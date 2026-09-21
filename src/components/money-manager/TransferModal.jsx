import { useState, useMemo } from "react";
import {
  X,
  ArrowRightLeft,
  Check,
  CreditCard,
  Banknote,
  Wallet,
  BadgeDollarSign,
} from "lucide-react";
import { useExpenses } from "../../context/ExpensesContext.jsx";
import { formatSum, formatDollar, formatRate } from "../../utils/format.js";
import { WALLET_CONFIG } from "../../constants/money.js";

const WALLET_ICONS = {
  hamyon: Wallet,
  naqd: Banknote,
  karta: CreditCard,
  dollar: BadgeDollarSign,
};

export default function TransferModal({ initialFrom = "hamyon", initialTo = "naqd", onClose }) {
  const { executeTransfer, currentBalances, rateInfo } = useExpenses();
  const [fromWallet, setFromWallet] = useState(initialFrom);
  const [toWallet, setToWallet] = useState(initialTo === initialFrom ? "naqd" : initialTo);
  const [amount, setAmount] = useState("");
  const [customRate, setCustomRate] = useState(rateInfo?.rate || 12850);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableWallets = ["hamyon", "naqd", "karta", "dollar"];

  const handleSwap = () => {
    const prevFrom = fromWallet;
    const prevTo = toWallet;
    setFromWallet(prevTo);
    setToWallet(prevFrom);
  };

  const isFromDollar = fromWallet === "dollar";
  const isToDollar = toWallet === "dollar";
  const hasCurrencyConversion = isFromDollar !== isToDollar;

  const numAmount = Number(amount) || 0;

  // Hisoblangan maqsadli summa
  const calculatedTargetAmount = useMemo(() => {
    if (!numAmount || numAmount <= 0) return 0;
    const rate = Number(customRate) || rateInfo?.rate || 12850;
    if (isFromDollar && !isToDollar) {
      // Dollardan so'mga
      return Math.round(numAmount * rate);
    }
    if (!isFromDollar && isToDollar) {
      // So'mdan dollarga
      return Number((numAmount / rate).toFixed(2));
    }
    return numAmount;
  }, [numAmount, isFromDollar, isToDollar, customRate, rateInfo]);

  const addQuickAmount = (val) => {
    setAmount((prev) => {
      const current = Number(prev) || 0;
      return String(current + val);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!numAmount || numAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const fromCfg = WALLET_CONFIG[fromWallet] || { label: fromWallet };
      const toCfg = WALLET_CONFIG[toWallet] || { label: toWallet };

      const defaultReason = `${fromCfg.label}dan ${toCfg.label}ga o'tkazma`;

      await executeTransfer({
        from: fromWallet,
        to: toWallet,
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

  const FromIcon = WALLET_ICONS[fromWallet] || Wallet;
  const ToIcon = WALLET_ICONS[toWallet] || Wallet;

  const fromBalance = currentBalances[fromWallet] || 0;
  const toBalance = currentBalances[toWallet] || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">
              {fromWallet === "hamyon" ? "Hamyondan pul o'tkazish" : "Hisoblararo pul o'tkazish"}
            </h3>
            <p className="modal-subtitle">
              {fromWallet === "hamyon"
                ? "Hamyondagi mablag'ni Naqd yoki Plastik kartaga o'tkazish"
                : "Kundalik pul manbalari o'rtasida mablag' ko'chirish"}
            </p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form form--type-transfer">
          {/* Manba va Qabul qiluvchi tanlash */}
          <div className="transfer-flow">
            <div className={`transfer-box transfer-box--${fromWallet}`}>
              <span className="transfer-box__tag">Qayerdan:</span>
              <select
                className="transfer-select"
                value={fromWallet}
                onChange={(e) => {
                  const val = e.target.value;
                  setFromWallet(val);
                  if (val === toWallet) {
                    setToWallet(val === "hamyon" ? "naqd" : "hamyon");
                  }
                }}
              >
                {availableWallets.map((w) => (
                  <option key={w} value={w}>
                    {WALLET_CONFIG[w].label}
                  </option>
                ))}
              </select>
              <div className="transfer-box__card">
                <FromIcon size={18} />
                <strong>{WALLET_CONFIG[fromWallet]?.label}</strong>
              </div>
              <span className="transfer-box__bal mono">
                Balans:{" "}
                {fromWallet === "dollar"
                  ? formatDollar(fromBalance)
                  : formatSum(fromBalance)}
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

            <div className={`transfer-box transfer-box--${toWallet}`}>
              <span className="transfer-box__tag">Qayerga:</span>
              <select
                className="transfer-select"
                value={toWallet}
                onChange={(e) => {
                  const val = e.target.value;
                  setToWallet(val);
                  if (val === fromWallet) {
                    setFromWallet(val === "hamyon" ? "naqd" : "hamyon");
                  }
                }}
              >
                {availableWallets
                  .filter((w) => w !== fromWallet)
                  .map((w) => (
                    <option key={w} value={w}>
                      {WALLET_CONFIG[w].label}
                    </option>
                  ))}
              </select>
              <div className="transfer-box__card">
                <ToIcon size={18} />
                <strong>{WALLET_CONFIG[toWallet]?.label}</strong>
              </div>
              <span className="transfer-box__bal mono">
                Balans:{" "}
                {toWallet === "dollar"
                  ? formatDollar(toBalance)
                  : formatSum(toBalance)}
              </span>
            </div>
          </div>

          {/* Valyuta konvertatsiyasi bo'lsa kurs sozlamasi */}
          {hasCurrencyConversion && (
            <div className="conversion-rate-banner">
              <div className="conversion-rate-banner__info">
                <span>Konvertatsiya kursi (1 USD):</span>
                <input
                  type="number"
                  step="any"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  className="expense-form__input mono"
                  style={{ width: 140, display: "inline-block", padding: "4px 8px" }}
                />
                <span className="field-hint">CBU: {formatRate(rateInfo?.rate || 12850)}</span>
              </div>
            </div>
          )}

          {/* O'tkazma summasi */}
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
              placeholder={isFromDollar ? "Masalan: 50" : "Masalan: 50000"}
              className="expense-form__input mono expense-form__input--amount"
              required
            />
            {amount && (
              <div className="amount-preview mono">
                <span>Chiqim: {isFromDollar ? formatDollar(numAmount) : formatSum(numAmount)}</span>
                {hasCurrencyConversion && (
                  <span style={{ marginLeft: 12, color: "var(--accent)" }}>
                    ➝ Tushum: {isToDollar ? formatDollar(calculatedTargetAmount) : formatSum(calculatedTargetAmount)}
                  </span>
                )}
              </div>
            )}

            {/* Tezkor summa tugmalari */}
            <div className="quick-amount-chips" style={{ marginTop: 8 }}>
              {(isFromDollar ? [10, 20, 50, 100] : [10000, 50000, 100000, 200000]).map((val) => (
                <button
                  key={val}
                  type="button"
                  className="quick-amount-chip mono"
                  onClick={() => addQuickAmount(val)}
                >
                  +{isFromDollar ? `$${val}` : formatSum(val).replace(" so'm", "")}
                </button>
              ))}
              {fromBalance > 0 && (
                <button
                  type="button"
                  className="quick-amount-chip quick-amount-chip--all mono"
                  onClick={() => setAmount(String(fromBalance))}
                >
                  Barchasi ({isFromDollar ? formatDollar(fromBalance) : formatSum(fromBalance).replace(" so'm", "")})
                </button>
              )}
            </div>
          </div>

          <div className="expense-form__field">
            <label className="expense-form__label">Izoh (ixtiyoriy)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Masalan: Hamyondan naqdga o'tkazma"
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
