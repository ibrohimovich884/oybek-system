import { useState } from "react";
import { X, ArrowRightLeft, Check, CreditCard, Banknote } from "lucide-react";
import { useExpenses } from "../../context/ExpensesContext.jsx";
import { formatSum } from "../../utils/format.js";
import { WALLET_CONFIG } from "../../constants/money.js";

export default function TransferModal({ initialFrom = "karta", initialTo = "naqd", onClose }) {
  const { addExpense, currentBalances } = useExpenses();
  const [fromWallet, setFromWallet] = useState(initialFrom);
  const [toWallet, setToWallet] = useState(initialTo);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSwap = () => {
    setFromWallet(toWallet);
    setToWallet(fromWallet);
  };

  const addQuickAmount = (val) => {
    setAmount((prev) => {
      const current = Number(prev) || 0;
      return String(current + val);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const defaultReason =
        fromWallet === "karta" && toWallet === "naqd"
          ? "Bankomatdan naqd yechish"
          : "Kartaga naqd pul to'ldirish";

      await addExpense({
        type: "transfer",
        amount: numAmount,
        fromWallet,
        toWallet,
        category: "O'tkazma",
        subcategory: "O'tkazma",
        reason: reason.trim() || defaultReason,
        location: "Bankomat / Bank",
        spentAt: new Date().toISOString(),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Hisoblararo pul o'tkazish</h3>
            <p className="modal-subtitle">
              Plastik karta va naqd hamyon o'rtasida pul ko'chirish
            </p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form form--type-transfer">
          <div className="transfer-flow">
            <div className={`transfer-box ${fromWallet === "karta" ? "transfer-box--karta" : "transfer-box--naqd"}`}>
              <span className="transfer-box__tag">Qayerdan:</span>
              <div className="transfer-box__card">
                {fromWallet === "karta" ? <CreditCard size={20} /> : <Banknote size={20} />}
                <strong>{WALLET_CONFIG[fromWallet].label}</strong>
              </div>
              <span className="transfer-box__bal mono">
                Balans: {formatSum(currentBalances[fromWallet])}
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

            <div className={`transfer-box ${toWallet === "karta" ? "transfer-box--karta" : "transfer-box--naqd"}`}>
              <span className="transfer-box__tag">Qayerga:</span>
              <div className="transfer-box__card">
                {toWallet === "karta" ? <CreditCard size={20} /> : <Banknote size={20} />}
                <strong>{WALLET_CONFIG[toWallet].label}</strong>
              </div>
              <span className="transfer-box__bal mono">
                Balans: {formatSum(currentBalances[toWallet])}
              </span>
            </div>
          </div>

          <div className="expense-form__field">
            <label className="expense-form__label">
              O'tkazma summasi (so'm) <span className="field-required">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Masalan: 50000"
              className="expense-form__input mono expense-form__input--amount"
              required
            />
            {amount && <span className="amount-preview mono">{formatSum(Number(amount))}</span>}

            {/* Tezkor summa tugmalari */}
            <div className="quick-amount-chips" style={{ marginTop: 8 }}>
              {[10000, 50000, 100000, 200000, 500000].map((val) => (
                <button
                  key={val}
                  type="button"
                  className="quick-amount-chip mono"
                  onClick={() => addQuickAmount(val)}
                >
                  +{formatSum(val).replace(" so'm", "")}
                </button>
              ))}
              {currentBalances[fromWallet] > 0 && (
                <button
                  type="button"
                  className="quick-amount-chip quick-amount-chip--all mono"
                  onClick={() => setAmount(String(currentBalances[fromWallet]))}
                >
                  Barchasi ({formatSum(currentBalances[fromWallet]).replace(" so'm", "")})
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
              placeholder="Masalan: Agrobank bankomati"
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
