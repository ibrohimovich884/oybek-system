import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Settings,
  RefreshCw,
  Database,
  Wifi,
  WifiOff,
  Server,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  FileSpreadsheet,
  Trash2,
  ArrowDownCircle,
  ArrowUpCircle,
  Activity,
  Zap,
  HardDrive,
  Filter,
  Search,
  Check,
  RotateCcw,
  Sliders,
  Radio,
  FileJson,
} from "lucide-react";
import { useExpenses } from "../context/ExpensesContext.jsx";
import { formatSum, formatDateTime } from "../utils/format.js";
import { DEFAULT_BACKEND_URL } from "../config/apiConfig.js";

export default function SettingsPage() {
  const {
    syncStatus,
    triggerManualSync,
    forcePullFromDB,
    forcePushAllToDB,
    setAutoSync,
    changeBackendUrl,
    checkBackendHealth,
    clearSyncLogs,
    clearSyncQueue,
    clearLocalStorageData,
    downloadBackup,
    downloadCSV,
    importBackup,
    expenses,
    debts,
    refresh,
  } = useExpenses();

  // 4 asosiy bo'lim (tablar):
  // 1. "server"   -> 🗄️ Baza va Server
  // 2. "storage"  -> 🧹 Xotira va Kesh
  // 3. "backup"   -> 📦 Zaxira va Eksport
  // 4. "logs"     -> 📋 Tizim Jurnali
  const [activeTab, setActiveTab] = useState("server");

  // Standart holatda backend shu saytning o'zi (same-origin)
  const defaultBackendLabel = DEFAULT_BACKEND_URL || window.location.origin;
  const [backendInput, setBackendInput] = useState(syncStatus?.backendUrl || defaultBackendLabel);
  const [syncFeedback, setSyncFeedback] = useState(null);
  const [isHealthTesting, setIsHealthTesting] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [preserveBackendConfig, setPreserveBackendConfig] = useState(true);

  // Tizim jurnali uchun filter va qidiruv
  const [logFilter, setLogFilter] = useState("all"); // 'all' | 'success' | 'error' | 'warning'
  const [logSearch, setLogSearch] = useState("");

  // Brauzer kesh hajmi (localStorage)
  const [storageStats, setStorageStats] = useState({ keysCount: 0, kb: "0" });

  const calculateStorageStats = useCallback(() => {
    try {
      let totalBytes = 0;
      const len = localStorage.length;
      for (let i = 0; i < len; i++) {
        const key = localStorage.key(i);
        const val = localStorage.getItem(key) || "";
        totalBytes += (key.length + val.length) * 2;
      }
      setStorageStats({
        keysCount: len,
        kb: (totalBytes / 1024).toFixed(1),
      });
    } catch {
      setStorageStats({ keysCount: 0, kb: "0" });
    }
  }, []);

  useEffect(() => {
    calculateStorageStats();
  }, [calculateStorageStats, expenses, debts, activeTab]);

  useEffect(() => {
    if (syncStatus?.backendUrl) {
      setBackendInput(syncStatus.backendUrl);
    }
  }, [syncStatus?.backendUrl]);

  // Tezkor harakatlar
  const handleManualSync = async () => {
    setSyncFeedback({ type: "loading", message: "DB bilan sinxronizatsiya bajarilmoqda..." });
    try {
      const res = await triggerManualSync();
      if (res && res.success) {
        setSyncFeedback({
          type: "success",
          message: `Sinxronizatsiya muvaffaqiyatli! ${res.pushedCount} ta o'zgarish DBga yuborildi, ${res.pulledCount} ta ma'lumot DBdan yangilandi.`,
        });
      } else {
        setSyncFeedback({
          type: "error",
          message: res?.message || "Sinxronizatsiyada xatolik yuz berdi. Server javob bermayapti.",
        });
      }
    } catch (err) {
      setSyncFeedback({
        type: "error",
        message: err.message || "Sinxronizatsiyada xatolik yuz berdi.",
      });
    }
  };

  const handleForcePull = async () => {
    setSyncFeedback({ type: "loading", message: "DBdan barcha ma'lumotlar qayta tortib olinmoqda..." });
    try {
      const res = await forcePullFromDB();
      if (res && res.success) {
        calculateStorageStats();
        setSyncFeedback({
          type: "success",
          message: `DBdan yangilandi! ${res.pulledCount} ta eng so'nggi ma'lumotlar yuklandi.`,
        });
      } else {
        setSyncFeedback({
          type: "error",
          message: res?.message || "DBdan ma'lumot olib bo'lmadi.",
        });
      }
    } catch (err) {
      setSyncFeedback({ type: "error", message: err.message });
    }
  };

  const handleForcePush = async () => {
    if (!window.confirm("Barcha mahalliy ma'lumotlarni DBga majburiy yozishni tasdiqlaysizmi?")) return;
    setSyncFeedback({ type: "loading", message: "Barcha xotira DBga yuklanmoqda..." });
    try {
      const res = await forcePushAllToDB();
      if (res && res.success) {
        setSyncFeedback({
          type: "success",
          message: `Barcha ma'lumotlar (${res.count} ta yozuv) DBga muvaffaqiyatli saqlandi!`,
        });
      } else {
        setSyncFeedback({ type: "error", message: res?.error || "Yuklashda xato." });
      }
    } catch (err) {
      setSyncFeedback({ type: "error", message: err.message });
    }
  };

  const handleTestConnection = async () => {
    setIsHealthTesting(true);
    try {
      const isAlive = await checkBackendHealth();
      if (isAlive) {
        setSyncFeedback({
          type: "success",
          message: `Server bilan aloqa a'lo darajada! Latency: ${syncStatus?.latency ? syncStatus.latency + "ms" : "OK"}`,
        });
      } else {
        setSyncFeedback({
          type: "error",
          message: syncStatus?.backendError || "Serverga ulanib bo'lmadi.",
        });
      }
    } finally {
      setIsHealthTesting(false);
    }
  };

  const handleSaveBackendUrl = async () => {
    if (!backendInput.trim()) return;
    await changeBackendUrl(backendInput.trim());
    setSyncFeedback({ type: "success", message: "Backend server manzili yangilandi va tekshirildi!" });
  };

  const handleResetBackendUrl = async () => {
    setBackendInput(defaultBackendLabel);
    await changeBackendUrl(DEFAULT_BACKEND_URL);
    setSyncFeedback({ type: "success", message: "Standart backend manzili tiklandi!" });
  };

  const handleExecuteClearStorage = async () => {
    setIsClearing(true);
    setSyncFeedback({ type: "loading", message: "Lokal xotira tozalanmoqda va DBdan ma'lumotlar qayta tortib olinmoqda..." });
    try {
      const res = await clearLocalStorageData({
        preserveConnection: preserveBackendConfig,
        refetchFromDB: true,
      });

      setShowClearModal(false);
      calculateStorageStats();
      setSyncFeedback({
        type: "success",
        message: `Lokal xotira (localStorage) va mock ma'lumotlar to'liq tozalandi! ${res?.count || 0} ta kesh kaliti olib tashlandi va bazadan (DB) eng so'nggi ma'lumotlar yuklandi.`,
      });
    } catch (err) {
      setSyncFeedback({
        type: "error",
        message: "Xotirani tozalashda xatolik yuz berdi: " + err.message,
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus({ loading: true, message: "Fayl o'qilmoqda va tekshirilmoqda..." });
    try {
      const text = await file.text();
      const res = await importBackup(text);
      if (res.success) {
        setImportStatus({ success: true, message: "Zaxira nusxasi tizimga muvaffaqiyatli tiklandi!" });
        calculateStorageStats();
      } else {
        setImportStatus({ success: false, message: res.error || "Fayl formati yaroqsiz." });
      }
    } catch (err) {
      setImportStatus({ success: false, message: "Faylni o'qishda xatolik: " + err.message });
    }
    e.target.value = "";
  };

  const syncedExpensesCount = (expenses || []).filter((e) => e.synced !== false).length;
  const pendingExpensesCount = (expenses || []).filter((e) => e.synced === false).length;
  const pendingQueueCount = syncStatus?.pendingCount || 0;
  const totalLocalItems = (expenses || []).length + (debts || []).length;

  // Jurnal yozuvlarini saralash va filtrlash
  const filteredLogs = useMemo(() => {
    const logs = syncStatus?.logs || [];
    return logs.filter((log) => {
      if (logFilter !== "all" && log.level !== logFilter) {
        return false;
      }
      if (logSearch.trim()) {
        const query = logSearch.toLowerCase();
        return (
          (log.message && log.message.toLowerCase().includes(query)) ||
          (log.level && log.level.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [syncStatus?.logs, logFilter, logSearch]);

  return (
    <div className="settings-page animate-fade-in" style={{ paddingBottom: 60 }}>
      {/* Sarlavha qismi */}
      <div className="dashboard-header" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="badge badge--primary" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Settings size={13} />
              <span>Tizim sozlamalari</span>
            </span>
            <span className={`badge ${syncStatus?.isConnected ? "badge--success" : "badge--warning"}`}>
              {syncStatus?.isConnected ? "DB Faol" : "Oflayn xotira"}
            </span>
            <span className={`badge ${syncStatus?.isOnline ? "badge--income" : "badge--danger"}`}>
              {syncStatus?.isOnline ? "Internet bor" : "Internet uzilgan"}
            </span>
          </div>

          <h1 className="dashboard-title" style={{ marginTop: 8, marginBottom: 4 }}>
            Sozlamalar va Tizim Boshqaruvi
          </h1>
          <p className="dashboard-subtitle">
            Baza va server aloqasi, kesh va lokal xotira, zaxira nusxalar va tizim audit jurnali
          </p>
        </div>

        {/* Global tezkor amallar */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn--subtle"
            onClick={handleManualSync}
            disabled={syncStatus?.isSyncing}
            style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
            title="Server bilan zudlik bilan sinxronlash"
          >
            <RefreshCw size={15} className={syncStatus?.isSyncing ? "animate-spin" : ""} />
            <span>{syncStatus?.isSyncing ? "Sinxronlanmoqda..." : "Hozir sinxronlash"}</span>
          </button>
        </div>
      </div>

      {/* Xabarnoma / Feedback alert */}
      {syncFeedback && (
        <div
          className={`settings-alert settings-alert--${syncFeedback.type}`}
          style={{
            marginBottom: 20,
            padding: "12px 16px",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background:
              syncFeedback.type === "success"
                ? "rgba(16, 185, 129, 0.14)"
                : syncFeedback.type === "error"
                ? "rgba(239, 68, 68, 0.14)"
                : "rgba(56, 189, 248, 0.14)",
            border: `1px solid ${
              syncFeedback.type === "success"
                ? "var(--income)"
                : syncFeedback.type === "error"
                ? "var(--danger)"
                : "var(--karta)"
            }`,
            color: "var(--text)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {syncFeedback.type === "success" ? (
              <CheckCircle2 size={18} color="var(--income)" />
            ) : syncFeedback.type === "error" ? (
              <AlertTriangle size={18} color="var(--danger)" />
            ) : (
              <RefreshCw size={18} className="animate-spin" color="var(--karta)" />
            )}
            <span style={{ fontSize: "0.88rem", fontWeight: 500 }}>{syncFeedback.message}</span>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--xs"
            onClick={() => setSyncFeedback(null)}
          >
            Yopish
          </button>
        </div>
      )}

      {/* 4 TA ASOSIY QULAY BO'LIM (TABLAR) */}
      <div className="settings-tabs">
        <button
          type="button"
          className={`settings-tab-btn ${activeTab === "server" ? "is-active" : ""}`}
          onClick={() => setActiveTab("server")}
        >
          <span style={{ fontSize: "1.1rem" }}>🗄️</span>
          <span>Baza va Server</span>
          {pendingQueueCount > 0 && (
            <span className="settings-tab-badge" style={{ background: "rgba(245, 158, 11, 0.2)", color: "var(--warning)" }}>
              {pendingQueueCount}
            </span>
          )}
        </button>

        <button
          type="button"
          className={`settings-tab-btn ${activeTab === "storage" ? "is-active" : ""}`}
          onClick={() => setActiveTab("storage")}
        >
          <span style={{ fontSize: "1.1rem" }}>🧹</span>
          <span>Xotira va Kesh</span>
          <span className="settings-tab-badge">
            {totalLocalItems}
          </span>
        </button>

        <button
          type="button"
          className={`settings-tab-btn ${activeTab === "backup" ? "is-active" : ""}`}
          onClick={() => setActiveTab("backup")}
        >
          <span style={{ fontSize: "1.1rem" }}>📦</span>
          <span>Zaxira va Eksport</span>
        </button>

        <button
          type="button"
          className={`settings-tab-btn ${activeTab === "logs" ? "is-active" : ""}`}
          onClick={() => setActiveTab("logs")}
        >
          <span style={{ fontSize: "1.1rem" }}>📋</span>
          <span>Tizim Jurnali</span>
          {syncStatus?.logs?.length > 0 && (
            <span className="settings-tab-badge">
              {syncStatus.logs.length}
            </span>
          )}
        </button>
      </div>

      {/* =========================================================================
          TAB 1: 🗄️ BAZA VA SERVER
          - Maʼlumotlar bazasi (DB) va internet aloqasi holati.
          - Backend Server URL manzilini sozlash va aloqani tekshirish (Ping).
          - Avtomatik va majburiy sinxronizatsiya boshqaruvi.
          - Kutilayotgan navbat (Sync Queue).
         ========================================================================= */}
      {activeTab === "server" && (
        <div className="tab-pane animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* 1. Maʼlumotlar bazasi (DB) va internet aloqasi holati */}
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5 }}>
                  <Database size={20} style={{ color: "var(--accent)" }} />
                  <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
                    Maʼlumotlar Bazasi (DB) va Aloqa Holati
                  </h2>
                </div>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Internet va markaziy maʼlumotlar bazasi aloqa koʻrsatkichlari hamda real vaqt sinxronizatsiya holati
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn--subtle btn--sm"
                  onClick={handleTestConnection}
                  disabled={isHealthTesting}
                >
                  <Activity size={14} className={isHealthTesting ? "animate-spin" : ""} />
                  <span>{isHealthTesting ? "Tekshirilmoqda..." : "Aloqani tekshirish (Ping)"}</span>
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={handleManualSync}
                  disabled={syncStatus?.isSyncing}
                >
                  <RefreshCw size={14} className={syncStatus?.isSyncing ? "animate-spin" : ""} />
                  <span>{syncStatus?.isSyncing ? "Sinxronlanmoqda..." : "Sinxronlash"}</span>
                </button>
              </div>
            </div>

            {/* KPI kartalari */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 12,
                marginTop: 18,
                paddingTop: 18,
                borderTop: "1px solid var(--border)",
              }}
            >
              {/* Internet */}
              <div style={{ background: "var(--surface-sunken)", padding: "12px 14px", borderRadius: 8 }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                  {syncStatus?.isOnline ? <Wifi size={14} color="var(--income)" /> : <WifiOff size={14} color="var(--danger)" />}
                  <span>Internet Aloqasi</span>
                </div>
                <strong style={{ fontSize: "1.05rem", color: syncStatus?.isOnline ? "var(--income)" : "var(--danger)", display: "block", marginTop: 4 }}>
                  {syncStatus?.isOnline ? "Onlayn (Ulangan)" : "Oflayn (Uzilgan)"}
                </strong>
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", display: "block", marginTop: 2 }}>
                  {syncStatus?.latency ? `Ping javob: ${syncStatus.latency}ms` : "Aloqa barqaror"}
                </span>
              </div>

              {/* DB Server */}
              <div style={{ background: "var(--surface-sunken)", padding: "12px 14px", borderRadius: 8 }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Server size={14} color={syncStatus?.isConnected ? "var(--accent)" : "var(--warning)"} />
                  <span>DB Server Holati</span>
                </div>
                <strong style={{ fontSize: "1.05rem", color: syncStatus?.isConnected ? "var(--accent)" : "var(--warning)", display: "block", marginTop: 4 }}>
                  {syncStatus?.isConnected ? "Ulangan (Faol)" : syncStatus?.isChecking ? "Tekshirilmoqda..." : "Aloqa yo'q"}
                </strong>
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", display: "block", marginTop: 2 }}>
                  PostgreSQL / Node API
                </span>
              </div>

              {/* DBda saqlanganlar */}
              <div style={{ background: "var(--surface-sunken)", padding: "12px 14px", borderRadius: 8 }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Database size={14} color="var(--income)" />
                  <span>DBda Saqlangan</span>
                </div>
                <strong className="mono" style={{ fontSize: "1.15rem", color: "var(--income)", display: "block", marginTop: 4 }}>
                  {syncedExpensesCount} ta yozuv
                </strong>
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", display: "block", marginTop: 2 }}>
                  Markaziy bazada xavfsiz
                </span>
              </div>

              {/* Oxirgi sinxronizatsiya */}
              <div style={{ background: "var(--surface-sunken)", padding: "12px 14px", borderRadius: 8 }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Clock size={14} color="var(--karta)" />
                  <span>Oxirgi DB Sync</span>
                </div>
                <strong className="mono" style={{ fontSize: "0.95rem", color: "var(--text)", display: "block", marginTop: 5 }}>
                  {syncStatus?.lastSyncedAt ? formatDateTime(syncStatus.lastSyncedAt) : "Hali qilinmagan"}
                </strong>
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", display: "block", marginTop: 2 }}>
                  Avto va qo'lda nazoratda
                </span>
              </div>
            </div>
          </div>

          {/* 2. Backend Server URL manzilini sozlash va aloqani tekshirish (Ping) */}
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
              <Server size={19} color="var(--karta)" />
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
                Backend Server URL Manzili va Ping
              </h3>
            </div>
            <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", marginBottom: 16 }}>
              Maʼlumotlar bazasi saqlanadigan backend API manzili. Barcha soʻrovlar shu manzil orqali sinxronlanadi.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                  Faol Backend Server Manzili:
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input
                    type="text"
                    className="input"
                    value={backendInput}
                    onChange={(e) => setBackendInput(e.target.value)}
                    placeholder={defaultBackendLabel}
                    style={{ flex: "1 1 280px", fontFamily: "var(--font-mono)", fontSize: "0.86rem" }}
                  />
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={handleSaveBackendUrl}
                  >
                    <Check size={15} />
                    <span>Saqlash</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn--subtle"
                    onClick={handleTestConnection}
                    disabled={isHealthTesting}
                  >
                    <Activity size={15} className={isHealthTesting ? "animate-spin" : ""} />
                    <span>{isHealthTesting ? "Ping..." : "Aloqani tekshirish (Ping)"}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost text-muted"
                    onClick={handleResetBackendUrl}
                    title="Standart manzilni tiklash"
                  >
                    <RotateCcw size={15} />
                    <span>Standart</span>
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  background: "rgba(56, 189, 248, 0.08)",
                  border: "1px solid rgba(56, 189, 248, 0.2)",
                  borderRadius: 8,
                  fontSize: "0.78rem",
                  color: "var(--text)",
                }}
              >
                <div style={{ color: "var(--karta)", flexShrink: 0 }}>
                  <Radio size={16} />
                </div>
                <div>
                  <strong>Joriy ulanish:</strong>{" "}
                  <code style={{ color: "var(--karta)", fontWeight: 600 }}>
                    {syncStatus?.backendUrl || defaultBackendLabel}
                  </code>
                  <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>
                    ({syncStatus?.isConnected ? "✅ DB bilan faol aloqa oʻrnatilgan" : "⚠️ DBga ulanish kutilmoqda"})
                  </span>
                </div>
              </div>

              <div style={{ padding: "10px 14px", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: 8, fontSize: "0.78rem", color: "var(--warning)" }}>
                ⚡ Eslatma: Render serveri 15 daqiqa kirmasangiz uyqu rejimiga oʻtishi mumkin. Birinchi soʻrovda uygʻonishi 15-20 soniya vaqt oladi.
              </div>
            </div>
          </div>

          {/* 3. Avtomatik va majburiy sinxronizatsiya boshqaruvi */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            {/* Avtomatik sinxronizatsiya */}
            <div className="card" style={{ padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                <Zap size={19} color="var(--accent)" />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                  Avtomatik Sinxronizatsiya
                </h3>
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.5 }}>
                Har bir yangi kiritilgan amal, tahrir yoki oʻtkazma darhol server maʼlumotlar bazasiga yuboriladi. Aloqa uzilsa, kutilayotgan navbatga olinadi.
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  background: "var(--surface-sunken)",
                  borderRadius: 8,
                }}
              >
                <div>
                  <strong style={{ fontSize: "0.9rem", color: "var(--text)", display: "block" }}>
                    Avto-sync Rejimi
                  </strong>
                  <span style={{ fontSize: "0.76rem", color: syncStatus?.autoSyncEnabled ? "var(--income)" : "var(--text-muted)" }}>
                    {syncStatus?.autoSyncEnabled ? "Faol (Fonda avtomatik)" : "O'chirilgan (Faqat qo'lda)"}
                  </span>
                </div>

                <button
                  type="button"
                  className={`btn btn--sm ${syncStatus?.autoSyncEnabled ? "btn--primary" : "btn--subtle"}`}
                  onClick={() => setAutoSync(!syncStatus?.autoSyncEnabled)}
                >
                  {syncStatus?.autoSyncEnabled ? "Yoqilgan (Faol)" : "O'chirilgan"}
                </button>
              </div>
            </div>

            {/* Majburiy sinxronizatsiya boshqaruvi */}
            <div className="card" style={{ padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                <Sliders size={19} color="var(--income)" />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                  Majburiy Sinxronizatsiya Amallari
                </h3>
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.5 }}>
                Qoʻlda toʻliq yangilash, server bazasidagi maʼlumotlarni majburiy yuklash yoki mahalliy xotirani serverga yozish.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn--subtle"
                  onClick={handleForcePull}
                  disabled={syncStatus?.isSyncing}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <ArrowDownCircle size={16} color="var(--accent)" />
                    <span>DBdan yangilab olish (Force Pull)</span>
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>Serverdan yuklash</span>
                </button>

                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={handleForcePush}
                  disabled={syncStatus?.isSyncing}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <ArrowUpCircle size={16} color="var(--income)" />
                    <span>Barchasini DBga yuklash (Force Push)</span>
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>Lokalni serverga</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4. Kutilayotgan navbat (Sync Queue) */}
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Clock size={19} color={pendingQueueCount > 0 ? "var(--warning)" : "var(--income)"} />
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
                    Kutilayotgan Navbat ({pendingQueueCount} ta oʻzgarish)
                  </h3>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Internet yoʻqligida qilingan va hali server DBga joʻnatilmagan buyruqlar
                  </span>
                </div>
              </div>

              {pendingQueueCount > 0 && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn--primary btn--xs"
                    onClick={handleManualSync}
                    disabled={syncStatus?.isSyncing}
                  >
                    <RefreshCw size={12} className={syncStatus?.isSyncing ? "animate-spin" : ""} />
                    <span>Barchasini hozir yuborish</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--xs text-muted"
                    onClick={() => {
                      if (window.confirm("Kutilayotgan barcha navbatni tozalashni tasdiqlaysizmi?")) {
                        clearSyncQueue();
                      }
                    }}
                  >
                    <Trash2 size={12} />
                    <span>Navbatni tozalash</span>
                  </button>
                </div>
              )}
            </div>

            {pendingQueueCount === 0 ? (
              <div style={{ padding: "24px 16px", background: "var(--surface-sunken)", borderRadius: 8, textAlign: "center" }}>
                <CheckCircle2 size={26} color="var(--income)" style={{ margin: "0 auto 8px auto", display: "block" }} />
                <span style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--income)" }}>
                  Barcha maʼlumotlar toʻliq DBga saqlangan!
                </span>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Navbatda joʻnatilishi kutilayotgan amallar mavjud emas. Tizim toʻliq yangilangan.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {syncStatus?.pendingQueue?.map((item) => (
                  <div
                    key={item.queueId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      background: "var(--surface-sunken)",
                      borderRadius: 8,
                      fontSize: "0.84rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        className="badge"
                        style={{
                          background:
                            item.type === "create"
                              ? "rgba(16, 185, 129, 0.16)"
                              : item.type === "update"
                              ? "rgba(56, 189, 248, 0.16)"
                              : "rgba(239, 68, 68, 0.16)",
                          color:
                            item.type === "create"
                              ? "var(--income)"
                              : item.type === "update"
                              ? "var(--karta)"
                              : "var(--danger)",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                        }}
                      >
                        {item.type === "create" ? "Qo'shish" : item.type === "update" ? "Tahrir" : "O'chirish"}
                      </span>
                      <span>
                        <strong>
                          {item.entity === "expenses"
                            ? "Tranzaksiya"
                            : item.entity === "wallets"
                            ? "Hamyonlar"
                            : item.entity === "debts"
                            ? "Qarzlar"
                            : item.entity === "reserves"
                            ? "Zaxiralar"
                            : item.entity === "dollar_rate_history"
                            ? "Dollar kursi"
                            : item.entity}
                          :
                        </strong>{" "}
                        {item.payload?.personName ||
                          item.payload?.name ||
                          item.payload?.reason ||
                          item.payload?.category ||
                          (item.payload?.rate ? `${item.payload.rate} so'm` : "") ||
                          item.targetId}
                        {item.payload?.amount !== undefined &&
                          ` (${formatSum(item.payload.amount)})`}
                      </span>
                    </div>
                    <span className="mono" style={{ fontSize: "0.74rem", color: "var(--text-dim)" }}>
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: 🧹 XOTIRA VA KESH
          - Brauzerdagi xarajatlar, qarzlar va kesh hajmi koʻrsatkichlari.
          - Eski mock va lokal keshni xavfsiz tozalash (tasdiqlash modali bilan).
          - Server manzilini saqlab qolgan holda DBdan yangi maʼlumotlarni qayta yuklash.
         ========================================================================= */}
      {activeTab === "storage" && (
        <div className="tab-pane animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* 1. Brauzerdagi xarajatlar, qarzlar va kesh hajmi koʻrsatkichlari */}
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5 }}>
              <HardDrive size={20} color="var(--accent)" />
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
                Brauzer Xotirasi va Kesh Koʻrsatkichlari
              </h2>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 18 }}>
              Qurilmangiz brauzerida (localStorage va IndexedDB) saqlanayotgan operatsion maʼlumotlar hajmi
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: 12,
              }}
            >
              <div style={{ background: "var(--surface-sunken)", padding: "12px 14px", borderRadius: 8 }}>
                <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", display: "block" }}>Lokal Xarajatlar:</span>
                <strong className="mono" style={{ fontSize: "1.15rem", color: "var(--text)", display: "block", marginTop: 4 }}>
                  {(expenses || []).length} ta yozuv
                </strong>
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                  {syncedExpensesCount} ta DBda, {pendingExpensesCount} ta lokal
                </span>
              </div>

              <div style={{ background: "var(--surface-sunken)", padding: "12px 14px", borderRadius: 8 }}>
                <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", display: "block" }}>Qarz Yozuvlari:</span>
                <strong className="mono" style={{ fontSize: "1.15rem", color: "var(--text)", display: "block", marginTop: 4 }}>
                  {(debts || []).length} ta yozuv
                </strong>
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                  Berilgan va olingan qarzlar
                </span>
              </div>

              <div style={{ background: "var(--surface-sunken)", padding: "12px 14px", borderRadius: 8 }}>
                <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", display: "block" }}>Kutilayotgan Navbat:</span>
                <strong className="mono" style={{ fontSize: "1.15rem", color: pendingQueueCount > 0 ? "var(--warning)" : "var(--income)", display: "block", marginTop: 4 }}>
                  {pendingQueueCount} ta buyruq
                </strong>
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                  {pendingQueueCount === 0 ? "Barchasi DBga yetkazilgan" : "Yuborilishi kutilmoqda"}
                </span>
              </div>

              <div style={{ background: "var(--surface-sunken)", padding: "12px 14px", borderRadius: 8 }}>
                <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", display: "block" }}>Kesh Hajmi:</span>
                <strong className="mono" style={{ fontSize: "1.15rem", color: "var(--karta)", display: "block", marginTop: 4 }}>
                  ~{storageStats.kb} KB
                </strong>
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                  {storageStats.keysCount} ta lokal xotira kaliti
                </span>
              </div>

              <div style={{ background: "var(--surface-sunken)", padding: "12px 14px", borderRadius: 8 }}>
                <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", display: "block" }}>DB Ulanish Holati:</span>
                <strong style={{ fontSize: "1.05rem", color: syncStatus?.isConnected ? "var(--income)" : "var(--warning)", display: "block", marginTop: 4 }}>
                  {syncStatus?.isConnected ? "Ulangan (DB faol)" : "Oflayn"}
                </strong>
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                  {syncStatus?.isConnected ? "Baza bilan bog'langan" : "Lokal rejim"}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Server manzilini saqlab qolgan holda DBdan yangi maʼlumotlarni qayta yuklash */}
          <div className="card" style={{ padding: 22, border: "1px solid rgba(78, 184, 150, 0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5 }}>
                  <ArrowDownCircle size={20} color="var(--accent)" />
                  <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--text)" }}>
                    DBdan Yangi Maʼlumotlarni Qayta Yuklash
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: 640 }}>
                  Server manzilini va kiritilgan konfiguratsiyalarni toʻliq saqlab qolgan holda, markaziy maʼlumotlar bazasidagi eng toza va soʻnggi yozuvlarni brauzerga qayta yuklaydi.
                </p>
              </div>

              <button
                type="button"
                className="btn btn--primary"
                onClick={handleForcePull}
                disabled={syncStatus?.isSyncing}
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <RefreshCw size={15} className={syncStatus?.isSyncing ? "animate-spin" : ""} />
                <span>DBdan qayta yuklash</span>
              </button>
            </div>
          </div>

          {/* 3. Eski mock va lokal keshni xavfsiz tozalash (tasdiqlash modali bilan) */}
          <div className="card" style={{ padding: 22, border: "1px solid rgba(239, 68, 68, 0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "rgba(239, 68, 68, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--danger)",
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--text)" }}>
                    Eski Mock va Lokal Keshni Xavfsiz Tozalash
                  </h3>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    Eski test va mock maʼlumotlarni tozalab, faqat server bazasidagi haqiqiy maʼlumotlarni qoldirish
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setShowClearModal(true)}
                disabled={isClearing}
                style={{
                  background: "var(--danger)",
                  borderColor: "var(--danger)",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Trash2 size={16} />
                <span>{isClearing ? "Tozalanmoqda..." : "Lokal xotirani tozalash"}</span>
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 14 }}>
              PostgreSQL bazasiga ulangandan soʻng, brauzeringiz xotirasida (<code>localStorage</code>) avvaldan saqlanib qolgan eski mock yozuvlar va sinov keshlarini tozalash tavsiya etiladi. Tozalash tugagach, tizim avtomatik ravishda bazadan eng yangi toza holatni yuklab oladi.
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--surface-sunken)", borderRadius: 8 }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.84rem", color: "var(--text)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={preserveBackendConfig}
                  onChange={(e) => setPreserveBackendConfig(e.target.checked)}
                  style={{ cursor: "pointer", width: 16, height: 16, accentColor: "var(--accent)" }}
                />
                <span style={{ fontWeight: 500 }}>
                  Server manzilini saqlab qolish (tavsiya etiladi: DB bilan aloqa uzilmaydi)
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: 📦 ZAXIRA VA EKSPORT
          - Barcha moliyaviy maʼlumotlarni JSON zaxira fayli sifatida yuklab olish.
          - Excel / CSV jadval formatida eksport qilish.
          - JSON zaxira faylini tizimga qayta tiklash (Import).
         ========================================================================= */}
      {activeTab === "backup" && (
        <div className="tab-pane animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Sarlavha izohi */}
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
              <Download size={20} color="var(--accent)" />
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
                Zaxira Nusxa va Maʼlumotlar Eksporti
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Barcha moliyaviy maʼlumotlaringizni toʻliq saqlab olish, Excel jadvali sifatida tahlil qilish yoki avvalgi zaxira faylidan qayta tiklash
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            {/* 1. Barcha moliyaviy maʼlumotlarni JSON zaxira fayli sifatida yuklab olish */}
            <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 8,
                      background: "rgba(78, 184, 150, 0.14)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--accent)",
                    }}
                  >
                    <FileJson size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
                      JSON Zaxira Fayli
                    </h3>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      Toʻliq moliyaviy arxiv (.json)
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: "0.83rem", color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 16 }}>
                  Barcha hamyonlar, xarajat va daromad amallari, qarzlar, zaxira rezervlar va dollar kursi tarixini oʻz ichiga olgan toʻliq zaxira nusxasi.
                </p>
              </div>

              <button
                type="button"
                className="btn btn--primary"
                onClick={downloadBackup}
                style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <Download size={16} />
                <span>JSON zaxirani yuklab olish</span>
              </button>
            </div>

            {/* 2. Excel / CSV jadval formatida eksport qilish */}
            <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 8,
                      background: "rgba(56, 189, 248, 0.14)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--karta)",
                    }}
                  >
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
                      Excel / CSV Jadvali
                    </h3>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      Jadval va hisobotlar uchun (.csv)
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: "0.83rem", color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 16 }}>
                  Barcha amallarni Microsoft Excel, Google Sheets yoki Apple Numbers dasturlarida koʻrish va audit qilish uchun qulay jadval formatida eksport qiling.
                </p>
              </div>

              <button
                type="button"
                className="btn btn--subtle"
                onClick={downloadCSV}
                style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <FileSpreadsheet size={16} />
                <span>Excel / CSV formatida eksport</span>
              </button>
            </div>

            {/* 3. JSON zaxira faylini tizimga qayta tiklash (Import) */}
            <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 8,
                      background: "rgba(245, 158, 11, 0.14)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--warning)",
                    }}
                  >
                    <Upload size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
                      Zaxirani Qayta Tiklash (Import)
                    </h3>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      Avvalgi zaxira faylini tiklash
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: "0.83rem", color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 16 }}>
                  Avval saqlab olingan <code>.json</code> zaxira faylini tanlang. Tizim faylni oʻqib barcha yozuvlarni tiklaydi va DBga sinxronlaydi.
                </p>
              </div>

              <div>
                <label
                  className="btn btn--ghost"
                  style={{
                    width: "100%",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    border: "1px dashed var(--border)",
                  }}
                >
                  <Upload size={16} />
                  <span>JSON faylini tanlash...</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileImport}
                    style={{ display: "none" }}
                  />
                </label>

                {importStatus && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "8px 12px",
                      borderRadius: 6,
                      fontSize: "0.8rem",
                      background: importStatus.success
                        ? "rgba(16, 185, 129, 0.12)"
                        : "rgba(239, 68, 68, 0.12)",
                      color: importStatus.success ? "var(--income)" : "var(--danger)",
                      fontWeight: 500,
                    }}
                  >
                    {importStatus.message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: 📋 TIZIM JURNALI
          - Sinxronizatsiya va tizim hodisalari auditi/jurnali.
          - Jurnalni koʻrish va tozalash.
         ========================================================================= */}
      {activeTab === "logs" && (
        <div className="tab-pane animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Activity size={20} color="var(--accent)" />
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
                    Sinxronizatsiya va Tizim Jurnali (Audit)
                  </h2>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    Barcha sinxronizatsiya jarayonlari, muvaffaqiyatlar va xatolar qaydnomasi
                  </span>
                </div>
              </div>

              {syncStatus?.logs?.length > 0 && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm text-muted"
                  onClick={() => {
                    if (window.confirm("Barcha tizim jurnali yozuvlarini tozalashni tasdiqlaysizmi?")) {
                      clearSyncLogs();
                    }
                  }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Trash2 size={14} />
                  <span>Jurnalni tozalash</span>
                </button>
              )}
            </div>

            {/* Qidiruv va Filter paneli */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 16,
                paddingBottom: 14,
                borderBottom: "1px solid var(--border)",
              }}
            >
              {/* Filter tugmalari */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className={`btn btn--xs ${logFilter === "all" ? "btn--primary" : "btn--ghost"}`}
                  onClick={() => setLogFilter("all")}
                >
                  Barchasi ({syncStatus?.logs?.length || 0})
                </button>
                <button
                  type="button"
                  className={`btn btn--xs ${logFilter === "success" ? "btn--primary" : "btn--ghost"}`}
                  onClick={() => setLogFilter("success")}
                >
                  Muvaffaqiyatli
                </button>
                <button
                  type="button"
                  className={`btn btn--xs ${logFilter === "error" ? "btn--primary" : "btn--ghost"}`}
                  onClick={() => setLogFilter("error")}
                >
                  Xatolar
                </button>
                <button
                  type="button"
                  className={`btn btn--xs ${logFilter === "warning" ? "btn--primary" : "btn--ghost"}`}
                  onClick={() => setLogFilter("warning")}
                >
                  Ogohlantirishlar
                </button>
              </div>

              {/* Qidiruv inputi */}
              <div style={{ position: "relative", minWidth: 200 }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
                <input
                  type="text"
                  className="input input--sm"
                  placeholder="Jurnalda qidirish..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  style={{ paddingLeft: 30, fontSize: "0.8rem", width: "100%" }}
                />
              </div>
            </div>

            {/* Jurnal ro'yxati */}
            {filteredLogs.length === 0 ? (
              <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", textAlign: "center", padding: "32px 0" }}>
                {syncStatus?.logs?.length === 0
                  ? "Hozircha hech qanday tizim jurnali mavjud emas."
                  : "Tanlangan filtr boʻyicha yozuv topilmadi."}
              </div>
            ) : (
              <div
                style={{
                  maxHeight: 460,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      fontSize: "0.84rem",
                      padding: "10px 14px",
                      background: "var(--surface-sunken)",
                      borderRadius: 8,
                      borderLeft: `3px solid ${
                        log.level === "success"
                          ? "var(--income)"
                          : log.level === "error"
                          ? "var(--danger)"
                          : log.level === "warning"
                          ? "var(--warning)"
                          : "var(--karta)"
                      }`,
                    }}
                  >
                    <span
                      style={{
                        color:
                          log.level === "success"
                            ? "var(--income)"
                            : log.level === "error"
                            ? "var(--danger)"
                            : log.level === "warning"
                            ? "var(--warning)"
                            : "var(--karta)",
                        fontWeight: 800,
                        fontSize: "0.95rem",
                        lineHeight: 1,
                        paddingTop: 1,
                      }}
                    >
                      {log.level === "success" ? "✓" : log.level === "error" ? "✗" : "•"}
                    </span>
                    <span style={{ flex: 1, color: "var(--text)", lineHeight: 1.4 }}>{log.message}</span>
                    <span className="mono" style={{ color: "var(--text-dim)", fontSize: "0.74rem", flexShrink: 0 }}>
                      {formatDateTime(log.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Lokal xotirani xavfsiz tozalash tasdig'i */}
      {showClearModal && (
        <div
          className="modal-backdrop animate-fade-in"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => !isClearing && setShowClearModal(false)}
        >
          <div
            className="modal-card animate-scale-in"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              maxWidth: 480,
              width: "100%",
              padding: 24,
              boxShadow: "0 24px 48px rgba(0, 0, 0, 0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: "50%",
                  background: "rgba(239, 68, 68, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--danger)",
                  flexShrink: 0,
                }}
              >
                <Trash2 size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--text)" }}>
                  Lokal xotirani tozalaysizmi?
                </h3>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  Brauzer keshini tozalash va DBdan maʼlumotlarni yangilash
                </span>
              </div>
            </div>

            <div style={{ fontSize: "0.86rem", color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 18 }}>
              Ushbu amal bajarilganda:
              <ul style={{ margin: "8px 0 0 18px", padding: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                <li>Brauzerdagi eski test va mock maʼlumotlar toʻliq oʻchiriladi.</li>
                <li>Hamyonlar va zaxira keshlar yangilanadi.</li>
                <li>Ulangan markaziy maʼlumotlar bazasidan (DB) toza maʼlumotlar qayta tortib olinadi.</li>
                {preserveBackendConfig ? (
                  <li style={{ color: "var(--income)", fontWeight: 500 }}>
                    Backend server manzili (<code>{syncStatus?.backendUrl}</code>) saqlab qolinadi.
                  </li>
                ) : (
                  <li style={{ color: "var(--danger)" }}>
                    Backend server manzili ham tozalanadi.
                  </li>
                )}
              </ul>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setShowClearModal(false)}
                disabled={isClearing}
              >
                Bekor qilish
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleExecuteClearStorage}
                disabled={isClearing}
                style={{
                  background: "var(--danger)",
                  borderColor: "var(--danger)",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {isClearing ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Tozalanmoqda...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Ha, tozalansin</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
