import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "../context/NotificationsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { updatesApi, getLocalUpdates, isUpdatesFresh } from "../api/updates.js";
import Loader from "../components/common/Loader.jsx";
import {
  Sparkles,
  Bell,
  AlertTriangle,
  ArrowRight,
  Clock,
  CheckCircle2,
  Shield,
  Wrench,
  Send,
  Plus,
  Trash2,
  RefreshCw,
  X,
  Bug,
  Lightbulb,
  HelpCircle,
  MessageSquare,
} from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { notifications, unreadCount } = useNotifications();

  // Yangilanishlar holati (darhol keshdan yuklanadi, hech qanday to'siqli loader chiqmaydi)
  const [updates, setUpdates] = useState(() => getLocalUpdates());
  const [isLoadingUpdates, setIsLoadingUpdates] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Xabarnoma toast
  const [toast, setToast] = useState(null);

  // Shikoyat yuborish modali
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [selectedUpdateForComplaint, setSelectedUpdateForComplaint] = useState(null);
  const [complaintType, setComplaintType] = useState("complaint"); // 'complaint' | 'bug' | 'suggestion' | 'question'
  const [priority, setPriority] = useState("normal");             // 'low' | 'normal' | 'high' | 'urgent'
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin: Yangilik qo'shish modali
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
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
    setTimeout(() => setToast(null), 4000);
  };

  const todayStr = new Date().toLocaleDateString("uz-UZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const urgentNotification =
    notifications.find((n) => !n.isRead && n.priority === "high") ||
    notifications.find((n) => !n.isRead);

  // DBdan yangilanishlarni yuklash (1 kunda 1 marta fon rejimida)
  const loadUpdates = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    }

    try {
      const res = await updatesApi.getUpdates(isManual);
      if (res.ok && res.updates) {
        setUpdates(res.updates);
      }
    } catch (err) {
      if (isManual) {
        showToast("Yangilanishlarni yuklashda xatolik: " + err.message, "error");
      }
    } finally {
      setIsLoadingUpdates(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Sahifaga kirilganda faqat 1 kunda 1 marta fonda yangilanadi, ekranda loader chiqmaydi
    if (!isUpdatesFresh()) {
      loadUpdates(false);
    }
  }, [loadUpdates]);

  // Shikoyat modalini ochish (Tepadagi tugmadan yoki har qanday kartochkadan)
  const handleOpenComplaint = (update = null) => {
    setSelectedUpdateForComplaint(update || updates[0] || null);
    setSubject(
      update
        ? `${update.version} yangilanishi haqida`
        : updates[0]
        ? `${updates[0].version} yangilanishi haqida`
        : "Tizim yangilanishi haqida"
    );
    setMessage("");
    setComplaintType("complaint");
    setPriority("normal");
    setShowComplaintModal(true);
  };

  // Shikoyatni jo'natish (Ism va email avtomatik hisobdan olinadi!)
  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      showToast("Shikoyat yoki taklifingiz matnini kiriting", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const targetUpdate = selectedUpdateForComplaint;
      const userName = user?.fullName || user?.name || user?.username || "Foydalanuvchi";
      const userEmail = user?.email || "noma'lum";

      const payload = {
        userId: user?.id,
        updateId: targetUpdate?.id || null,
        updateVersion: targetUpdate?.version || null,
        updateTitle: targetUpdate?.title || null,
        complaintType,
        priority,
        subject: subject.trim() || `${targetUpdate?.version || "Tizim"} boʻyicha murojaat`,
        message: message.trim(),
        contactName: userName,
        contactEmail: userEmail,
        contactPhone: user?.phoneNumber || null,
      };

      const res = await updatesApi.submitComplaint(payload);
      if (res.ok) {
        showToast(res.message || "Shikoyatingiz adminga yetkazildi!");
        setShowComplaintModal(false);
        setMessage("");
      } else {
        showToast(res.error || "Shikoyatni yuborib bo'lmadi", "error");
      }
    } catch (err) {
      showToast("Xatolik: " + err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin: Yangi yangilanish kiritish
  const handleCreateUpdate = async (e) => {
    e.preventDefault();
    if (!createForm.version.trim() || !createForm.title.trim() || !createForm.summary.trim()) {
      showToast("Versiya, sarlavha va qisqacha tavsif kiritilishi shart", "error");
      return;
    }

    setIsCreating(true);
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
      setIsCreating(false);
    }
  };

  // Admin: Yangilanishni o'chirish
  const handleDeleteUpdate = async (id, title) => {
    if (!window.confirm(`"${title}" yangilanishini bazadan oʻchirmoqchimisiz?`)) return;
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

  return (
    <div className="home-page" style={{ maxWidth: 880, margin: "0 auto", paddingBottom: 60 }}>
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

      {/* Yuqori Sarlavha Qismi */}
      <div className="home-header" style={{ marginBottom: 16 }}>
        <div className="home-header__top">
          <span className="home-header__date">{todayStr}</span>
          <div className="flex items-center justify-between">
            <h1 className="page-title">Bosh sahifa</h1>
            <Link
              to="/notifications"
              className="home-header__notif-btn"
              title="Bildirishnomalar markazi"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="home-header__notif-pill">{unreadCount}</span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Muhim bildirishnoma bo'lsa */}
      {urgentNotification && (
        <Link
          to={urgentNotification.actionUrl || "/notifications"}
          className={`home-notif-banner ${
            urgentNotification.priority === "high" ? "home-notif-banner--high" : ""
          }`}
          style={{ marginBottom: 20 }}
        >
          <div className="home-notif-banner__icon">
            {urgentNotification.priority === "high" ? (
              <AlertTriangle size={17} />
            ) : (
              <Bell size={17} />
            )}
          </div>
          <div className="home-notif-banner__content">
            <span className="home-notif-banner__title">{urgentNotification.title}</span>
            <span className="home-notif-banner__desc">{urgentNotification.message}</span>
          </div>
          <ArrowRight size={15} className="home-notif-banner__arrow" />
        </Link>
      )}

      {/* ========================================================================= */}
      {/* TIZIM YANGILANISHLARI (Barcha ortiqcha tugmalar o'rniga to'g'ridan-to'g'ri yangiliklar) */}
      {/* ========================================================================= */}
      <div style={{ marginTop: 8 }}>
        {/* Yangilanishlar bo'limi bosh sarlavhasi va tezkor shikoyat tugmasi */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16,
            paddingBottom: 10,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(56, 189, 248, 0.3)",
              }}
            >
              <Sparkles size={19} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--text)" }}>
                Tizim Yangiliklari & Oʻzgarishlar
              </h2>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Ilovadagi soʻnggi yangilanishlar maʼlumotnomasi
              </span>
            </div>
          </div>

          {/* Harakat tugmalari: Tezkor shikoyat qilish & Admin qo'shish */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => handleOpenComplaint(null)}
              className="btn btn--danger btn--sm"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                borderColor: "#f87171",
                fontWeight: 600,
                fontSize: "0.82rem",
                padding: "7px 13px",
              }}
              title="Yangiliklar bo'yicha adminga shikoyat yoki taklif yuborish"
            >
              <AlertTriangle size={15} />
              <span>Adminga shikoyat qilish</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="btn btn--primary btn--sm"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: "0.82rem",
                  padding: "7px 12px",
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
              <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Maqolalar ro'yxati */}
        {isLoadingUpdates ? (
          <div style={{ padding: "40px 20px", display: "flex", justifyContent: "center" }}>
            <Loader size="md" text="Yangiliklar yuklanmoqda..." />
          </div>
        ) : updates.length === 0 ? (
          <div
            className="card"
            style={{
              padding: "40px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Sparkles size={36} style={{ color: "var(--text-muted)", opacity: 0.4 }} />
            <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>Hozircha yangiliklar kiritilmagan</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {updates.map((upd, idx) => {
              const isLatest = idx === 0 || upd.is_pinned;
              const details = Array.isArray(upd.details)
                ? upd.details
                : typeof upd.details === "string"
                ? JSON.parse(upd.details || "[]")
                : [];

              return (
                <article
                  key={upd.id}
                  className="card"
                  style={{
                    padding: "18px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    borderLeft: isLatest ? "4px solid #38bdf8" : "4px solid var(--border)",
                    background: "var(--surface)",
                    position: "relative",
                  }}
                >
                  {/* Yuqori qator: Versiya, Sana, Badge va Shikoyat tugmasi */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: "1.05rem",
                          fontWeight: 800,
                          fontFamily: "monospace",
                          color: isLatest ? "#38bdf8" : "var(--text)",
                          background: "var(--surface-2)",
                          padding: "2px 8px",
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                        }}
                      >
                        {upd.version}
                      </span>

                      {upd.badge && (
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: 5,
                            background: isLatest ? "rgba(56, 189, 248, 0.18)" : "rgba(245, 158, 11, 0.18)",
                            color: isLatest ? "#38bdf8" : "#fbbf24",
                            border: `1px solid ${isLatest ? "rgba(56, 189, 248, 0.35)" : "rgba(245, 158, 11, 0.35)"}`,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <Sparkles size={11} />
                          <span>{upd.badge}</span>
                        </span>
                      )}

                      <span
                        style={{
                          fontSize: "0.74rem",
                          color: "var(--text-muted)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Clock size={12} />
                        <span>{upd.release_date || "Yaqinda"}</span>
                      </span>
                    </div>

                    {/* Har bir kartochkadagi tezkor harakatlar */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => handleOpenComplaint(upd)}
                        className="btn btn--secondary btn--xs"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          borderColor: "rgba(239, 68, 68, 0.35)",
                          color: "#f87171",
                          background: "rgba(239, 68, 68, 0.06)",
                          fontWeight: 600,
                        }}
                        title={`${upd.version} bo'yicha adminga shikoyat qilish`}
                      >
                        <AlertTriangle size={12} />
                        <span>Shikoyat qilish</span>
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUpdate(upd.id, upd.title)}
                          className="btn btn--danger btn--xs"
                          style={{ padding: "4px 8px" }}
                          title="Ushbu yangilanishni o'chirish"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sarlavha va Qisqacha Tavsif */}
                  <div>
                    <h3 style={{ margin: "0 0 4px 0", fontSize: "1.08rem", fontWeight: 700, color: "var(--text)" }}>
                      {upd.title}
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
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
                        padding: "10px 12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {details.map((d, dIdx) => {
                        const text = typeof d === "string" ? d : d.text;
                        const type = typeof d === "string" ? "new" : d.type || "new";

                        let icon = <CheckCircle2 size={13} style={{ color: "#34d399", flexShrink: 0, marginTop: 2 }} />;
                        if (type === "security") {
                          icon = <Shield size={13} style={{ color: "#fbbf24", flexShrink: 0, marginTop: 2 }} />;
                        } else if (type === "fix") {
                          icon = <Wrench size={13} style={{ color: "#38bdf8", flexShrink: 0, marginTop: 2 }} />;
                        } else if (type === "improved") {
                          icon = <Sparkles size={13} style={{ color: "#a855f7", flexShrink: 0, marginTop: 2 }} />;
                        }

                        return (
                          <div key={dIdx} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: "0.82rem", color: "var(--text)" }}>
                            {icon}
                            <span style={{ lineHeight: 1.4 }}>{text}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SHIKOYAT / FIKR BILDIRISH MODALI (Ism so'ralmaydi, hisobdan olinadi!)        */}
      {/* ========================================================================= */}
      {showComplaintModal && (
        <div className="modal-backdrop" onClick={() => !isSubmitting && setShowComplaintModal(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: 500, width: "95%" }}
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
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.08rem", fontWeight: 700 }}>
                    Adminga Shikoyat / Fikr yuborish
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--text-muted)" }}>
                    {selectedUpdateForComplaint?.version
                      ? `${selectedUpdateForComplaint.version} yangilanishi boʻyicha`
                      : "Tizim boʻyicha murojaat"}
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

            <form onSubmit={handleSubmitComplaint} style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Qaysi yangilanish bo'yicha */}
              {updates.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)" }}>
                    Qaysi yangilanish haqida:
                  </label>
                  <select
                    value={selectedUpdateForComplaint?.id || ""}
                    onChange={(e) => {
                      const found = updates.find((u) => u.id === e.target.value);
                      setSelectedUpdateForComplaint(found || null);
                      if (found) setSubject(`${found.version} yangilanishi haqida`);
                    }}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 6,
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      fontSize: "0.82rem",
                    }}
                  >
                    {updates.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.version}: {u.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Murojaat turi */}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)" }}>
                  Murojaat turi:
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 6 }}>
                  {[
                    { id: "complaint", label: "Shikoyat", icon: AlertTriangle, color: "#f87171" },
                    { id: "bug", label: "Xatolik", icon: Bug, color: "#fb923c" },
                    { id: "suggestion", label: "Taklif", icon: Lightbulb, color: "#34d399" },
                    { id: "question", label: "Savol", icon: HelpCircle, color: "#38bdf8" },
                  ].map((type) => {
                    const Icon = type.icon;
                    const isSelected = complaintType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setComplaintType(type.id)}
                        style={{
                          padding: "7px 8px",
                          borderRadius: 7,
                          fontSize: "0.76rem",
                          fontWeight: isSelected ? 700 : 500,
                          background: isSelected ? "var(--surface-2)" : "transparent",
                          border: `1.5px solid ${isSelected ? type.color : "var(--border)"}`,
                          color: isSelected ? type.color : "var(--text-muted)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 5,
                          cursor: "pointer",
                        }}
                      >
                        <Icon size={13} />
                        <span>{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Shikoyat matni */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)" }}>
                  Shikoyat yoki taklifingiz matni: <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Qanday muammo, kamchilik yoki taklifingiz bor?..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    fontSize: "0.85rem",
                    resize: "vertical",
                  }}
                  required
                />
              </div>

              {/* Bildirish: Hisob ma'lumoti */}
              <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", background: "var(--surface-2)", padding: "7px 10px", borderRadius: 6 }}>
                Hisobingiz: <strong>{user?.fullName || user?.name || user?.username || "Foydalanuvchi"}</strong> ({user?.email || "Gmail"}) orqali adminga yuboriladi.
              </div>

              {/* Pastki tugmalar */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowComplaintModal(false)}
                  className="btn btn--secondary btn--sm"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn--danger btn--sm"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    fontWeight: 600,
                  }}
                >
                  <Send size={14} />
                  <span>{isSubmitting ? "Yuborilmoqda..." : "Adminga yuborish"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADMIN YANGI YANGILIK QO'SHISH MODALI                                      */}
      {/* ========================================================================= */}
      {isAdmin && showCreateModal && (
        <div className="modal-backdrop" onClick={() => !isCreating && setShowCreateModal(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: 540, width: "95%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                Yangi Tizim Yangilanishini Kiritish
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

            <form onSubmit={handleCreateUpdate} style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: "0.76rem", fontWeight: 600 }}>Versiya (masalan v5.3.0):</label>
                  <input
                    type="text"
                    placeholder="v5.3.0"
                    value={createForm.version}
                    onChange={(e) => setCreateForm({ ...createForm, version: e.target.value })}
                    style={{ padding: "8px 10px", borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "0.82rem" }}
                    required
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: "0.76rem", fontWeight: 600 }}>Nishon (Badge):</label>
                  <input
                    type="text"
                    placeholder="Muhim yangilanish"
                    value={createForm.badge}
                    onChange={(e) => setCreateForm({ ...createForm, badge: e.target.value })}
                    style={{ padding: "8px 10px", borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "0.82rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "0.76rem", fontWeight: 600 }}>Sarlavha:</label>
                <input
                  type="text"
                  placeholder="Yangilanish nomi..."
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  style={{ padding: "8px 10px", borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "0.82rem" }}
                  required
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "0.76rem", fontWeight: 600 }}>Qisqacha tavsif:</label>
                <textarea
                  rows={2}
                  placeholder="Yangilanish haqida qisqacha..."
                  value={createForm.summary}
                  onChange={(e) => setCreateForm({ ...createForm, summary: e.target.value })}
                  style={{ padding: "8px 10px", borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "0.82rem", resize: "vertical" }}
                  required
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "0.76rem", fontWeight: 600 }}>
                  Asosiy bandlar (Har biri alohida qatorda):
                </label>
                <textarea
                  rows={3}
                  placeholder="Har bir yangi funksiyani yangi qatordan yozing..."
                  value={createForm.detailsText}
                  onChange={(e) => setCreateForm({ ...createForm, detailsText: e.target.value })}
                  style={{ padding: "8px 10px", borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "0.82rem", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn--secondary btn--sm">
                  Bekor qilish
                </button>
                <button type="submit" disabled={isCreating} className="btn btn--primary btn--sm">
                  {isCreating ? "Saqlanmoqda..." : "Eʼlon qilish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
