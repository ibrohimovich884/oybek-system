import React, { useState } from "react";
import {
  X,
  User,
  Heart,
  Phone,
  Compass,
  Smile,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import {
  PERSON_CATEGORIES,
  CRUSH_STATUSES,
} from "../../constants/people.js";
import { createPerson } from "../../api/people.js";

export default function AddPersonModal({ onClose, onSuccess, initialIsCrush = false }) {
  const [formData, setFormData] = useState({
    nickname: "",
    fullName: "",
    gender: "female",
    category: "friend",
    status: "active",
    isCrush: initialIsCrush,
    crushStatus: initialIsCrush ? "liked" : "interest",
    crushStartedOn: initialIsCrush ? new Date().toISOString().slice(0, 10) : "",
    metOn: "",
    metPlace: "",
    metVia: "",
    birthday: "",
    phone: "",
    telegram: "",
    instagram: "",
    otherContacts: "",
    notes: "",
  });

  // Ixtiyoriy kengaytirilgan bo'limlar ochilishi
  const [showProfileSection, setShowProfileSection] = useState(false);
  const [profileData, setProfileData] = useState({
    area: "",
    interests: "",
    likes: "",
    dislikes: "",
    personality: "",
    howWeTalk: "",
    meaningToMe: "",
    myFeelings: "",
  });

  const [showAppearanceSection, setShowAppearanceSection] = useState(false);
  const [appearanceData, setAppearanceData] = useState({
    heightCmEst: "",
    eyeColor: "",
    hairColor: "",
    faceNotes: "",
    otherNotes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nickname.trim()) {
      setError("Ism yoki laqab kiritilishi shart");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        profile: showProfileSection ? profileData : null,
        appearance: showAppearanceSection ? appearanceData : null,
      };

      await createPerson(payload);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "Saqlashda xatolik yuz berdi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="people-modal-backdrop" onClick={onClose}>
      <div className="people-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="people-modal-header">
          <h2>
            <User size={18} color="#4eb896" />
            <span>Yangi tanish qo'shish</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon btn-icon--xs"
            aria-label="Yopish"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="people-modal-body">
          {error && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                color: "#fca5a5",
                borderRadius: "10px",
                padding: "0.75rem 1rem",
                fontSize: "0.86rem",
              }}
            >
              {error}
            </div>
          )}

          {/* Asosiy maydonlar */}
          <div className="people-form-grid">
            <div className="people-form-group">
              <label className="people-form-label">
                Ism / Laqab (ko'rinadigan nom) *
              </label>
              <input
                type="text"
                required
                className="people-form-input"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                placeholder="Masalan: Malika, Jasur, Otabek..."
              />
            </div>

            <div className="people-form-group">
              <label className="people-form-label">To'liq ismi va familiyasi</label>
              <input
                type="text"
                className="people-form-input"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="To'liq ismi (agar ma'lum bo'lsa)"
              />
            </div>

            <div className="people-form-group">
              <label className="people-form-label">Toifasi</label>
              <select
                className="people-form-select"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {PERSON_CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="people-form-group">
              <label className="people-form-label">Jinsi</label>
              <select
                className="people-form-select"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="female">Qiz bola / Ayol</option>
                <option value="male">O'g'il bola / Erkak</option>
                <option value="other">Boshqa</option>
              </select>
            </div>

            <div className="people-form-group">
              <label className="people-form-label">Aloqa holati</label>
              <select
                className="people-form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">Faol aloqada</option>
                <option value="lost_contact">Aloqa uzilgan</option>
              </select>
            </div>

            <div className="people-form-group">
              <label className="people-form-label">Tug'ilgan kuni</label>
              <input
                type="date"
                className="people-form-input"
                value={formData.birthday}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
              />
            </div>
          </div>

          {/* Yoqtirganlar (Crush) bo'limi */}
          <div
            style={{
              background: formData.isCrush
                ? "rgba(244, 114, 182, 0.12)"
                : "rgba(255, 255, 255, 0.03)",
              border: `1px solid ${
                formData.isCrush ? "rgba(244, 114, 182, 0.4)" : "rgba(255, 255, 255, 0.08)"
              }`,
              borderRadius: "12px",
              padding: "0.9rem 1.1rem",
              transition: "all 0.25s ease",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                cursor: "pointer",
                userSelect: "none",
                color: formData.isCrush ? "#f472b6" : "var(--text)",
                fontWeight: 600,
                fontSize: "0.92rem",
              }}
            >
              <input
                type="checkbox"
                checked={formData.isCrush}
                onChange={(e) =>
                  setFormData({ ...formData, isCrush: e.target.checked })
                }
                style={{ accentColor: "#ec4899", width: 16, height: 16 }}
              />
              <Heart size={16} fill={formData.isCrush ? "#f472b6" : "transparent"} />
              <span>Yoqtirganlar (Crush) ro'yxatiga qo'shish</span>
            </label>

            {formData.isCrush && (
              <div
                className="people-form-grid"
                style={{ marginTop: "0.85rem", paddingTop: "0.85rem", borderTop: "1px solid rgba(244, 114, 182, 0.2)" }}
              >
                <div className="people-form-group">
                  <label className="people-form-label" style={{ color: "#f472b6" }}>
                    His-tuyg'u bosqichi
                  </label>
                  <select
                    className="people-form-select"
                    value={formData.crushStatus}
                    onChange={(e) =>
                      setFormData({ ...formData, crushStatus: e.target.value })
                    }
                  >
                    {CRUSH_STATUSES.filter((c) => c.value !== "all").map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label} ({c.desc})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="people-form-group">
                  <label className="people-form-label" style={{ color: "#f472b6" }}>
                    Yoqtira boshlagan sana
                  </label>
                  <input
                    type="date"
                    className="people-form-input"
                    value={formData.crushStartedOn}
                    onChange={(e) =>
                      setFormData({ ...formData, crushStartedOn: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tanishuv tarixi */}
          <div className="people-form-grid">
            <div className="people-form-group">
              <label className="people-form-label">Qachon tanishganmiz</label>
              <input
                type="date"
                className="people-form-input"
                value={formData.metOn}
                onChange={(e) => setFormData({ ...formData, metOn: e.target.value })}
              />
            </div>

            <div className="people-form-group">
              <label className="people-form-label">Qayerda tanishganmiz</label>
              <input
                type="text"
                className="people-form-input"
                value={formData.metPlace}
                onChange={(e) => setFormData({ ...formData, metPlace: e.target.value })}
                placeholder="Masalan: Universitet, Kafeda, Tadbirda..."
              />
            </div>

            <div className="people-form-group people-form-group--full">
              <label className="people-form-label">Kim orqali yoki qanday tanishgan</label>
              <input
                type="text"
                className="people-form-input"
                value={formData.metVia}
                onChange={(e) => setFormData({ ...formData, metVia: e.target.value })}
                placeholder="Do'stimiz orqali, Instagram orqali, Tasodifan..."
              />
            </div>
          </div>

          {/* Aloqa vositalari */}
          <div className="people-form-grid">
            <div className="people-form-group">
              <label className="people-form-label">Telefon raqam</label>
              <input
                type="tel"
                className="people-form-input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+998 90 123 45 67"
              />
            </div>

            <div className="people-form-group">
              <label className="people-form-label">Telegram username</label>
              <input
                type="text"
                className="people-form-input"
                value={formData.telegram}
                onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                placeholder="foydalanuvchi_nomi"
              />
            </div>

            <div className="people-form-group">
              <label className="people-form-label">Instagram username</label>
              <input
                type="text"
                className="people-form-input"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                placeholder="instagram_nomi"
              />
            </div>

            <div className="people-form-group">
              <label className="people-form-label">Boshqa kontaktlar</label>
              <input
                type="text"
                className="people-form-input"
                value={formData.otherContacts}
                onChange={(e) => setFormData({ ...formData, otherContacts: e.target.value })}
                placeholder="Email, LinkedIn, manzil..."
              />
            </div>

            <div className="people-form-group people-form-group--full">
              <label className="people-form-label">Izohlar / Muhim eslatmalar</label>
              <textarea
                className="people-form-textarea"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Bu inson haqida eslab qolish kerak bo'lgan xususiyatlar..."
              />
            </div>
          </div>

          {/* Quyi qo'shimcha bo'limlar: Tashqi ko'rinish va Profil */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem" }}>
            {/* Tashqi ko'rinish accordion */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              <button
                type="button"
                onClick={() => setShowAppearanceSection(!showAppearanceSection)}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: "transparent",
                  border: "none",
                  color: "#6ee7b7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  fontSize: "0.86rem",
                  fontWeight: 600,
                }}
              >
                <span>+ Boshlang'ich tashqi ko'rinish qaydi (ixtiyoriy)</span>
                {showAppearanceSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showAppearanceSection && (
                <div style={{ padding: "1rem", borderTop: "1px solid rgba(255, 255, 255, 0.06)" }} className="people-form-grid">
                  <div className="people-form-group">
                    <label className="people-form-label">Taxminiy bo'yi (sm)</label>
                    <input
                      type="number"
                      className="people-form-input"
                      value={appearanceData.heightCmEst}
                      onChange={(e) => setAppearanceData({ ...appearanceData, heightCmEst: e.target.value })}
                      placeholder="170"
                    />
                  </div>
                  <div className="people-form-group">
                    <label className="people-form-label">Ko'z rangi</label>
                    <input
                      type="text"
                      className="people-form-input"
                      value={appearanceData.eyeColor}
                      onChange={(e) => setAppearanceData({ ...appearanceData, eyeColor: e.target.value })}
                      placeholder="Qora, jigarrang..."
                    />
                  </div>
                  <div className="people-form-group">
                    <label className="people-form-label">Soch rangi</label>
                    <input
                      type="text"
                      className="people-form-input"
                      value={appearanceData.hairColor}
                      onChange={(e) => setAppearanceData({ ...appearanceData, hairColor: e.target.value })}
                      placeholder="Qora, sarg'ish..."
                    />
                  </div>
                  <div className="people-form-group">
                    <label className="people-form-label">Yuz tuzilishi</label>
                    <input
                      type="text"
                      className="people-form-input"
                      value={appearanceData.faceNotes}
                      onChange={(e) => setAppearanceData({ ...appearanceData, faceNotes: e.target.value })}
                      placeholder="Dumaloq yuz..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Kengaytirilgan profil accordion */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              <button
                type="button"
                onClick={() => setShowProfileSection(!showProfileSection)}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: "transparent",
                  border: "none",
                  color: "#6ee7b7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  fontSize: "0.86rem",
                  fontWeight: 600,
                }}
              >
                <span>+ Kengaytirilgan profil va his-tuyg'ular (ixtiyoriy)</span>
                {showProfileSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showProfileSection && (
                <div style={{ padding: "1rem", borderTop: "1px solid rgba(255, 255, 255, 0.06)" }} className="people-form-grid">
                  <div className="people-form-group">
                    <label className="people-form-label">Yashash joyi</label>
                    <input
                      type="text"
                      className="people-form-input"
                      value={profileData.area}
                      onChange={(e) => setProfileData({ ...profileData, area: e.target.value })}
                      placeholder="Yashash hududi"
                    />
                  </div>
                  <div className="people-form-group">
                    <label className="people-form-label">Qiziqishlari</label>
                    <input
                      type="text"
                      className="people-form-input"
                      value={profileData.interests}
                      onChange={(e) => setProfileData({ ...profileData, interests: e.target.value })}
                      placeholder="Qiziqishlari"
                    />
                  </div>
                  <div className="people-form-group people-form-group--full">
                    <label className="people-form-label">Xarakteri</label>
                    <textarea
                      className="people-form-textarea"
                      value={profileData.personality}
                      onChange={(e) => setProfileData({ ...profileData, personality: e.target.value })}
                      placeholder="Xarakter xususiyatlari..."
                    />
                  </div>
                  <div className="people-form-group people-form-group--full">
                    <label className="people-form-label">Unga bo'lgan his-tuyg'um</label>
                    <textarea
                      className="people-form-textarea"
                      value={profileData.myFeelings}
                      onChange={(e) => setProfileData({ ...profileData, myFeelings: e.target.value })}
                      placeholder="Unga bo'lgan munosabatingiz..."
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="people-modal-footer" style={{ margin: "1rem -1.5rem -1.5rem", padding: "1rem 1.5rem" }}>
            <button type="button" onClick={onClose} className="people-btn-secondary">
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="people-btn-primary"
            >
              <span>{isSubmitting ? "Saqlanmoqda..." : "Shaxsni saqlash"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
