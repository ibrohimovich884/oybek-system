import { useState, useMemo } from "react";
import {
  X,
  ArrowRightLeft,
  Check,
  CreditCard,
  Banknote,
  Wallet,
  BadgeDollarSign,
  Shield,
} from "lucide-react";
import { useExpenses } from "../../context/ExpensesContext.jsx";
import { formatSum, formatDollar, formatRate } from "../../utils/format.js";
import { WALLET_CONFIG, RESERVE_CONFIG } from "../../constants/money.js";

const ALL_ACCOUNTS = [
  { id: "hamyon", name: "Hamyon", type: "oddiy", currency: "UZS", icon: Wallet },
  { id: "naqd", name: "Naqd pul (Oddiy)", type: "oddiy", currency: "UZS", icon: Banknote },
  { id: "karta", name: "Plastik karta (Oddiy)", type: "oddiy", currency: "UZS", icon: CreditCard },
  { id: "dollar", name: "AQSH Dollari (Oddiy)", type: "oddiy", currency: "USD", icon: BadgeDollarSign },
  { id: "naqd-asosiy", name: "Naqd pul (Asosiy / Rezerv)", type: "asosiy", currency: "UZS", icon: Shield },
  { id: "karta-asosiy", name: "Plastik karta (Asosiy / Rezerv)", type: "asosiy", currency: "UZS", icon: Shield },
  { id: "dollar-asosiy", name: "AQSH Dollari (Asosiy / Rezerv)", type: "asosiy", currency: "USD", icon: Shield },
];

export default function UniversalTransferModal({ initialFrom = "naqd", initialTo = "naqd-asosiy", onClose }) {
  const { executeTransfer, currentBalances, reserves, rateInfo } = useExpenses();
  const [fromAccount, setFromAccount] = useState(initialFrom);
  const [toAccount, setToAccount] = useState(initialTo);
  const [amount, setAmount] = useState("");
  const [customRate, setCustomRate] = useState(rateInfo?.rate || 12850);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fromInfo = ALL_ACCOUNTS.find((a) => a.id === fromAccount) || ALL_ACCOUNTS[0];
  const toInfo = ALL_ACCOUNTS.find((a) => a.id === toAccount) || ALL_ACCOUNTS[1];

  const isFromDollar = fromInfo.currency === "USD";
  const isToDollar = toInfo.currency === "USD";
  const hasCurrencyConversion = isFromDollar !== isToDollar;

  const numAmount = Number(amount) || 0;

  // Qayerdan balansini aniqlash
  const getBalance = (id) => {
    if (id === "hamyon") return currentBalances.hamyon;
    if (id === "naqd") return currentBalances.naqd;
    if (id === "karta") return currentBalances.karta;
    if (id === "dollar") return currentBalances.dollar;
    if (id === "naqd-asosiy") return reserves["naqd-asosiy"]?.amount || 0;
    if (id === "karta-asosiy") return reserves["karta-asosiy"]?.amount || 0;
    if (id === "dollar-asosiy") return reserves["dollar-asosiy"]?.amount || 0;
    return 0;
  };

  const fromBalance = getBalance(fromAccount);
  const toBalance = getBalance(toAccount);

  // Hisoblangan maqsadli summa
  const calculatedTargetAmount = useMemo(() => {
    if (!numAmount || numAmount <= 0) return 0;
    const rate = Number(customRate) || rateInfo?.rate || 12850;
    if (isFromDollar && !isToDollar) {
      // USD -> UZS
      return Math.round(numAmount * rate);
    }
    if (!isFromDollar && isToDollar) {
      // UZS -> USD
      return Number((numAmount / rate).toFixed(2));
    }
    return numAmount;
  }, [numAmount, isFromDollar, isToDollar, customRate, rateInfo]);

  const handleSwap = () => {
    const prevFrom = fromAccount;
    const prevTo = toAccount;
    setFromAccount(prevTo);
    setToAccount(prevFrom);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!numAmount || numAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const defaultReason = `${fromInfo.name}dan ${toInfo.name}ga o'tkazma`;

      await executeTransfer({
        from: fromAccount,
        to: toAccount,
        amount: numAmount,
        targetAmount: calculatedTargetAmount,
        exchangeRate: hasCurrencyConversion ? Number(customRate) : null,
        note: reason.trim() || defaultReason,
      });
      onClose();
    } catch (err) {
      alert(`O'tkazishda xatolik: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Universal Pul O'tkazmasi</h3>
            <p className="modal-subtitle">
              Har qanday ikki hisob (Oddiy yoki Asosiy rezervlar) o'rtasida mablag' o'tkazish
            </p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form form--type-transfer universal-transfer-form">
          {/* O'tkazma oqimi: Qayerdan va Qayerga */}
          <div className="universal-transfer-flow">
            {/* Manba hisob */}
            <div className={`transfer-card transfer-card--${fromInfo.type}`}>
              <div className="transfer-card__header">
                <span className="transfer-card__direction">
                  <span className="transfer-dot transfer-dot--out"></span>
                  Qayerdan chiqadi
                </span>
                <span className={`transfer-type-tag transfer-type-tag--${fromInfo.type}`}>
                  {fromInfo.type === "asosiy" ? "Rezerv" : "Kundalik"}
                </span>
              </div>

              <div className="transfer-card__select-wrap">
                <select
                  className="transfer-select"
                  value={fromAccount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFromAccount(val);
                    if (val === toAccount) {
                      setToAccount(val === "naqd" ? "naqd-asosiy" : "naqd");
                    }
                  }}
                >
                  <optgroup label="Oddiy (Kundalik) hisoblar">
                    {ALL_ACCOUNTS.filter((a) => a.type === "oddiy").map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Asosiy (Rezerv) hisoblar">
                    {ALL_ACCOUNTS.filter((a) => a.type === "asosiy").map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="transfer-card__footer">
                <div className="transfer-card__account-title">
                  <fromInfo.icon size={16} className="transfer-acc-icon" />
                  <span>{fromInfo.name}</span>
                </div>
                <div className="transfer-card__bal mono">
                  <span className="transfer-bal-label">Mavjud:</span>{" "}
                  <strong>{isFromDollar ? formatDollar(fromBalance) : formatSum(fromBalance)}</strong>
                </div>
              </div>
            </div>

            {/* Swap tugmasi */}
            <div className="transfer-swap-container">
              <button
                type="button"
                className="transfer-swap-btn"
                onClick={handleSwap}
                title="Yo'nalishni almashtirish"
              >
                <ArrowRightLeft size={16} />
              </button>
            </div>

            {/* Qabul qiluvchi hisob */}
            <div className={`transfer-card transfer-card--${toInfo.type}`}>
              <div className="transfer-card__header">
                <span className="transfer-card__direction">
                  <span className="transfer-dot transfer-dot--in"></span>
                  Qayerga tushadi
                </span>
                <span className={`transfer-type-tag transfer-type-tag--${toInfo.type}`}>
                  {toInfo.type === "asosiy" ? "Rezerv" : "Kundalik"}
                </span>
              </div>

              <div className="transfer-card__select-wrap">
                <select
                  className="transfer-select"
                  value={toAccount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setToAccount(val);
                    if (val === fromAccount) {
                      setFromAccount(val === "naqd-asosiy" ? "naqd" : "naqd-asosiy");
                    }
                  }}
                >
                  <optgroup label="Oddiy (Kundalik) hisoblar">
                    {ALL_ACCOUNTS.filter((a) => a.type === "oddiy" && a.id !== fromAccount).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Asosiy (Rezerv) hisoblar">
                    {ALL_ACCOUNTS.filter((a) => a.type === "asosiy" && a.id !== fromAccount).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="transfer-card__footer">
                <div className="transfer-card__account-title">
                  <toInfo.icon size={16} className="transfer-acc-icon" />
                  <span>{toInfo.name}</span>
                </div>
                <div className="transfer-card__bal mono">
                  <span className="transfer-bal-label">Mavjud:</span>{" "}
                  <strong>{isToDollar ? formatDollar(toBalance) : formatSum(toBalance)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Valyuta konvertatsiyasi bo'lsa kurs sozlamasi */}
          {hasCurrencyConversion && (
            <div className="transfer-conversion-card">
              <div className="conversion-card__header">
                <span className="conversion-card__title">
                  Valyuta ayirboshlash kursi (1 USD):
                </span>
                <div className="conversion-rate-input-group">
                  <input
                    type="number"
                    step="any"
                    value={customRate}
                    onChange={(e) => setCustomRate(e.target.value)}
                    className="field-input mono conversion-rate-input"
                  />
                  <span className="conversion-rate-unit">so'm</span>
                </div>
              </div>
              <div className="conversion-rate-hint mono">
                {isFromDollar
                  ? `1 $ = ${formatSum(Number(customRate) || 0)} so'm kursi bo'yicha hisoblanadi`
                  : `${formatSum(Number(customRate) || 0)} so'm = 1 $ kursi bo'yicha hisoblanadi`}
              </div>
            </div>
          )}

          {/* Summa */}
          <div className="form-group transfer-amount-group">
            <label className="field-label">
              O'tkazma summasi ({isFromDollar ? "$" : "so'm"}) <span style={{ color: "var(--expense)" }}>*</span>
            </label>
            <div className="input-with-currency">
              <input
                type="number"
                min={isFromDollar ? "0.01" : "1"}
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={isFromDollar ? "Masalan: 100" : "Masalan: 100 000"}
                className="field-input mono transfer-amount-input"
                required
              />
              <span className="currency-suffix mono">{isFromDollar ? "$" : "so'm"}</span>
            </div>

            {amount && numAmount > 0 && (
              <div className="transfer-calculation-preview mono">
                <div className="calc-item calc-item--out">
                  <span className="calc-label">Chiqim:</span>
                  <span className="calc-value">
                    {isFromDollar ? formatDollar(numAmount) : formatSum(numAmount)}
                  </span>
                </div>
                {hasCurrencyConversion && (
                  <>
                    <span className="calc-arrow">➝</span>
                    <div className="calc-item calc-item--in">
                      <span className="calc-label">Tushum:</span>
                      <span className="calc-value">
                        {isToDollar ? formatDollar(calculatedTargetAmount) : formatSum(calculatedTargetAmount)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Izoh */}
          <div className="form-group">
            <label className="field-label">O'tkazma izohi (tarix uchun)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Masalan: Rezerv fondiga ajratildi, yoki zaxiradan yechildi..."
              className="field-input"
            />
          </div>

          <div className="modal-actions" style={{ marginTop: 20 }}>
            <div className="modal-actions-right" style={{ width: "100%", justifyContent: "flex-end", display: "flex", gap: 8 }}>
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                Bekor qilish
              </button>
              <button
                type="submit"
                className="btn btn--primary btn--transfer"
                disabled={isSubmitting || !amount}
              >
                <Check size={16} />
                <span>O'tkazishni tasdiqlash</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
