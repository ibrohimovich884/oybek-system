import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { WifiOff, Clock, RefreshCw, CheckCircle2, X } from "lucide-react";
import { useExpenses } from "../context/ExpensesContext.jsx";

export default function OfflineIndicator() {
  const { syncStatus, triggerManualSync } = useExpenses();
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [isPendingDismissed, setIsPendingDismissed] = useState(false);
  const [isOfflineDismissed, setIsOfflineDismissed] = useState(false);

  useEffect(() => {
    const handleSyncComplete = () => {
      setShowSavedToast(true);
      setIsPendingDismissed(false); // Yangi sinxronlash bo'lganda holat tiklanadi
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
        className="pwa-floating-toast animate-slide-up"
        style={{
          color: "var(--income)",
          borderColor: "var(--income)",
          fontWeight: 600,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={16} />
          <span>DB bilan sinxronlandi!</span>
        </div>
        <button
          type="button"
          onClick={() => setShowSavedToast(false)}
          className="pwa-toast-close-btn"
          aria-label="Yopish"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  // Agar oflayn bo'lsa va berkitilmagan bo'lsa
  if (!syncStatus?.isOnline && !isOfflineDismissed) {
    return (
      <div
        id="pwa-offline-indicator"
        className="pwa-floating-toast animate-slide-up"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <WifiOff size={16} color="var(--danger)" style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <span style={{ fontWeight: 600, color: "var(--danger)" }}>Oflayn rejim</span>
            <span style={{ color: "var(--text-muted)", marginLeft: 6, fontSize: "0.75rem" }}>
              (Qurilma xotirasida)
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOfflineDismissed(true)}
          className="pwa-toast-close-btn"
          title="Berkitish"
          aria-label="Eslatmani berkitish"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  // Agar onlayn bo'lsa, lekin DBga yuborilishi kutilayotganlar bo'lsa va berkitilmagan bo'lsa
  if (syncStatus?.pendingCount > 0 && !isPendingDismissed) {
    return (
      <div
        id="pwa-pending-sync-indicator"
        className="pwa-floating-toast animate-slide-up"
        style={{ borderColor: "var(--warning)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
          <Clock size={15} color="var(--warning)" className="animate-pulse" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
            <strong style={{ color: "var(--warning)" }}>{syncStatus.pendingCount} ta</strong> DBga kutilmoqda
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
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
          <button
            type="button"
            onClick={() => setIsPendingDismissed(true)}
            className="pwa-toast-close-btn"
            title="Eslatmani berkitish"
            aria-label="Eslatmani berkitish"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
