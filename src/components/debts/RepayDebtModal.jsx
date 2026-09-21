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
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 460 }}
      >
        <div className="modal-header">
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
          <button className="btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error-banner">{error}</div>}

          {/* Summa & Tezkor tugmalar */}
          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label className="field-label" style={{ marginBottom: 0 }}>To'lov summasi</label>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="btn btn--ghost btn--xs"
                  onClick={() => setAmount(Math.round(remaining / 2))}
                >
                  50%
                </button>
                <button
                  type="button"
                  className="btn btn--subtle btn--xs"
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
              />
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
              Jami qarz: <span className="mono">{formatFn(debt.amount)}</span> • To'langan: <span className="mono">{formatFn(totalPaid)}</span>
            </div>
          </div>

          {/* Qaysi hisobga / Qaysi hisobdan */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="form-group">
              <label className="field-label">
                {isGiven ? "Qaysi hisobga tushdi" : "Qaysi hisobdan to'landi"}
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
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  height: 42,
                  padding: "0 10px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface-sunken)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={affectBalance}
                  onChange={(e) => setAffectBalance(e.target.checked)}
                  style={{ accentColor: "var(--accent)" }}
                />
                <span>{isGiven ? "Kirim qilib yozilsin" : "Chiqim qilib yozilsin"}</span>
              </label>
            </div>
          </div>

          {/* Sana */}
          <div className="form-group">
            <label className="field-label">To'lov sanasi</label>
            <div className="input-with-icon">
              <Calendar size={16} className="input-icon" />
              <input
                type="datetime-local"
                className="field-input mono"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Izoh */}
          <div className="form-group">
            <label className="field-label">To'lov izohi</label>
            <div className="input-with-icon">
              <FileText size={16} className="input-icon" />
              <input
                type="text"
                className="field-input"
                placeholder="Masalan: Kartaga tashlab berdi, naqd keltirib berdi"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: 14 }}>
            <button type="button" className="btn btn--subtle" onClick={onClose}>
              Bekor qilish
            </button>
            <button type="submit" className="btn btn--primary">
              <CheckCircle2 size={16} />
              <span>To'lovni tasdiqlash</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
