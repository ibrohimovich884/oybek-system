import React, { useState, useEffect, useMemo, useRef } from "react";
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
  AlertTriangle,
  ShieldCheck,
  Send,
  Link2,
  Unlink,
} from "lucide-react";
import { useExpenses } from "../../context/ExpensesContext.jsx";
import {
  DEBT_TYPES,
  DEBT_TYPE_LABELS,
  REPAYMENT_PROBABILITY,
} from "../../constants/debts.js";
import {
  CATEGORY_LABELS,
  getTrustLevelInfo,
} from "../../constants/people.js";
import { readLocalPeople, fetchPeople } from "../../api/people.js";
import {
  toLocalDatetimeInput,
  toLocalDateInput,
  formatDateWithWeekday,
  cleanSocialHandle,
} from "../../utils/format.js";

function InstagramIcon({ size = 14, color = "currentColor" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export default function EditDebtModal({ isOpen, onClose, debt, onUpdateDebt }) {
  const { getLinkedDebtTransactions } = useExpenses();
  const linkedTxs = debt && getLinkedDebtTransactions ? getLinkedDebtTransactions(debt) : [];
  const hasLinkedTxs = linkedTxs.length > 0 || Boolean(debt?.affectBalance);

  const [peopleList, setPeopleList] = useState(() => readLocalPeople());
  const [personId, setPersonId] = useState(debt?.personId || null);
  const [type, setType] = useState(debt?.type || DEBT_TYPES.GIVEN);
  const [personName, setPersonName] = useState(debt?.personName || "");
  const [contact, setContact] = useState(debt?.contact || "");
  const [instagram, setInstagram] = useState(debt?.instagram || "");
  const [telegram, setTelegram] = useState(debt?.telegram || "");
  const [amount, setAmount] = useState(debt?.amount || "");
  const [currency, setCurrency] = useState(debt?.currency || "UZS");
  const [wallet, setWallet] = useState(debt?.wallet || "hamyon");
  const [date, setDate] = useState(() =>
    debt?.date ? toLocalDatetimeInput(debt.date) : toLocalDatetimeInput(new Date())
  );
  const [location, setLocation] = useState(debt?.location || "");
  const [reason, setReason] = useState(debt?.reason || "");
  const [isDueDateUnknown, setIsDueDateUnknown] = useState(
    debt?.isDueDateUnknown !== undefined ? debt.isDueDateUnknown : !debt?.dueDate
  );
  const [dueDate, setDueDate] = useState(() =>
    debt?.dueDate ? toLocalDateInput(debt.dueDate) : toLocalDateInput(new Date())
  );
  const [repaymentProbability, setRepaymentProbability] = useState(
    debt?.repaymentProbability || REPAYMENT_PROBABILITY.HIGH
  );
  const [personalNote, setPersonalNote] = useState(debt?.personalNote || "");
  const [syncLinkedTransaction, setSyncLinkedTransaction] = useState(hasLinkedTxs);
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setPeopleList(readLocalPeople());
    fetchPeople()
      .then((list) => {
        if (Array.isArray(list)) setPeopleList(list);
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (debt) {
      setPersonId(debt.personId || null);
      setType(debt.type || DEBT_TYPES.GIVEN);
      setPersonName(debt.personName || "");
      setContact(debt.contact || "");
      setInstagram(cleanSocialHandle(debt.instagram || ""));
      setTelegram(cleanSocialHandle(debt.telegram || ""));
      setAmount(debt.amount || "");
      setCurrency(debt.currency || "UZS");
      setWallet(debt.wallet || "hamyon");
      setDate(debt.date ? toLocalDatetimeInput(debt.date) : toLocalDatetimeInput(new Date()));
      setLocation(debt.location || "");
      setReason(debt.reason || "");
      setIsDueDateUnknown(
        debt.isDueDateUnknown !== undefined ? debt.isDueDateUnknown : !debt.dueDate
      );
      setDueDate(
        debt.dueDate ? toLocalDateInput(debt.dueDate) : toLocalDateInput(new Date())
      );
      setRepaymentProbability(debt.repaymentProbability || REPAYMENT_PROBABILITY.HIGH);
      setPersonalNote(debt.personalNote || "");
      setSyncLinkedTransaction(Boolean(debt.affectBalance) || linkedTxs.length > 0);
      setError("");
      setShowSuggestions(false);
    }
  }, [debt]);

  useEffect(() => {
    if (!showSuggestions) return;
    const handleClickOutside = (e) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSuggestions]);

  const selectedPersonObj = useMemo(() => {
    if (!personId) return null;
    return peopleList.find((p) => p.id === personId) || debt?.linkedPerson || null;
  }, [personId, peopleList, debt]);

  const suggestedPeople = useMemo(() => {
    const q = personName.trim().toLowerCase();
    const qClean = q.replace(/^@/, "");
    if (!q) {
      return peopleList.slice(0, 6);
    }
    return peopleList
      .filter((p) => {
        const nick = (p.nickname || "").toLowerCase();
        const full = (p.fullName || "").toLowerCase();
        const ph = (p.phone || "").toLowerCase();
        const tg = cleanSocialHandle(p.telegram || "").toLowerCase();
        const ig = cleanSocialHandle(p.instagram || "").toLowerCase();
        const other = (p.otherContacts || "").toLowerCase();
        return (
          nick.includes(q) ||
          full.includes(q) ||
          ph.includes(q) ||
          (qClean && tg.includes(qClean)) ||
          (qClean && ig.includes(qClean)) ||
          other.includes(q)
        );
      })
      .slice(0, 8);
  }, [peopleList, personName]);

  if (!isOpen || !debt) return null;

  const handleSelectSuggestedPerson = (person) => {
    const trustInfo = getTrustLevelInfo(person.trustLevel);
    const cleanIg = cleanSocialHandle(person.instagram || "");
    const cleanTg = cleanSocialHandle(person.telegram || "");

    setPersonId(person.id);
    setPersonName(person.nickname || person.fullName || "");
    setContact(
      person.phone ||
        (cleanTg ? `@${cleanTg}` : "") ||
        (cleanIg ? `@${cleanIg}` : "") ||
        ""
    );
    setInstagram(cleanIg);
    setTelegram(cleanTg);
    if (!location && (person.profile?.area || person.metPlace)) {
      setLocation(person.profile?.area || person.metPlace || "");
    }
    setRepaymentProbability(trustInfo.suggestedProbability || REPAYMENT_PROBABILITY.MEDIUM);
    setShowSuggestions(false);
  };

  const handlePersonNameChange = (val) => {
    setPersonName(val);
    setShowSuggestions(true);
    if (selectedPersonObj) {
      const norm = val.trim().toLowerCase();
      const matchNick = (selectedPersonObj.nickname || "").trim().toLowerCase();
      const matchFull = (selectedPersonObj.fullName || "").trim().toLowerCase();
      if (norm !== matchNick && norm !== matchFull) {
        setPersonId(null);
      }
    }
  };

  // Tezkor muddat qo'shish funksiyasi
  const handleAddDaysToDueDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDueDate(toLocalDateInput(d));
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

    onUpdateDebt(
      debt.id,
      {
        personId,
        type,
        personName: personName.trim(),
        contact: contact.trim(),
        instagram: cleanSocialHandle(instagram),
        telegram: cleanSocialHandle(telegram),
        amount: numAmount,
        currency,
        wallet,
        date,
        location: location.trim(),
        reason: reason.trim(),
        isDueDateUnknown,
        dueDate: isDueDateUnknown ? null : dueDate,
        repaymentProbability,
        personalNote: personalNote.trim(),
      },
      { syncLinkedTransaction }
    );

    onClose();
  };

  const labels = DEBT_TYPE_LABELS[type];
  const linkedTrustInfo = selectedPersonObj ? getTrustLevelInfo(selectedPersonObj.trustLevel) : null;

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

          {/* 1. Qarz turi tanlagich */}
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

          {/* 2. Qarzdor / Qarz beruvchi ismi va Telefon */}
          <div className="form-row form-row--wide-left">
            <div className="form-group" ref={autocompleteRef} style={{ position: "relative" }}>
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
                  onFocus={() => {
                    if (peopleList.length > 0) setShowSuggestions(true);
                  }}
                  onChange={(e) => handlePersonNameChange(e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>

              {showSuggestions && suggestedPeople.length > 0 && (
                <div className="debt-person-autocomplete" role="listbox">
                  <div className="debt-person-autocomplete__header">
                    <span>Odamlar roʻyxatidan tanlash:</span>
                  </div>
                  {suggestedPeople.map((p) => {
                    const tInfo = getTrustLevelInfo(p.trustLevel);
                    const ig = cleanSocialHandle(p.instagram || "");
                    const tg = cleanSocialHandle(p.telegram || "");
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={`debt-person-suggestion-item ${personId === p.id ? "is-selected" : ""}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectSuggestedPerson(p);
                        }}
                      >
                        <div className="debt-person-suggestion-avatar">
                          {(p.nickname || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="debt-person-suggestion-body">
                          <div className="debt-person-suggestion-top">
                            <strong>{p.nickname}</strong>
                            {p.fullName && (
                              <span className="debt-person-suggestion-full">({p.fullName})</span>
                            )}
                            <span
                              className="debt-trust-pill"
                              style={{
                                color: tInfo.color,
                                background: tInfo.bg,
                                borderColor: tInfo.border,
                              }}
                            >
                              {tInfo.shortLabel} ishonch
                            </span>
                          </div>
                          <div className="debt-person-suggestion-meta">
                            <span>{CATEGORY_LABELS[p.category] || p.category}</span>
                            {p.phone && <span>• 📞 {p.phone}</span>}
                            {ig && <span>• IG: @{ig}</span>}
                            {tg && <span>• TG: @{tg}</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="field-label">Telefon raqami</label>
              <div className="input-with-icon">
                <Phone size={16} className="input-icon" />
                <input
                  type="text"
                  className="field-input"
                  placeholder="+998 90..."
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </div>
            </div>
          </div>

          {selectedPersonObj && (
            <div className="debt-linked-person-banner">
              <div className="debt-linked-person-banner__left">
                <Link2 size={14} color="var(--accent)" />
                <span>
                  Odamlar bilan bogʻlangan: <strong>{selectedPersonObj.nickname}</strong>
                  {selectedPersonObj.fullName ? ` (${selectedPersonObj.fullName})` : ""}
                </span>
                {linkedTrustInfo && (
                  <span
                    className="debt-trust-pill"
                    style={{
                      color: linkedTrustInfo.color,
                      background: linkedTrustInfo.bg,
                      borderColor: linkedTrustInfo.border,
                    }}
                  >
                    {linkedTrustInfo.label}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="debt-linked-person-unlink"
                onClick={() => setPersonId(null)}
                title="Bogʻlanishni uzish"
              >
                <Unlink size={12} />
                <span>Uzish</span>
              </button>
            </div>
          )}

          {/* Instagram & Telegram */}
          <div className="form-row form-row--2col">
            <div className="form-group">
              <label className="field-label">Instagram (@username)</label>
              <div className="input-with-icon">
                <span className="input-icon" style={{ display: "inline-flex", color: "#e879f9" }}>
                  <InstagramIcon size={15} />
                </span>
                <input
                  type="text"
                  className="field-input"
                  placeholder="instagram_nomi"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="field-label">Telegram (@username)</label>
              <div className="input-with-icon">
                <Send size={15} className="input-icon" style={{ color: "#38bdf8" }} />
                <input
                  type="text"
                  className="field-input"
                  placeholder="telegram_nomi"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
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
                  else if (wallet === "dollar") setWallet("hamyon");
                }}
              >
                <option value="UZS">So'm (UZS)</option>
                <option value="USD">AQSH Dollari ($)</option>
              </select>
            </div>
          </div>

          {/* Tezkor summa chiplari */}
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

          {/* 4. Hamyon manbasi */}
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label className="field-label" style={{ margin: 0 }}>
                  <Calendar size={14} style={{ marginRight: 4, display: "inline" }} />
                  <span>Qarz sanasi</span>
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

              {!isDueDateUnknown && (
                <div style={{ marginTop: 5 }}>
                  {dueDate && (
                    <div style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 600, marginBottom: 5 }}>
                      🗓 {formatDateWithWeekday(dueDate)}
                    </div>
                  )}
                  <div className="quick-date-chips" style={{ display: "flex", gap: 6 }}>
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
              )}
            </div>
          </div>

          {/* 6. Joylashuv va Sababi */}
          <div className="form-row form-row--2col">
            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label className="field-label" style={{ margin: 0 }}>
                  <MapPin size={14} style={{ marginRight: 4, display: "inline" }} />
                  <span>Joylashuv / Manzil</span>
                </label>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    type="button"
                    className={`quick-chip-btn ${location === "Gulbahor" ? "is-active" : ""}`}
                    onClick={() => setLocation(location === "Gulbahor" ? "" : "Gulbahor")}
                    title="Gulbahor deb yozish"
                  >
                    Gulbahor
                  </button>
                  <button
                    type="button"
                    className={`quick-chip-btn ${location === "40-maktab" ? "is-active" : ""}`}
                    onClick={() => setLocation(location === "40-maktab" ? "" : "40-maktab")}
                    title="40-maktab deb yozish"
                  >
                    40-maktab
                  </button>
                </div>
              </div>
              <input
                type="text"
                className="field-input"
                placeholder="Masalan: Gulbahor, 40-maktab..."
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

          {/* 7. Qaytarish ehtimoli darajasi (3 ta variant) */}
          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label className="field-label" style={{ margin: 0 }}>
                <ShieldCheck size={14} style={{ marginRight: 4, display: "inline" }} />
                <span>Qaytarish ehtimoli darajasi</span>
              </label>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                {type === DEBT_TYPES.GIVEN ? "Qarz qaytish ishonchliligi" : "Oʻz vaqtida qaytarish imkoni"}
              </span>
            </div>

            <div className="debt-prob-selector-grid">
              {[
                {
                  key: REPAYMENT_PROBABILITY.HIGH,
                  label: "Yuqori",
                  sublabel: "90-100%",
                  hint: "Ishonchli, vaqtida qaytadi",
                  icon: ShieldCheck,
                  color: "#22c55e",
                  activeClass: "is-high",
                },
                {
                  key: REPAYMENT_PROBABILITY.MEDIUM,
                  label: "Oʻrtacha",
                  sublabel: "50-80%",
                  hint: "Kechikishi mumkin",
                  icon: Clock,
                  color: "#f59e0b",
                  activeClass: "is-medium",
                },
                {
                  key: REPAYMENT_PROBABILITY.LOW,
                  label: "Past",
                  sublabel: "0-40%",
                  hint: "Qaytishi qiyin / xavf bor",
                  icon: AlertTriangle,
                  color: "#ef4444",
                  activeClass: "is-low",
                },
              ].map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = repaymentProbability === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    className={`debt-prob-card-btn ${isSelected ? `is-selected ${opt.activeClass}` : ""}`}
                    onClick={() => setRepaymentProbability(opt.key)}
                  >
                    <div className="debt-prob-card-top">
                      <div className="debt-prob-card-icon" style={{ color: opt.color }}>
                        <IconComponent size={16} />
                      </div>
                      <span className="debt-prob-card-tag" style={{ color: opt.color }}>
                        {opt.sublabel}
                      </span>
                    </div>
                    <div className="debt-prob-card-name" style={{ color: isSelected ? opt.color : "inherit" }}>
                      {opt.label}
                    </div>
                    <div className="debt-prob-card-desc">{opt.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 8. Shaxsiy eslatma / izoh */}
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

          {/* 9. Bog'liq hamyon balansi va tranzaksiyasini yangilash ogohlantirishi */}
          {(hasLinkedTxs || debt.affectBalance) && (
            <div
              style={{
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                borderRadius: "var(--radius-md)",
                padding: "12px 14px",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: "0.82rem", lineHeight: 1.4, flex: 1 }}>
                  <strong style={{ color: "#f59e0b", display: "block" }}>
                    Hamyon balansi bilan bogʻlangan qarz
                  </strong>
                  <span style={{ color: "var(--text-secondary)" }}>
                    Ushbu qarz yaratilganda yoki toʻlanganda hisobingiz balansiga taʼsir qilgan. Qarz summasi yoki hisobi oʻzgarganda, hamyon balansini ham avtomatik qayta hisoblash tavsiya etiladi.
                  </span>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 8,
                      cursor: "pointer",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={syncLinkedTransaction}
                      onChange={(e) => setSyncLinkedTransaction(e.target.checked)}
                      style={{ accentColor: "var(--accent)", width: 16, height: 16 }}
                    />
                    <span>Bogʻliq hamyon tranzaksiyasi va balansini ham mos ravishda yangilash</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Pastki amallar tugmalari */}
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
