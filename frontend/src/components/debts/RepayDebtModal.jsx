import { useState } from "react";
import { X, DollarSign, Wallet, Calendar, FileText, CheckCircle2 } from "lucide-react";
import { formatSum, formatDollar } from "../../utils/format.js";
import { DEBT_TYPES } from "../../constants/debts.js";

export default function RepayDebtModal({ isOpen, onClose, debt, onRepay }) {
  if (!isOpen || !debt) return null;

  const totalPaid = (debt.payments || []).reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );
  const remaining = Math.max(0, Number(debt.amount || 0) - totalPaid);
  const isUsd = debt.currency === "USD";
  const formatFn = isUsd ? formatDollar : formatSum;

  const [amount, setAmount] = useState(remaining);
  const [wallet, setWallet] = useState(debt.wallet || (isUsd ? "dollar" : "naqd"));
  const [affectBalance, setAffectBalance] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const isGiven = debt.type === DEBT_TYPES.GIVEN;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Iltimos, to'g'ri to'lov summasini kiriting");
      return;
    }

    onRepay(debt.id, {
      amount: numAmount,
      wallet,
      affectBalance,
      date,
      note,
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content debt-repay-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-mobile-handle" />
        <div className="modal-header debt-modal-header">
          <div>
            <h3 className="modal-title">
              {isGiven ? "Qarz qaytishini yozish" : "Qarzni to'lash"}
            </h3>
            <p className="modal-subtitle">
              {debt.personName} • Qoldiq:{" "}
              <strong className="mono" style={{ color: "var(--accent)" }}>
                {formatFn(remaining)}
              </strong>
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Yopish"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body debt-modal-form">
          {error && <div className="feedback-alert feedback-alert--error">{error}</div>}

          {/* Summa & Tezkor tugmalar */}
          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label className="field-label" style={{ marginBottom: 0 }}>To'lov summasi</label>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="quick-chip-btn"
                  onClick={() => setAmount(Math.round(remaining / 2))}
                >
                  50%
                </button>
                <button
                  type="button"
                  className="quick-chip-btn quick-chip-btn--all"
                  onClick={() => setAmount(remaining)}
                >
                  100% (To'liq)
                </button>
              </div>
            </div>

            <div className="input-with-icon">
              <DollarSign size={16} className="input-icon" />
              <input
                type="number"
                min="0"
                step="any"
                className="field-input mono"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
              Jami qarz: <span className="mono">{formatFn(debt.amount)}</span> • To'langan: <span className="mono">{formatFn(totalPaid)}</span>
            </div>
          </div>

          {/* Qaysi hisobga / Qaysi hisobdan */}
          <div className="form-row form-row--2col">
            <div className="form-group">
              <label className="field-label">
                <Wallet size={14} style={{ marginRight: 4, display: "inline" }} />
                <span>{isGiven ? "Qaysi hisobga tushdi" : "Qaysi hisobdan to'landi"}</span>
              </label>
              <select
                className="field-input"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
              >
                {isUsd ? (
                  <option value="dollar">AQSH Dollari ($)</option>
                ) : (
                  <>
                    <option value="hamyon">Hamyon (Kundalik)</option>
                    <option value="naqd">Naqd pul</option>
                    <option value="karta">Plastik karta</option>
                  </>
                )}
              </select>
            </div>

            <div className="form-group">
              <label className="field-label">Balansga ta'siri</label>
              <label className="debt-checkbox-card">
                <input
                  type="checkbox"
                  checked={affectBalance}
                  onChange={(e) => setAffectBalance(e.target.checked)}
                  style={{ accentColor: "var(--accent)", cursor: "pointer" }}
                />
                <span>{isGiven ? "Kirim qilib yozilsin" : "Chiqim qilib yozilsin"}</span>
              </label>
            </div>
          </div>

          {/* Sana */}
          <div className="form-group">
            <label className="field-label">
              <Calendar size={14} style={{ marginRight: 4, display: "inline" }} />
              <span>To'lov sanasi</span>
            </label>
            <input
              type="datetime-local"
              className="field-input mono"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Izoh */}
          <div className="form-group">
            <label className="field-label">
              <FileText size={14} style={{ marginRight: 4, display: "inline" }} />
              <span>To'lov izohi</span>
            </label>
            <input
              type="text"
              className="field-input"
              placeholder="Masalan: Kartaga tashlab berdi, naqd keltirdi"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="modal-actions debt-modal-actions">
            <div className="modal-actions-right debt-modal-actions-right">
              <button type="button" className="btn btn--ghost debt-action-cancel" onClick={onClose}>
                Bekor qilish
              </button>
              <button type="submit" className="btn btn--primary debt-action-save">
                <CheckCircle2 size={16} />
                <span>To'lovni tasdiqlash</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
