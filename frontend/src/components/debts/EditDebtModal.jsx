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
  Clock,
} from "lucide-react";
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
      setError("");
    }
  }, [debt]);

  // Tezkor muddat qo'shish funksiyasi
  const handleAddDaysToDueDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().slice(0, 10));
    setIsDueDateUnknown(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!personName.trim()) {
      setError(
        type === DEBT_TYPES.GIVEN
          ? "Iltimos, qarz olgan odam ismini kiriting"
          : "Iltimos, kimdan qarz olinganini kiriting"
      );
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
        className="modal-content modal-content--wide debt-edit-modal animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobil tortgich chiziqcha */}
        <div className="modal-mobile-handle" />

        {/* Sarlavha qatori */}
        <div className="modal-header debt-modal-header">
          <div className="debt-modal-header__info">
            <div
              className={`debt-modal-header__icon ${
                type === DEBT_TYPES.GIVEN ? "is-given" : "is-taken"
              }`}
            >
              {type === DEBT_TYPES.GIVEN ? (
                <ArrowUpRight size={20} />
              ) : (
                <ArrowDownLeft size={20} />
              )}
            </div>
            <div>
              <h3 className="modal-title">Qarzni tahrirlash</h3>
              <p className="modal-subtitle">
                {debt.personName ? `${debt.personName} qarz shartlari` : "Ma'lumotlarni yangilash"}
              </p>
            </div>
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
          {error && (
            <div className="feedback-alert feedback-alert--error" style={{ marginBottom: 10 }}>
              <span>{error}</span>
            </div>
          )}

          {/* 1. Qarz turi tanlagich (Katta qulay tugmalar) */}
          <div className="debt-switcher">
            <button
              type="button"
              className={`debt-switcher__btn ${
                type === DEBT_TYPES.GIVEN ? "is-given" : ""
              }`}
              onClick={() => setType(DEBT_TYPES.GIVEN)}
            >
              <ArrowUpRight size={16} />
              <span>Men qarz berdim (+)</span>
            </button>
            <button
              type="button"
              className={`debt-switcher__btn ${
                type === DEBT_TYPES.TAKEN ? "is-taken" : ""
              }`}
              onClick={() => setType(DEBT_TYPES.TAKEN)}
            >
              <ArrowDownLeft size={16} />
              <span>Men qarz oldim (-)</span>
            </button>
          </div>

          {/* 2. Qarzdor / Qarz beruvchi ismi va Aloqa */}
          <div className="form-row form-row--wide-left">
            <div className="form-group">
              <label className="field-label">
                {labels.personLabel} <span style={{ color: "var(--expense)" }}>*</span>
              </label>
              <div className="input-with-icon">
                <User size={16} className="input-icon" />
                <input
                  type="text"
                  className="field-input"
                  placeholder={
                    type === DEBT_TYPES.GIVEN
                      ? "Masalan: Rustam aka"
                      : "Masalan: Otabek aka"
                  }
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="field-label">Telefon / Aloqa</label>
              <div className="input-with-icon">
                <Phone size={16} className="input-icon" />
                <input
                  type="text"
                  className="field-input"
                  placeholder="+998 90... yoki @telegram"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 3. Summa & Valyuta */}
          <div className="form-row form-row--wide-left">
            <div className="form-group">
              <label className="field-label">
                {type === DEBT_TYPES.GIVEN ? "Berilgan summa" : "Olingan summa"}{" "}
                <span style={{ color: "var(--expense)" }}>*</span>
              </label>
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
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="field-label">Valyuta</label>
              <select
                className="field-input"
                value={currency}
                onChange={(e) => {
                  const curr = e.target.value;
                  setCurrency(curr);
                  if (curr === "USD") setWallet("dollar");
                  else if (wallet === "dollar") setWallet("naqd");
                }}
              >
                <option value="UZS">So'm (UZS)</option>
                <option value="USD">AQSH Dollari ($)</option>
              </select>
            </div>
          </div>

          {/* Tezkor summa chiplari (Telefon uchun juda qulay) */}
          <div className="quick-amount-chips-row">
            {(currency === "USD"
              ? [50, 100, 200, 500, 1000]
              : [100000, 300000, 500000, 1000000, 5000000]
            ).map((val) => (
              <button
                key={val}
                type="button"
                className={`quick-chip-btn ${Number(amount) === val ? "is-active" : ""}`}
                onClick={() => setAmount(String(val))}
              >
                {currency === "USD"
                  ? `$${val}`
                  : val >= 1000000
                  ? `${val / 1000000} mln`
                  : `${val / 1000} ming`}
              </button>
            ))}
          </div>

          {/* 4. Hamyon manbasi (Faqat kundalik oddiy hisoblar) */}
          <div className="form-group">
            <label className="field-label">
              <Wallet size={14} style={{ marginRight: 4, display: "inline" }} />
              <span>{labels.walletLabel}</span>
            </label>
            <select
              className="field-input"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
            >
              {currency === "USD" ? (
                <option value="dollar">AQSH Dollari ($) — Oddiy</option>
              ) : (
                <>
                  <option value="hamyon">Hamyon (Kundalik)</option>
                  <option value="naqd">Naqd pul</option>
                  <option value="karta">Plastik karta</option>
                </>
              )}
            </select>
          </div>

          {/* 5. Qarz sanasi va Qaytarish muddati */}
          <div className="form-row form-row--2col">
            <div className="form-group">
              <label className="field-label">
                <Calendar size={14} style={{ marginRight: 4, display: "inline" }} />
                <span>Qarz sanasi</span>
              </label>
              <input
                type="datetime-local"
                className="field-input mono"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label className="field-label" style={{ margin: 0 }}>
                  <Clock size={14} style={{ marginRight: 4, display: "inline" }} />
                  <span>Qaytarish muddati</span>
                </label>
                <label className="muddatsiz-toggle-label">
                  <input
                    type="checkbox"
                    checked={isDueDateUnknown}
                    onChange={(e) => setIsDueDateUnknown(e.target.checked)}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <span>Muddatsiz</span>
                </label>
              </div>

              <input
                type="date"
                className="field-input mono"
                disabled={isDueDateUnknown}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ opacity: isDueDateUnknown ? 0.35 : 1 }}
              />

              {/* Tezkor sana tugmalari */}
              {!isDueDateUnknown && (
                <div className="quick-date-chips" style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button
                    type="button"
                    className="quick-chip-btn"
                    onClick={() => handleAddDaysToDueDate(7)}
                  >
                    +1 hafta
                  </button>
                  <button
                    type="button"
                    className="quick-chip-btn"
                    onClick={() => handleAddDaysToDueDate(30)}
                  >
                    +1 oy
                  </button>
                  <button
                    type="button"
                    className="quick-chip-btn"
                    onClick={() => handleAddDaysToDueDate(90)}
                  >
                    +3 oy
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 6. Joylashuv va Sababi */}
          <div className="form-row form-row--2col">
            <div className="form-group">
              <label className="field-label">
                <MapPin size={14} style={{ marginRight: 4, display: "inline" }} />
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

            <div className="form-group">
              <label className="field-label">
                <HelpCircle size={14} style={{ marginRight: 4, display: "inline" }} />
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

          {/* 7. Shaxsiy eslatma / izoh */}
          <div className="form-group">
            <label className="field-label">
              <FileText size={14} style={{ marginRight: 4, display: "inline" }} />
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

          {/* Pastki amallar tugmalari (Telefonda katta va qulay) */}
          <div className="modal-actions debt-modal-actions">
            <div className="modal-actions-right debt-modal-actions-right">
              <button
                type="button"
                className="btn btn--ghost debt-action-cancel"
                onClick={onClose}
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                className="btn btn--primary debt-action-save"
              >
                <CheckCircle2 size={16} />
                <span>Oʻzgarishlarni saqlash</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
