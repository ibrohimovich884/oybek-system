import React, { useState } from "react";
import { X, Edit2, Heart } from "lucide-react";
import {
  PERSON_CATEGORIES,
  CRUSH_STATUSES,
} from "../../constants/people.js";
import { updatePerson } from "../../api/people.js";

export default function EditPersonModal({ person, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    nickname: person.nickname || "",
    fullName: person.fullName || "",
    gender: person.gender || "female",
    category: person.category || "friend",
    status: person.status || "active",
    isCrush: Boolean(person.isCrush),
    crushStatus: person.crushStatus || "liked",
    crushStartedOn: person.crushStartedOn || "",
    metOn: person.metOn || "",
    metPlace: person.metPlace || "",
    metVia: person.metVia || "",
    birthday: person.birthday || "",
    phone: person.phone || "",
    telegram: person.telegram || "",
    instagram: person.instagram || "",
    otherContacts: person.otherContacts || "",
    notes: person.notes || "",
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
      await updatePerson(person.id, formData);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "Tahrirlashda xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="people-modal-backdrop" onClick={onClose}>
      <div className="people-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="people-modal-header">
          <h2>
            <Edit2 size={18} color="#4eb896" />
            <span>Kartani tahrirlash: {person.nickname}</span>
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

          <div className="people-form-grid">
            <div className="people-form-group">
              <label className="people-form-label">Ism / Laqab *</label>
              <input
                type="text"
                required
                className="people-form-input"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              />
            </div>

            <div className="people-form-group">
              <label className="people-form-label">To'liq ismi</label>
              <input
                type="text"
                className="people-form-input"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
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
                value={formData.birthday || ""}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
              />
            </div>
          </div>

          {/* Crush holati */}
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
              <span>Yoqtirganlar (Crush) ro'yxatida bo'lsin</span>
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
                    value={formData.crushStatus || "liked"}
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
                    value={formData.crushStartedOn || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, crushStartedOn: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tanishuv */}
          <div className="people-form-grid">
            <div className="people-form-group">
              <label className="people-form-label">Tanishgan sana</label>
              <input
                type="date"
                className="people-form-input"
                value={formData.metOn || ""}
                onChange={(e) => setFormData({ ...formData, metOn: e.target.value })}
              />
            </div>

            <div className="people-form-group">
              <label className="people-form-label">Tanishgan joy</label>
              <input
                type="text"
                className="people-form-input"
                value={formData.metPlace || ""}
                onChange={(e) => setFormData({ ...formData, metPlace: e.target.value })}
              />
            </div>

            <div className="people-form-group people-form-group--full">
              <label className="people-form-label">Kim orqali / Qanday tanishgan</label>
              <input
                type="text"
                className="people-form-input"
                value={formData.metVia || ""}
                onChange={(e) => setFormData({ ...formData, metVia: e.target.value })}
              />
            </div>
          </div>

          {/* Aloqa */}
          <div className="people-form-grid">
            <div className="people-form-group">
              <label className="people-form-label">Telefon</label>
              <input
                type="tel"
                className="people-form-input"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="people-form-group">
              <label className="people-form-label">Telegram</label>
              <input
                type="text"
                className="people-form-input"
                value={formData.telegram || ""}
                onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
              />
            </div>

            <div className="people-form-group">
              <label className="people-form-label">Instagram</label>
              <input
                type="text"
                className="people-form-input"
                value={formData.instagram || ""}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
              />
            </div>

            <div className="people-form-group">
              <label className="people-form-label">Boshqa kontaktlar</label>
              <input
                type="text"
                className="people-form-input"
                value={formData.otherContacts || ""}
                onChange={(e) => setFormData({ ...formData, otherContacts: e.target.value })}
              />
            </div>

            <div className="people-form-group people-form-group--full">
              <label className="people-form-label">Izohlar</label>
              <textarea
                className="people-form-textarea"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="people-modal-footer" style={{ margin: "1rem -1.5rem -1.5rem", padding: "1rem 1.5rem" }}>
            <button type="button" onClick={onClose} className="people-btn-secondary">
              Bekor qilish
            </button>
            <button type="submit" disabled={isSubmitting} className="people-btn-primary">
              <span>{isSubmitting ? "Saqlanmoqda..." : "O'zgarishlarni saqlash"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
