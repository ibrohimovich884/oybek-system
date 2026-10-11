import React from "react";
import {
  Heart,
  Phone,
  Send,
  MapPin,
  Calendar,
  Sparkles,
  User,
  ChevronRight,
} from "lucide-react";

function InstagramIcon({ size = 11, color = "currentColor" }) {
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
  CRUSH_STATUS_LABELS,
} from "../../constants/people.js";

export default function PersonCard({ person, onClick, onToggleCrush }) {
  const {
    nickname,
    fullName,
    gender,
    category,
    status,
    isCrush,
    crushStatus,
    metOn,
    metPlace,
    phone,
    telegram,
    instagram,
    notes,
    latestAppearance,
  } = person;

  const firstLetter = (nickname || "?").charAt(0).toUpperCase();

  const handleCrushClick = (e) => {
    e.stopPropagation();
    if (onToggleCrush) {
      onToggleCrush(person);
    }
  };

  return (
    <div
      className={`person-card ${isCrush ? "person-card--crush" : ""}`}
      onClick={() => onClick && onClick(person)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick && onClick(person);
        }
      }}
    >
      <div>
        {/* Karta yuqori qismi */}
        <div className="person-card-top">
          <div className="person-card-header">
            <div
              className={`person-avatar ${
                gender === "female" ? "person-avatar--female" : ""
              } ${isCrush ? "person-avatar--crush" : ""}`}
            >
              {firstLetter}
            </div>

            <div className="person-name-box">
              <h3 className="person-nickname" title={nickname}>
                {nickname}
              </h3>
              {fullName && (
                <p className="person-fullname" title={fullName}>
                  {fullName}
                </p>
              )}

              {/* Unboxed clean metadata (Anti-slop) */}
              <div className="person-metadata-row">
                <span className="person-category-text">
                  {CATEGORY_LABELS[category] || category}
                </span>
                <span className="person-meta-sep" aria-hidden="true">
                  ·
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span
                    className={`person-status-dot ${
                      status === "active"
                        ? "person-status-dot--active"
                        : "person-status-dot--lost"
                    }`}
                  />
                  <span>
                    {status === "active" ? "Faol" : "Aloqa uzilgan"}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Crush tugmasi / belgisi */}
          <button
            type="button"
            onClick={handleCrushClick}
            className="btn-icon btn-icon--xs"
            title={
              isCrush
                ? "Yoqtirganlar ro'yxatidan chiqarish"
                : "Yoqtirganlar ro'yxatiga qo'shish"
            }
            style={{
              background: isCrush
                ? "rgba(244, 114, 182, 0.18)"
                : "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${
                isCrush ? "rgba(244, 114, 182, 0.45)" : "rgba(255, 255, 255, 0.1)"
              }`,
              color: isCrush ? "#f472b6" : "var(--text-dim, #797368)",
              borderRadius: "8px",
              padding: "6px",
              transition: "all 0.2s ease",
            }}
          >
            <Heart
              size={15}
              fill={isCrush ? "#f472b6" : "transparent"}
              style={{
                filter: isCrush
                  ? "drop-shadow(0 0 4px rgba(244, 114, 182, 0.6))"
                  : "none",
              }}
            />
          </button>
        </div>

        {/* Crush status bosqichi (agar bo'lsa) */}
        {isCrush && crushStatus && (
          <div style={{ marginTop: "0.65rem" }}>
            <span className="person-crush-badge">
              <Sparkles size={11} />
              <span>{CRUSH_STATUS_LABELS[crushStatus] || crushStatus}</span>
            </span>
          </div>
        )}

        {/* Karta tanasi: aloqa va joylashuv */}
        <div className="person-card-body" style={{ marginTop: "0.75rem" }}>
          {/* Tanishgan joyi yoki sanasi */}
          {(metPlace || metOn) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                fontSize: "0.78rem",
                color: "var(--text-muted, #a7a195)",
              }}
            >
              <MapPin size={12} color="#4eb896" />
              <span>
                {metPlace || "Joy ko'rsatilmagan"}
                {metOn && ` (${metOn})`}
              </span>
            </div>
          )}

          {/* Aloqa teglari */}
          {(telegram || instagram || phone) && (
            <div className="person-contacts-row">
              {telegram && (
                <a
                  href={`https://t.me/${telegram}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="person-contact-chip"
                  title={`Telegram: @${telegram}`}
                >
                  <Send size={11} color="#38bdf8" />
                  <span>@{telegram}</span>
                </a>
              )}
              {instagram && (
                <a
                  href={`https://instagram.com/${instagram}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="person-contact-chip"
                  title={`Instagram: @${instagram}`}
                >
                  <InstagramIcon size={11} color="#e879f9" />
                  <span>@{instagram}</span>
                </a>
              )}
              {phone && (
                <a
                  href={`tel:${phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="person-contact-chip"
                  title={`Tel: ${phone}`}
                >
                  <Phone size={11} color="#34d399" />
                  <span>{phone}</span>
                </a>
              )}
            </div>
          )}

          {/* Izoh qisqartmasi */}
          {notes && <p className="person-notes-snippet">{notes}</p>}
        </div>
      </div>

      {/* Karta tag qismi: Tashqi ko'rinish va o'tish tugmasi */}
      <div className="person-card-footer">
        {latestAppearance ? (
          <div className="person-appearance-preview">
            <User size={12} />
            <span>
              {latestAppearance.heightCmEst
                ? `${latestAppearance.heightCmEst} sm`
                : ""}
              {latestAppearance.hairColor
                ? ` · ${latestAppearance.hairColor}`
                : ""}
              {latestAppearance.eyeColor
                ? ` · ${latestAppearance.eyeColor} ko'z`
                : ""}
            </span>
          </div>
        ) : (
          <span style={{ color: "var(--text-dim, #797368)" }}>
            Ko'rinish yozilmagan
          </span>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "2px",
            color: "var(--accent, #4eb896)",
            fontSize: "0.78rem",
            fontWeight: 500,
          }}
        >
          <span>Karta</span>
          <ChevronRight size={13} />
        </div>
      </div>
    </div>
  );
}
