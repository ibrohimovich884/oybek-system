import { useState } from "react";
import {
  X,
  Plus,
  Bell,
  Calendar,
  AlertCircle,
  Tag,
  Link as LinkIcon,
  Clock,
  Sparkles,
} from "lucide-react";

export default function AddNotificationModal({ isOpen, onClose, onAdd }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("custom"); // 'custom' | 'debt' | 'finance' | 'exercise' | 'system'
  const [priority, setPriority] = useState("normal"); // 'high' | 'normal' | 'low'
  const [dueDate, setDueDate] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [actionLabel, setActionLabel] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAdd({
      title: title.trim(),
      message: message.trim(),
      type,
      priority,
      dueDate: dueDate || null,
      actionUrl: actionUrl.trim() || null,
      actionLabel: actionLabel.trim() || (actionUrl ? "Bo'limga o'tish" : null),
    });

    // Reset & close
    setTitle("");
    setMessage("");
    setType("custom");
    setPriority("normal");
    setDueDate("");
    setActionUrl("");
    setActionLabel("");
    onClose();
  };

  const quickTemplates = [
    {
      title: "Bankomatdan naqd yechish",
      type: "finance",
      priority: "normal",
      actionUrl: "/money",
      actionLabel: "Money manager",
    },
    {
      title: "Qarzni qaytarish eslatmasi",
      type: "debt",
      priority: "high",
      actionUrl: "/debts",
      actionLabel: "Qarz daftari",
    },
    {
      title: "Kechki badantarbiya mashqi",
      type: "exercise",
      priority: "normal",
      actionUrl: "/exercises",
      actionLabel: "Mashqlar",
    },
    {
      title: "Baza zaxira nusxasini olish",
      type: "system",
      priority: "low",
      actionUrl: "/settings",
      actionLabel: "Sozlamalar",
    },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card modal-card--md notif-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header__left">
            <div className="modal-icon-badge modal-icon-badge--accent">
              <Bell size={18} />
            </div>
            <div>
              <h2 className="modal-title">Yangi eslatma yaratish</h2>
              <p className="modal-subtitle">
                Shaxsiy reja, moliyaviy vazifa yoki eslatma qo'shing
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Yopish"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tezkor andozalar (Quick templates) */}
        <div className="notif-templates">
          <span className="notif-templates__title">
            <Sparkles size={13} className="text-accent" />
            <span>Tezkor andozalar:</span>
          </span>
          <div className="notif-templates__list">
            {quickTemplates.map((t, idx) => (
              <button
                key={idx}
                type="button"
                className="notif-template-pill"
                onClick={() => {
                  setTitle(t.title);
                  setType(t.type);
                  setPriority(t.priority);
                  setActionUrl(t.actionUrl);
                  setActionLabel(t.actionLabel);
                }}
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="modal-form">
          {/* Sarlavha */}
          <div className="form-group">
            <label className="form-label">
              Sarlavha <span className="text-expense">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Masalan: Kommuna to'lovini amalga oshirish"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Izoh / Tafsilot */}
          <div className="form-group">
            <label className="form-label">Tafsilot yoki izoh</label>
            <textarea
              className="form-input form-textarea"
              rows={3}
              placeholder="Qo'shimcha eslatma matni yoki miqdor..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {/* Turi va Prioritet */}
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">
                <Tag size={14} />
                <span>Kategoriya turi</span>
              </label>
              <select
                className="form-input form-select"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="custom">Shaxsiy eslatma</option>
                <option value="finance">Moliya & Xarajat</option>
                <option value="debt">Qarz hisob-kitobi</option>
                <option value="exercise">Sport & Mashq</option>
                <option value="system">Tizim & Baza</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <AlertCircle size={14} />
                <span>Muhimlik darajasi</span>
              </label>
              <select
                className="form-input form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Past (Oddiy axborot)</option>
                <option value="normal">O'rtacha (Standart)</option>
                <option value="high">Yuqori (Shoshilinch / Muhim)</option>
              </select>
            </div>
          </div>

          {/* Belgilangan sana (DueDate) */}
          <div className="form-group">
            <label className="form-label">
              <Calendar size={14} />
              <span>Muddat yoki eslatish sanasi</span>
            </label>
            <input
              type="date"
              className="form-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Havola (Action Link) - optional */}
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">
                <LinkIcon size={14} />
                <span>Yo'naltirish sahifasi</span>
              </label>
              <select
                className="form-input form-select"
                value={actionUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  setActionUrl(val);
                  if (val === "/money") setActionLabel("Money manager");
                  else if (val === "/debts") setActionLabel("Qarz daftari");
                  else if (val === "/control") setActionLabel("Boshqaruv");
                  else if (val === "/exercises") setActionLabel("Mashqlar");
                  else if (val === "/settings") setActionLabel("Sozlamalar");
                }}
              >
                <option value="">Havola yo'q</option>
                <option value="/money">Money manager (/money)</option>
                <option value="/debts">Qarz daftari (/debts)</option>
                <option value="/control">Control panel (/control)</option>
                <option value="/exercises">Mashqlar (/exercises)</option>
                <option value="/settings">Sozlamalar & DB (/settings)</option>
              </select>
            </div>

            {actionUrl && (
              <div className="form-group">
                <label className="form-label">Tugma matni</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Masalan: O'tish"
                  value={actionLabel}
                  onChange={(e) => setActionLabel(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onClose}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={!title.trim()}
            >
              <Plus size={16} />
              <span>Eslatmani saqlash</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
