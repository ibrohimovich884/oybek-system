import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { WifiOff, Clock, RefreshCw, CheckCircle2 } from "lucide-react";
import { useExpenses } from "../context/ExpensesContext.jsx";

export default function OfflineIndicator() {
  const { syncStatus, triggerManualSync } = useExpenses();
  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    const handleSyncComplete = () => {
      setShowSavedToast(true);
      const timer = setTimeout(() => setShowSavedToast(false), 3000);
      return () => clearTimeout(timer);
    };
    window.addEventListener("oybek:sync-complete", handleSyncComplete);
    return () => window.removeEventListener("oybek:sync-complete", handleSyncComplete);
  }, []);

  // Agar muvaffaqiyatli sinxronlangan bo'lsa qisqa toast
  if (showSavedToast) {
    return (
      <div
        id="pwa-sync-success-indicator"
        className="animate-slide-up"
        style={{
          position: "fixed",
          bottom: "16px",
          right: "16px",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "var(--surface)",
          color: "var(--income)",
          border: "1px solid var(--income)",
          borderRadius: "8px",
          padding: "8px 14px",
          fontSize: "0.82rem",
          fontWeight: 600,
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
        }}
      >
        <CheckCircle2 size={16} />
        <span>DB bilan sinxronlandi!</span>
      </div>
    );
  }

  // Agar oflayn bo'lsa
  if (!syncStatus?.isOnline) {
    return (
      <div
        id="pwa-offline-indicator"
        className="animate-slide-up"
        style={{
          position: "fixed",
          bottom: "16px",
          right: "16px",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "var(--surface)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "8px 14px",
          fontSize: "0.82rem",
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
        }}
      >
        <WifiOff size={16} color="var(--danger)" />
        <div>
          <span style={{ fontWeight: 600, color: "var(--danger)" }}>Oflayn rejim</span>
          <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>
            (Yozuvlar qurilma xotirasida saqlanadi)
          </span>
        </div>
      </div>
    );
  }

  // Agar onlayn bo'lsa, lekin DBga yuborilishi kutilayotganlar bo'lsa
  if (syncStatus?.pendingCount > 0) {
    return (
      <div
        id="pwa-pending-sync-indicator"
        className="animate-slide-up"
        style={{
          position: "fixed",
          bottom: "16px",
          right: "16px",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "var(--surface)",
          color: "var(--text)",
          border: "1px solid var(--warning)",
          borderRadius: "8px",
          padding: "8px 12px",
          fontSize: "0.82rem",
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
        }}
      >
        <Clock size={15} color="var(--warning)" className="animate-pulse" />
        <span>
          <strong style={{ color: "var(--warning)" }}>{syncStatus.pendingCount} ta</strong> DBga kutilmoqda
        </span>
        <button
          type="button"
          className="btn btn--subtle btn--xs"
          onClick={() => triggerManualSync()}
          disabled={syncStatus.isSyncing}
          style={{ padding: "3px 8px", fontSize: "0.74rem" }}
        >
          <RefreshCw size={12} className={syncStatus.isSyncing ? "animate-spin" : ""} />
          <span>{syncStatus.isSyncing ? "Sync..." : "Yuborish"}</span>
        </button>
        <Link
          to="/settings"
          style={{ fontSize: "0.74rem", color: "var(--text-muted)", textDecoration: "underline" }}
        >
          Sozlamalar
        </Link>
      </div>
    );
  }

  return null;
}
