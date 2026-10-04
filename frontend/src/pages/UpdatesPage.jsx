import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Shield,
  Wrench,
  Plus,
  Trash2,
  RefreshCw,
  X,
  Bug,
  Lightbulb,
  HelpCircle,
} from "lucide-react";
import { updatesApi } from "../api/updates.js";
import { useAuth } from "../context/AuthContext.jsx";
import Loader from "../components/common/Loader.jsx";

export default function UpdatesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Ro'yxatlar va holatlar
  const [updates, setUpdates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Xabarnoma
  const [toast, setToast] = useState(null);

  // Shikoyat yuborish modali
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [selectedUpdateForComplaint, setSelectedUpdateForComplaint] = useState(null);
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);
  const [complaintForm, setComplaintForm] = useState({
    subject: "",
    message: "",
    complaintType: "complaint", // 'complaint' | 'bug' | 'suggestion' | 'question'
    priority: "normal",        // 'low' | 'normal' | 'high' | 'urgent'
    contactName: user?.fullName || user?.name || "",
    contactEmail: user?.email || "",
    contactPhone: user?.phoneNumber || "",
  });

  // Admin yangilanish qo'shish modali
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingUpdate, setIsCreatingUpdate] = useState(false);
  const [createForm, setCreateForm] = useState({
    version: "",
    title: "",
    category: "feature",
    badge: "",
    summary: "",
    detailsText: "",
    releaseDate: new Date().toISOString().split("T")[0],
    isPinned: false,
  });

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Ma'lumotlarni yuklash
  const loadUpdates = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await updatesApi.getUpdates();
      if (res.ok && res.updates) {
        setUpdates(res.updates);
      }
    } catch (err) {
      showToast("Yangilanishlarni yuklashda xatolik: " + err.message, "error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUpdates();
  }, [loadUpdates]);

  // Shikoyat yuborishni ochish (aniq bir yangilik bo'yicha)
  const handleOpenComplaint = (update) => {
    setSelectedUpdateForComplaint(update);
    setComplaintForm((prev) => ({
      ...prev,
      subject: update ? `${update.version} yangilanishi haqida shikoyat / fikr` : "Tizim yangilanishlari boʻyicha fikr",
      contactName: user?.fullName || user?.name || prev.contactName || "",
      contactEmail: user?.email || prev.contactEmail || "",
      contactPhone: user?.phoneNumber || prev.contactPhone || "",
    }));
    setShowComplaintModal(true);
  };

  // Shikoyatni jo'natish
  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    if (!complaintForm.subject.trim() || !complaintForm.message.trim()) {
      showToast("Mavzu va shikoyat matnini kiriting", "error");
      return;
    }

    setIsSubmittingComplaint(true);
    try {
      const payload = {
        userId: user?.id,
        updateId: selectedUpdateForComplaint?.id || null,
        updateVersion: selectedUpdateForComplaint?.version || null,
        updateTitle: selectedUpdateForComplaint?.title || null,
        complaintType: complaintForm.complaintType,
        priority: complaintForm.priority,
        subject: complaintForm.subject.trim(),
        message: complaintForm.message.trim(),
        contactName: complaintForm.contactName.trim() || user?.fullName || "Foydalanuvchi",
        contactEmail: complaintForm.contactEmail.trim() || user?.email || "",
        contactPhone: complaintForm.contactPhone.trim() || null,
      };

      const res = await updatesApi.submitComplaint(payload);
      if (res.ok) {
        showToast(res.message || "Shikoyatingiz adminga muvaffaqiyatli yetkazildi!");
        setShowComplaintModal(false);
        setComplaintForm({
          subject: "",
          message: "",
          complaintType: "complaint",
          priority: "normal",
          contactName: user?.fullName || user?.name || "",
          contactEmail: user?.email || "",
          contactPhone: user?.phoneNumber || "",
        });
      } else {
        showToast(res.error || "Shikoyatni yuborib bo'lmadi", "error");
      }
    } catch (err) {
      showToast("Xatolik: " + err.message, "error");
    } finally {
      setIsSubmittingComplaint(false);
    }
  };

  // Admin: Yangi yangilik e'lon qilish
  const handleCreateUpdate = async (e) => {
    e.preventDefault();
    if (!createForm.version.trim() || !createForm.title.trim() || !createForm.summary.trim()) {
      showToast("Versiya, sarlavha va qisqacha tavsif kiritilishi shart", "error");
      return;
    }

    setIsCreatingUpdate(true);
    try {
      const detailsList = createForm.detailsText
        .split("\n")
        .map((line) => line.trim().replace(/^[-*•]\s*/, ""))
        .filter(Boolean)
        .map((text) => ({ text, type: "new" }));

      const payload = {
        version: createForm.version.trim(),
        title: createForm.title.trim(),
        category: createForm.category,
        badge: createForm.badge.trim() || null,
        summary: createForm.summary.trim(),
        details: detailsList,
        releaseDate: createForm.releaseDate,
        isPinned: createForm.isPinned,
      };

      const res = await updatesApi.createUpdate(payload);
      if (res.ok) {
        showToast(res.message || "Yangi yangilanish eʼlon qilindi!");
        setShowCreateModal(false);
        setCreateForm({
          version: "",
          title: "",
          category: "feature",
          badge: "",
          summary: "",
          detailsText: "",
          releaseDate: new Date().toISOString().split("T")[0],
          isPinned: false,
        });
        loadUpdates(true);
      } else {
        showToast(res.error || "Yangilanish qo'shib bo'lmadi", "error");
      }
    } catch (err) {
      showToast("Xatolik: " + err.message, "error");
    } finally {
      setIsCreatingUpdate(false);
    }
  };

  // Admin: Yangilanishni o'chirish
  const handleDeleteUpdate = async (id, title) => {
    if (!window.confirm(`Haqiqatan ham "${title}" yangilanishini oʻchirmoqchimisiz?`)) return;

    try {
      const res = await updatesApi.deleteUpdate(id);
      if (res.ok) {
        showToast("Yangilanish oʻchirildi");
        loadUpdates(true);
      }
    } catch (err) {
      showToast("Xatolik: " + err.message, "error");
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: "60px 20px", display: "flex", justifyContent: "center" }}>
        <Loader size="lg" text="Tizim yangilanishlari yuklanmoqda..." subtext="Versiyalar va oʻzgarishlar jurnali" />
      </div>
    );
  }

  return (
    <div className="updates-page" style={{ maxWidth: 860, margin: "0 auto", paddingBottom: 60 }}>
      {/* Toast xabar */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 18px",
            borderRadius: 10,
            background: toast.type === "error" ? "rgba(239, 68, 68, 0.95)" : "rgba(16, 185, 129, 0.95)",
            color: "#fff",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            fontSize: "0.88rem",
            fontWeight: 600,
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          {toast.type === "error" ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", marginLeft: 8 }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Soddalashtirilgan Header (Keraksiz tugmalarsiz va faqat ma'lumotnoma) */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 10px rgba(56, 189, 248, 0.3)",
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="page-title" style={{ margin: 0, fontSize: "1.55rem" }}>
                Tizim Yangilanishlari
              </h1>
              <p className="page-subtitle" style={{ margin: 0 }}>
                OYBEK SysteM tizimi versiyalari va kiritilgan oʻzgarishlar maʼlumotnomasi
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="btn btn--primary btn--sm"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                }}
              >
                <Plus size={15} />
                <span>Yangilik qoʻshish</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => loadUpdates(true)}
              className="btn btn--secondary btn--sm"
              disabled={isRefreshing}
              style={{ padding: "7px 10px" }}
              title="Yangilash"
            >
              <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* Yangilanishlar ro'yxati (To'g'ridan-to'g'ri xronologik ma'lumotnoma) */}
      {updates.length === 0 ? (
        <div
          className="card"
          style={{
            padding: "50px 20px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Sparkles size={40} style={{ color: "var(--text-muted)", opacity: 0.4 }} />
          <div style={{ fontSize: "1.05rem", fontWeight: 700 }}>Hozircha yangilanishlar mavjud emas</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {updates.map((upd, idx) => {
            const isLatest = idx === 0 || upd.is_pinned;
            const details = Array.isArray(upd.details)
              ? upd.details
              : typeof upd.details === "string"
              ? JSON.parse(upd.details || "[]")
              : [];

            return (
              <div
                key={upd.id}
                className="card"
                style={{
                  padding: "20px 22px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  borderLeft: isLatest ? "4px solid #38bdf8" : "4px solid var(--border)",
                  background: "var(--surface)",
                  position: "relative",
                  boxShadow: isLatest ? "0 4px 20px rgba(56, 189, 248, 0.08)" : undefined,
                }}
              >
                {/* Yuqori qator: Versiya, Sana, Badge va Admin o'chirish */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: 800,
                        fontFamily: "monospace",
                        color: isLatest ? "#38bdf8" : "var(--text)",
                        background: "var(--surface-2)",
                        padding: "3px 10px",
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                      }}
                    >
                      {upd.version}
                    </span>

                    {upd.badge && (
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: isLatest ? "rgba(56, 189, 248, 0.18)" : "rgba(245, 158, 11, 0.18)",
                          color: isLatest ? "#38bdf8" : "#fbbf24",
                          border: `1px solid ${isLatest ? "rgba(56, 189, 248, 0.35)" : "rgba(245, 158, 11, 0.35)"}`,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Sparkles size={11} />
                        <span>{upd.badge}</span>
                      </span>
                    )}

                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Clock size={13} />
                      <span>{upd.release_date || "Yaqinda"}</span>
                    </span>
                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteUpdate(upd.id, upd.title)}
                      className="btn btn--danger btn--xs"
                      style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                      title="Ushbu yangilanishni o'chirish"
                    >
                      <Trash2 size={13} />
                      <span>Oʻchirish</span>
                    </button>
                  )}
                </div>

                {/* Sarlavha va Qisqacha Tavsif */}
                <div>
                  <h3 style={{ margin: "0 0 6px 0", fontSize: "1.12rem", fontWeight: 700, color: "var(--text)" }}>
                    {upd.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
                    {upd.summary}
                  </p>
                </div>

                {/* Tafsilotlar (Bandlar) */}
                {details.length > 0 && (
                  <div
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "12px 14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Asosiy oʻzgarishlar va imkoniyatlar:
                    </div>
                    {details.map((d, dIdx) => {
                      const text = typeof d === "string" ? d : d.text;
                      const type = typeof d === "string" ? "new" : d.type || "new";

                      let icon = <CheckCircle2 size={14} style={{ color: "#34d399", flexShrink: 0, marginTop: 2 }} />;
                      if (type === "security") {
                        icon = <Shield size={14} style={{ color: "#fbbf24", flexShrink: 0, marginTop: 2 }} />;
                      } else if (type === "fix") {
                        icon = <Wrench size={14} style={{ color: "#38bdf8", flexShrink: 0, marginTop: 2 }} />;
                      } else if (type === "improved") {
                        icon = <Sparkles size={14} style={{ color: "#a855f7", flexShrink: 0, marginTop: 2 }} />;
                      }

                      return (
                        <div key={dIdx} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "0.84rem", color: "var(--text)" }}>
                          {icon}
                          <span style={{ lineHeight: 1.45 }}>{text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pastki qism: Adminga shikoyat / fikr bildirish tugmasi */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    paddingTop: 8,
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleOpenComplaint(upd)}
                    className="btn btn--secondary btn--xs"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      borderColor: "rgba(239, 68, 68, 0.35)",
                      color: "#f87171",
                      background: "rgba(239, 68, 68, 0.06)",
                      fontWeight: 600,
                    }}
                    title="Ushbu yangilik bo'yicha adminga shikoyat yoki taklif yuborish"
                  >
                    <AlertTriangle size={13} />
                    <span>Ushbu yangilik haqida adminga shikoyat qilish</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =================================================================== */}
      {/* SHIKOYAT / FIKR BILDIRISH MODALI                                   */}
      {/* =================================================================== */}
      {showComplaintModal && (
        <div className="modal-backdrop" onClick={() => setShowComplaintModal(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: 540, width: "95%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "rgba(239, 68, 68, 0.15)",
                    color: "#f87171",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.12rem", fontWeight: 700 }}>
                    Adminga Shikoyat yoki Fikr yuborish
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {selectedUpdateForComplaint
                      ? `${selectedUpdateForComplaint.version} (${selectedUpdateForComplaint.title}) boʻyicha`
                      : "Tizim yangilanishi boʻyicha murojaat"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-icon btn-icon--sm"
                onClick={() => setShowComplaintModal(false)}
                aria-label="Yopish"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitComplaint} style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Murojaat turi */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
                  Murojaat turi:
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
                  {[
                    { id: "complaint", label: "Shikoyat", icon: AlertTriangle, color: "#f87171" },
                    { id: "bug", label: "Tizim xatosi", icon: Bug, color: "#fb923c" },
                    { id: "suggestion", label: "Taklif / Fikr", icon: Lightbulb, color: "#34d399" },
                    { id: "question", label: "Savol", icon: HelpCircle, color: "#38bdf8" },
                  ].map((type) => {
                    const Icon = type.icon;
                    const isSelected = complaintForm.complaintType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setComplaintForm({ ...complaintForm, complaintType: type.id })}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 8,
                          fontSize: "0.78rem",
                          fontWeight: isSelected ? 700 : 500,
                          background: isSelected ? "var(--surface-2)" : "transparent",
                          border: `1.5px solid ${isSelected ? type.color : "var(--border)"}`,
                          color: isSelected ? type.color : "var(--text-muted)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          cursor: "pointer",
                        }}
                      >
                        <Icon size={14} />
                        <span>{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Muhimlik darajasi */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
                  Muhimlik darajasi:
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { id: "normal", label: "Oddiy" },
                    { id: "high", label: "Muhim" },
                    { id: "urgent", label: "Shoshilinch!" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setComplaintForm({ ...complaintForm, priority: p.id })}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 6,
                        fontSize: "0.76rem",
                        fontWeight: complaintForm.priority === p.id ? 700 : 500,
                        background: complaintForm.priority === p.id ? "rgba(239, 68, 68, 0.15)" : "var(--surface-2)",
                        border: `1px solid ${complaintForm.priority === p.id ? "#f87171" : "var(--border)"}`,
                        color: complaintForm.priority === p.id ? "#f87171" : "var(--text-muted)",
                        cursor: "pointer",
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mavzu */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
                  Mavzu: <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Mavzuni kiriting..."
                  value={complaintForm.subject}
                  onChange={(e) => setComplaintForm({ ...complaintForm, subject: e.target.value })}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 8,
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    fontSize: "0.88rem",
                  }}
                  required
                />
              </div>

              {/* Xabar matni */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
                  Shikoyat yoki taklifingiz matni: <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Shikoyat, kamchilik yoki taklifingizni yozing..."
                  value={complaintForm.message}
                  onChange={(e) => setComplaintForm({ ...complaintForm, message: e.target.value })}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    fontSize: "0.86rem",
                    resize: "vertical",
                  }}
                  required
                />
              </div>

              {/* Aloqa ma'lumotlari */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Ismingiz:</label>
                  <input
                    type="text"
                    value={complaintForm.contactName}
                    onChange={(e) => setComplaintForm({ ...complaintForm, contactName: e.target.value })}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 6,
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      fontSize: "0.82rem",
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Telefon (Ixtiyoriy):</label>
                  <input
                    type="text"
                    placeholder="+998 90 123 45 67"
                    value={complaintForm.contactPhone}
                    onChange={(e) => setComplaintForm({ ...complaintForm, contactPhone: e.target.value })}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 6,
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      fontSize: "0.82rem",
                    }}
                  />
                </div>
              </div>

              {/* Pastki tugmalar */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowComplaintModal(false)}
                  className="btn btn--secondary"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingComplaint}
                  className="btn btn--danger"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  }}
                >
                  <Send size={15} />
                  <span>{isSubmittingComplaint ? "Yuborilmoqda..." : "Adminga yuborish"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* ADMIN YANGI YANGILIK QO'SHISH MODALI                                */}
      {/* =================================================================== */}
      {isAdmin && showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: 580, width: "95%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
                Yangi Tizim Yangilanishini Eʼlon Qilish
              </h3>
              <button
                type="button"
                className="btn-icon btn-icon--sm"
                onClick={() => setShowCreateModal(false)}
                aria-label="Yopish"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUpdate} style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600 }}>Versiya (masalan v5.3.0):</label>
                  <input
                    type="text"
                    placeholder="v5.3.0"
                    value={createForm.version}
                    onChange={(e) => setCreateForm({ ...createForm, version: e.target.value })}
                    style={{ padding: "8px 10px", borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                    required
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600 }}>Nishon (Badge):</label>
                  <input
                    type="text"
                    placeholder="Muhim yangilanish"
                    value={createForm.badge}
                    onChange={(e) => setCreateForm({ ...createForm, badge: e.target.value })}
                    style={{ padding: "8px 10px", borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600 }}>Sarlavha:</label>
                <input
                  type="text"
                  placeholder="Yangilanish sarlavhasi..."
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  style={{ padding: "8px 10px", borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                  required
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600 }}>Qisqacha tavsif:</label>
                <textarea
                  rows={2}
                  placeholder="Yangilanish haqida umumiy mazmun..."
                  value={createForm.summary}
                  onChange={(e) => setCreateForm({ ...createForm, summary: e.target.value })}
                  style={{ padding: "8px 10px", borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", resize: "vertical" }}
                  required
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600 }}>
                  Asosiy oʻzgarishlar bandlari (Har bir qator alohida band):
                </label>
                <textarea
                  rows={4}
                  placeholder="Har bir yangi funksiyani alohida qatorda yozing..."
                  value={createForm.detailsText}
                  onChange={(e) => setCreateForm({ ...createForm, detailsText: e.target.value })}
                  style={{ padding: "8px 10px", borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn--secondary">
                  Bekor qilish
                </button>
                <button type="submit" disabled={isCreatingUpdate} className="btn btn--primary">
                  {isCreatingUpdate ? "Saqlanmoqda..." : "Eʼlon qilish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
