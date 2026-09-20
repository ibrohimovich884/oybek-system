import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      id="pwa-offline-indicator"
      style={{
        position: "fixed",
        bottom: "16px",
        right: "16px",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: "var(--surface, #242321)",
        color: "var(--text, #f2efe8)",
        border: "1px solid var(--border, #3a3833)",
        borderRadius: "8px",
        padding: "8px 14px",
        fontSize: "0.85rem",
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.4)",
      }}
    >
      <WifiOff size={16} color="var(--expense, #c17a6e)" />
      <span>Oflayn rejim (keshlangan ma'lumotlar)</span>
    </div>
  );
}
