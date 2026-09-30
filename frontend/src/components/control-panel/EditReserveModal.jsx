import { useState } from "react";
import { X, Check, ShieldAlert, History } from "lucide-react";
import { useExpenses } from "../../context/ExpensesContext.jsx";
import { formatSum, formatDollar, formatRate, formatDateTime } from "../../utils/format.js";
import { RESERVE_CONFIG } from "../../constants/money.js";

export default function EditReserveModal({ reserveId, onClose }) {
  const { reserves, updateReserve, rateInfo } = useExpenses();
  const reserve = reserves[reserveId] || { amount: 0, notes: [] };
  const config = RESERVE_CONFIG[reserveId] || { name: reserveId, currency: "UZS" };

  const isDollar = config.currency === "USD";
  const currentRate = rateInfo?.rate || 12850;

  const [amount, setAmount] = useState(String(reserve.amount ?? ""));
  const [noteText, setNoteText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      setError("Iltimos, to'g'ri summa kiriting.");
      return;
    }

    if (!noteText.trim()) {
      setError("Asosiy balansni o'zgartirish uchun izoh (sabab) kiritish majburiydir!");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await updateReserve(reserveId, {
        amount: numAmount,
        noteText: noteText.trim(),
        exchangeRateAtTime: isDollar ? currentRate : null,
      });
      onClose();
    } catch (err) {
      setError(`Xatolik: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Asosiy Balansni Tahrirlash</h3>
            <p className="modal-subtitle">{config.name} (Rezerv mablag'i)</p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="modal-error-banner" style={{ background: "var(--danger-soft)", color: "var(--danger)", padding: "10px 14px", borderRadius: 8, fontSize: "0.85rem", display: "flex", gap: 8, alignItems: "center" }}>
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="expense-form__field">
            <label className="expense-form__label">Hozirgi saqlangan summa:</label>
            <div className="mono" style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent)" }}>
              {isDollar ? formatDollar(reserve.amount || 0) : formatSum(reserve.amount || 0)}
              {isDollar && (
                <span style={{ fontSize: "0.85rem", opacity: 0.8, marginLeft: 8 }}>
                  (~ {formatSum((reserve.amount || 0) * currentRate)})
                </span>
              )}
            </div>
          </div>

          <div className="expense-form__field">
            <label className="expense-form__label" htmlFor="reserve-new-amount">
              Yangi summa ({isDollar ? "$" : "so'm"}) <span className="field-required">*</span>
            </label>
            <input
              id="reserve-new-amount"
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Yangi summani kiriting..."
              className="expense-form__input mono expense-form__input--amount"
              required
            />
            {amount && (
              <span className="amount-preview mono">
                {isDollar ? formatDollar(Number(amount)) : formatSum(Number(amount))}
              </span>
            )}
          </div>

          <div className="expense-form__field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="expense-form__label" htmlFor="reserve-note">
                O'zgarish sababi / Izoh <span className="field-required">* (Majburiy)</span>
              </label>
              <span className="field-hint" style={{ color: "var(--warning)" }}>Tarixga yoziladi</span>
            </div>
            <textarea
              id="reserve-note"
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Masalan: Maoshdan jamg'armaga qo'shildi, yoki uydagi seyfga saqlash uchun..."
              className="expense-form__input"
              required
            />
          </div>

          {/* Izohlar tarixi ro'yxati (Prepend - eng yangisi tepada) */}
          {Array.isArray(reserve.notes) && reserve.notes.length > 0 && (
            <div className="reserve-notes-history" style={{ marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
                <History size={14} />
                <span>Oldingi izohlar tarixi ({reserve.notes.length}):</span>
              </div>
              <div style={{ maxHeight: 150, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {reserve.notes.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: "8px 12px",
                      background: "var(--surface-hover)",
                      borderRadius: 6,
                      fontSize: "0.78rem",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", marginBottom: 2 }}>
                      <span className="mono">{formatDateTime(n.createdAt)}</span>
                      {n.exchangeRate && <span className="mono">@ {formatRate(n.exchangeRate)}</span>}
                    </div>
                    <div style={{ color: "var(--text)" }}>{n.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: 16 }}>
            <div className="modal-actions-right" style={{ width: "100%", justifyContent: "flex-end" }}>
              <button type="button" className="btn" onClick={onClose}>
                Bekor qilish
              </button>
              <button type="submit" className="btn btn--primary" disabled={isSaving || !noteText.trim()}>
                <Check size={16} />
                <span>O'zgarishni tasdiqlash</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
