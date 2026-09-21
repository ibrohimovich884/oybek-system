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

        <form onSubmit={handleSubmit} className="modal-form form--type-transfer">
          <div className="transfer-flow">
            {/* Manba hisob */}
            <div className={`transfer-box transfer-box--${fromInfo.type}`}>
              <span className="transfer-box__tag">Qayerdan chiqadi:</span>
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
              <div className="transfer-box__card">
                <fromInfo.icon size={18} />
                <strong>{fromInfo.name}</strong>
              </div>
              <span className="transfer-box__bal mono">
                Balans: {isFromDollar ? formatDollar(fromBalance) : formatSum(fromBalance)}
              </span>
            </div>

            <button
              type="button"
              className="transfer-swap-btn"
              onClick={handleSwap}
              title="Yo'nalishni almashtirish"
            >
              <ArrowRightLeft size={18} />
            </button>

            {/* Qabul qiluvchi hisob */}
            <div className={`transfer-box transfer-box--${toInfo.type}`}>
              <span className="transfer-box__tag">Qayerga tushadi:</span>
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
              <div className="transfer-box__card">
                <toInfo.icon size={18} />
                <strong>{toInfo.name}</strong>
              </div>
              <span className="transfer-box__bal mono">
                Balans: {isToDollar ? formatDollar(toBalance) : formatSum(toBalance)}
              </span>
            </div>
          </div>

          {/* Valyuta konvertatsiyasi bo'lsa kurs sozlamasi */}
          {hasCurrencyConversion && (
            <div className="conversion-rate-banner" style={{ marginTop: 12, padding: "10px 14px", background: "var(--surface-hover)", borderRadius: 8, border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Konvertatsiya kursi (1 USD):</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="number"
                    step="any"
                    value={customRate}
                    onChange={(e) => setCustomRate(e.target.value)}
                    className="expense-form__input mono"
                    style={{ width: 140, padding: "4px 8px" }}
                  />
                  <span className="field-hint">so'm</span>
                </div>
              </div>
            </div>
          )}

          {/* Summa */}
          <div className="expense-form__field">
            <label className="expense-form__label">
              O'tkazma summasi ({isFromDollar ? "$" : "so'm"}) <span className="field-required">*</span>
            </label>
            <input
              type="number"
              min={isFromDollar ? "0.01" : "1"}
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={isFromDollar ? "Masalan: 100" : "Masalan: 100000"}
              className="expense-form__input mono expense-form__input--amount"
              required
            />
            {amount && (
              <div className="amount-preview mono" style={{ marginTop: 6, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span>Chiqim: {isFromDollar ? formatDollar(numAmount) : formatSum(numAmount)}</span>
                {hasCurrencyConversion && (
                  <span style={{ color: "var(--accent)" }}>
                    ➝ Tushum: {isToDollar ? formatDollar(calculatedTargetAmount) : formatSum(calculatedTargetAmount)}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="expense-form__field">
            <label className="expense-form__label">O'tkazma izohi (tarix uchun)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Masalan: Rezerv fondiga ajratildi, yoki zaxiradan yechildi..."
              className="expense-form__input"
            />
          </div>

          <div className="modal-actions">
            <div className="modal-actions-right" style={{ width: "100%", justifyContent: "flex-end" }}>
              <button type="button" className="btn" onClick={onClose}>
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
