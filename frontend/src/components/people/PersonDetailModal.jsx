import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Edit2,
  Trash2,
  Heart,
  MapPin,
  Compass,
  Phone,
  User,
  Sparkles,
  Smile,
  Plus,
  Clock,
  Save,
  ShieldCheck,
  HandCoins,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  HeartHandshake,
  AlertCircle,
  PlusCircle,
} from "lucide-react";

function InstagramIcon({ size = 14, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  GENDER_LABELS,
  CRUSH_STATUSES,
  CRUSH_STATUS_LABELS,
  TRUST_LEVEL_OPTIONS,
  getTrustLevelInfo,
} from "../../constants/people.js";
import {
  DEBT_TYPES,
  DEBT_STATUS_LABELS,
  getDebtDueInfo,
} from "../../constants/debts.js";
import {
  updatePerson,
  updateProfile,
  addAppearance,
  deleteAppearance,
  updateCrushStatus,
} from "../../api/people.js";
import {
  calculateAgeAndNextBirthday,
  formatDurationSince,
  cleanSocialHandle,
  formatSum,
  formatDollar,
} from "../../utils/format.js";
import { useExpenses } from "../../context/ExpensesContext.jsx";
import ConfirmModal from "../common/ConfirmModal.jsx";
import RepayDebtModal from "../debts/RepayDebtModal.jsx";
import ForgiveDebtModal from "../debts/ForgiveDebtModal.jsx";

export default function PersonDetailModal({
  person,
  onClose,
  onEdit,
  onDelete,
  onRefresh,
}) {
  const navigate = useNavigate();
  const { debts, repayDebt, forgiveDebt, settleDebt } = useExpenses();
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'debts' | 'profile' | 'appearances'
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    area: person.profile?.area || "",
    interests: person.profile?.interests || "",
    likes: person.profile?.likes || "",
    dislikes: person.profile?.dislikes || "",
    personality: person.profile?.personality || "",
    howWeTalk: person.profile?.howWeTalk || "",
    meaningToMe: person.profile?.meaningToMe || "",
    myFeelings: person.profile?.myFeelings || "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Yangi ko'rinish qo'shish formasi
  const [showAddAppearance, setShowAddAppearance] = useState(false);
  const [appForm, setAppForm] = useState({
    heightCmEst: person.latestAppearance?.heightCmEst || "",
    eyeColor: person.latestAppearance?.eyeColor || "",
    hairColor: person.latestAppearance?.hairColor || "",
    faceNotes: "",
    otherNotes: "",
    recordedAt: new Date().toISOString().slice(0, 10),
  });
  const [isSavingApp, setIsSavingApp] = useState(false);

  // Crush statusini tezkor yangilash
  const [isUpdatingCrush, setIsUpdatingCrush] = useState(false);
  const [isUpdatingTrust, setIsUpdatingTrust] = useState(false);
  const [modalError, setModalError] = useState("");
  const [deleteAppTarget, setDeleteAppTarget] = useState(null);
  const [isDeletingApp, setIsDeletingApp] = useState(false);
  const [repayTargetDebt, setRepayTargetDebt] = useState(null);
  const [forgiveTargetDebt, setForgiveTargetDebt] = useState(null);

  // Shaxs yangilanganda forma maydonlarini ham sinxronlash
  useEffect(() => {
    setProfileForm({
      area: person.profile?.area || "",
      interests: person.profile?.interests || "",
      likes: person.profile?.likes || "",
      dislikes: person.profile?.dislikes || "",
      personality: person.profile?.personality || "",
      howWeTalk: person.profile?.howWeTalk || "",
      meaningToMe: person.profile?.meaningToMe || "",
      myFeelings: person.profile?.myFeelings || "",
    });
    setAppForm((prev) => ({
      ...prev,
      heightCmEst: person.latestAppearance?.heightCmEst || "",
      eyeColor: person.latestAppearance?.eyeColor || "",
      hairColor: person.latestAppearance?.hairColor || "",
    }));
    setModalError("");
  }, [person]);

  const trustInfo = getTrustLevelInfo(person.trustLevel);

  // Ushbu shaxsga bog'langan barcha qarzlar (personId qat'iy tekshiriladi, faqat bog'lanmaganlarda ism fallback)
  const personDebts = useMemo(() => {
    const nick = (person.nickname || "").trim().toLowerCase();
    const full = (person.fullName || "").trim().toLowerCase();
    return (debts || [])
      .filter((d) => {
        const dPersonId = d.personId || d.linkedPerson?.id || null;
        if (dPersonId) return dPersonId === person.id;
        const dName = (d.personName || "").trim().toLowerCase();
        return Boolean(dName && (dName === nick || (full && dName === full)));
      })
      .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  }, [debts, person.id, person.nickname, person.fullName]);

  const debtTotals = useMemo(() => {
    let givenUzs = 0;
    let givenUsd = 0;
    let takenUzs = 0;
    let takenUsd = 0;
    let activeCount = 0;
    personDebts.forEach((d) => {
      if (d.status === "settled" || d.status === "forgiven") return;
      const paid = (d.payments || []).reduce((acc, p) => acc + Number(p.amount || 0), 0);
      const rem = Math.max(0, Number(d.amount || 0) - paid);
      if (rem > 0) {
        activeCount += 1;
        const isUsd = d.currency === "USD";
        if (d.type === DEBT_TYPES.TAKEN) {
          if (isUsd) takenUsd += rem;
          else takenUzs += rem;
        } else {
          if (isUsd) givenUsd += rem;
          else givenUzs += rem;
        }
      }
    });
    return { givenUzs, givenUsd, takenUzs, takenUsd, activeCount };
  }, [personDebts]);

  const handleQuickTrustChange = async (newTrustLevel) => {
    setIsUpdatingTrust(true);
    setModalError("");
    try {
      await updatePerson(person.id, { trustLevel: newTrustLevel });
      if (onRefresh) onRefresh();
    } catch (err) {
      setModalError("Ishonish darajasini yangilashda xatolik: " + err.message);
    } finally {
      setIsUpdatingTrust(false);
    }
  };

  const handleOpenAddDebtForPerson = () => {
    onClose();
    navigate(`/debts?addForPerson=${encodeURIComponent(person.id)}`);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setModalError("");
    try {
      await updateProfile(person.id, profileForm);
      setIsEditingProfile(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      setModalError("Profilni saqlashda xatolik: " + err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddAppearanceSubmit = async (e) => {
    e.preventDefault();
    setIsSavingApp(true);
    setModalError("");
    try {
      await addAppearance(person.id, appForm);
      setShowAddAppearance(false);
      setAppForm({
        heightCmEst: appForm.heightCmEst,
        eyeColor: appForm.eyeColor,
        hairColor: appForm.hairColor,
        faceNotes: "",
        otherNotes: "",
        recordedAt: new Date().toISOString().slice(0, 10),
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      setModalError("Ko'rinish qaydini saqlashda xatolik: " + err.message);
    } finally {
      setIsSavingApp(false);
    }
  };

  const handleDeleteAppearance = (appId) => {
    setDeleteAppTarget(appId);
  };

  const handleConfirmDeleteAppearance = async () => {
    if (!deleteAppTarget) return;
    setIsDeletingApp(true);
    setModalError("");
    try {
      await deleteAppearance(person.id, deleteAppTarget);
      setDeleteAppTarget(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      setModalError("Ko'rinish qaydini o'chirishda xatolik: " + err.message);
    } finally {
      setIsDeletingApp(false);
    }
  };

  const handleCrushChange = async (newStatus) => {
    setIsUpdatingCrush(true);
    setModalError("");
    try {
      await updateCrushStatus(person.id, {
        isCrush: true,
        crushStatus: newStatus,
        crushStartedOn: person.crushStartedOn || new Date().toISOString().slice(0, 10),
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      setModalError("His-tuyg'u bosqichini yangilashda xatolik: " + err.message);
    } finally {
      setIsUpdatingCrush(false);
    }
  };

  const handleToggleCrush = async () => {
    setIsUpdatingCrush(true);
    setModalError("");
    try {
      await updateCrushStatus(person.id, {
        isCrush: !person.isCrush,
        crushStatus: !person.isCrush ? "liked" : null,
        crushStartedOn: !person.isCrush ? new Date().toISOString().slice(0, 10) : null,
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      setModalError("Yoqtirganlar holatini o'zgartirishda xatolik: " + err.message);
    } finally {
      setIsUpdatingCrush(false);
    }
  };

  return (
    <div className="people-modal-backdrop" onClick={onClose}>
      <div
        className="people-modal-box people-modal-box--wide"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal tepasi */}
        <div className="people-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div
              className={`person-avatar ${
                person.gender === "female" ? "person-avatar--female" : ""
              } ${person.isCrush ? "person-avatar--crush" : ""}`}
            >
              {(person.nickname || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <h2>{person.nickname}</h2>
              {person.fullName && (
                <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  {person.fullName}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={handleToggleCrush}
              disabled={isUpdatingCrush}
              className="btn-icon btn-icon--xs"
              style={{
                background: person.isCrush ? "rgba(244, 114, 182, 0.2)" : "rgba(255, 255, 255, 0.05)",
                border: `1px solid ${person.isCrush ? "rgba(244, 114, 182, 0.45)" : "rgba(255, 255, 255, 0.1)"}`,
                color: person.isCrush ? "#f472b6" : "var(--text-muted)",
                padding: "7px",
                borderRadius: "8px",
              }}
              title={person.isCrush ? "Yoqtirganlardan olib tashlash" : "Yoqtirganlarga qo'shish"}
            >
              <Heart size={16} fill={person.isCrush ? "#f472b6" : "transparent"} />
            </button>

            <button
              type="button"
              onClick={() => onEdit && onEdit(person)}
              className="btn-icon btn-icon--xs"
              title="Tahrirlash"
              style={{
                background: "rgba(78, 184, 150, 0.15)",
                border: "1px solid rgba(78, 184, 150, 0.3)",
                color: "#6ee7b7",
                padding: "7px",
                borderRadius: "8px",
              }}
            >
              <Edit2 size={15} />
            </button>

            <button
              type="button"
              onClick={() => onDelete && onDelete(person)}
              className="btn-icon btn-icon--xs"
              title="O'chirish"
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                padding: "7px",
                borderRadius: "8px",
              }}
            >
              <Trash2 size={15} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="btn-icon btn-icon--xs"
              style={{ padding: "7px", borderRadius: "8px" }}
              aria-label="Yopish"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab navigatsiyasi */}
        <div className="people-tab-bar" style={{ overflowX: "auto" }}>
          <button
            type="button"
            className={`people-tab-btn ${activeTab === "overview" ? "is-active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <User size={15} />
            <span>Asosiy karta</span>
          </button>
          <button
            type="button"
            className={`people-tab-btn ${activeTab === "debts" ? "is-active" : ""}`}
            onClick={() => setActiveTab("debts")}
          >
            <HandCoins size={15} />
            <span>Qarz daftari ({personDebts.length})</span>
          </button>
          <button
            type="button"
            className={`people-tab-btn ${activeTab === "profile" ? "is-active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <Smile size={15} />
            <span>Kengaytirilgan profil</span>
          </button>
          <button
            type="button"
            className={`people-tab-btn ${activeTab === "appearances" ? "is-active" : ""}`}
            onClick={() => setActiveTab("appearances")}
          >
            <Clock size={15} />
            <span>Ko'rinish tarixi ({person.appearances?.length || 0})</span>
          </button>
        </div>

        {/* Modal asosiy qismi */}
        <div className="people-modal-body">
          {modalError && (
            <div className="people-feedback-banner people-feedback-banner--error">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <AlertCircle size={15} />
                <span>{modalError}</span>
              </div>
              <button type="button" onClick={() => setModalError("")} className="people-feedback-close">
                <X size={13} />
              </button>
            </div>
          )}
          {/* TAB 1: ASOSIY KARTA */}
          {activeTab === "overview" && (
            <>
              {/* Crush bloki */}
              {person.isCrush && (
                <div
                  className="person-detail-section"
                  style={{
                    background: "rgba(244, 114, 182, 0.08)",
                    borderColor: "rgba(244, 114, 182, 0.3)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    <h4
                      className="person-detail-section-title"
                      style={{ color: "#f472b6" }}
                    >
                      <Heart size={15} fill="#f472b6" />
                      <span>Yoqtirganlar bo'limi</span>
                    </h4>

                    {person.crushStartedOn && (
                      <span style={{ fontSize: "0.78rem", color: "#fbcfe8", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={12} />
                        <span>Boshlangan: {person.crushStartedOn} ({formatDurationSince(person.crushStartedOn)})</span>
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      His-tuyg'u bosqichi:
                    </span>
                    <select
                      value={person.crushStatus || "liked"}
                      onChange={(e) => handleCrushChange(e.target.value)}
                      disabled={isUpdatingCrush}
                      className="people-form-select"
                      style={{ maxWidth: "240px", padding: "0.4rem 0.75rem", fontSize: "0.85rem" }}
                    >
                      {CRUSH_STATUSES.filter((c) => c.value !== "all").map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label} ({c.desc})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Status va toifalar */}
              <div className="person-detail-section">
                <h4 className="person-detail-section-title">
                  <User size={14} />
                  <span>Umumiy ma'lumotlar</span>
                </h4>

                <div className="person-detail-grid">
                  <div className="person-detail-item">
                    <span className="person-detail-label">Toifasi</span>
                    <span className="person-detail-val" style={{ color: "#6ee7b7" }}>
                      {CATEGORY_LABELS[person.category] || person.category}
                    </span>
                  </div>

                  <div className="person-detail-item">
                    <span className="person-detail-label">Ishonish darajasi</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginTop: "2px" }}>
                      <select
                        value={person.trustLevel || "medium"}
                        onChange={(e) => handleQuickTrustChange(e.target.value)}
                        disabled={isUpdatingTrust}
                        className="people-form-select"
                        style={{
                          maxWidth: "220px",
                          padding: "0.35rem 0.65rem",
                          fontSize: "0.84rem",
                          color: trustInfo.color,
                          borderColor: trustInfo.border,
                        }}
                      >
                        {TRUST_LEVEL_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.fullLabel}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="person-detail-item">
                    <span className="person-detail-label">Aloqa holati</span>
                    <span className="person-detail-val">
                      {STATUS_LABELS[person.status] || person.status}
                    </span>
                  </div>

                  <div className="person-detail-item">
                    <span className="person-detail-label">Jinsi</span>
                    <span className="person-detail-val">
                      {GENDER_LABELS[person.gender] || "Ko'rsatilmagan"}
                    </span>
                  </div>

                  <div className="person-detail-item">
                    <span className="person-detail-label">Tug'ilgan kuni</span>
                    {person.birthday ? (
                      (() => {
                        const bdayInfo = calculateAgeAndNextBirthday(person.birthday);
                        return (
                          <div>
                            <span className="person-detail-val">{bdayInfo ? bdayInfo.formattedDate : person.birthday}</span>
                            {bdayInfo && (
                              <div style={{ fontSize: "0.76rem", color: bdayInfo.daysLeft <= 7 ? "#34d399" : "var(--text-muted)", marginTop: "2px", fontWeight: 500 }}>
                                {bdayInfo.age} yoshda · {bdayInfo.daysText}
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <span className="person-detail-val">Kiritilmagan</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tanishuv ma'lumotlari */}
              <div className="person-detail-section">
                <h4 className="person-detail-section-title">
                  <Compass size={14} />
                  <span>Qachon va qayerda tanishganmiz</span>
                </h4>

                <div className="person-detail-grid">
                  <div className="person-detail-item">
                    <span className="person-detail-label">Tanishgan sana</span>
                    <span className="person-detail-val">
                      {person.metOn || "Ko'rsatilmagan"}
                    </span>
                  </div>

                  <div className="person-detail-item">
                    <span className="person-detail-label">Tanishgan joy</span>
                    <span className="person-detail-val">
                      {person.metPlace || "Ko'rsatilmagan"}
                    </span>
                  </div>

                  <div className="person-detail-item" style={{ gridColumn: "1 / -1" }}>
                    <span className="person-detail-label">Kim orqali / Qanday tanishgan</span>
                    <span className="person-detail-val">
                      {person.metVia || "Ko'rsatilmagan"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Aloqa ma'lumotlari */}
              <div className="person-detail-section">
                <h4 className="person-detail-section-title">
                  <Phone size={14} />
                  <span>Aloqa vositalari</span>
                </h4>

                <div className="person-detail-grid">
                  <div className="person-detail-item">
                    <span className="person-detail-label">Telefon</span>
                    {person.phone ? (
                      <a href={`tel:${person.phone}`} style={{ color: "#34d399", textDecoration: "none" }}>
                        {person.phone}
                      </a>
                    ) : (
                      <span className="person-detail-val">—</span>
                    )}
                  </div>

                  <div className="person-detail-item">
                    <span className="person-detail-label">Telegram</span>
                    {person.telegram ? (
                      <a
                        href={`https://t.me/${person.telegram}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#38bdf8", textDecoration: "none" }}
                      >
                        @{person.telegram}
                      </a>
                    ) : (
                      <span className="person-detail-val">—</span>
                    )}
                  </div>

                  <div className="person-detail-item">
                    <span className="person-detail-label">Instagram</span>
                    {person.instagram ? (
                      <a
                        href={`https://instagram.com/${person.instagram}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#e879f9", textDecoration: "none" }}
                      >
                        @{person.instagram}
                      </a>
                    ) : (
                      <span className="person-detail-val">—</span>
                    )}
                  </div>

                  <div className="person-detail-item">
                    <span className="person-detail-label">Boshqa kontaktlar</span>
                    <span className="person-detail-val">
                      {person.otherContacts || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Izoh */}
              {person.notes && (
                <div className="person-detail-section">
                  <h4 className="person-detail-section-title">
                    <Sparkles size={14} />
                    <span>Qo'shimcha izohlar</span>
                  </h4>
                  <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.5, color: "var(--text)" }}>
                    {person.notes}
                  </p>
                </div>
              )}
            </>
          )}

          {/* TAB 1.5: QARZ DAFTARI TARIXI */}
          {activeTab === "debts" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div
                className="person-detail-section"
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
                  {(() => {
                    const hasGiven = debtTotals.givenUzs > 0 || debtTotals.givenUsd > 0;
                    const hasTaken = debtTotals.takenUzs > 0 || debtTotals.takenUsd > 0;
                    const fmtPair = (uzs, usd) => {
                      if (uzs > 0 && usd > 0) return `${formatSum(uzs)} + ${formatDollar(usd)}`;
                      if (uzs > 0) return formatSum(uzs);
                      return formatDollar(usd);
                    };

                    if (!hasGiven && !hasTaken) {
                      return (
                        <div>
                          <span className="person-detail-label">Faol qarz qoldig'i</span>
                          <div className="person-detail-val mono" style={{ fontSize: "1.1rem", color: "#34d399", marginTop: "2px" }}>
                            0 so'm (Qarz yo'q)
                          </div>
                        </div>
                      );
                    }

                    return (
                      <>
                        {hasGiven && (
                          <div>
                            <span className="person-detail-label">Menga qaytishi kerak</span>
                            <div className="person-detail-val mono" style={{ fontSize: "1.08rem", color: "#38bdf8", marginTop: "2px" }}>
                              +{fmtPair(debtTotals.givenUzs, debtTotals.givenUsd)}
                            </div>
                          </div>
                        )}
                        {hasTaken && (
                          <div>
                            <span className="person-detail-label">Qaytarishim kerak</span>
                            <div className="person-detail-val mono" style={{ fontSize: "1.08rem", color: "#f59e0b", marginTop: "2px" }}>
                              -{fmtPair(debtTotals.takenUzs, debtTotals.takenUsd)}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddDebtForPerson}
                  className="people-btn-primary"
                  style={{ padding: "0.5rem 0.95rem", fontSize: "0.84rem" }}
                >
                  <Plus size={15} />
                  <span>Yangi qarz yozish</span>
                </button>
              </div>

              {personDebts.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  {personDebts.map((debt) => {
                    const isGiven = debt.type === DEBT_TYPES.GIVEN;
                    const isUsd = debt.currency === "USD";
                    const fmt = isUsd ? formatDollar : formatSum;
                    const paid = (debt.payments || []).reduce((acc, p) => acc + Number(p.amount || 0), 0);
                    const isClosed = debt.status === "settled" || debt.status === "forgiven";
                    const rem = isClosed ? 0 : Math.max(0, Number(debt.amount || 0) - paid);
                    const statusCfg = DEBT_STATUS_LABELS[debt.status] || DEBT_STATUS_LABELS.pending;
                    const dueInfo = getDebtDueInfo(debt);

                    return (
                      <div
                        key={debt.id}
                        className="person-detail-section"
                        style={{ padding: "0.9rem 1rem", gap: "0.55rem", cursor: "pointer" }}
                        onClick={() => {
                          onClose();
                          navigate(`/debts?debtId=${encodeURIComponent(debt.id)}`);
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                            {isGiven ? <ArrowUpRight size={14} color="#38bdf8" /> : <ArrowDownLeft size={14} color="#f59e0b" />}
                            <strong style={{ fontSize: "0.88rem" }}>
                              {isGiven ? "Berilgan qarz" : "Olingan qarz"}
                            </strong>
                            <span
                              style={{
                                fontSize: "0.72rem",
                                padding: "2px 7px",
                                borderRadius: "6px",
                                color: statusCfg.color,
                                background: statusCfg.bg,
                                border: `1px solid ${statusCfg.border}`,
                              }}
                            >
                              {statusCfg.label}
                            </span>
                          </div>
                          <span className="mono" style={{ fontWeight: 700, color: isGiven ? "#38bdf8" : "#f59e0b" }}>
                            {fmt(debt.amount)}
                            {rem > 0 && rem < debt.amount && (
                              <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginLeft: "6px" }}>
                                (Qoldiq: {fmt(rem)})
                              </span>
                            )}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.78rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                          <span>{new Date(debt.date || debt.createdAt).toLocaleDateString("uz-UZ")}</span>
                          <span>• {dueInfo.text}</span>
                          {debt.reason && <span>• {debt.reason}</span>}
                        </div>

                        {!isClosed && rem > 0 && (
                          <div
                            style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap", paddingTop: "0.25rem" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="btn btn--xs btn--primary"
                              onClick={() => setRepayTargetDebt(debt)}
                            >
                              <PlusCircle size={12} />
                              <span>{isGiven ? "To'lov olish" : "To'lov qilish"}</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn--xs"
                              style={{
                                background: "rgba(168, 85, 247, 0.15)",
                                color: "#c084fc",
                                border: "1px solid rgba(168, 85, 247, 0.3)",
                              }}
                              onClick={() => setForgiveTargetDebt(debt)}
                            >
                              <HeartHandshake size={12} />
                              <span>Voz kechish</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn--xs btn--ghost"
                              onClick={() =>
                                settleDebt(debt.id, {
                                  amount: rem,
                                  wallet: debt.wallet,
                                  affectBalance: false,
                                  note: "Odamlar kartasidan to'liq yopildi",
                                })
                              }
                            >
                              <CheckCircle2 size={12} />
                              <span>Yopildi</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="people-empty-state" style={{ padding: "2rem" }}>
                  <HandCoins size={32} color="#4eb896" />
                  <h3>Qarz yozuvlari topilmadi</h3>
                  <p>{person.nickname} bilan bog'liq birorta qarz hali kiritilmagan.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: KENGAYTIRILGAN PROFIL */}
          {activeTab === "profile" && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                }}
              >
                <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--text-muted)" }}>
                  Yaqin odamlar uchun chuqurroq shaxsiy profil va his-tuyg'ular.
                </p>

                <button
                  type="button"
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="people-btn-secondary"
                  style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem" }}
                >
                  <Edit2 size={13} />
                  <span>{isEditingProfile ? "Bekor qilish" : "Tahrirlash"}</span>
                </button>
              </div>

              {isEditingProfile ? (
                <form onSubmit={handleProfileSubmit} className="people-form-grid">
                  <div className="people-form-group">
                    <label className="people-form-label">Yashash joyi (hududi)</label>
                    <input
                      type="text"
                      className="people-form-input"
                      value={profileForm.area}
                      onChange={(e) => setProfileForm({ ...profileForm, area: e.target.value })}
                      placeholder="Masalan: Chilonzor, Samarqand..."
                    />
                  </div>

                  <div className="people-form-group">
                    <label className="people-form-label">Qiziqishlari</label>
                    <input
                      type="text"
                      className="people-form-input"
                      value={profileForm.interests}
                      onChange={(e) => setProfileForm({ ...profileForm, interests: e.target.value })}
                      placeholder="Kitoblar, musiqa, dizayn, sport..."
                    />
                  </div>

                  <div className="people-form-group">
                    <label className="people-form-label">Yoqtirgan narsalari</label>
                    <textarea
                      className="people-form-textarea"
                      value={profileForm.likes}
                      onChange={(e) => setProfileForm({ ...profileForm, likes: e.target.value })}
                      placeholder="Nimalarni yaxshi ko'radi, nimalar quvontiradi?"
                    />
                  </div>

                  <div className="people-form-group">
                    <label className="people-form-label">Yoqtirmagan narsalari</label>
                    <textarea
                      className="people-form-textarea"
                      value={profileForm.dislikes}
                      onChange={(e) => setProfileForm({ ...profileForm, dislikes: e.target.value })}
                      placeholder="Nimalardan nafratlanadi yoki jahli chiqadi?"
                    />
                  </div>

                  <div className="people-form-group">
                    <label className="people-form-label">Xarakteri</label>
                    <textarea
                      className="people-form-textarea"
                      value={profileForm.personality}
                      onChange={(e) => setProfileForm({ ...profileForm, personality: e.target.value })}
                      placeholder="Ochiqko'ngil, kamgap, hazilkash, jiddiy..."
                    />
                  </div>

                  <div className="people-form-group">
                    <label className="people-form-label">Qanday gaplashamiz?</label>
                    <textarea
                      className="people-form-textarea"
                      value={profileForm.howWeTalk}
                      onChange={(e) => setProfileForm({ ...profileForm, howWeTalk: e.target.value })}
                      placeholder="Qaysi platformada, qanday uslubda va qanchalik tez-tez gaplashamiz?"
                    />
                  </div>

                  <div className="people-form-group people-form-group--full">
                    <label className="people-form-label">Men uchun nimani anglatadi?</label>
                    <textarea
                      className="people-form-textarea"
                      value={profileForm.meaningToMe}
                      onChange={(e) => setProfileForm({ ...profileForm, meaningToMe: e.target.value })}
                      placeholder="Bu inson mening hayotimda qanday o'ringa ega?"
                    />
                  </div>

                  <div className="people-form-group people-form-group--full">
                    <label className="people-form-label">Unga bo'lgan his-tuyg'um</label>
                    <textarea
                      className="people-form-textarea"
                      value={profileForm.myFeelings}
                      onChange={(e) => setProfileForm({ ...profileForm, myFeelings: e.target.value })}
                      placeholder="Hozirgi paytda u haqida nimalarni his qilmoqdaman?"
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="people-btn-secondary"
                    >
                      Bekor qilish
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="people-btn-primary"
                    >
                      <Save size={14} />
                      <span>{isSavingProfile ? "Saqlanmoqda..." : "Profilni saqlash"}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {person.profile ? (
                    <>
                      <div className="person-detail-section">
                        <div className="person-detail-grid">
                          <div className="person-detail-item">
                            <span className="person-detail-label">Yashash joyi / Hudud</span>
                            <span className="person-detail-val">{person.profile.area || "Ko'rsatilmagan"}</span>
                          </div>
                          <div className="person-detail-item">
                            <span className="person-detail-label">Qiziqishlari</span>
                            <span className="person-detail-val">{person.profile.interests || "Ko'rsatilmagan"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="person-detail-section">
                        <div className="person-detail-grid">
                          <div className="person-detail-item">
                            <span className="person-detail-label">Yoqtirgan narsalari</span>
                            <span className="person-detail-val">{person.profile.likes || "Ko'rsatilmagan"}</span>
                          </div>
                          <div className="person-detail-item">
                            <span className="person-detail-label">Yoqtirmagan narsalari</span>
                            <span className="person-detail-val">{person.profile.dislikes || "Ko'rsatilmagan"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="person-detail-section">
                        <div className="person-detail-grid">
                          <div className="person-detail-item">
                            <span className="person-detail-label">Xarakteri</span>
                            <span className="person-detail-val">{person.profile.personality || "Ko'rsatilmagan"}</span>
                          </div>
                          <div className="person-detail-item">
                            <span className="person-detail-label">Qanday gaplashamiz</span>
                            <span className="person-detail-val">{person.profile.howWeTalk || "Ko'rsatilmagan"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="person-detail-section">
                        <div className="person-detail-item">
                          <span className="person-detail-label">Men uchun nimani anglatadi</span>
                          <p style={{ margin: "4px 0 0", fontSize: "0.9rem", color: "var(--text)", lineHeight: 1.5 }}>
                            {person.profile.meaningToMe || "Ko'rsatilmagan"}
                          </p>
                        </div>
                      </div>

                      <div className="person-detail-section" style={{ borderColor: "rgba(78, 184, 150, 0.35)" }}>
                        <div className="person-detail-item">
                          <span className="person-detail-label" style={{ color: "#6ee7b7" }}>
                            Unga bo'lgan his-tuyg'um
                          </span>
                          <p style={{ margin: "4px 0 0", fontSize: "0.92rem", color: "#f5f3ec", lineHeight: 1.5 }}>
                            {person.profile.myFeelings || "Ko'rsatilmagan"}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="people-empty-state" style={{ padding: "2rem" }}>
                      <Smile size={32} color="#4eb896" />
                      <h3>Kengaytirilgan profil hali to'ldirilmagan</h3>
                      <p>Ushbu insonning qiziqishlari, xarakteri va unga bo'lgan his-tuyg'ularingizni yozib qoldiring.</p>
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(true)}
                        className="people-btn-primary"
                        style={{ marginTop: "0.5rem" }}
                      >
                        <Plus size={14} />
                        <span>Profilni to'ldirish</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TASHQI KO'RINISH TARIXI */}
          {activeTab === "appearances" && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1.25rem",
                }}
              >
                <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--text-muted)" }}>
                  Tashqi ko'rinish vaqt o'tishi bilan o'zgarishi mumkin. Har bir qayd sanasi bilan saqlanadi.
                </p>

                <button
                  type="button"
                  onClick={() => setShowAddAppearance(!showAddAppearance)}
                  className="people-btn-primary"
                  style={{ padding: "0.45rem 0.9rem", fontSize: "0.84rem" }}
                >
                  <Plus size={14} />
                  <span>Yangi qayd</span>
                </button>
              </div>

              {/* Yangi ko'rinish formasi */}
              {showAddAppearance && (
                <form
                  onSubmit={handleAddAppearanceSubmit}
                  style={{
                    background: "rgba(34, 33, 29, 0.85)",
                    border: "1px solid rgba(78, 184, 150, 0.3)",
                    borderRadius: "14px",
                    padding: "1.25rem",
                    marginBottom: "1.5rem",
                  }}
                  className="people-form-grid"
                >
                  <div className="people-form-group">
                    <label className="people-form-label">Qayd sanasi</label>
                    <input
                      type="date"
                      className="people-form-input"
                      value={appForm.recordedAt}
                      onChange={(e) => setAppForm({ ...appForm, recordedAt: e.target.value })}
                    />
                  </div>

                  <div className="people-form-group">
                    <label className="people-form-label">Taxminiy bo'yi (sm)</label>
                    <input
                      type="number"
                      className="people-form-input"
                      value={appForm.heightCmEst}
                      onChange={(e) => setAppForm({ ...appForm, heightCmEst: e.target.value })}
                      placeholder="Masalan: 172"
                    />
                  </div>

                  <div className="people-form-group">
                    <label className="people-form-label">Ko'z rangi</label>
                    <input
                      type="text"
                      className="people-form-input"
                      value={appForm.eyeColor}
                      onChange={(e) => setAppForm({ ...appForm, eyeColor: e.target.value })}
                      placeholder="Qora, jigarrang, yashil..."
                    />
                  </div>

                  <div className="people-form-group">
                    <label className="people-form-label">Soch rangi / turmagi</label>
                    <input
                      type="text"
                      className="people-form-input"
                      value={appForm.hairColor}
                      onChange={(e) => setAppForm({ ...appForm, hairColor: e.target.value })}
                      placeholder="Qora uzun, sarg'ish kalta..."
                    />
                  </div>

                  <div className="people-form-group people-form-group--full">
                    <label className="people-form-label">Yuz tuzilishi va alohida belgilar</label>
                    <input
                      type="text"
                      className="people-form-input"
                      value={appForm.faceNotes}
                      onChange={(e) => setAppForm({ ...appForm, faceNotes: e.target.value })}
                      placeholder="Dumaloq yuz, xolli, ko'zoynak taqadi..."
                    />
                  </div>

                  <div className="people-form-group people-form-group--full">
                    <label className="people-form-label">Boshqa tashqi belgilar / kiyinishi</label>
                    <textarea
                      className="people-form-textarea"
                      value={appForm.otherNotes}
                      onChange={(e) => setAppForm({ ...appForm, otherNotes: e.target.value })}
                      placeholder="Kiyinish uslubi, qaddi-qomati, o'ziga xosliklari..."
                    />
                  </div>

                  <div
                    style={{
                      gridColumn: "1 / -1",
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "0.75rem",
                      marginTop: "0.5rem",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setShowAddAppearance(false)}
                      className="people-btn-secondary"
                    >
                      Bekor qilish
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingApp}
                      className="people-btn-primary"
                    >
                      <Save size={14} />
                      <span>{isSavingApp ? "Saqlanmoqda..." : "Qaydni saqlash"}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Ko'rinishlar tarixi (Timeline) */}
              {person.appearances && person.appearances.length > 0 ? (
                <div className="appearance-timeline">
                  {person.appearances.map((app) => (
                    <div key={app.id} className="appearance-item">
                      <div className="appearance-item-top">
                        <span className="appearance-date">
                          {new Date(app.recordedAt).toLocaleDateString("uz-UZ", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDeleteAppearance(app.id)}
                          className="btn-icon btn-icon--xs"
                          title="Ushbu yozuvni o'chirish"
                          style={{
                            color: "var(--danger, #f87171)",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: "4px",
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="appearance-features-grid">
                        <div>
                          <span style={{ color: "var(--text-dim)", fontSize: "0.72rem", display: "block" }}>
                            Bo'yi
                          </span>
                          <span style={{ color: "var(--text)", fontWeight: 500 }}>
                            {app.heightCmEst ? `${app.heightCmEst} sm` : "—"}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-dim)", fontSize: "0.72rem", display: "block" }}>
                            Ko'z rangi
                          </span>
                          <span style={{ color: "var(--text)", fontWeight: 500 }}>
                            {app.eyeColor || "—"}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-dim)", fontSize: "0.72rem", display: "block" }}>
                            Soch rangi
                          </span>
                          <span style={{ color: "var(--text)", fontWeight: 500 }}>
                            {app.hairColor || "—"}
                          </span>
                        </div>
                      </div>

                      {app.faceNotes && (
                        <div style={{ fontSize: "0.82rem", color: "var(--text)" }}>
                          <span style={{ color: "var(--text-dim)" }}>Yuz tuzilishi: </span>
                          <span>{app.faceNotes}</span>
                        </div>
                      )}

                      {app.otherNotes && (
                        <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                          <span style={{ color: "var(--text-dim)" }}>Izoh: </span>
                          <span>{app.otherNotes}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="people-empty-state" style={{ padding: "2rem" }}>
                  <User size={32} color="#4eb896" />
                  <h3>Tashqi ko'rinish qaydlari yo'q</h3>
                  <p>Bu insonning bo'yi, ko'z va soch rangi hamda o'ziga xos belgilarini kiritib boring.</p>
                  <button
                    type="button"
                    onClick={() => setShowAddAppearance(true)}
                    className="people-btn-primary"
                    style={{ marginTop: "0.5rem" }}
                  >
                    <Plus size={14} />
                    <span>Birinchi qaydni kiritish</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal pastki qismi */}
        <div className="people-modal-footer" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleOpenAddDebtForPerson}
            className="people-btn-primary"
            style={{ padding: "0.55rem 1rem", fontSize: "0.85rem" }}
          >
            <HandCoins size={15} />
            <span>+ Qarz yozish</span>
          </button>

          <button type="button" onClick={onClose} className="people-btn-secondary">
            Yopish
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(deleteAppTarget)}
        title="Ko'rinish yozuvini o'chirish"
        message="Ushbu tashqi ko'rinish qaydini o'chirishni tasdiqlaysizmi?"
        confirmLabel="Ha, o'chirish"
        cancelLabel="Bekor qilish"
        variant="danger"
        isLoading={isDeletingApp}
        onConfirm={handleConfirmDeleteAppearance}
        onCancel={() => !isDeletingApp && setDeleteAppTarget(null)}
      />

      <RepayDebtModal
        isOpen={Boolean(repayTargetDebt)}
        onClose={() => setRepayTargetDebt(null)}
        debt={repayTargetDebt}
        onRepay={repayDebt}
      />

      <ForgiveDebtModal
        isOpen={Boolean(forgiveTargetDebt)}
        onClose={() => setForgiveTargetDebt(null)}
        debt={forgiveTargetDebt}
        onForgive={forgiveDebt}
      />
    </div>
  );
}
