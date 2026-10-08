import React, { useState } from "react";
import {
  X,
  HeartHandshake,
  AlertTriangle,
  User,
  DollarSign,
  Calendar,
  Check,
} from "lucide-react";
import { formatSum, formatDollar } from "../../utils/format.js";
import { DEBT_TYPES } from "../../constants/debts.js";

export default function ForgiveDebtModal({
  isOpen,
  onClose,
  debt,
  onForgive,
}) {
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !debt) return null;

  const isGiven = debt.type === DEBT_TYPES.GIVEN;
  const isUsd = debt.currency === "USD";
  const formatFn = isUsd ? formatDollar : formatSum;

  const totalAmount = Number(debt.amount || 0);
  const payments = debt.payments || [];
  const paidAmount = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onForgive(debt.id, {
        amount: remainingAmount,
        note: note.trim() || "Qarzdan voz kechildi (Kechib yuborildi / Halol qilindi)",
        date: new Date().toISOString(),
      });
      onClose();
    } catch (err) {
      console.error("Voz kechishda xatolik:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content debt-forgive-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-mobile-handle" />

        {/* Modal Header */}
        <div className="modal-header debt-forgive-header">
          <div className="modal-title-with-icon debt-forgive-title-wrap">
            <div className="debt-forgive-icon-box">
              <HeartHandshake size={20} />
            </div>
            <div>
              <h3 className="debt-forgive-title">
                Qarzdan voz kechish
              </h3>
              <p className="debt-forgive-subtitle">
                Kechvorish / Halol qilish amali
              </p>
            </div>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Yopish"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body debt-forgive-body">
            {/* Qarzdor shaxs ma'lumoti */}
            <div className="debt-forgive-person-card">
              <div className="debt-forgive-person-left">
                <div className="debt-forgive-avatar">
                  {debt.personName?.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="debt-forgive-person-details">
                  <div className="debt-forgive-person-name">
                    {debt.personName}
                  </div>
                  {debt.contact && (
                    <div className="debt-forgive-person-contact">
                      {debt.contact}
                    </div>
                  )}
                </div>
              </div>

              <div className="debt-forgive-amount-box">
                <span className="debt-forgive-amount-lbl">
                  Kechiladigan qoldiq:
                </span>
                <span className="debt-forgive-amount-val mono">
                  {formatFn(remainingAmount)}
                </span>
              </div>
            </div>

            {/* Moliya taqsimoti */}
            <div className="debt-forgive-metrics-grid">
              <div className="debt-forgive-metric-item">
                <span className="debt-forgive-metric-lbl">
                  Boshlang'ich summa
                </span>
                <strong className="mono debt-forgive-metric-val">
                  {formatFn(totalAmount)}
                </strong>
              </div>

              <div className="debt-forgive-metric-item">
                <span className="debt-forgive-metric-lbl">
                  Ilgari to'langan
                </span>
                <strong className="mono debt-forgive-metric-val debt-forgive-metric-val--paid">
                  {paidAmount > 0 ? formatFn(paidAmount) : "0"}
                </strong>
              </div>
            </div>

            {/* Tushuntirish bloki */}
            <div className="debt-forgive-rule-box">
              <AlertTriangle
                size={18}
                className="debt-forgive-rule-icon"
              />
              <div className="debt-forgive-rule-text">
                <strong>Voz kechish qoidalari:</strong>
                <ul>
                  <li>Qarz oluvchidan bu pul qaytib olinmaydi.</li>
                  <li>Qarz daftarda toʻliq yopilgan (<strong>Voz kechilgan</strong>) deb belgilanadi.</li>
                  <li>Hamyon balansiga pul kirmaydi.</li>
                </ul>
              </div>
            </div>

            {/* Izoh maydoni */}
            <div className="field-group">
              <label className="field-label" htmlFor="forgive-note">
                Izoh / Sabab (ixtiyoriy)
              </label>
              <input
                id="forgive-note"
                type="text"
                className="field-input"
                placeholder="Masalan: Kechib yuborildi / Halol qilindi"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer debt-forgive-footer">
            <button
              type="button"
              className="btn btn--ghost debt-forgive-cancel-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Bekor qilish
            </button>

            <button
              type="submit"
              className="btn debt-forgive-submit-btn"
              disabled={isSubmitting}
            >
              <HeartHandshake size={16} />
              <span>{isSubmitting ? "Saqlanmoqda..." : "Ha, voz kechish (Kechvorish)"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
