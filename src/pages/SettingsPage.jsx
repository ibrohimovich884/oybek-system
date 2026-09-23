import { useState } from "react";
import {
  Settings,
  RefreshCw,
  Database,
  Wifi,
  WifiOff,
  CloudCheck,
  CloudOff,
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
    downloadBackup,
    downloadCSV,
    importBackup,
    expenses,
  } = useExpenses();

  const [backendInput, setBackendInput] = useState(syncStatus?.backendUrl || DEFAULT_BACKEND_URL);
  const [syncFeedback, setSyncFeedback] = useState(null);
  const [isHealthTesting, setIsHealthTesting] = useState(false);
  const [importStatus, setImportStatus] = useState(null);

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
    setSyncFeedback({ type: "loading", message: "DBdan barcha ma'lumotlar yangilab olinmoqda..." });
    try {
      const res = await forcePullFromDB();
      if (res && res.success) {
        setSyncFeedback({
          type: "success",
          message: `DBdan yangilandi! ${res.pulledCount} ta ma'lumot olindi.`,
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
    setBackendInput(DEFAULT_BACKEND_URL);
    await changeBackendUrl(DEFAULT_BACKEND_URL);
    setSyncFeedback({ type: "success", message: "Standart backend manzili tiklandi!" });
  };

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus({ loading: true, message: "Fayl o'qilmoqda..." });
    try {
      const text = await file.text();
      const res = await importBackup(text);
      if (res.success) {
        setImportStatus({ success: true, message: "Zaxira muvaffaqiyatli tiklandi!" });
      } else {
        setImportStatus({ success: false, message: res.error || "Fayl formati noto'g'ri." });
      }
    } catch (err) {
      setImportStatus({ success: false, message: "Faylni o'qishda xatolik: " + err.message });
    }
  };

  const syncedExpensesCount = (expenses || []).filter((e) => e.synced !== false).length;
  const pendingExpensesCount = (expenses || []).filter((e) => e.synced === false).length;

  return (
    <div className="settings-page animate-fade-in" style={{ paddingBottom: 60 }}>
      {/* Sarlavha */}
      <div className="dashboard-header" style={{ marginBottom: 22 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="badge badge--primary" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Settings size={13} />
              <span>Tizim sozlamalari</span>
            </span>
            <span className={`badge ${syncStatus?.isConnected ? "badge--success" : "badge--warning"}`}>
              {syncStatus?.isConnected ? "DB Faol" : "Oflayn xotira"}
            </span>
          </div>
          <h1 className="dashboard-title" style={{ marginTop: 6 }}>
            Sozlamalar va Sinxronizatsiya (Settings & DB Sync)
          </h1>
          <p className="dashboard-subtitle">
            Maʼlumotlar bazasi aloqasi, oflayn kesh holati va qoʻlda / avtomatik sinxronizatsiya boshqaruvi
          </p>
        </div>

        {/* Tezkor sinxronlash tugmasi */}
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleManualSync}
          disabled={syncStatus?.isSyncing}
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <RefreshCw size={16} className={syncStatus?.isSyncing ? "animate-spin" : ""} />
          <span>{syncStatus?.isSyncing ? "Sinxronlanmoqda..." : "Hozir sinxronlash"}</span>
        </button>
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
            <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{syncFeedback.message}</span>
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

      {/* 1. Asosiy Sinxronizatsiya Holati Kartasi */}
      <div className="card settings-hero-card" style={{ marginBottom: 24, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Database size={20} style={{ color: "var(--accent)" }} />
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
                Server & Maʼlumotlar Bazasi (DB) Sinxronizatsiyasi
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Internet yo'qligida kiritilgan ma'lumotlar xotirada saqlanadi va internet ulanganda DBga avtomatik yuboriladi.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleManualSync}
              disabled={syncStatus?.isSyncing}
            >
              <RefreshCw size={15} className={syncStatus?.isSyncing ? "animate-spin" : ""} />
              <span>{syncStatus?.isSyncing ? "Sinxronlanmoqda..." : "Qoʻlda sinxronizatsiya"}</span>
            </button>
            <button
              type="button"
              className="btn btn--subtle"
              onClick={handleForcePull}
              disabled={syncStatus?.isSyncing}
              title="Serverdan eng yangi ma'lumotlarni qayta tortib olish"
            >
              <ArrowDownCircle size={15} />
              <span>DBdan yangilab olish</span>
            </button>
            <button
              type="button"
              className="btn btn--ghost text-muted"
              onClick={handleForcePush}
              disabled={syncStatus?.isSyncing}
              title="Barcha lokal ma'lumotlarni serverga yuborish"
            >
              <ArrowUpCircle size={15} />
              <span>Barchasini DBga yuklash</span>
            </button>
          </div>
        </div>

        {/* KPI holatlari qatori */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            marginTop: 18,
            paddingTop: 18,
            borderTop: "1px solid var(--border)",
          }}
        >
          {/* Tarmoq holati */}
          <div style={{ background: "var(--surface-sunken)", padding: "10px 14px", borderRadius: 8 }}>
            <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
              {syncStatus?.isOnline ? <Wifi size={13} color="var(--income)" /> : <WifiOff size={13} color="var(--danger)" />}
              <span>Internet aloqasi</span>
            </div>
            <strong style={{ fontSize: "1rem", color: syncStatus?.isOnline ? "var(--income)" : "var(--danger)", display: "block", marginTop: 4 }}>
              {syncStatus?.isOnline ? "Onlayn (Uланган)" : "Oflayn (Uzilgan)"}
            </strong>
          </div>

          {/* DB Server holati */}
          <div style={{ background: "var(--surface-sunken)", padding: "10px 14px", borderRadius: 8 }}>
            <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
              <Server size={13} color={syncStatus?.isConnected ? "var(--accent)" : "var(--warning)"} />
              <span>DB Server holati</span>
            </div>
            <strong style={{ fontSize: "1rem", color: syncStatus?.isConnected ? "var(--accent)" : "var(--warning)", display: "block", marginTop: 4 }}>
              {syncStatus?.isConnected ? "Ulangan (Faol)" : syncStatus?.isChecking ? "Tekshirilmoqda..." : "Aloqa yo'q"}
            </strong>
          </div>

          {/* DBda saqlanganlar soni */}
          <div style={{ background: "var(--surface-sunken)", padding: "10px 14px", borderRadius: 8 }}>
            <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
              <Database size={13} color="var(--income)" />
              <span>DBda saqlangan</span>
            </div>
            <strong className="mono" style={{ fontSize: "1.1rem", color: "var(--income)", display: "block", marginTop: 4 }}>
              {syncedExpensesCount} ta yozuv
            </strong>
          </div>

          {/* Faqat xotirada (kutilayotgan) soni */}
          <div style={{ background: "var(--surface-sunken)", padding: "10px 14px", borderRadius: 8 }}>
            <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={13} color={pendingExpensesCount > 0 ? "var(--warning)" : "var(--text-muted)"} />
              <span>Faqat xotirada (Kutilmoqda)</span>
            </div>
            <strong className="mono" style={{ fontSize: "1.1rem", color: pendingExpensesCount > 0 ? "var(--warning)" : "var(--text)", display: "block", marginTop: 4 }}>
              {pendingExpensesCount} ta yozuv
            </strong>
          </div>

          {/* Oxirgi sinxronizatsiya vaqti */}
          <div style={{ background: "var(--surface-sunken)", padding: "10px 14px", borderRadius: 8 }}>
            <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
              <Activity size={13} color="var(--karta)" />
              <span>Oxirgi muvaffaqiyatli DB sync</span>
            </div>
            <span className="mono" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", display: "block", marginTop: 6 }}>
              {syncStatus?.lastSyncedAt ? formatDateTime(syncStatus.lastSyncedAt) : "Hali qilinmagan"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Avto-Sinxronizatsiya va Server Sozlamalari (2 Ustun) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 24 }}>
        {/* A) Avtomatik sinxronizatsiya boshqaruvi */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Zap size={18} color="var(--accent)" />
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
              Avtomatik Sinxronizatsiya
            </h3>
          </div>

          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 16 }}>
            Avtomatik sinxronizatsiya yoqilganda yangi kiritilgan har bir xarajat yoki o'tkazma darhol server DBga yuboriladi. Agar internet bo'lmasa, navbatga olinadi va internet paydo bo'lishi bilan avtomatik yuboriladi.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              background: "var(--surface-sunken)",
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            <div>
              <strong style={{ fontSize: "0.9rem", color: "var(--text)", display: "block" }}>
                Avto-sinxronizatsiya holati
              </strong>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                {syncStatus?.autoSyncEnabled ? "Faol (Fonda avtomatik yuboriladi)" : "O'chirilgan (Faqat qo'lda)"}
              </span>
            </div>

            <button
              type="button"
              className={`btn btn--xs ${syncStatus?.autoSyncEnabled ? "btn--primary" : "btn--subtle"}`}
              onClick={() => setAutoSync(!syncStatus?.autoSyncEnabled)}
            >
              {syncStatus?.autoSyncEnabled ? "Yoqilgan (Faol)" : "O'chirilgan"}
            </button>
          </div>

          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.4 }}>
            💡 Maslahat: Agar internetingiz barqaror bo'lmasa, avto-sinxronizatsiya yoniq qolishi maqsadga muvofiq — tizim barcha o'zgarishlarni xotirada saqlab, aloqa paydo bo'lishi bilan o'zi DBga uzatadi.
          </div>
        </div>

        {/* B) Backend Server Manzili (URL) */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Server size={18} color="var(--karta)" />
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
              Backend Server Manzili
            </h3>
          </div>

          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 14 }}>
            Maʼlumotlar saqlanadigan asosiy API serveri manzili (Render yoki mahalliy server).
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                Server URL:
              </label>
              <input
                type="text"
                className="input"
                value={backendInput}
                onChange={(e) => setBackendInput(e.target.value)}
                placeholder="https://oybek-system-backend-1.onrender.com"
                style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}
              />
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                className="btn btn--subtle btn--xs"
                onClick={handleSaveBackendUrl}
              >
                Saqlash
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--xs"
                onClick={handleTestConnection}
                disabled={isHealthTesting}
              >
                {isHealthTesting ? "Tekshirilmoqda..." : "Aloqani tekshirish (Ping)"}
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--xs text-muted"
                onClick={handleResetBackendUrl}
              >
                Standartga qaytarish
              </button>
            </div>
          </div>

          <div style={{ marginTop: 12, padding: "8px 10px", background: "rgba(245, 158, 11, 0.08)", borderRadius: 6, fontSize: "0.75rem", color: "var(--warning)" }}>
            ⚡ Render bepul serveri 15 daqiqa kirmasangiz uyqu rejimiga o'tadi. Birinchi so'rovda uyg'onishi 15-20 soniya olishi mumkin.
          </div>
        </div>
      </div>

      {/* 3. Kutilayotgan Navbatdagi O'zgarishlar (Sync Queue) */}
      <div className="card" style={{ marginBottom: 24, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={18} color="var(--warning)" />
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                Kutilayotgan Navbat ({syncStatus?.pendingCount || 0} ta o'zgarish)
              </h3>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Internet yo'qligida yozilgan va hali DBga jo'natilmagan buyruqlar
              </span>
            </div>
          </div>

          {syncStatus?.pendingCount > 0 && (
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
                  if (window.confirm("Kutilayotgan navbatni tozalashni tasdiqlaysizmi?")) {
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

        {syncStatus?.pendingCount === 0 ? (
          <div style={{ padding: "18px 14px", background: "var(--surface-sunken)", borderRadius: 8, textAlign: "center" }}>
            <CheckCircle2 size={24} color="var(--income)" style={{ margin: "0 auto 6px auto", display: "block" }} />
            <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--income)" }}>
              Barcha maʼlumotlar toʻliq DBga saqlangan!
            </span>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Xotirada kutilayotgan yuborilmagan tranzaksiya mavjud emas.
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
                  padding: "8px 12px",
                  background: "var(--surface-sunken)",
                  borderRadius: 6,
                  fontSize: "0.82rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    className="badge"
                    style={{
                      background:
                        item.type === "create"
                          ? "rgba(16, 185, 129, 0.14)"
                          : item.type === "update"
                          ? "rgba(56, 189, 248, 0.14)"
                          : "rgba(239, 68, 68, 0.14)",
                      color:
                        item.type === "create"
                          ? "var(--income)"
                          : item.type === "update"
                          ? "var(--karta)"
                          : "var(--danger)",
                      fontSize: "0.7rem",
                    }}
                  >
                    {item.type === "create" ? "Qo'shish" : item.type === "update" ? "Tahrir" : "O'chirish"}
                  </span>
                  <span>
                    <strong>{item.entity}:</strong> {item.payload?.reason || item.payload?.category || item.targetId}
                    {item.payload?.amount && ` (${formatSum(item.payload.amount)})`}
                  </span>
                </div>
                <span className="mono" style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                  {formatDateTime(item.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Zaxira nusxa (Backup / Restore) */}
      <div className="card" style={{ marginBottom: 24, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Download size={18} color="var(--accent)" />
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
            Zaxira Nusxa & Eksport (Backup / Restore)
          </h3>
        </div>

        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 16 }}>
          Barcha moliyaviy ma'lumotlaringizni (hamyonlar, xarajatlar, zaxiralar, qarzlar) JSON yoki CSV fayl sifatida yuklab olishingiz va kerak bo'lganda boshqa qurilmada qayta tiklashingiz mumkin.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className="btn btn--subtle"
            onClick={downloadBackup}
          >
            <Download size={15} />
            <span>JSON zaxirani yuklab olish</span>
          </button>

          <button
            type="button"
            className="btn btn--subtle"
            onClick={downloadCSV}
          >
            <FileSpreadsheet size={15} />
            <span>Excel / CSV eksport</span>
          </button>

          <label className="btn btn--ghost" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Upload size={15} />
            <span>Zaxirani tiklash (Import)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              style={{ display: "none" }}
            />
          </label>
        </div>

        {importStatus && (
          <div style={{ marginTop: 10, fontSize: "0.8rem", color: importStatus.success ? "var(--income)" : "var(--danger)" }}>
            {importStatus.message}
          </div>
        )}
      </div>

      {/* 5. Sinxronizatsiya Jurnali (Logs) */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={18} color="var(--text-muted)" />
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
              Sinxronizatsiya Jurnali (Oxirgi amallar)
            </h3>
          </div>

          {syncStatus?.logs?.length > 0 && (
            <button
              type="button"
              className="btn btn--ghost btn--xs text-muted"
              onClick={clearSyncLogs}
            >
              Jurnalni tozalash
            </button>
          )}
        </div>

        {syncStatus?.logs?.length === 0 ? (
          <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", textAlign: "center", padding: "16px 0" }}>
            Hozircha hech qanday jurnal yozuvi yo'q.
          </div>
        ) : (
          <div
            style={{
              maxHeight: 240,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              background: "var(--surface-sunken)",
              padding: 10,
              borderRadius: 8,
            }}
          >
            {syncStatus?.logs?.map((log) => (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  fontSize: "0.78rem",
                  padding: "4px 6px",
                  borderBottom: "1px solid var(--border-subtle)",
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
                    fontWeight: 700,
                    minWidth: 16,
                  }}
                >
                  {log.level === "success" ? "✓" : log.level === "error" ? "✗" : "•"}
                </span>
                <span style={{ flex: 1, color: "var(--text)" }}>{log.message}</span>
                <span className="mono" style={{ color: "var(--text-dim)", fontSize: "0.7rem", flexShrink: 0 }}>
                  {formatDateTime(log.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
