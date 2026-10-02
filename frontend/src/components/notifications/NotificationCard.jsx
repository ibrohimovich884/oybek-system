import { Link } from "react-router-dom";
import {
  HandCoins,
  Wallet,
  Dumbbell,
  Database,
  Bell,
  Check,
  RotateCcw,
  Trash2,
  Calendar,
  ExternalLink,
  AlertTriangle,
  Info,
  Clock,
} from "lucide-react";

export default function NotificationCard({
  notification,
  onToggleRead,
  onDelete,
}) {
  const {
    id,
    title,
    message,
    type,
    priority,
    actionUrl,
    actionLabel,
    dueDate,
    createdAt,
    isRead,
    isSystem,
  } = notification;

  // Ikona va uslubni tanlash
  const getTypeConfig = () => {
    switch (type) {
      case "debt":
        return {
          icon: HandCoins,
          className: "notif-card__icon--debt",
          label: "Qarz daftari",
        };
      case "finance":
        return {
          icon: Wallet,
          className: "notif-card__icon--finance",
          label: "Moliya & Balans",
        };
      case "exercise":
        return {
          icon: Dumbbell,
          className: "notif-card__icon--exercise",
          label: "Sport & Mashq",
        };
      case "system":
        return {
          icon: Database,
          className: "notif-card__icon--system",
          label: "Tizim & Baza",
        };
      default:
        return {
          icon: Bell,
          className: "notif-card__icon--custom",
          label: "Shaxsiy eslatma",
        };
    }
  };

  const typeConfig = getTypeConfig();
  const Icon = typeConfig.icon;

  // Vaqtni qisqa formatlash
  const formatTime = (isoString) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      const now = new Date();
      const diffMs = now - d;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "Hozirgina";
      if (diffMins < 60) return `${diffMins} daqiqa oldin`;
      if (diffHours < 24) return `${diffHours} soat oldin`;
      if (diffDays === 1) return "Kecha";
      if (diffDays < 7) return `${diffDays} kun oldin`;
      return d.toLocaleDateString("uz-UZ", {
        day: "numeric",
        month: "short",
      });
    } catch {
      return "";
    }
  };

  return (
    <div
      className={`notif-card ${isRead ? "notif-card--read" : "notif-card--unread"} ${
        priority === "high" ? "notif-card--high" : ""
      }`}
    >
      {/* Chapdagi ikonka */}
      <div className={`notif-card__icon ${typeConfig.className}`}>
        <Icon size={18} />
      </div>

      {/* Asosiy ma'lumotlar */}
      <div className="notif-card__content">
        <div className="notif-card__top">
          <div className="notif-card__badges">
            <span className="notif-tag notif-tag--category">
              {typeConfig.label}
            </span>
            {priority === "high" && (
              <span className="notif-tag notif-tag--high">
                <AlertTriangle size={11} />
                <span>Muhim</span>
              </span>
            )}
            {priority === "low" && (
              <span className="notif-tag notif-tag--low">
                <span>Axborot</span>
              </span>
            )}
            {isSystem && (
              <span className="notif-tag notif-tag--system">
                <span>Avtomatik</span>
              </span>
            )}
          </div>

          <div className="notif-card__time">
            <Clock size={12} />
            <span>{formatTime(createdAt)}</span>
          </div>
        </div>

        <h3 className="notif-card__title">
          {!isRead && <span className="notif-unread-dot" aria-hidden="true" />}
          {title}
        </h3>

        {message && <p className="notif-card__message">{message}</p>}

        {/* Muddat sanasi (DueDate) */}
        {dueDate && (
          <div className="notif-card__due">
            <Calendar size={13} />
            <span>Muddat: {dueDate}</span>
          </div>
        )}

        {/* Pastki harakatlar: Havola & Tugmalar */}
        <div className="notif-card__footer">
          {actionUrl ? (
            <Link
              to={actionUrl}
              className="btn btn--subtle btn--xs notif-card__action-btn"
              onClick={() => {
                if (!isRead) onToggleRead(id);
              }}
            >
              <span>{actionLabel || "Bo'limga o'tish"}</span>
              <ExternalLink size={12} />
            </Link>
          ) : (
            <span />
          )}

          <div className="notif-card__actions">
            {/* O'qilgan / o'qilmagan holatini o'zgartirish */}
            <button
              type="button"
              className="notif-btn-icon"
              title={isRead ? "O'qilmagan deb belgilash" : "O'qilgan deb belgilash"}
              onClick={() => onToggleRead(id)}
              aria-label={isRead ? "O'qilmagan deb belgilash" : "O'qilgan deb belgilash"}
            >
              {isRead ? <RotateCcw size={14} /> : <Check size={14} />}
            </button>

            {/* O'chirish / Yashirish */}
            <button
              type="button"
              className="notif-btn-icon notif-btn-icon--danger"
              title={isSystem ? "Yashirish" : "O'chirish"}
              onClick={() => onDelete(id)}
              aria-label="O'chirish"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
