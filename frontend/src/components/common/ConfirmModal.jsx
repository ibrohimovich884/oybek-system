import React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

export default function ConfirmModal({
  isOpen,
  title = "Tasdiqlash",
  message = "Ushbu amalni bajarishni tasdiqlaysizmi?",
  confirmLabel = "Tasdiqlash",
  cancelLabel = "Bekor qilish",
  variant = "danger",
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  const isDanger = variant === "danger";

  return (
    <div
      className="people-modal-backdrop"
      style={{ zIndex: 1300 }}
      onClick={() => !isLoading && onCancel && onCancel()}
    >
      <div
        className="people-confirm-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="people-confirm-modal__header">
          <div
            className={`people-confirm-modal__icon ${
              isDanger ? "people-confirm-modal__icon--danger" : "people-confirm-modal__icon--primary"
            }`}
          >
            {isDanger ? <Trash2 size={18} /> : <AlertTriangle size={18} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 className="people-confirm-modal__title">{title}</h3>
          </div>
          <button
            type="button"
            className="btn-icon btn-icon--xs"
            onClick={() => !isLoading && onCancel && onCancel()}
            aria-label="Yopish"
          >
            <X size={16} />
          </button>
        </div>

        <p className="people-confirm-modal__msg">{message}</p>

        <div className="people-confirm-modal__actions">
          <button
            type="button"
            className="people-btn-secondary"
            onClick={() => onCancel && onCancel()}
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={isDanger ? "people-btn-danger-solid" : "people-btn-primary"}
            onClick={() => onConfirm && onConfirm()}
            disabled={isLoading}
          >
            {isLoading ? "Bajarilmoqda..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
