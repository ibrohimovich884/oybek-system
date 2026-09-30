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
  Search,
  Check,
  RotateCcw,
  Sliders,
  Radio,
  FileJson,
  Archive,
  ClipboardList,
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
  } = useExpenses();

  // 4 asosiy bo'lim (tablar):
  // 1. "server"   -> Baza va Server (Database & Server)
  // 2. "storage"  -> Xotira va Kesh (Storage & Cache)
  // 3. "backup"   -> Zaxira va Eksport (Backup & Export)
  // 4. "logs"     -> Tizim Jurnali (System Log / Audit)
  const [activeTab, setActiveTab] = useState("server");

  // Render server manzili
  const serverUrl = "https://oybek-system.onrender.com";
  const [syncFeedback, setSyncFeedback] = useState(null);
  const [isHealthTesting, setIsHealthTesting] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [preserveBackendConfig, setPreserveBackendConfig] = useState(true);

  // Tizim jurnali filtri va qidiruvi
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

  // Amallar
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

  const handleExecuteClearStorage = async () => {
    setIsClearing(true);
    setSyncFeedback({ type: "loading", message: "Lokal xotira tozalanmoqda va DBdan qayta yuklanmoqda..." });
    try {
      const res = await clearLocalStorageData({
        preserveConnection: preserveBackendConfig,
        refetchFromDB: true,
      });

      setShowClearModal(false);
      calculateStorageStats();
      setSyncFeedback({
        type: "success",
        message: `Lokal xotira va eski mocklar tozalandi! ${res?.count || 0} ta kesh kaliti olib tashlandi va bazadan (DB) eng so'nggi ma'lumotlar olindi.`,
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
        setImportStatus({ success: true, message: "Zaxira nusxasi muvaffaqiyatli tiklandi!" });
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

  // Jurnal yozuvlarini saralash
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
      <div className="dashboard-header" style={{ marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            <span className="badge badge--primary" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.75rem" }}>
              <Settings size={13} />
              <span>Tizim sozlamalari</span>
            </span>
            <span className={`badge ${syncStatus?.isConnected ? "badge--success" : "badge--warning"}`} style={{ fontSize: "0.75rem" }}>
              {syncStatus?.isConnected ? "DB Faol" : "Oflayn"}
            </span>
            <span className={`badge ${syncStatus?.isOnline ? "badge--income" : "badge--danger"}`} style={{ fontSize: "0.75rem" }}>
              {syncStatus?.isOnline ? "Online" : "Offline"}
            </span>
          </div>

          <h1
            className="dashboard-title"
            style={{
              fontSize: "clamp(1.25rem, 5vw, 1.6rem)",
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            Sozlamalar va Tizim
          </h1>
          <p
            className="dashboard-subtitle"
            style={{
              fontSize: "clamp(0.78rem, 3.5vw, 0.85rem)",
              marginTop: 4,
              marginBottom: 0,
            }}
          >
            Baza va server, kesh va lokal xotira, zaxiralar hamda audit jurnali
          </p>
        </div>

        {/* Global tezkor amallar */}
        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            className="btn btn--subtle btn--sm"
            onClick={handleManualSync}
            disabled={syncStatus?.isSyncing}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.82rem",
              padding: "7px 12px",
            }}
            title="Server bilan zudlik bilan sinxronlash"
          >
            <RefreshCw size={14} className={syncStatus?.isSyncing ? "animate-spin" : ""} />
            <span>{syncStatus?.isSyncing ? "Sinxronlanmoqda..." : "Hozir sinxronlash"}</span>
          </button>
        </div>
      </div>

      {/* Xabarnoma / Feedback alert */}
      {syncFeedback && (
        <div
          className={`settings-alert settings-alert--${syncFeedback.type}`}
          style={{
            marginBottom: 16,
            padding: "10px 14px",
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
            {syncFeedback.type === "success" ? (
              <CheckCircle2 size={16} color="var(--income)" style={{ flexShrink: 0 }} />
            ) : syncFeedback.type === "error" ? (
              <AlertTriangle size={16} color="var(--danger)" style={{ flexShrink: 0 }} />
            ) : (
              <RefreshCw size={16} className="animate-spin" color="var(--karta)" style={{ flexShrink: 0 }} />
            )}
            <span style={{ fontSize: "0.82rem", fontWeight: 500, lineHeight: 1.3 }}>{syncFeedback.message}</span>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--xs"
            onClick={() => setSyncFeedback(null)}
            style={{ flexShrink: 0, marginLeft: 8 }}
          >
            Yopish
          </button>
        </div>
      )}

      {/* 4 TA ASOSIY QULAY BO'LIM (TABLAR) - STIKERSIZ, SOF ICONLAR BILAN */}
      <div className="settings-tabs">
        <button
          type="button"
          className={`settings-tab-btn ${activeTab === "server" ? "is-active" : ""}`}
          onClick={() => setActiveTab("server")}
        >
          <Database size={15} style={{ color: activeTab === "server" ? "var(--accent)" : "currentColor" }} />
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
          <HardDrive size={15} style={{ color: activeTab === "storage" ? "var(--accent)" : "currentColor" }} />
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
          <Archive size={15} style={{ color: activeTab === "backup" ? "var(--accent)" : "currentColor" }} />
          <span>Zaxira va Eksport</span>
        </button>

        <button
          type="button"
          className={`settings-tab-btn ${activeTab === "logs" ? "is-active" : ""}`}
          onClick={() => setActiveTab("logs")}
        >
          <ClipboardList size={15} style={{ color: activeTab === "logs" ? "var(--accent)" : "currentColor" }} />
          <span>Tizim Jurnali</span>
          {syncStatus?.logs?.length > 0 && (
            <span className="settings-tab-badge">
              {syncStatus.logs.length}
            </span>
          )}
        </button>
      </div>

      {/* =========================================================================
          TAB 1: BAZA VA SERVER
          - Maʼlumotlar bazasi (DB) va internet aloqasi holati.
          - Backend Server URL manzilini sozlash va aloqani tekshirish (Ping).
          - Avtomatik va majburiy sinxronizatsiya boshqaruvi.
          - Kutilayotgan navbat (Sync Queue).
         ========================================================================= */}
      {activeTab === "server" && (
        <div className="tab-pane animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* 1. Maʼlumotlar bazasi (DB) va internet aloqasi holati */}
          <div className="settings-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Database size={18} style={{ color: "var(--accent)" }} />
                  <h2 style={{ margin: 0, fontSize: "1.08rem", fontWeight: 700 }}>
                    Maʼlumotlar Bazasi va Aloqa Holati
                  </h2>
                </div>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Internet va markaziy maʼlumotlar bazasi aloqa koʻrsatkichlari
                </p>
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", width: "100%", marginTop: 4 }}>
                <button
                  type="button"
                  className="btn btn--subtle btn--xs"
                  onClick={handleTestConnection}
                  disabled={isHealthTesting}
                  style={{ flex: "1 1 120px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <Activity size={13} className={isHealthTesting ? "animate-spin" : ""} />
                  <span>{isHealthTesting ? "Ping..." : "Aloqani tekshirish"}</span>
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--xs"
                  onClick={handleManualSync}
                  disabled={syncStatus?.isSyncing}
                  style={{ flex: "1 1 120px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <RefreshCw size={13} className={syncStatus?.isSyncing ? "animate-spin" : ""} />
                  <span>{syncStatus?.isSyncing ? "Sinxronlanmoqda..." : "Sinxronlash"}</span>
                </button>
              </div>
            </div>

            {/* KPI kartalari (375px'da qulay 2 ustunli) */}
            <div className="settings-kpi-grid-4" style={{ marginTop: 14 }}>
              {/* Internet */}
              <div className="settings-kpi-box">
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                  {syncStatus?.isOnline ? <Wifi size={13} color="var(--income)" /> : <WifiOff size={13} color="var(--danger)" />}
                  <span>Internet</span>
                </div>
                <strong style={{ fontSize: "0.95rem", color: syncStatus?.isOnline ? "var(--income)" : "var(--danger)", display: "block", marginTop: 4 }}>
                  {syncStatus?.isOnline ? "Onlayn" : "Oflayn"}
                </strong>
                <span style={{ fontSize: "0.68rem", color: "var(--text-dim)", display: "block", marginTop: 2 }}>
                  {syncStatus?.latency ? `${syncStatus.latency}ms ping` : "Barqaror"}
                </span>
              </div>

              {/* DB Server */}
              <div className="settings-kpi-box">
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                  <Server size={13} color={syncStatus?.isConnected ? "var(--accent)" : "var(--warning)"} />
                  <span>DB Server</span>
                </div>
                <strong style={{ fontSize: "0.95rem", color: syncStatus?.isConnected ? "var(--accent)" : "var(--warning)", display: "block", marginTop: 4 }}>
                  {syncStatus?.isConnected ? "Ulangan" : syncStatus?.isChecking ? "Tekshiruv..." : "Aloqa yo'q"}
                </strong>
                <span style={{ fontSize: "0.68rem", color: "var(--text-dim)", display: "block", marginTop: 2 }}>
                  PostgreSQL
                </span>
              </div>

              {/* DBda saqlanganlar */}
              <div className="settings-kpi-box">
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                  <Database size={13} color="var(--income)" />
                  <span>DBda Mavjud</span>
                </div>
                <strong className="mono" style={{ fontSize: "1.05rem", color: "var(--income)", display: "block", marginTop: 4 }}>
                  {syncedExpensesCount} ta
                </strong>
                <span style={{ fontSize: "0.68rem", color: "var(--text-dim)", display: "block", marginTop: 2 }}>
                  Yozuv saqlangan
                </span>
              </div>

              {/* Oxirgi sinxronizatsiya */}
              <div className="settings-kpi-box">
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                  <Clock size={13} color="var(--karta)" />
                  <span>Oxirgi Sync</span>
                </div>
                <strong className="mono" style={{ fontSize: "0.85rem", color: "var(--text)", display: "block", marginTop: 4 }}>
                  {syncStatus?.lastSyncedAt ? formatDateTime(syncStatus.lastSyncedAt).split(" ")[1] || "Bajarilgan" : "Yo'q"}
                </strong>
                <span style={{ fontSize: "0.68rem", color: "var(--text-dim)", display: "block", marginTop: 2 }}>
                  {syncStatus?.lastSyncedAt ? formatDateTime(syncStatus.lastSyncedAt).split(" ")[0] : "Hali qilinmagan"}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Backend Server Manzili va Ping */}
          <div className="settings-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Server size={18} color="var(--karta)" />
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
                    Asosiy Backend Server
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Frontend va backend Render platformasida bitta xizmatda ishlamoqda
                </p>
              </div>

              <button
                type="button"
                className="btn btn--subtle btn--sm"
                onClick={handleTestConnection}
                disabled={isHealthTesting}
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                <Activity size={14} className={isHealthTesting ? "animate-spin" : ""} />
                <span>{isHealthTesting ? "Ping tekshirilmoqda..." : "Aloqani tekshirish (Ping)"}</span>
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "12px 14px",
                background: "rgba(56, 189, 248, 0.08)",
                border: "1px solid rgba(56, 189, 248, 0.25)",
                borderRadius: 8,
                fontSize: "0.82rem",
                color: "var(--text)",
                marginBottom: 10,
              }}
            >
              <div style={{ color: "var(--karta)", flexShrink: 0, marginTop: 2 }}>
                <Radio size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginBottom: 2 }}>
                  Doimiy server manzili:
                </div>
                <code style={{ color: "var(--karta)", fontWeight: 700, fontSize: "0.92rem", wordBreak: "break-all" }}>
                  https://oybek-system.onrender.com
                </code>
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
                  {syncStatus?.isConnected ? (
                    <>
                      <CheckCircle2 size={13} color="var(--income)" />
                      <span style={{ color: "var(--income)", fontWeight: 600, fontSize: "0.78rem" }}>
                        DB bilan faol aloqa oʻrnatilgan {syncStatus?.latency ? `(${syncStatus.latency}ms)` : ""}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={13} color="var(--warning)" />
                      <span style={{ color: "var(--warning)", fontWeight: 600, fontSize: "0.78rem" }}>
                        Serverga ulanish kutilmoqda (uygʻonishi 15-20s olishi mumkin)
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 10px",
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
                borderRadius: 6,
                fontSize: "0.74rem",
                color: "var(--warning)",
              }}
            >
              <Zap size={14} style={{ flexShrink: 0 }} />
              <span>
                <strong>Avtomatik bogʻlanish:</strong> Tizim server manzilini qidirib oʻtirmaydi — barcha soʻrovlar toʻgʻridan-toʻgʻri Render serveriga yoʻnaltiriladi.
              </span>
            </div>
          </div>

          {/* 3. Avtomatik va majburiy sinxronizatsiya boshqaruvi */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            {/* Avtomatik sinxronizatsiya */}
            <div className="settings-card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Zap size={17} color="var(--accent)" />
                <h3 style={{ margin: 0, fontSize: "1.02rem", fontWeight: 700 }}>
                  Avtomatik Sinxronizatsiya
                </h3>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.4 }}>
                Yangi kiritilgan amal va tahrirlar darhol server maʼlumotlar bazasiga yuboriladi.
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  background: "var(--surface-sunken)",
                  borderRadius: 6,
                }}
              >
                <div>
                  <strong style={{ fontSize: "0.85rem", color: "var(--text)", display: "block" }}>
                    Avto-sync
                  </strong>
                  <span style={{ fontSize: "0.72rem", color: syncStatus?.autoSyncEnabled ? "var(--income)" : "var(--text-muted)" }}>
                    {syncStatus?.autoSyncEnabled ? "Faol (Fonda avtomatik)" : "O'chirilgan"}
                  </span>
                </div>

                <button
                  type="button"
                  className={`btn btn--xs ${syncStatus?.autoSyncEnabled ? "btn--primary" : "btn--subtle"}`}
                  onClick={() => setAutoSync(!syncStatus?.autoSyncEnabled)}
                >
                  {syncStatus?.autoSyncEnabled ? "Yoqilgan" : "O'chirilgan"}
                </button>
              </div>
            </div>

            {/* Majburiy sinxronizatsiya boshqaruvi */}
            <div className="settings-card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Sliders size={17} color="var(--income)" />
                <h3 style={{ margin: 0, fontSize: "1.02rem", fontWeight: 700 }}>
                  Majburiy Sinxronlash
                </h3>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.4 }}>
                Bazasidagi eng soʻnggi maʼlumotlarni tortib olish yoki lokal xotirani DBga majburiy yuklash.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn--subtle btn--sm"
                  onClick={handleForcePull}
                  disabled={syncStatus?.isSyncing}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px" }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: "0.8rem" }}>
                    <ArrowDownCircle size={15} color="var(--accent)" />
                    <span>DBdan yangilab olish (Pull)</span>
                  </span>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Serverdan</span>
                </button>

                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={handleForcePush}
                  disabled={syncStatus?.isSyncing}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px" }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: "0.8rem" }}>
                    <ArrowUpCircle size={15} color="var(--income)" />
                    <span>Barchasini DBga yuklash (Push)</span>
                  </span>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Lokalni</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4. Kutilayotgan navbat (Sync Queue) */}
          <div className="settings-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={18} color={pendingQueueCount > 0 ? "var(--warning)" : "var(--income)"} />
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
                    Kutilayotgan Navbat ({pendingQueueCount})
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Internet yoʻqligida navbatga olingan buyruqlar
                  </span>
                </div>
              </div>

              {pendingQueueCount > 0 && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn--primary btn--xs"
                    onClick={handleManualSync}
                    disabled={syncStatus?.isSyncing}
                  >
                    <RefreshCw size={11} className={syncStatus?.isSyncing ? "animate-spin" : ""} />
                    <span>Hozir yuborish</span>
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
                    <Trash2 size={11} />
                    <span>Tozalash</span>
                  </button>
                </div>
              )}
            </div>

            {pendingQueueCount === 0 ? (
              <div style={{ padding: "18px 12px", background: "var(--surface-sunken)", borderRadius: 6, textAlign: "center" }}>
                <CheckCircle2 size={24} color="var(--income)" style={{ margin: "0 auto 6px auto", display: "block" }} />
                <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--income)" }}>
                  Barcha maʼlumotlar toʻliq DBga saqlangan!
                </span>
                <p style={{ margin: "3px 0 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Kutilayotgan tranzaksiya mavjud emas.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {syncStatus?.pendingQueue?.map((item) => (
                  <div
                    key={item.queueId}
                    className="settings-queue-item"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      background: "var(--surface-sunken)",
                      borderRadius: 6,
                      fontSize: "0.8rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
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
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          padding: "1px 5px",
                        }}
                      >
                        {item.type === "create" ? "Qo'shish" : item.type === "update" ? "Tahrir" : "O'chirish"}
                      </span>
                      <span style={{ wordBreak: "break-word" }}>
                        <strong>
                          {item.entity === "expenses"
                            ? "Amal"
                            : item.entity === "wallets"
                            ? "Hamyon"
                            : item.entity === "debts"
                            ? "Qarz"
                            : item.entity === "reserves"
                            ? "Zaxira"
                            : item.entity}:
                        </strong>{" "}
                        {item.payload?.personName ||
                          item.payload?.name ||
                          item.payload?.reason ||
                          item.payload?.category ||
                          item.targetId}
                        {item.payload?.amount !== undefined &&
                          ` (${formatSum(item.payload.amount)})`}
                      </span>
                    </div>
                    <span className="mono" style={{ fontSize: "0.7rem", color: "var(--text-dim)", flexShrink: 0 }}>
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
          TAB 2: XOTIRA VA KESH
          - Brauzerdagi xarajatlar, qarzlar va kesh hajmi koʻrsatkichlari.
          - Eski mock va lokal keshni xavfsiz tozalash (tasdiqlash modali bilan).
          - Server manzilini saqlab qolgan holda DBdan yangi maʼlumotlarni qayta yuklash.
         ========================================================================= */}
      {activeTab === "storage" && (
        <div className="tab-pane animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* 1. Brauzerdagi xarajatlar, qarzlar va kesh hajmi koʻrsatkichlari */}
          <div className="settings-card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <HardDrive size={18} color="var(--accent)" />
              <h2 style={{ margin: 0, fontSize: "1.08rem", fontWeight: 700 }}>
                Brauzer Xotirasi va Kesh
              </h2>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 14 }}>
              Qurilmangiz brauzerida saqlanayotgan operatsion maʼlumotlar hajmi
            </p>

            <div className="settings-kpi-grid-5">
              <div className="settings-kpi-box">
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>Xarajatlar:</span>
                <strong className="mono" style={{ fontSize: "1.05rem", color: "var(--text)", display: "block", marginTop: 3 }}>
                  {(expenses || []).length} ta
                </strong>
                <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
                  {syncedExpensesCount} DB, {pendingExpensesCount} lokal
                </span>
              </div>

              <div className="settings-kpi-box">
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>Qarzlar:</span>
                <strong className="mono" style={{ fontSize: "1.05rem", color: "var(--text)", display: "block", marginTop: 3 }}>
                  {(debts || []).length} ta
                </strong>
                <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
                  Qarz yozuvlari
                </span>
              </div>

              <div className="settings-kpi-box">
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>Navbat:</span>
                <strong className="mono" style={{ fontSize: "1.05rem", color: pendingQueueCount > 0 ? "var(--warning)" : "var(--income)", display: "block", marginTop: 3 }}>
                  {pendingQueueCount} ta
                </strong>
                <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
                  {pendingQueueCount === 0 ? "To'liq DBda" : "Kutilmoqda"}
                </span>
              </div>

              <div className="settings-kpi-box">
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>Kesh Hajmi:</span>
                <strong className="mono" style={{ fontSize: "1.05rem", color: "var(--karta)", display: "block", marginTop: 3 }}>
                  ~{storageStats.kb} KB
                </strong>
                <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
                  {storageStats.keysCount} ta kalit
                </span>
              </div>

              <div className="settings-kpi-box" style={{ gridColumn: "span 2" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>DB Holati:</span>
                <strong style={{ fontSize: "0.95rem", color: syncStatus?.isConnected ? "var(--income)" : "var(--warning)", display: "block", marginTop: 3 }}>
                  {syncStatus?.isConnected ? "Ulangan (DB faol)" : "Oflayn rejim"}
                </strong>
                <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
                  {syncStatus?.isConnected ? "Server bazasi bilan bog'langan" : "Lokal xotirada"}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Server manzilini saqlab qolgan holda DBdan yangi maʼlumotlarni qayta yuklash */}
          <div className="settings-card" style={{ border: "1px solid rgba(78, 184, 150, 0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <ArrowDownCircle size={18} color="var(--accent)" />
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text)" }}>
                    DBdan Qayta Yuklash
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                  Server manzilini saqlab qolgan holda, bazadagi eng yangi toza yozuvlarni brauzerga yuklaydi.
                </p>
              </div>

              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={handleForcePull}
                disabled={syncStatus?.isSyncing}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "center" }}
              >
                <RefreshCw size={14} className={syncStatus?.isSyncing ? "animate-spin" : ""} />
                <span>DBdan qayta yuklash</span>
              </button>
            </div>
          </div>

          {/* 3. Eski mock va lokal keshni xavfsiz tozalash (tasdiqlash modali bilan) */}
          <div className="settings-card" style={{ border: "1px solid rgba(239, 68, 68, 0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "rgba(239, 68, 68, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--danger)",
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text)" }}>
                    Eski Mock va Keshni Tozalash
                  </h3>
                  <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                    Eski test yozuvlarni tozalab, faqat server bazasini qoldirish
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => setShowClearModal(true)}
                disabled={isClearing}
                style={{
                  background: "var(--danger)",
                  borderColor: "var(--danger)",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  width: "100%",
                }}
              >
                <Trash2 size={14} />
                <span>{isClearing ? "Tozalanmoqda..." : "Lokal xotirani tozalash"}</span>
              </button>
            </div>

            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.4, marginBottom: 12 }}>
              PostgreSQL bazasiga ulangach, brauzerdagi avvalgi sinov keshlarini tozalash tavsiya etiladi. Tozalangach, DBdan toza maʼlumotlar yuklanadi.
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--surface-sunken)", borderRadius: 6 }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: "0.78rem", color: "var(--text)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={preserveBackendConfig}
                  onChange={(e) => setPreserveBackendConfig(e.target.checked)}
                  style={{ cursor: "pointer", width: 15, height: 15, accentColor: "var(--accent)" }}
                />
                <span style={{ fontWeight: 500 }}>
                  Server manzilini saqlab qolish (DB aloqasi uzilmaydi)
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: ZAXIRA VA EKSPORT
          - Barcha moliyaviy maʼlumotlarni JSON zaxira fayli sifatida yuklab olish.
          - Excel / CSV jadval formatida eksport qilish.
          - JSON zaxira faylini tizimga qayta tiklash (Import).
         ========================================================================= */}
      {activeTab === "backup" && (
        <div className="tab-pane animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Sarlavha */}
          <div className="settings-card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Archive size={18} color="var(--accent)" />
              <h2 style={{ margin: 0, fontSize: "1.08rem", fontWeight: 700 }}>
                Zaxira Nusxa va Eksport
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Moliyaviy maʼlumotlarni saqlab olish, Excel jadvali qilib yuklash yoki tiklash
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {/* 1. JSON zaxira fayli */}
            <div className="settings-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: "rgba(78, 184, 150, 0.14)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--accent)",
                    }}
                  >
                    <FileJson size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700 }}>
                      JSON Zaxira Fayli
                    </h3>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      Toʻliq arxiv (.json)
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.4, marginBottom: 14 }}>
                  Hamyonlar, amallar, qarzlar, zaxira rezervlar va kurslar toʻliq arxivi.
                </p>
              </div>

              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={downloadBackup}
                style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 40 }}
              >
                <Download size={15} />
                <span>JSON zaxirani yuklab olish</span>
              </button>
            </div>

            {/* 2. Excel / CSV eksport */}
            <div className="settings-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: "rgba(56, 189, 248, 0.14)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--karta)",
                    }}
                  >
                    <FileSpreadsheet size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700 }}>
                      Excel / CSV Jadvali
                    </h3>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      Jadvallar uchun (.csv)
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.4, marginBottom: 14 }}>
                  Excel yoki Google Sheets dasturlarida tahlil qilish uchun jadval formatida eksport.
                </p>
              </div>

              <button
                type="button"
                className="btn btn--subtle btn--sm"
                onClick={downloadCSV}
                style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 40 }}
              >
                <FileSpreadsheet size={15} />
                <span>Excel / CSV eksport</span>
              </button>
            </div>

            {/* 3. Zaxirani qayta tiklash (Import) */}
            <div className="settings-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: "rgba(245, 158, 11, 0.14)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--warning)",
                    }}
                  >
                    <Upload size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700 }}>
                      Zaxirani Qayta Tiklash
                    </h3>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      Avvalgi .json faylidan
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.4, marginBottom: 14 }}>
                  Saqlab olingan <code>.json</code> zaxira faylini tanlang. Tizim yozuvlarni qayta tiklaydi.
                </p>
              </div>

              <div>
                <label
                  className="btn btn--ghost btn--sm"
                  style={{
                    width: "100%",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    border: "1px dashed var(--border)",
                    minHeight: 40,
                  }}
                >
                  <Upload size={15} />
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
                      marginTop: 8,
                      padding: "6px 10px",
                      borderRadius: 6,
                      fontSize: "0.76rem",
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
          TAB 4: TIZIM JURNALI
          - Sinxronizatsiya va tizim hodisalari auditi/jurnali.
          - Jurnalni koʻrish va tozalash.
         ========================================================================= */}
      {activeTab === "logs" && (
        <div className="tab-pane animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="settings-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ClipboardList size={18} color="var(--accent)" />
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.08rem", fontWeight: 700 }}>
                    Sinxronizatsiya Auditi
                  </h2>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Barcha sinxronizatsiya jarayonlari qaydnomasi
                  </span>
                </div>
              </div>

              {syncStatus?.logs?.length > 0 && (
                <button
                  type="button"
                  className="btn btn--ghost btn--xs text-muted"
                  onClick={() => {
                    if (window.confirm("Barcha tizim jurnali yozuvlarini tozalashni tasdiqlaysizmi?")) {
                      clearSyncLogs();
                    }
                  }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                >
                  <Trash2 size={13} />
                  <span>Jurnalni tozalash</span>
                </button>
              )}
            </div>

            {/* Qidiruv va Filter paneli (375px'da toza) */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 12,
                paddingBottom: 10,
                borderBottom: "1px solid var(--border)",
              }}
            >
              {/* Qidiruv inputi */}
              <div style={{ position: "relative", width: "100%" }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
                <input
                  type="text"
                  className="input input--sm"
                  placeholder="Jurnalda qidirish..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  style={{ paddingLeft: 30, fontSize: "0.78rem", width: "100%" }}
                />
              </div>

              {/* Filter tugmalari */}
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className={`btn btn--xs ${logFilter === "all" ? "btn--primary" : "btn--ghost"}`}
                  onClick={() => setLogFilter("all")}
                  style={{ fontSize: "0.72rem", padding: "4px 8px" }}
                >
                  Barchasi ({syncStatus?.logs?.length || 0})
                </button>
                <button
                  type="button"
                  className={`btn btn--xs ${logFilter === "success" ? "btn--primary" : "btn--ghost"}`}
                  onClick={() => setLogFilter("success")}
                  style={{ fontSize: "0.72rem", padding: "4px 8px" }}
                >
                  Muvaffaqiyatli
                </button>
                <button
                  type="button"
                  className={`btn btn--xs ${logFilter === "error" ? "btn--primary" : "btn--ghost"}`}
                  onClick={() => setLogFilter("error")}
                  style={{ fontSize: "0.72rem", padding: "4px 8px" }}
                >
                  Xatolar
                </button>
                <button
                  type="button"
                  className={`btn btn--xs ${logFilter === "warning" ? "btn--primary" : "btn--ghost"}`}
                  onClick={() => setLogFilter("warning")}
                  style={{ fontSize: "0.72rem", padding: "4px 8px" }}
                >
                  Ogohlantirish
                </button>
              </div>
            </div>

            {/* Jurnal ro'yxati */}
            {filteredLogs.length === 0 ? (
              <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", textAlign: "center", padding: "24px 0" }}>
                {syncStatus?.logs?.length === 0
                  ? "Hozircha hech qanday tizim jurnali mavjud emas."
                  : "Tanlangan filtr boʻyicha yozuv topilmadi."}
              </div>
            ) : (
              <div
                style={{
                  maxHeight: 400,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="settings-log-item"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      fontSize: "0.78rem",
                      padding: "8px 10px",
                      background: "var(--surface-sunken)",
                      borderRadius: 6,
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
                    <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
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
                          fontSize: "0.9rem",
                          lineHeight: 1,
                        }}
                      >
                        {log.level === "success" ? "✓" : log.level === "error" ? "✗" : "•"}
                      </span>
                      <span style={{ flex: 1, color: "var(--text)", lineHeight: 1.35, wordBreak: "break-word" }}>
                        {log.message}
                      </span>
                    </div>
                    <span className="mono" style={{ color: "var(--text-dim)", fontSize: "0.68rem", alignSelf: "flex-end" }}>
                      {formatDateTime(log.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Lokal xotirani xavfsiz tozalash tasdig'i (375px mos) */}
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
            padding: 12,
          }}
          onClick={() => !isClearing && setShowClearModal(false)}
        >
          <div
            className="modal-card animate-scale-in"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              maxWidth: 360,
              width: "100%",
              padding: 18,
              boxShadow: "0 24px 48px rgba(0, 0, 0, 0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "rgba(239, 68, 68, 0.15)",
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
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text)" }}>
                  Xotirani tozalaysizmi?
                </h3>
                <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                  Lokal keshni tozalash va DBdan yangilash
                </span>
              </div>
            </div>

            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.45, marginBottom: 14 }}>
              Ushbu amal bajarilganda:
              <ul style={{ margin: "6px 0 0 16px", padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <li>Brauzerdagi eski test va mock maʼlumotlar tozalanadi.</li>
                <li>Hamyon va keshlar yangilanadi.</li>
                <li>Markaziy maʼlumotlar bazasidan (DB) toza maʼlumotlar yuklanadi.</li>
                {preserveBackendConfig ? (
                  <li style={{ color: "var(--income)", fontWeight: 500 }}>
                    Server URL saqlab qolinadi.
                  </li>
                ) : (
                  <li style={{ color: "var(--danger)" }}>
                    Server URL ham tozalanadi.
                  </li>
                )}
              </ul>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setShowClearModal(false)}
                disabled={isClearing}
                style={{ flex: 1, minHeight: 40 }}
              >
                Bekor qilish
              </button>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={handleExecuteClearStorage}
                disabled={isClearing}
                style={{
                  background: "var(--danger)",
                  borderColor: "var(--danger)",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  flex: 1,
                  minHeight: 40,
                }}
              >
                {isClearing ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Tozalanmoqda...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
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
