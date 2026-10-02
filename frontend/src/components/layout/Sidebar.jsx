import { NavLink } from "react-router-dom";
import {
  Home,
  Wallet,
  SlidersHorizontal,
  HandCoins,
  Dumbbell,
  Settings,
  X,
  Database,
  RefreshCw,
  Lock,
} from "lucide-react";
import { useExpenses } from "../../context/ExpensesContext.jsx";
import { useSecurity } from "../../context/SecurityContext.jsx";

export default function Sidebar({ isOpen, onClose }) {
  const { syncStatus, debts } = useExpenses();
  const { isUnlocked } = useSecurity();

  const isControlUnlocked = isUnlocked("control_panel");

  const pendingDebtsCount = (debts || []).filter(
    (d) => d.status !== "settled"
  ).length;

  const navItems = [
    { to: "/", label: "Bosh sahifa", icon: Home },
    { to: "/money", label: "Money manager", icon: Wallet },
    {
      to: "/debts",
      label: "Qarz daftari",
      icon: HandCoins,
      badge: pendingDebtsCount > 0 ? `${pendingDebtsCount}` : null,
      badgeType: pendingDebtsCount > 0 ? "info" : null,
    },
    {
      to: "/control",
      label: "Control panel",
      icon: SlidersHorizontal,
      badge: !isControlUnlocked ? <Lock size={12} style={{ color: "#34d399" }} /> : null,
      badgeType: !isControlUnlocked ? "lock" : null,
    },
    { to: "/exercises", label: "Mashqlar", icon: Dumbbell, badge: "Tez kunda" },
    {
      to: "/settings",
      label: "Sozlamalar & DB",
      icon: Settings,
      badge: syncStatus?.pendingCount > 0 ? `${syncStatus.pendingCount}` : null,
      badgeType: syncStatus?.pendingCount > 0 ? "warning" : null,
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isOpen ? "is-open" : ""}`}>
        <div className="sidebar__header">
          <NavLink
            to="/"
            onClick={onClose}
            className="sidebar__brand"
            title="Bosh sahifaga qaytish"
            style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
          >
            <div className="sidebar__logo-badge">OS</div>
            <div className="sidebar__brand-text">
              <span className="sidebar__brand-name">OYBEK SysteM</span>
              <span className="sidebar__brand-tag">Shaxsiy panel</span>
            </div>
          </NavLink>

          <button
            type="button"
            className="sidebar__close-btn"
            onClick={onClose}
            aria-label="Menyuni yopish"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar__nav">
          <span className="sidebar__section-title">Asosiy bo'limlar</span>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={onClose}
                className={({ isActive }) =>
                  isActive ? "sidebar__link is-active" : "sidebar__link"
                }
              >
                <Icon size={18} className="sidebar__link-icon" />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`sidebar__badge ${
                      item.badgeType === "warning"
                        ? "sidebar__badge--warning"
                        : item.badgeType === "lock"
                        ? "sidebar__badge--lock"
                        : ""
                    }`}
                    style={
                      item.badgeType === "lock"
                        ? {
                            background: "rgba(16, 185, 129, 0.15)",
                            border: "1px solid rgba(52, 211, 153, 0.3)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "3px 5px",
                            borderRadius: "6px",
                          }
                        : {}
                    }
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar__footer">
          <NavLink
            to="/settings"
            onClick={onClose}
            className="sidebar__system-badge"
            style={{ textDecoration: "none", color: "inherit", cursor: "pointer", width: "100%" }}
            title="Sozlamalar va DB holatiga o'tish"
          >
            <Database
              size={15}
              style={{
                color: syncStatus?.isConnected
                  ? "var(--income)"
                  : syncStatus?.isSyncing
                  ? "var(--karta)"
                  : "var(--warning)",
                flexShrink: 0,
              }}
              className={syncStatus?.isSyncing ? "animate-spin" : ""}
            />
            <div className="sidebar__system-info">
              <span className="sidebar__system-title" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span>{syncStatus?.isConnected ? "DB Ulangan" : "Oflayn xotira"}</span>
                {syncStatus?.pendingCount > 0 && (
                  <span style={{ fontSize: "0.68rem", color: "var(--warning)", fontWeight: 700 }}>
                    ({syncStatus.pendingCount})
                  </span>
                )}
              </span>
              <span className="sidebar__system-sub">
                {syncStatus?.isSyncing
                  ? "Sinxronlanmoqda..."
                  : syncStatus?.pendingCount > 0
                  ? "Kutilayotgan yozuvlar bor"
                  : "Sinxronizatsiya sozlamalari"}
              </span>
            </div>
          </NavLink>
        </div>
      </aside>
    </>
  );
}

