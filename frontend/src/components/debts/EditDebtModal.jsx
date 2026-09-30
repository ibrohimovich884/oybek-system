import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Phone,
  DollarSign,
  MapPin,
  Calendar,
  HelpCircle,
  FileText,
  Wallet,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { WALLET_CONFIG } from "../../constants/money.js";
import { DEBT_TYPES, DEBT_TYPE_LABELS } from "../../constants/debts.js";

export default function EditDebtModal({ isOpen, onClose, debt, onUpdateDebt }) {
  if (!isOpen || !debt) return null;

  const [type, setType] = useState(debt.type || DEBT_TYPES.GIVEN);
  const [personName, setPersonName] = useState(debt.personName || "");
  const [contact, setContact] = useState(debt.contact || "");
  const [amount, setAmount] = useState(debt.amount || "");
  const [currency, setCurrency] = useState(debt.currency || "UZS");
  const [wallet, setWallet] = useState(debt.wallet || "naqd");
  const [date, setDate] = useState(() =>
    debt.date ? debt.date.slice(0, 16) : new Date().toISOString().slice(0, 16)
  );
  const [location, setLocation] = useState(debt.location || "");
  const [reason, setReason] = useState(debt.reason || "");
  const [isDueDateUnknown, setIsDueDateUnknown] = useState(
    debt.isDueDateUnknown !== undefined ? debt.isDueDateUnknown : !debt.dueDate
  );
  const [dueDate, setDueDate] = useState(() =>
    debt.dueDate ? debt.dueDate.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [personalNote, setPersonalNote] = useState(debt.personalNote || "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (debt) {
      setType(debt.type || DEBT_TYPES.GIVEN);
      setPersonName(debt.personName || "");
      setContact(debt.contact || "");
      setAmount(debt.amount || "");
      setCurrency(debt.currency || "UZS");
      setWallet(debt.wallet || "naqd");
      setDate(debt.date ? debt.date.slice(0, 16) : new Date().toISOString().slice(0, 16));
      setLocation(debt.location || "");
      setReason(debt.reason || "");
      setIsDueDateUnknown(
        debt.isDueDateUnknown !== undefined ? debt.isDueDateUnknown : !debt.dueDate
      );
      setDueDate(
        debt.dueDate ? debt.dueDate.slice(0, 10) : new Date().toISOString().slice(0, 10)
      );
      setPersonalNote(debt.personalNote || "");
    }
  }, [debt]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!personName.trim()) {
      setError("Iltimos, qarzdor shaxs ismini kiriting");
      return;
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Iltimos, to'g'ri summa kiriting (0 dan katta bo'lsin)");
      return;
    }

    onUpdateDebt(debt.id, {
      type,
      personName: personName.trim(),
      contact: contact.trim(),
      amount: numAmount,
      currency,
      wallet,
      date,
      location: location.trim(),
      reason: reason.trim(),
      isDueDateUnknown,
      dueDate: isDueDateUnknown ? null : dueDate,
      personalNote: personalNote.trim(),
    });

    onClose();
  };

  const labels = DEBT_TYPE_LABELS[type];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-content--wide"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 540 }}
      >
        <div className="modal-mobile-handle" />
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background:
                  type === DEBT_TYPES.GIVEN
                    ? "rgba(78, 184, 150, 0.15)"
                    : "rgba(245, 158, 11, 0.15)",
                color: type === DEBT_TYPES.GIVEN ? "var(--accent)" : "var(--warning)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {type === DEBT_TYPES.GIVEN ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
            </div>
            <div>
              <h3 className="modal-title">Qarz ma'lumotlarini tahrirlash</h3>
              <p className="modal-subtitle">Qarzdor shaxs yoki qarz shartlarini yangilash</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {error && (
            <div
              style={{
                padding: "8px 12px",
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid var(--expense)",
                borderRadius: "var(--radius-sm)",
                color: "var(--expense)",
                fontSize: "0.85rem",
              }}
            >
              {error}
            </div>
          )}

          {/* Turi Switcher */}
          <div className="debt-switcher">
            <button
              type="button"
              className={`debt-switcher__btn ${type === DEBT_TYPES.GIVEN ? "is-given" : ""}`}
              onClick={() => setType(DEBT_TYPES.GIVEN)}
            >
              <ArrowUpRight size={16} />
              <span>Men qarz berdim (+)</span>
            </button>
            <button
              type="button"
              className={`debt-switcher__btn ${type === DEBT_TYPES.TAKEN ? "is-taken" : ""}`}
              onClick={() => setType(DEBT_TYPES.TAKEN)}
            >
              <ArrowDownLeft size={16} />
              <span>Men qarz oldim (-)</span>
            </button>
          </div>

          {/* Ism va Aloqa */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field-group">
              <label className="field-label">
                <User size={14} />
                <span>{labels.personLabel} *</span>
              </label>
              <input
                type="text"
                className="field-input"
                placeholder="Masalan: Rustam aka"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label">
                <Phone size={14} />
                <span>Telefon / Aloqa</span>
              </label>
              <input
                type="text"
                className="field-input"
                placeholder="+998 90 123 45 67"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>
          </div>

          {/* Summa, Valyuta va Hamyon */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr", gap: 10 }}>
            <div className="field-group">
              <label className="field-label">
                <DollarSign size={14} />
                <span>Qarz summasi *</span>
              </label>
              <input
                type="number"
                step="any"
                min="0"
                className="field-input mono"
                placeholder="Masalan: 500000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label">Valyuta</label>
              <select
                className="field-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="UZS">UZS (so'm)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>

            <div className="field-group">
              <label className="field-label">
                <Wallet size={14} />
                <span>Hamyon</span>
              </label>
              <select
                className="field-select"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
              >
                {Object.entries(WALLET_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Berilgan/Olingan sana va Qaytarish muddati */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field-group">
              <label className="field-label">
                <Calendar size={14} />
                <span>Qarz sanasi</span>
              </label>
              <input
                type="datetime-local"
                className="field-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="field-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="field-label">
                  <Calendar size={14} />
                  <span>Qaytarish muddati</span>
                </label>
                <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={isDueDateUnknown}
                    onChange={(e) => setIsDueDateUnknown(e.target.checked)}
                  />
                  <span>Muddatsiz</span>
                </label>
              </div>
              <input
                type="date"
                className="field-input"
                disabled={isDueDateUnknown}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ opacity: isDueDateUnknown ? 0.4 : 1 }}
              />
            </div>
          </div>

          {/* Joylashuv va Sababi */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field-group">
              <label className="field-label">
                <MapPin size={14} />
                <span>Joylashuv / Manzil</span>
              </label>
              <input
                type="text"
                className="field-input"
                placeholder="Chorsu, ofis yoki manzil..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label">
                <HelpCircle size={14} />
                <span>Qarz maqsadi / sababi</span>
              </label>
              <input
                type="text"
                className="field-input"
                placeholder="Savdo uchun, dori-darmon..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          {/* O'zim uchun shaxsiy eslatma */}
          <div className="field-group">
            <label className="field-label">
              <FileText size={14} />
              <span>O'zim uchun shaxsiy eslatma (Izoh)</span>
            </label>
            <input
              type="text"
              className="field-input"
              placeholder="Muhim eslatmalar, guvohlar yoki shartlar..."
              value={personalNote}
              onChange={(e) => setPersonalNote(e.target.value)}
            />
          </div>

          <div className="modal-footer" style={{ marginTop: 10, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Bekor qilish
            </button>
            <button type="submit" className="btn btn--primary">
              <CheckCircle2 size={16} />
              <span>Saqlash</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
