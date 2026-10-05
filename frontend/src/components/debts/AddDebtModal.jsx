import { useState } from "react";
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
import { WALLET_CONFIG } from "../../constants/money.js";
import { DEBT_TYPES, DEBT_TYPE_LABELS } from "../../constants/debts.js";
import {
  toLocalDatetimeInput,
  toLocalDateInput,
  formatDateWithWeekday,
} from "../../utils/format.js";

export default function AddDebtModal({ isOpen, onClose, onAddDebt }) {
  if (!isOpen) return null;

  const [type, setType] = useState(DEBT_TYPES.GIVEN); // "given" | "taken"
  const [personName, setPersonName] = useState("");
  const [contact, setContact] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("UZS");
  const [wallet, setWallet] = useState("naqd");
  const [affectBalance, setAffectBalance] = useState(true);
  const [date, setDate] = useState(() => toLocalDatetimeInput(new Date()));
  const [location, setLocation] = useState("");
  const [reason, setReason] = useState("");
  const [isDueDateUnknown, setIsDueDateUnknown] = useState(true);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return toLocalDateInput(d);
  });
  const [personalNote, setPersonalNote] = useState("");
  const [error, setError] = useState("");

  const handleAddDaysToDueDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDueDate(toLocalDateInput(d));
    setIsDueDateUnknown(false);
  };

  const labels = DEBT_TYPE_LABELS[type];

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

    onAddDebt({
      type,
      personName,
      contact,
      amount: numAmount,
      currency,
      wallet,
      affectBalance,
      date,
      location,
      reason,
      isDueDateUnknown,
      dueDate: isDueDateUnknown ? null : dueDate,
      personalNote,
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-content--wide debt-add-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-mobile-handle" />
        <div className="modal-header debt-modal-header">
          <div className="debt-modal-header__info">
            <div
              className={`debt-modal-header__icon ${
                type === DEBT_TYPES.GIVEN ? "is-given" : "is-taken"
              }`}
            >
              {type === DEBT_TYPES.GIVEN ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
            </div>
            <div>
              <h3 className="modal-title">Yangi qarz yozish</h3>
              <p className="modal-subtitle">
                {type === DEBT_TYPES.GIVEN
                  ? "Men birovga qarz berdim (Kutilmoqda)"
                  : "Men birovdan qarz oldim (Majburiyat)"}
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
          {error && <div className="feedback-alert feedback-alert--error">{error}</div>}

          {/* Qarz yo'nalishi (Switcher) */}
          <div className="debt-switcher">
            <button
              type="button"
              className={`debt-switcher__btn ${type === DEBT_TYPES.GIVEN ? "is-given" : ""}`}
              onClick={() => {
                setType(DEBT_TYPES.GIVEN);
                if (currency === "USD") setWallet("dollar");
              }}
            >
              <ArrowUpRight size={16} />
              <span>Men qarz berdim (+)</span>
            </button>

            <button
              type="button"
              className={`debt-switcher__btn ${type === DEBT_TYPES.TAKEN ? "is-taken" : ""}`}
              onClick={() => {
                setType(DEBT_TYPES.TAKEN);
                if (currency === "USD") setWallet("dollar");
              }}
            >
              <ArrowDownLeft size={16} />
              <span>Men qarz oldim (-)</span>
            </button>
          </div>

          {/* Shaxs ismi va Aloqa */}
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
                  placeholder={type === DEBT_TYPES.GIVEN ? "Masalan: Rustam aka" : "Masalan: Otabek aka"}
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  autoFocus
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
                  placeholder="+998 90... yoki @username"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Summa & Valyuta */}
          <div className="form-row form-row--wide-left">
            <div className="form-group">
              <label className="field-label">
                {type === DEBT_TYPES.GIVEN ? "Berilgan summa" : "Olingan summa"} <span style={{ color: "var(--expense)" }}>*</span>
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

          {/* Tezkor summalar */}
          <div className="quick-amount-chips-row">
            {(currency === "USD"
              ? [
                  { val: 5, label: "$5" },
                  { val: 10, label: "$10" },
                  { val: 15, label: "$15" },
                  { val: 20, label: "$20" },
                  { val: 50, label: "$50" },
                  { val: 100, label: "$100" },
                ]
              : [
                  { val: 5000, label: "5 000" },
                  { val: 10000, label: "10 000" },
                  { val: 15000, label: "15 000" },
                  { val: 20000, label: "20 000" },
                  { val: 50000, label: "50 000" },
                  { val: 100000, label: "100 000" },
                ]
            ).map((item) => (
              <button
                key={item.val}
                type="button"
                className={`quick-chip-btn ${Number(amount) === item.val ? "is-active" : ""}`}
                onClick={() => setAmount(String(item.val))}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Qaysi hisobdan / Qaysi hisobga & Balansga ta'sir */}
          <div className="form-row form-row--2col">
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
                <span>{labels.affectBalanceLabel}</span>
              </label>
            </div>
          </div>

          {/* Vaqt & Joy */}
          <div className="form-row form-row--2col">
            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label className="field-label" style={{ margin: 0 }}>
                  <Calendar size={14} style={{ marginRight: 4, display: "inline" }} />
                  <span>Sana va vaqt</span>
                </label>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    type="button"
                    className="quick-chip-btn"
                    onClick={() => setDate(toLocalDatetimeInput(new Date()))}
                    title="Hozirgi vaqt"
                  >
                    Hozir
                  </button>
                  <button
                    type="button"
                    className="quick-chip-btn"
                    onClick={() => {
                      const y = new Date();
                      y.setDate(y.getDate() - 1);
                      setDate(toLocalDatetimeInput(y));
                    }}
                    title="Kecha shu vaqt"
                  >
                    Kecha
                  </button>
                </div>
              </div>
              <input
                type="datetime-local"
                className="field-input mono"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              {date && (
                <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 3, display: "block" }}>
                  🗓 {formatDateWithWeekday(date)}
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="field-label">
                <MapPin size={14} style={{ marginRight: 4, display: "inline" }} />
                <span>Joylashuv (Manzil)</span>
              </label>
              <input
                type="text"
                className="field-input"
                placeholder="Chorsu, ofis yoki choyxona..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          {/* Sababi / Maqsadi */}
          <div className="form-group">
            <label className="field-label">
              <HelpCircle size={14} style={{ marginRight: 4, display: "inline" }} />
              <span>{labels.targetReasonLabel}</span>
            </label>
            <input
              type="text"
              className="field-input"
              placeholder={
                type === DEBT_TYPES.GIVEN
                  ? "U nima uchun oldi? Masalan: To'y xarajatlari, savdo"
                  : "Men nima maqsadda oldim? Masalan: Ta'mir, xarid"
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* Qachon qaytarishi (Default: Noma'lum) */}
          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label className="field-label" style={{ marginBottom: 0 }}>
                {labels.dueDateLabel}
              </label>
              <label className="muddatsiz-toggle-label">
                <input
                  type="checkbox"
                  checked={isDueDateUnknown}
                  onChange={(e) => setIsDueDateUnknown(e.target.checked)}
                  style={{ accentColor: "var(--accent)" }}
                />
                <span>Muddati noma'lum</span>
              </label>
            </div>

            {!isDueDateUnknown ? (
              <>
                <input
                  type="date"
                  className="field-input mono"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 5, flexWrap: "wrap", gap: 6 }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 600 }}>
                    🗓 {formatDateWithWeekday(dueDate)}
                  </span>
                  <div style={{ display: "flex", gap: 5 }}>
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
                </div>
              </>
            ) : (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface-sunken)",
                  border: "1px dashed var(--border)",
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                }}
              >
                Aniq sana belgilanmagan (Muddatsiz)
              </div>
            )}
          </div>

          {/* O'zim uchun eslatma (Izoh) */}
          <div className="form-group">
            <label className="field-label">
              <FileText size={14} style={{ marginRight: 4, display: "inline" }} />
              <span>Izoh (O'zim uchun eslatma)</span>
            </label>
            <textarea
              className="field-input"
              rows={2}
              placeholder="O'zingiz uchun maxsus eslatma yoki shartlar..."
              value={personalNote}
              onChange={(e) => setPersonalNote(e.target.value)}
              style={{ resize: "vertical" }}
            />
          </div>

          <div className="modal-actions debt-modal-actions">
            <div className="modal-actions-right debt-modal-actions-right">
              <button type="button" className="btn btn--ghost debt-action-cancel" onClick={onClose}>
                Bekor qilish
              </button>
              <button
                type="submit"
                className="btn btn--primary debt-action-save"
              >
                <CheckCircle2 size={16} />
                <span>Qarzni saqlash</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
