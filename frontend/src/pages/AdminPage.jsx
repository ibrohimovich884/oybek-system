import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Trash2,
  UserPlus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  Unlock,
  Coins,
  Receipt,
  HandCoins,
  Dumbbell,
  ArrowRight,
  UserX,
  X,
  Database,
  Info,
  Clock,
  MessageSquare,
  Send,
  Bug,
  Lightbulb,
  HelpCircle,
} from "lucide-react";
import { adminApi } from "../api/admin.js";
import { updatesApi } from "../api/updates.js";
import { useAuth } from "../context/AuthContext.jsx";
import Loader from "../components/common/Loader.jsx";

export default function AdminPage() {
  const { user: currentAdmin } = useAuth();

  // Holatlar
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all"); // 'all' | 'user' | 'admin'
  const [filterStatus, setFilterStatus] = useState("all"); // 'all' | 'active' | 'blocked'
  const [activeTab, setActiveTab] = useState("users"); // 'users' | 'hash-lab' | 'cascade-info'

  // Xabarlar
  const [toast, setToast] = useState(null); // { type: 'success'|'error', text: '' }

  // Modallar
  const [resetModalUser, setResetModalUser] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [resetSuccessData, setResetSuccessData] = useState(null);
  const [isResetting, setIsResetting] = useState(false);

  const [deleteModalUser, setDeleteModalUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    fullName: "",
    username: "",
    phoneNumber: "",
    role: "user",
  });
  const [isCreating, setIsCreating] = useState(false);

  const [hashDetailUser, setHashDetailUser] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Hash laboratoriyasi holati
  const [labInputPassword, setLabInputPassword] = useState("");
  const [labCompareHash, setLabCompareHash] = useState("");
  const [labResult, setLabResult] = useState(null);
  const [isHashing, setIsHashing] = useState(false);

  // Shikoyatlar va Fikrlar holatlari
  const [complaints, setComplaints] = useState([]);
  const [complaintStats, setComplaintStats] = useState({ total: 0, pending: 0, in_review: 0, resolved: 0, rejected: 0 });
  const [complaintFilterStatus, setComplaintFilterStatus] = useState("all");
  const [complaintFilterType, setComplaintFilterType] = useState("all");
  const [complaintSearch, setComplaintSearch] = useState("");
  const [selectedComplaintForReply, setSelectedComplaintForReply] = useState(null);
  const [replyStatus, setReplyStatus] = useState("resolved");
  const [replyNotes, setReplyNotes] = useState("");
  const [isUpdatingComplaint, setIsUpdatingComplaint] = useState(false);

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Ma'lumotlarni yuklash
  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [usersRes, statsRes, complaintsRes] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getStats(),
        updatesApi.getAdminComplaints().catch(() => ({ ok: false })),
      ]);

      if (usersRes.ok && usersRes.users) {
        setUsers(usersRes.users);
      }
      if (statsRes.ok && statsRes.stats) {
        setStats(statsRes.stats);
      }
      if (complaintsRes.ok && complaintsRes.complaints) {
        setComplaints(complaintsRes.complaints);
        if (complaintsRes.stats) {
          setComplaintStats(complaintsRes.stats);
        }
      }
    } catch (err) {
      showToast("Maʼlumotlarni yuklashda xatolik: " + err.message, "error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Tasodifiy mustahkam parol generatsiyasi
  const generateStrongPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPasswordInput(pwd);
    setGeneratedPassword(pwd);
  };

  // Parolni tiklash (Reset Password)
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetModalUser || !newPasswordInput.trim()) return;

    setIsResetting(true);
    try {
      const res = await adminApi.resetPassword(resetModalUser.id, newPasswordInput.trim());
      if (res.ok) {
        setResetSuccessData({
          user: resetModalUser,
          newPassword: newPasswordInput.trim(),
          newHash: res.newHash,
        });
        showToast(`"${resetModalUser.full_name || resetModalUser.email}" paroli yangilandi!`);
        loadData(true);
      } else {
        showToast(res.error || "Parolni yangilashda xatolik", "error");
      }
    } catch (err) {
      showToast("Xatolik: " + err.message, "error");
    } finally {
      setIsResetting(false);
    }
  };

  // Foydalanuvchini o'chirish (CASCADE)
  const handleDeleteUser = async () => {
    if (!deleteModalUser) return;
    setIsDeleting(true);

    try {
      const res = await adminApi.deleteUser(deleteModalUser.id);
      if (res.ok) {
        showToast(res.message || "Foydalanuvchi va barcha maʼlumotlari toʻliq oʻchirildi!");
        setDeleteModalUser(null);
        loadData(true);
      } else {
        showToast(res.error || "Oʻchirishda xatolik yuz berdi", "error");
      }
    } catch (err) {
      showToast("Xatolik: " + err.message, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Foydalanuvchi holatini o'zgartirish
  const handleToggleStatus = async (user) => {
    const nextStatus = !user.is_active;
    try {
      const res = await adminApi.toggleStatus(user.id, nextStatus);
      if (res.ok) {
        showToast(nextStatus ? `"${user.full_name}" faollashtirildi` : `"${user.full_name}" bloklandi`);
        loadData(true);
      } else {
        showToast(res.error || "Holatni o'zgartirib bo'lmadi", "error");
      }
    } catch (err) {
      showToast("Xatolik: " + err.message, "error");
    }
  };

  // Yangi foydalanuvchi yaratish
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.email.trim() || !createForm.password.trim()) {
      showToast("Email va parol kiritilishi shart", "error");
      return;
    }

    setIsCreating(true);
    try {
      const res = await adminApi.createUser(createForm);
      if (res.ok) {
        showToast(res.message || "Yangi foydalanuvchi yaratildi!");
        setShowCreateModal(false);
        setCreateForm({
          email: "",
          password: "",
          fullName: "",
          username: "",
          phoneNumber: "",
          role: "user",
        });
        loadData(true);
      } else {
        showToast(res.error || "Foydalanuvchini yaratib bo'lmadi", "error");
      }
    } catch (err) {
      showToast("Xatolik: " + err.message, "error");
    } finally {
      setIsCreating(false);
    }
  };

  // Hash vositasi orqali parolni xeshlash
  const handleRunHashLab = async (e) => {
    if (e) e.preventDefault();
    if (!labInputPassword.trim()) return;

    setIsHashing(true);
    try {
      const res = await adminApi.hashTool(labInputPassword.trim(), labCompareHash.trim());
      if (res.ok && res.data) {
        setLabResult(res.data);
      }
    } catch (err) {
      showToast("Xeshlashda xatolik: " + err.message, "error");
    } finally {
      setIsHashing(false);
    }
  };

  // Filtrlangan foydalanuvchilar
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Qidiruv
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        (u.full_name && u.full_name.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        (u.username && u.username.toLowerCase().includes(term)) ||
        (u.phone_number && u.phone_number.includes(term));

      // Rol
      const matchRole =
        filterRole === "all" ||
        (filterRole === "admin" && u.role === "admin") ||
        (filterRole === "user" && u.role !== "admin");

      // Holat
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && u.is_active !== false) ||
        (filterStatus === "blocked" && u.is_active === false);

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchTerm, filterRole, filterStatus]);

  // Filtrlangan shikoyatlar
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const term = complaintSearch.toLowerCase().trim();
      const matchSearch =
        !term ||
        c.subject?.toLowerCase().includes(term) ||
        c.message?.toLowerCase().includes(term) ||
        c.user_name?.toLowerCase().includes(term) ||
        c.user_email?.toLowerCase().includes(term) ||
        c.update_version?.toLowerCase().includes(term);

      const matchStatus = complaintFilterStatus === "all" || c.status === complaintFilterStatus;
      const matchType = complaintFilterType === "all" || c.complaint_type === complaintFilterType;

      return matchSearch && matchStatus && matchType;
    });
  }, [complaints, complaintSearch, complaintFilterStatus, complaintFilterType]);

  const handleUpdateComplaintStatus = async (id, status, adminNotes) => {
    try {
      const res = await updatesApi.updateComplaintStatus(id, { status, adminNotes });
      if (res.ok) {
        showToast(res.message || "Holat yangilandi!");
        loadData(true);
        if (selectedComplaintForReply?.id === id) {
          setSelectedComplaintForReply(null);
        }
      } else {
        showToast(res.error || "Xatolik yuz berdi", "error");
      }
    } catch (err) {
      showToast("Xatolik: " + err.message, "error");
    }
  };

  const handleDeleteComplaint = async (id) => {
    if (!window.confirm("Haqiqatan ham ushbu shikoyatni oʻchirmoqchimisiz?")) return;
    try {
      const res = await updatesApi.deleteComplaint(id);
      if (res.ok) {
        showToast("Shikoyat oʻchirildi");
        loadData(true);
      } else {
        showToast(res.error || "Oʻchirishda xatolik", "error");
      }
    } catch (err) {
      showToast("Xatolik: " + err.message, "error");
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: "40px 20px", minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader size="lg" text="Admin Panel yuklanmoqda..." subtext="Foydalanuvchilar va xavfsizlik jurnallari olinmoqda" />
      </div>
    );
  }

  return (
    <div className="admin-page" style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 60 }}>
      {/* Toast xabarnoma */}
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

      {/* Yuqori Header */}
      <div className="admin-header" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  color: "#18181b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 10px rgba(245, 158, 11, 0.3)",
                }}
              >
                <ShieldCheck size={22} />
              </div>
              <h1 className="page-title" style={{ margin: 0, fontSize: "1.65rem", display: "flex", alignItems: "center", gap: 8 }}>
                <span>Admin Panel</span>
                <span
                  style={{
                    fontSize: "0.68rem",
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: "rgba(245, 158, 11, 0.18)",
                    color: "#fbbf24",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  Boshqaruv
                </span>
              </h1>
            </div>
            <p className="page-subtitle" style={{ margin: 0 }}>
              Foydalanuvchilar nazorati, parollarni tiklash (Hash Password) va maʼlumotlar tozalanishi (CASCADE)
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={() => loadData(true)}
              className="btn btn--secondary btn--sm"
              disabled={isRefreshing}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              title="Ro'yxatni yangilash"
            >
              <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} />
              <span>{isRefreshing ? "Yangilanmoqda..." : "Yangilash"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="btn btn--primary btn--sm"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                borderColor: "#34d399",
              }}
            >
              <UserPlus size={16} />
              <span>Yangi User</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistika Kartochkalari */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <div className="card" style={{ padding: "14px 18px", borderLeft: "3px solid #f59e0b" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Jami Userlar</span>
            <Users size={18} style={{ color: "#f59e0b" }} />
          </div>
          <div style={{ fontSize: "1.65rem", fontWeight: 800, marginTop: 4, color: "var(--text)" }}>
            {stats?.totalUsers ?? users.length}
          </div>
          <div style={{ fontSize: "0.72rem", color: "#34d399", marginTop: 2 }}>
            ● {stats?.activeUsers ?? users.filter((u) => u.is_active !== false).length} ta faol foydalanuvchi
          </div>
        </div>

        <div className="card" style={{ padding: "14px 18px", borderLeft: "3px solid #38bdf8" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Jami Tranzaksiyalar</span>
            <Receipt size={18} style={{ color: "#38bdf8" }} />
          </div>
          <div style={{ fontSize: "1.65rem", fontWeight: 800, marginTop: 4, color: "var(--text)" }}>
            {stats?.totalTransactions ?? 0}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
            Barcha foydalanuvchilar hisobidan
          </div>
        </div>

        <div className="card" style={{ padding: "14px 18px", borderLeft: "3px solid #a855f7" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Xavfsizlik & Hash</span>
            <KeyRound size={18} style={{ color: "#a855f7" }} />
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: 7, color: "var(--text)" }}>
            Bcrypt + Pepper
          </div>
          <div style={{ fontSize: "0.72rem", color: "#a855f7", marginTop: 2 }}>
            HMAC-SHA256 maxfiy kalitli xeshlash
          </div>
        </div>

        <div className="card" style={{ padding: "14px 18px", borderLeft: "3px solid #10b981" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>CASCADE Tozalash</span>
            <Database size={18} style={{ color: "#10b981" }} />
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: 7, color: "var(--text)" }}>
            Faol (100% tozalash)
          </div>
          <div style={{ fontSize: "0.72rem", color: "#34d399", marginTop: 2 }}>
            User oʻchirilganda barcha maʼlumot ketadi
          </div>
        </div>

        <div
          className="card"
          onClick={() => setActiveTab("complaints")}
          style={{
            padding: "14px 18px",
            borderLeft: "3px solid #ef4444",
            cursor: "pointer",
            background: activeTab === "complaints" ? "rgba(239, 68, 68, 0.08)" : undefined,
            transition: "all 0.15s ease",
          }}
          title="Shikoyatlar va fikrlarni ko'rish"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Shikoyat & Fikrlar</span>
            <MessageSquare size={18} style={{ color: "#ef4444" }} />
          </div>
          <div style={{ fontSize: "1.65rem", fontWeight: 800, marginTop: 4, color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
            <span>{complaintStats.total || complaints.length}</span>
            {complaintStats.pending > 0 && (
              <span
                style={{
                  fontSize: "0.68rem",
                  background: "#ef4444",
                  color: "#fff",
                  padding: "2px 7px",
                  borderRadius: 10,
                  fontWeight: 800,
                }}
              >
                {complaintStats.pending} yangi
              </span>
            )}
          </div>
          <div style={{ fontSize: "0.72rem", color: complaintStats.pending > 0 ? "#f87171" : "#34d399", marginTop: 2 }}>
            {complaintStats.pending > 0 ? `● ${complaintStats.pending} ta ko'rib chiqilmagan` : "● Barcha shikoyatlar ko'rilgan"}
          </div>
        </div>
      </div>

      {/* Tab Navigatsiyasi */}
      <div className="money-tabs" style={{ marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`money-tab-btn ${activeTab === "users" ? "is-active" : ""}`}
        >
          <Users size={16} />
          <span>Foydalanuvchilar roʻyxati ({filteredUsers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("complaints")}
          className={`money-tab-btn ${activeTab === "complaints" ? "is-active" : ""}`}
        >
          <MessageSquare size={16} />
          <span>Shikoyatlar & Fikrlar ({complaints.length})</span>
          {complaintStats.pending > 0 && (
            <span
              style={{
                background: "#ef4444",
                color: "#fff",
                fontSize: "0.68rem",
                fontWeight: 800,
                padding: "2px 6px",
                borderRadius: 10,
                marginLeft: 4,
              }}
            >
              {complaintStats.pending}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("hash-lab")}
          className={`money-tab-btn ${activeTab === "hash-lab" ? "is-active" : ""}`}
        >
          <KeyRound size={16} />
          <span>Hash Password vositasi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cascade-info")}
          className={`money-tab-btn ${activeTab === "cascade-info" ? "is-active" : ""}`}
        >
          <Database size={16} />
          <span>CASCADE Qoidasi (Savol-Javob)</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: FOYDALANUVCHILAR RO'YXATI                                     */}
      {/* =================================================================== */}
      {activeTab === "users" && (
        <div className="tab-content-fade">
          {/* Qidiruv va Filtr paneli */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "14px 16px",
              marginBottom: 16,
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Qidiruv input */}
            <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                type="text"
                placeholder="Ism, Gmail, username yoki telefon..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  paddingLeft: 36,
                  paddingRight: 12,
                  height: 38,
                  borderRadius: 8,
                  fontSize: "0.85rem",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filtrlar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>Rol:</span>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                style={{
                  height: 38,
                  padding: "0 10px",
                  borderRadius: 8,
                  fontSize: "0.82rem",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  cursor: "pointer",
                }}
              >
                <option value="all">Barcha rollar</option>
                <option value="user">Oddiy foydalanuvchilar</option>
                <option value="admin">Faqat Adminlar</option>
              </select>

              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600, marginLeft: 6 }}>
                Holat:
              </span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  height: 38,
                  padding: "0 10px",
                  borderRadius: 8,
                  fontSize: "0.82rem",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  cursor: "pointer",
                }}
              >
                <option value="all">Hammasi</option>
                <option value="active">Faqat Faollar</option>
                <option value="blocked">Bloklanganlar</option>
              </select>
            </div>
          </div>

          {/* Foydalanuvchilar ro'yxati jadval/kartalar */}
          {filteredUsers.length === 0 ? (
            <div
              className="card"
              style={{
                padding: "48px 24px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <UserX size={44} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
              <div style={{ fontSize: "1rem", fontWeight: 700 }}>Hech qanday foydalanuvchi topilmadi</div>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", maxWidth: 360 }}>
                Qidiruv soʻrovini oʻzgartirib koʻring yoki yangi foydalanuvchi qoʻshing.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredUsers.map((u) => {
                const isAdmin = u.role === "admin";
                const isActive = u.is_active !== false;
                const isSelf = currentAdmin?.id === u.id || (currentAdmin?.email && currentAdmin.email === u.email);

                return (
                  <div
                    key={u.id}
                    className="card"
                    style={{
                      padding: "16px 18px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      borderLeft: isAdmin ? "3px solid #f59e0b" : isActive ? "3px solid #10b981" : "3px solid #ef4444",
                      background: "var(--surface)",
                      transition: "transform 0.15s ease, border-color 0.15s ease",
                    }}
                  >
                    {/* Yuqori qism: Profil va Amallar */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 12,
                      }}
                    >
                      {/* Avatar va Ism */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 220, flex: 1 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: "50%",
                            background: isAdmin
                              ? "linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.45) 100%)"
                              : "linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.45) 100%)",
                            border: `1.5px solid ${isAdmin ? "#fbbf24" : "#34d399"}`,
                            color: isAdmin ? "#fbbf24" : "#34d399",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: "1.1rem",
                            flexShrink: 0,
                          }}
                        >
                          {(u.full_name || u.email || "U").charAt(0).toUpperCase()}
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: "0.98rem", fontWeight: 700, color: "var(--text)" }}>
                              {u.full_name || u.username || "Nomsiz User"}
                            </span>

                            {isAdmin && (
                              <span
                                style={{
                                  fontSize: "0.65rem",
                                  padding: "2px 7px",
                                  borderRadius: 5,
                                  background: "rgba(245, 158, 11, 0.18)",
                                  color: "#fbbf24",
                                  border: "1px solid rgba(245, 158, 11, 0.35)",
                                  fontWeight: 700,
                                }}
                              >
                                ADMIN
                              </span>
                            )}

                            {isSelf && (
                              <span
                                style={{
                                  fontSize: "0.65rem",
                                  padding: "2px 6px",
                                  borderRadius: 5,
                                  background: "rgba(56, 189, 248, 0.15)",
                                  color: "#38bdf8",
                                  fontWeight: 600,
                                }}
                              >
                                (Siz)
                              </span>
                            )}

                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: "0.72rem",
                                padding: "2px 7px",
                                borderRadius: 5,
                                background: isActive ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                                color: isActive ? "#34d399" : "#f87171",
                                border: `1px solid ${isActive ? "rgba(52, 211, 153, 0.3)" : "rgba(248, 113, 113, 0.3)"}`,
                                fontWeight: 600,
                              }}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: isActive ? "#34d399" : "#f87171",
                                }}
                              />
                              {isActive ? "Faol" : "Bloklangan"}
                            </span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                            <span>Gmail: <strong style={{ color: "var(--text)" }}>{u.email}</strong></span>
                            {u.username && <span>Username: @{u.username}</span>}
                            {u.phone_number && <span>Tel: {u.phone_number}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Amallar tugmalari */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        {/* Parolni tiklash (User paroli esidan chiqsa) */}
                        <button
                          type="button"
                          onClick={() => {
                            setResetModalUser(u);
                            setNewPasswordInput("");
                            setGeneratedPassword("");
                            setResetSuccessData(null);
                          }}
                          className="btn btn--secondary btn--xs"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            color: "#fbbf24",
                            borderColor: "rgba(245, 158, 11, 0.3)",
                            background: "rgba(245, 158, 11, 0.08)",
                          }}
                          title="Foydalanuvchi parolini yangilash (Parol esdan chiqqanda)"
                        >
                          <KeyRound size={14} />
                          <span>Parolni tiklash</span>
                        </button>

                        {/* Hash ko'rish */}
                        <button
                          type="button"
                          onClick={() => setHashDetailUser(u)}
                          className="btn btn--secondary btn--xs"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            color: "#a855f7",
                            borderColor: "rgba(168, 85, 247, 0.3)",
                            background: "rgba(168, 85, 247, 0.08)",
                          }}
                          title="Foydalanuvchining shifrlangan xeshini ko'rish"
                        >
                          <Lock size={14} />
                          <span>Xesh (Hash)</span>
                        </button>

                        {/* Bloklash / Ochish */}
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            className="btn btn--secondary btn--xs"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              color: isActive ? "#f87171" : "#34d399",
                            }}
                            title={isActive ? "Hisobni bloklash" : "Hisobni faollashtirish"}
                          >
                            {isActive ? <Unlock size={14} /> : <Lock size={14} />}
                            <span>{isActive ? "Bloklash" : "Faollashtirish"}</span>
                          </button>
                        )}

                        {/* Userni o'chirish (CASCADE) */}
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => setDeleteModalUser(u)}
                            className="btn btn--danger btn--xs"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              background: "rgba(239, 68, 68, 0.15)",
                              borderColor: "rgba(239, 68, 68, 0.35)",
                              color: "#fca5a5",
                            }}
                            title="Foydalanuvchini va barcha ma'lumotlarini o'chirish"
                          >
                            <Trash2 size={14} />
                            <span>Oʻchirish</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Pastki axborot paneli: Bog'liq ma'lumotlar va sana */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 12,
                        paddingTop: 10,
                        borderTop: "1px dashed var(--border)",
                        fontSize: "0.75rem",
                      }}
                    >
                      {/* Bog'langan yozuvlar soni */}
                      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text-muted)" }}>
                          <Receipt size={14} style={{ color: "#38bdf8" }} />
                          <span>Tranzaksiyalar: <strong style={{ color: "var(--text)" }}>{u.transactions_count || 0}</strong></span>
                        </span>

                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text-muted)" }}>
                          <Coins size={14} style={{ color: "#34d399" }} />
                          <span>Hamyonlar: <strong style={{ color: "var(--text)" }}>{u.wallets_count || 7}</strong></span>
                        </span>

                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text-muted)" }}>
                          <HandCoins size={14} style={{ color: "#fbbf24" }} />
                          <span>Qarzlar: <strong style={{ color: "var(--text)" }}>{u.debts_count || 0}</strong></span>
                        </span>

                        {u.password_hash && (
                          <div
                            onClick={() => setHashDetailUser(u)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "2px 8px",
                              borderRadius: 4,
                              background: "rgba(255, 255, 255, 0.04)",
                              border: "1px solid rgba(255, 255, 255, 0.08)",
                              cursor: "pointer",
                              fontFamily: "monospace",
                              fontSize: "0.7rem",
                              color: "var(--text-muted)",
                            }}
                            title="Xeshni ko'rish"
                          >
                            <KeyRound size={12} style={{ color: "#a855f7" }} />
                            <span>Hash: {u.password_hash.slice(0, 16)}...</span>
                          </div>
                        )}
                      </div>

                      {/* Sanalar */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text-muted)" }}>
                        <span>
                          Roʻyxatdan: {u.created_at ? new Date(u.created_at).toLocaleDateString("uz-UZ") : "Nomaʼlum"}
                        </span>
                        {u.last_login_at && (
                          <span>
                            Oxirgi kirish: {new Date(u.last_login_at).toLocaleDateString("uz-UZ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: HASH PASSWORD VOSITASI / LABORATORIYASI                       */}
      {/* =================================================================== */}
      {activeTab === "hash-lab" && (
        <div className="tab-content-fade" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card" style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "rgba(168, 85, 247, 0.15)",
                  color: "#a855f7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <KeyRound size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>Hash Password Generator & Tekshiruvchi</h2>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Foydalanuvchi paroli esidan chiqqanda yangi xesh yaratish yoki kiritilgan parolni tekshirish
                </p>
              </div>
            </div>

            <form onSubmit={handleRunHashLab} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
                    1. Xeshlash uchun parol matni (Plaintext):
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      placeholder="masalan: YangiParol123"
                      value={labInputPassword}
                      onChange={(e) => setLabInputPassword(e.target.value)}
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                        fontSize: "0.9rem",
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$";
                        let p = "";
                        for (let i = 0; i < 10; i++) p += chars.charAt(Math.floor(Math.random() * chars.length));
                        setLabInputPassword(p);
                      }}
                      className="btn btn--secondary btn--sm"
                      title="Tasodifiy parol"
                    >
                      <Sparkles size={15} />
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
                    2. Taqqoslash uchun mavjud Hash (Ixtiyoriy):
                  </label>
                  <input
                    type="text"
                    placeholder="Mavjud xeshni shu yerga qoʻying (tekshirish uchun)..."
                    value={labCompareHash}
                    onChange={(e) => setLabCompareHash(e.target.value)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      fontSize: "0.85rem",
                      fontFamily: "monospace",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="submit"
                  disabled={!labInputPassword.trim() || isHashing}
                  className="btn btn--primary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
                    borderColor: "#a855f7",
                  }}
                >
                  <KeyRound size={16} />
                  <span>{isHashing ? "Xesh hisoblanmoqda..." : "Xeshni hosil qilish & Tekshirish"}</span>
                </button>
              </div>
            </form>

            {/* Natija ko'rsatish */}
            {labResult && (
              <div
                style={{
                  marginTop: 20,
                  padding: 16,
                  borderRadius: 10,
                  background: "rgba(168, 85, 247, 0.08)",
                  border: "1px solid rgba(168, 85, 247, 0.3)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  animation: "fadeIn 0.2s ease-out",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#d8b4fe" }}>
                    Natija: Bcrypt Peppered Hash
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    Algoritm: {labResult.algorithm}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "var(--surface)",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    gap: 10,
                  }}
                >
                  <code style={{ fontSize: "0.82rem", color: "#34d399", wordBreak: "break-all" }}>
                    {labResult.hash}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(labResult.hash, "lab-hash")}
                    className="btn btn--secondary btn--xs"
                    style={{ flexShrink: 0 }}
                  >
                    {copiedKey === "lab-hash" ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                    <span>{copiedKey === "lab-hash" ? "Nusxalandi!" : "Nusxa"}</span>
                  </button>
                </div>

                {labResult.isMatch !== null && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: labResult.isMatch ? "#34d399" : "#f87171",
                    }}
                  >
                    {labResult.isMatch ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    <span>
                      {labResult.isMatch
                        ? "Parol xeshga 100% mos keldi! Ushbu parol to'g'ri."
                        : "Parol xeshga mos kelmadi! Parol noto'g'ri."}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tushuntirish kartasi */}
          <div className="card" style={{ padding: "18px 22px" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <Info size={16} style={{ color: "#38bdf8" }} />
              <span>User paroli esidan chiqib qolganda nima qilish kerak?</span>
            </h3>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
              <li>
                Bcrypt xeshlash bir tomonlama (irreversible) bo'lgani sababli, foydalanuvchining eski parolini asliga qaytarib bo'lmaydi.
              </li>
              <li>
                Admin foydalanuvchilar roʻyxatidagi <strong>"Parolni tiklash"</strong> tugmasini bosadi.
              </li>
              <li>
                Yangi xavfsiz parol kiritiladi yoki <strong>"Tasodifiy generatsiya"</strong> tugmasi orqali avtomatik hosil qilinadi.
              </li>
              <li>
                Tizim yangi parolni Pepperli Bcrypt orqali xeshlash bilan bazaga yozadi.
              </li>
              <li>
                Admin yangi parolni nusxalab, foydalanuvchiga taqdim etadi (masalan: Telegram yoki SMS orqali).
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: CASCADE QOIDASI (SAVOL-JAVOB)                                  */}
      {/* =================================================================== */}
      {activeTab === "cascade-info" && (
        <div className="tab-content-fade" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            className="card"
            style={{
              padding: "24px 28px",
              borderLeft: "4px solid #10b981",
              background: "var(--surface)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#34d399",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Database size={20} />
              </div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>
                Savol: Agar userlar tabledan user oʻchirilsa, unga tegishli barcha maʼlumotlar ham oʻchiriladimi?
              </h2>
            </div>

            <div
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                color: "#34d399",
                background: "rgba(16, 185, 129, 0.1)",
                padding: "10px 16px",
                borderRadius: 8,
                border: "1px solid rgba(52, 211, 153, 0.25)",
                marginBottom: 16,
              }}
            >
              HA! Barcha maʼlumotlar toʻliq va xavfsiz tarzda oʻchiriladi (CASCADE tozalash).
            </div>

            <p style={{ fontSize: "0.88rem", lineHeight: 1.6, color: "var(--text-muted)", margin: "0 0 16px 0" }}>
              Admin paneldan biror foydalanuvchini oʻchirganingizda, server PostgreSQL bazasida bitta xavfsiz tranzaksiya (
              <code style={{ color: "#fbbf24" }}>BEGIN ... COMMIT</code>) ichida foydalanuvchiga tegishli barcha quyidagi jadvallarni bir zumda tozalaydi:
            </p>

            {/* Jadvallar ro'yxati grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div style={{ padding: "12px 14px", background: "var(--surface-2)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: "0.85rem", color: "#38bdf8" }}>
                  <Receipt size={16} />
                  <span>Tranzaksiyalar & Xarajatlar</span>
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  <code style={{ color: "#38bdf8" }}>transactions</code> va <code style={{ color: "#38bdf8" }}>transaction_edits</code> toʻliq oʻchiriladi.
                </p>
              </div>

              <div style={{ padding: "12px 14px", background: "var(--surface-2)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: "0.85rem", color: "#34d399" }}>
                  <Coins size={16} />
                  <span>Hamyonlar & Izohlar</span>
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  <code style={{ color: "#34d399" }}>wallets</code> va <code style={{ color: "#34d399" }}>wallet_notes</code> qoldiqlari bilan yoʻqotiladi.
                </p>
              </div>

              <div style={{ padding: "12px 14px", background: "var(--surface-2)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: "0.85rem", color: "#fbbf24" }}>
                  <HandCoins size={16} />
                  <span>Qarzlar & Toʻlovlar</span>
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  <code style={{ color: "#fbbf24" }}>debts</code> va <code style={{ color: "#fbbf24" }}>debt_payments</code> yozuvlari tozalanadi.
                </p>
              </div>

              <div style={{ padding: "12px 14px", background: "var(--surface-2)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: "0.85rem", color: "#f87171" }}>
                  <Dumbbell size={16} />
                  <span>Mashqlar & Jurnallar</span>
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  <code style={{ color: "#f87171" }}>exercises</code> va <code style={{ color: "#f87171" }}>exercise_logs</code> barcha maʼlumotlari oʻchiriladi.
                </p>
              </div>

              <div style={{ padding: "12px 14px", background: "var(--surface-2)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: "0.85rem", color: "#a855f7" }}>
                  <Clock size={16} />
                  <span>Zaxira Nusxalar (Snapshot)</span>
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  <code style={{ color: "#a855f7" }}>app_snapshot</code> (reserves, dollar history) tozalanadi.
                </p>
              </div>

              <div style={{ padding: "12px 14px", background: "var(--surface-2)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: "0.85rem", color: "#f59e0b" }}>
                  <Users size={16} />
                  <span>Foydalanuvchi hisobi (Users)</span>
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  <code style={{ color: "#f59e0b" }}>users</code> jadvalidagi asosiy hisob oʻchiriladi.
                </p>
              </div>
            </div>

            <div
              style={{
                padding: "12px 16px",
                background: "rgba(56, 189, 248, 0.08)",
                border: "1px solid rgba(56, 189, 248, 0.25)",
                borderRadius: 8,
                fontSize: "0.82rem",
                color: "#7dd3fc",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Info size={18} style={{ flexShrink: 0 }} />
              <span>
                Shuningdek, brauzerning LocalStorage xotirasidagi foydalanuvchiga tegishli barcha keshlar ham toʻliq tozalanadi. Hech qanday "yetim" (orphan) maʼlumot qolmaydi.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: SHIKOYATLAR VA FIKRLAR (COMPLAINTS & FEEDBACK)               */}
      {/* =================================================================== */}
      {activeTab === "complaints" && (
        <div className="tab-content-fade" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Statistika kartochkalari */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            <div className="card" style={{ padding: "12px 16px", borderLeft: "3px solid #ef4444" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>Jami Murojaatlar</span>
              <div style={{ fontSize: "1.45rem", fontWeight: 800, marginTop: 4, color: "var(--text)" }}>
                {complaints.length}
              </div>
            </div>

            <div className="card" style={{ padding: "12px 16px", borderLeft: "3px solid #fbbf24" }}>
              <span style={{ fontSize: "0.78rem", color: "#fbbf24", fontWeight: 600 }}>Kutilayotgan (Yangi)</span>
              <div style={{ fontSize: "1.45rem", fontWeight: 800, marginTop: 4, color: "#fbbf24" }}>
                {complaints.filter((c) => c.status === "pending").length}
              </div>
            </div>

            <div className="card" style={{ padding: "12px 16px", borderLeft: "3px solid #38bdf8" }}>
              <span style={{ fontSize: "0.78rem", color: "#38bdf8", fontWeight: 600 }}>Koʻrib chiqilmoqda</span>
              <div style={{ fontSize: "1.45rem", fontWeight: 800, marginTop: 4, color: "#38bdf8" }}>
                {complaints.filter((c) => c.status === "in_review").length}
              </div>
            </div>

            <div className="card" style={{ padding: "12px 16px", borderLeft: "3px solid #10b981" }}>
              <span style={{ fontSize: "0.78rem", color: "#34d399", fontWeight: 600 }}>Hal qilinganlar</span>
              <div style={{ fontSize: "1.45rem", fontWeight: 800, marginTop: 4, color: "#34d399" }}>
                {complaints.filter((c) => c.status === "resolved").length}
              </div>
            </div>
          </div>

          {/* Qidiruv va Filtr paneli */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "12px 16px",
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                type="text"
                placeholder="Mavzu, xabar, foydalanuvchi yoki versiya..."
                value={complaintSearch}
                onChange={(e) => setComplaintSearch(e.target.value)}
                style={{
                  width: "100%",
                  paddingLeft: 36,
                  paddingRight: 12,
                  height: 38,
                  borderRadius: 8,
                  fontSize: "0.85rem",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              />
              {complaintSearch && (
                <button
                  type="button"
                  onClick={() => setComplaintSearch("")}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>Holat:</span>
              <select
                value={complaintFilterStatus}
                onChange={(e) => setComplaintFilterStatus(e.target.value)}
                style={{
                  height: 38,
                  padding: "0 10px",
                  borderRadius: 8,
                  fontSize: "0.82rem",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  cursor: "pointer",
                }}
              >
                <option value="all">Barcha holatlar</option>
                <option value="pending">Kutilayotgan (Yangi)</option>
                <option value="in_review">Koʻrib chiqilmoqda</option>
                <option value="resolved">Hal qilingan</option>
                <option value="rejected">Rad etilgan</option>
              </select>

              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600, marginLeft: 6 }}>
                Tur:
              </span>
              <select
                value={complaintFilterType}
                onChange={(e) => setComplaintFilterType(e.target.value)}
                style={{
                  height: 38,
                  padding: "0 10px",
                  borderRadius: 8,
                  fontSize: "0.82rem",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  cursor: "pointer",
                }}
              >
                <option value="all">Barcha turlar</option>
                <option value="complaint">Shikoyat</option>
                <option value="bug">Tizim xatosi (Bug)</option>
                <option value="suggestion">Taklif / Gʻoya</option>
                <option value="question">Savol</option>
              </select>
            </div>
          </div>

          {/* Shikoyatlar ro'yxati */}
          {filteredComplaints.length === 0 ? (
            <div
              className="card"
              style={{
                padding: "48px 24px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <MessageSquare size={44} style={{ color: "var(--text-muted)", opacity: 0.4 }} />
              <div style={{ fontSize: "1rem", fontWeight: 700 }}>Hozircha hech qanday shikoyat yoki fikr tushmadi</div>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", maxWidth: 400 }}>
                Foydalanuvchilar Yangilanishlar sahifasi orqali shikoyat yoki taklif yuborganlarida, bu yerda darhol aks etadi.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filteredComplaints.map((c) => {
                const isPending = c.status === "pending";
                const isInReview = c.status === "in_review";
                const isResolved = c.status === "resolved";

                let typeLabel = "Shikoyat";
                let typeColor = "#f87171";
                let TypeIcon = AlertTriangle;

                if (c.complaint_type === "bug") {
                  typeLabel = "Tizim xatosi";
                  typeColor = "#fb923c";
                  TypeIcon = Bug;
                } else if (c.complaint_type === "suggestion") {
                  typeLabel = "Taklif / Fikr";
                  typeColor = "#34d399";
                  TypeIcon = Lightbulb;
                } else if (c.complaint_type === "question") {
                  typeLabel = "Savol";
                  typeColor = "#38bdf8";
                  TypeIcon = HelpCircle;
                }

                return (
                  <div
                    key={c.id}
                    className="card"
                    style={{
                      padding: "16px 18px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      borderLeft: isPending
                        ? "4px solid #fbbf24"
                        : isInReview
                        ? "4px solid #38bdf8"
                        : isResolved
                        ? "4px solid #34d399"
                        : "4px solid #ef4444",
                      background: "var(--surface)",
                    }}
                  >
                    {/* Yuqori qator: Foydalanuvchi ma'lumoti, sana va holat */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: "50%",
                            background: "rgba(56, 189, 248, 0.15)",
                            color: "#38bdf8",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "0.95rem",
                          }}
                        >
                          {(c.user_name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)" }}>
                              {c.user_name}
                            </span>
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: 5,
                                background: "var(--surface-2)",
                                color: typeColor,
                                border: `1px solid ${typeColor}40`,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <TypeIcon size={12} />
                              <span>{typeLabel}</span>
                            </span>

                            {c.priority && c.priority !== "normal" && (
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background: c.priority === "urgent" ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)",
                                  color: c.priority === "urgent" ? "#f87171" : "#fbbf24",
                                  border: `1px solid ${c.priority === "urgent" ? "#f87171" : "#fbbf24"}50`,
                                }}
                              >
                                {c.priority === "urgent" ? "SHOSHILINCH" : "MUHIM"}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
                            {c.user_email && <span>Gmail: {c.user_email}</span>}
                            {c.user_phone && <span>Tel: {c.user_phone}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Holat tanlagich va o'chirish */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <select
                          value={c.status}
                          onChange={(e) => handleUpdateComplaintStatus(c.id, e.target.value, c.admin_notes)}
                          style={{
                            height: 32,
                            padding: "0 8px",
                            borderRadius: 6,
                            fontSize: "0.76rem",
                            fontWeight: 700,
                            background: isPending
                              ? "rgba(245, 158, 11, 0.15)"
                              : isInReview
                              ? "rgba(56, 189, 248, 0.15)"
                              : isResolved
                              ? "rgba(16, 185, 129, 0.15)"
                              : "rgba(239, 68, 68, 0.15)",
                            color: isPending
                              ? "#fbbf24"
                              : isInReview
                              ? "#38bdf8"
                              : isResolved
                              ? "#34d399"
                              : "#f87171",
                            border: `1px solid ${
                              isPending
                                ? "rgba(245, 158, 11, 0.4)"
                                : isInReview
                                ? "rgba(56, 189, 248, 0.4)"
                                : isResolved
                                ? "rgba(52, 211, 153, 0.4)"
                                : "rgba(239, 68, 68, 0.4)"
                            }`,
                            cursor: "pointer",
                          }}
                        >
                          <option value="pending">Kutilmoqda</option>
                          <option value="in_review">Koʻrib chiqilmoqda</option>
                          <option value="resolved">Hal qilindi</option>
                          <option value="rejected">Rad etildi</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleDeleteComplaint(c.id)}
                          className="btn-icon btn-icon--xs"
                          style={{ color: "#f87171", background: "rgba(239, 68, 68, 0.1)", borderRadius: 6, padding: 5 }}
                          title="Shikoyatni oʻchirish"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Shikoyat mavzusi va tegishli yangilanish */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--text)" }}>
                          {c.subject}
                        </h4>
                        {c.update_version && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: "rgba(56, 189, 248, 0.12)",
                              color: "#38bdf8",
                              fontFamily: "monospace",
                            }}
                          >
                            Yangilik: {c.update_version}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--text-muted)", lineHeight: 1.5, background: "var(--surface-2)", padding: "10px 12px", borderRadius: 8 }}>
                        {c.message}
                      </p>
                    </div>

                    {/* Admin Javobi (Resolution Note) */}
                    {c.admin_notes ? (
                      <div
                        style={{
                          background: "rgba(16, 185, 129, 0.08)",
                          border: "1px solid rgba(52, 211, 153, 0.3)",
                          borderRadius: 8,
                          padding: "10px 12px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 10,
                        }}
                      >
                        <div style={{ fontSize: "0.82rem", color: "#34d399", lineHeight: 1.45 }}>
                          <strong>Admin Javobi / Izohi:</strong> {c.admin_notes}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedComplaintForReply(c);
                            setReplyStatus(c.status);
                            setReplyNotes(c.admin_notes || "");
                          }}
                          className="btn btn--secondary btn--xs"
                          style={{ flexShrink: 0 }}
                        >
                          Tahrirlash
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedComplaintForReply(c);
                            setReplyStatus(c.status === "pending" ? "in_review" : c.status);
                            setReplyNotes("");
                          }}
                          className="btn btn--secondary btn--xs"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            color: "#38bdf8",
                            borderColor: "rgba(56, 189, 248, 0.35)",
                          }}
                        >
                          <Send size={13} />
                          <span>Admin javobi yozish</span>
                        </button>
                      </div>
                    )}

                    {/* Pastki sana */}
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                      <span>Murojaat vaqti: {new Date(c.created_at).toLocaleString("uz-UZ")}</span>
                      {c.resolved_at && <span style={{ color: "#34d399" }}>Hal qilindi: {new Date(c.resolved_at).toLocaleString("uz-UZ")}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADMIN JAVOBI YOZISH                                          */}
      {/* =================================================================== */}
      {selectedComplaintForReply && (
        <div className="modal-backdrop" onClick={() => setSelectedComplaintForReply(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 520, width: "95%", background: "var(--surface)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                  Shikoyatga Javob Yozish & Holatni Yangilash
                </h3>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Murojaatchi: {selectedComplaintForReply.user_name} ({selectedComplaintForReply.user_email})
                </p>
              </div>
              <button
                type="button"
                className="btn-icon btn-icon--xs"
                onClick={() => setSelectedComplaintForReply(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsUpdatingComplaint(true);
                try {
                  await handleUpdateComplaintStatus(
                    selectedComplaintForReply.id,
                    replyStatus,
                    replyNotes.trim()
                  );
                } finally {
                  setIsUpdatingComplaint(false);
                }
              }}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>
                  Yangi holat:
                </label>
                <select
                  value={replyStatus}
                  onChange={(e) => setReplyStatus(e.target.value)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    fontSize: "0.85rem",
                  }}
                >
                  <option value="in_review">Koʻrib chiqilmoqda (In Review)</option>
                  <option value="resolved">Hal qilindi (Resolved)</option>
                  <option value="rejected">Rad etildi (Rejected)</option>
                  <option value="pending">Kutilmoqda (Pending)</option>
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>
                  Admin javobi / Yechim izohi:
                </label>
                <textarea
                  rows={4}
                  placeholder="Foydalanuvchiga ko'rinadigan javobingizni yozing (masalan: 'Muammo v5.2.1 da tuzatildi' yoki 'Taklifingiz qabul qilindi')..."
                  value={replyNotes}
                  onChange={(e) => setReplyNotes(e.target.value)}
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

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setSelectedComplaintForReply(null)}
                  className="btn btn--secondary"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingComplaint}
                  className="btn btn--primary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  }}
                >
                  <Check size={16} />
                  <span>{isUpdatingComplaint ? "Saqlanmoqda..." : "Saqlash va Yuborish"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 1: PAROLNI TIKLASH (RESET PASSWORD MODAL)                     */}
      {/* =================================================================== */}
      {resetModalUser && (
        <div className="modal-backdrop" onClick={() => !isResetting && setResetModalUser(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 480, width: "95%", background: "var(--surface)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "rgba(245, 158, 11, 0.15)",
                    color: "#fbbf24",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Parolni tiklash</h3>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    User paroli esidan chiqib qolganda yangi parol berish
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="btn-icon btn-icon--xs"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Foydalanuvchi ma'lumoti */}
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                marginBottom: 16,
                fontSize: "0.82rem",
              }}
            >
              <div>Foydalanuvchi: <strong style={{ color: "var(--text)" }}>{resetModalUser.full_name || resetModalUser.username}</strong></div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.76rem" }}>Gmail: {resetModalUser.email}</div>
            </div>

            {resetSuccessData ? (
              /* Muvaffaqiyat xabari va nusxalash */
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div
                  style={{
                    padding: 14,
                    borderRadius: 8,
                    background: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(52, 211, 153, 0.3)",
                    color: "#34d399",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={20} />
                  <span>Parol bazada muvaffaqiyatli yangilandi va xeshlandi!</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>
                    Foydalanuvchiga berish uchun yangi parol:
                  </label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  >
                    <strong style={{ fontSize: "1.1rem", letterSpacing: "0.05em", color: "#fbbf24" }}>
                      {resetSuccessData.newPassword}
                    </strong>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(resetSuccessData.newPassword, "new-pwd")}
                      className="btn btn--secondary btn--xs"
                    >
                      {copiedKey === "new-pwd" ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                      <span>{copiedKey === "new-pwd" ? "Nusxalandi" : "Nusxa olish"}</span>
                    </button>
                  </div>
                </div>

                {resetSuccessData.newHash && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Yangi Bcrypt Peppered Hash:</span>
                    <code
                      style={{
                        fontSize: "0.7rem",
                        padding: "6px 8px",
                        background: "var(--surface-3)",
                        borderRadius: 6,
                        wordBreak: "break-all",
                        color: "#a855f7",
                      }}
                    >
                      {resetSuccessData.newHash}
                    </code>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="btn btn--primary"
                  style={{ width: "100%", marginTop: 8 }}
                >
                  Yopish
                </button>
              </div>
            ) : (
              /* Yangi parol kiritish formasi */
              <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
                      Yangi parol (kamida 6 ta belgi):
                    </label>
                    <button
                      type="button"
                      onClick={generateStrongPassword}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#fbbf24",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Sparkles size={13} />
                      <span>Tasodifiy generatsiya</span>
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Yangi parolni kiriting..."
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      fontSize: "0.95rem",
                    }}
                    required
                    autoFocus
                  />
                </div>

                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  * Ushbu parol serverda HMAC-SHA256 Pepper bilan qoʻshimcha himoyalanib, 10 raundli Bcrypt orqali bazaga xesh qilib saqlanadi.
                </p>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setResetModalUser(null)}
                    className="btn btn--secondary btn--sm"
                    disabled={isResetting}
                  >
                    Bekor qilish
                  </button>

                  <button
                    type="submit"
                    disabled={!newPasswordInput.trim() || newPasswordInput.trim().length < 6 || isResetting}
                    className="btn btn--primary btn--sm"
                    style={{
                      background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                      borderColor: "#fbbf24",
                      color: "#18181b",
                    }}
                  >
                    {isResetting ? "Saqlanmoqda..." : "Saqlash va Yangilash"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: USERNİ O'CHIRISH (CASCADE TASDIQLASH)                        */}
      {/* =================================================================== */}
      {deleteModalUser && (
        <div className="modal-backdrop" onClick={() => !isDeleting && setDeleteModalUser(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 500, width: "95%", background: "var(--surface)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#f87171",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#f87171" }}>
                  Foydalanuvchini oʻchirish (CASCADE)
                </h3>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Bu amal qaytarib boʻlmasdir!
                </p>
              </div>
            </div>

            <div
              style={{
                padding: "12px 14px",
                background: "var(--surface-2)",
                borderRadius: 8,
                border: "1px solid var(--border)",
                marginBottom: 16,
                fontSize: "0.85rem",
              }}
            >
              <div>Foydalanuvchi: <strong style={{ color: "var(--text)" }}>{deleteModalUser.full_name || deleteModalUser.username}</strong></div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.76rem" }}>Gmail: {deleteModalUser.email}</div>
            </div>

            <div
              style={{
                padding: "12px 14px",
                borderRadius: 8,
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                marginBottom: 20,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#fca5a5", marginBottom: 6 }}>
                Ushbu amal bajarilganda bazadan quyidagilar TOʻLIQ OʻCHIRILADI:
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                <li>Barcha tranzaksiyalar va xarajatlar ({deleteModalUser.transactions_count || 0} ta)</li>
                <li>Barcha hamyonlar va qoldiqlar ({deleteModalUser.wallets_count || 7} ta)</li>
                <li>Barcha qarz yozuvlari va toʻlovlar ({deleteModalUser.debts_count || 0} ta)</li>
                <li>Barcha mashqlar va shaxsiy snapshotlar</li>
                <li>Foydalanuvchining hisobi va JWT tokenlari</li>
              </ul>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                className="btn btn--secondary btn--sm"
                disabled={isDeleting}
              >
                Bekor qilish
              </button>

              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="btn btn--danger btn--sm"
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Trash2 size={15} />
                <span>{isDeleting ? "Oʻchirilmoqda..." : "Ha, butunlay oʻchirilsin"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: YANGI FOYDALANUVCHI QO'SHISH                                */}
      {/* =================================================================== */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => !isCreating && setShowCreateModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 480, width: "95%", background: "var(--surface)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "#34d399",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Yangi Foydalanuvchi</h3>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Admin paneldan toʻgʻridan-toʻgʻri hisob yaratish
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn-icon btn-icon--xs"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)" }}>
                  Gmail (Email) *
                </label>
                <input
                  type="email"
                  placeholder="masalan: user@gmail.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    fontSize: "0.85rem",
                  }}
                  required
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)" }}>
                  Ism / Familiya
                </label>
                <input
                  type="text"
                  placeholder="masalan: Jasur Bek"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    fontSize: "0.85rem",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)" }}>
                    Username (ixtiyoriy)
                  </label>
                  <input
                    type="text"
                    placeholder="masalan: jasur_01"
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)" }}>
                    Telefon raqam
                  </label>
                  <input
                    type="text"
                    placeholder="+998 90 123 45 67"
                    value={createForm.phoneNumber}
                    onChange={(e) => setCreateForm({ ...createForm, phoneNumber: e.target.value })}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)" }}>
                    Parol * (kamida 6 ta belgi)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                      let p = "";
                      for (let i = 0; i < 8; i++) p += chars.charAt(Math.floor(Math.random() * chars.length));
                      setCreateForm({ ...createForm, password: p });
                    }}
                    style={{ background: "none", border: "none", color: "#34d399", fontSize: "0.72rem", cursor: "pointer" }}
                  >
                    Tasodifiy parol
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Parolni kiriting..."
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    fontSize: "0.85rem",
                  }}
                  required
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)" }}>
                  Tizimdagi roli
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    fontSize: "0.85rem",
                  }}
                >
                  <option value="user">Oddiy foydalanuvchi (Aʼzo)</option>
                  <option value="admin">Admin (Toʻliq boshqaruv)</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn--secondary btn--sm"
                  disabled={isCreating}
                >
                  Bekor qilish
                </button>

                <button
                  type="submit"
                  disabled={!createForm.email.trim() || !createForm.password.trim() || isCreating}
                  className="btn btn--primary btn--sm"
                >
                  {isCreating ? "Yaratilmoqda..." : "Yaratish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 4: XESH TAFSILOTLARI (HASH DETAIL MODAL)                      */}
      {/* =================================================================== */}
      {hashDetailUser && (
        <div className="modal-backdrop" onClick={() => setHashDetailUser(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460, width: "95%", background: "var(--surface)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "rgba(168, 85, 247, 0.15)",
                    color: "#a855f7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Lock size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Parol Xeshi Tafsilotlari</h3>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {hashDetailUser.full_name || hashDetailUser.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setHashDetailUser(null)}
                className="btn-icon btn-icon--xs"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Ushbu xesh foydalanuvchining parolini xavfsiz saqlash uchun ishlatiladi:
              </div>

              <div
                style={{
                  padding: 12,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Bcrypt Hash:</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(hashDetailUser.password_hash, "detail-hash")}
                    className="btn btn--secondary btn--xs"
                  >
                    {copiedKey === "detail-hash" ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                    <span>{copiedKey === "detail-hash" ? "Nusxalandi" : "Nusxa olish"}</span>
                  </button>
                </div>

                <code
                  style={{
                    fontSize: "0.76rem",
                    wordBreak: "break-all",
                    color: "#34d399",
                    background: "var(--surface)",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                  }}
                >
                  {hashDetailUser.password_hash || "Xesh topilmadi"}
                </code>
              </div>

              <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                <div>● <strong>Algoritm:</strong> Bcrypt (10 round)</div>
                <div>● <strong>Pepper:</strong> HMAC-SHA256 maxfiy kalit</div>
                <div>● <strong>Xususiyat:</strong> Bir tomonlama (Un-hash qilib bo'lmaydi)</div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setHashDetailUser(null)}
                  className="btn btn--primary btn--sm"
                >
                  Tushunarli
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
