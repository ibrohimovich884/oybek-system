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
} from "lucide-react";
import { WALLET_CONFIG } from "../../constants/money.js";
import { DEBT_TYPES, DEBT_TYPE_LABELS } from "../../constants/debts.js";

export default function AddDebtModal({ isOpen, onClose, onAddDebt }) {
  if (!isOpen) return null;

  const [type, setType] = useState(DEBT_TYPES.GIVEN); // "given" | "taken"
  const [personName, setPersonName] = useState("");
  const [contact, setContact] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("UZS");
  const [wallet, setWallet] = useState("naqd");
  const [affectBalance, setAffectBalance] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [location, setLocation] = useState("");
  const [reason, setReason] = useState("");
  const [isDueDateUnknown, setIsDueDateUnknown] = useState(true);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [personalNote, setPersonalNote] = useState("");
  const [error, setError] = useState("");

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
        className="modal-content modal-content--wide"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 540 }}
      >
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: type === DEBT_TYPES.GIVEN ? "rgba(56, 189, 248, 0.15)" : "rgba(245, 158, 11, 0.15)",
                color: type === DEBT_TYPES.GIVEN ? "#38bdf8" : "#f59e0b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {type === DEBT_TYPES.GIVEN ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
            </div>
            <div>
              <h3 className="modal-title">Yangi qarz qaydnomasi</h3>
              <p className="modal-subtitle">
                {type === DEBT_TYPES.GIVEN
                  ? "Men birovga qarz berdim (Kutilayotgan pul)"
                  : "Men birovdan qarz oldim (Qaytarishim kerak)"}
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error-banner">{error}</div>}

          {/* Qarz yo'nalishi (Switcher) */}
          <div className="form-group">
            <label className="field-label">Qarz turi</label>
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
                <span>Men qarz berdim</span>
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
                <span>Men qarz oldim</span>
              </button>
            </div>
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
                  placeholder={type === DEBT_TYPES.GIVEN ? "Masalan: Alisher Valiyev" : "Masalan: Otabek aka"}
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="field-label">Telefon / Telegram</label>
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

          {/* Qaysi hisobdan / Qaysi hisobga & Balansga ta'sir */}
          <div className="form-row form-row--2col">
            <div className="form-group">
              <label className="field-label">{labels.walletLabel}</label>
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
              <label className="field-label">Olingan / berilgan vaqti</label>
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

            <div className="form-group">
              <label className="field-label">Olingan joy (Manzil)</label>
              <div className="input-with-icon">
                <MapPin size={16} className="input-icon" />
                <input
                  type="text"
                  className="field-input"
                  placeholder="Masalan: Chilonzor, Choyxona"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Sababi / Maqsadi */}
          <div className="form-group">
            <label className="field-label">{labels.targetReasonLabel}</label>
            <div className="input-with-icon">
              <HelpCircle size={16} className="input-icon" />
              <input
                type="text"
                className="field-input"
                placeholder={
                  type === DEBT_TYPES.GIVEN
                    ? "U nima uchun oldi? Masalan: To'y xarajatlari, tovar olishga"
                    : "Men nima maqsadda oldim? Masalan: Ta'mir uchun, texnika xaridi"
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          {/* Qachon qaytarishi (Default: Noma'lum) */}
          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label className="field-label" style={{ marginBottom: 0 }}>
                {labels.dueDateLabel}
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  color: isDueDateUnknown ? "var(--accent)" : "var(--text-muted)",
                }}
              >
                <input
                  type="checkbox"
                  checked={isDueDateUnknown}
                  onChange={(e) => setIsDueDateUnknown(e.target.checked)}
                  style={{ accentColor: "var(--accent)" }}
                />
                <span>Muddati noma'lum (default)</span>
              </label>
            </div>

            {!isDueDateUnknown ? (
              <div className="input-with-icon">
                <Calendar size={16} className="input-icon" />
                <input
                  type="date"
                  className="field-input mono"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            ) : (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface-sunken)",
                  border: "1px dashed var(--border)",
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                }}
              >
                Aniq sana belgilanmagan (qaytarish vaqti kelishilmagan)
              </div>
            )}
          </div>

          {/* O'zim uchun eslatma (Izoh) */}
          <div className="form-group">
            <label className="field-label">
              Izoh (O'zim uchun eslatma)
            </label>
            <div className="input-with-icon input-with-icon--textarea">
              <FileText size={16} className="input-icon" />
              <textarea
                className="field-input"
                rows={2}
                placeholder="O'zingiz uchun maxsus eslatma, shartlar yoki xotiralar..."
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                style={{ resize: "vertical" }}
              />
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn--subtle" onClick={onClose}>
              Bekor qilish
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              style={{
                background: type === DEBT_TYPES.GIVEN ? "#0284c7" : "#d97706",
                color: "#fff",
              }}
            >
              <CheckCircle2 size={16} />
              <span>Qarzni qayd qilish</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
