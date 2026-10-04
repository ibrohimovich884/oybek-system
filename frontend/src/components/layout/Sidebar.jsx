import { NavLink } from "react-router-dom";
import {
  Home,
  Wallet,
  History,
  SlidersHorizontal,
  HandCoins,
  Dumbbell,
  Settings,
  Bell,
  X,
  Database,
  Lock,
  LogOut,
  ShieldCheck,
  User,
} from "lucide-react";
import { useExpenses } from "../../context/ExpensesContext.jsx";
import { useSecurity } from "../../context/SecurityContext.jsx";
import { useNotifications } from "../../context/NotificationsContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function Sidebar({ isOpen, onClose }) {
  const { syncStatus, debts, regularExpenses } = useExpenses();
  const { isUnlocked, isControlPanelLockEnabled } = useSecurity();
  const { unreadCount } = useNotifications();
  const { user, logout, daysRemaining } = useAuth();

  const isControlUnlocked = isUnlocked("control_panel");
  const isControlLocked = isControlPanelLockEnabled && !isControlUnlocked;

  const pendingDebtsCount = (debts || []).filter(
    (d) => d.status !== "settled"
  ).length;

  const regularTxCount = (regularExpenses || []).length;

  const displayName = user?.fullName || user?.name || "Foydalanuvchi";
  const displayEmail = user?.email || (user?.username ? `@${user.username}` : "");
  const roleLabel = user?.role === "admin" ? "Admin" : "Aʼzo";

  const navItems = [
    { to: "/", label: "Bosh sahifa", icon: Home },
    ...(user?.role === "admin"
      ? [
          {
            to: "/admin",
            label: "Admin Panel",
            icon: ShieldCheck,
            badge: "Admin",
            badgeType: "admin",
          },
        ]
      : []),
    { to: "/money", label: "Money manager", icon: Wallet },
    {
      to: "/history",
      label: "Tranzaksiyalar tarixi",
      icon: History,
      badge: regularTxCount > 0 ? `${regularTxCount}` : null,
    },
    {
      to: "/debts",
      label: "Qarz daftari",
      icon: HandCoins,
      badge: pendingDebtsCount > 0 ? `${pendingDebtsCount}` : null,
      badgeType: pendingDebtsCount > 0 ? "info" : null,
    },
    {
      to: "/notifications",
      label: "Bildirishnomalar",
      icon: Bell,
      badge: unreadCount > 0 ? `${unreadCount}` : null,
      badgeType: unreadCount > 0 ? "warning" : null,
    },
    {
      to: "/control",
      label: "Control panel",
      icon: SlidersHorizontal,
      badge: isControlLocked ? <Lock size={12} style={{ color: "#34d399" }} /> : null,
      badgeType: isControlLocked ? "lock" : null,
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
              <span className="sidebar__brand-tag">Multi-User Panel</span>
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
                        : item.badgeType === "admin"
                        ? "sidebar__badge--admin"
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
                        : item.badgeType === "admin"
                        ? {
                            background: "rgba(245, 158, 11, 0.2)",
                            border: "1px solid rgba(245, 158, 11, 0.45)",
                            color: "#fbbf24",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: "6px",
                            fontSize: "0.68rem",
                            letterSpacing: "0.02em",
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

        {/* Pastki qism: Foydalanuvchi ismi, DB holati va chiqish */}
        <div className="sidebar__footer">
          {/* Foydalanuvchi profili kartochkasi (Pastda joylashtirilgan) */}
          <div className="sidebar__user-card">
            <div className="sidebar__user-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>

            <div className="sidebar__user-info">
              <div className="sidebar__user-name-row">
                <span className="sidebar__user-name" title={displayName}>
                  {displayName}
                </span>
                <span
                  className={`sidebar__user-role-badge ${
                    user?.role === "admin" ? "sidebar__user-role-badge--admin" : ""
                  }`}
                >
                  {roleLabel}
                </span>
              </div>

              {displayEmail && (
                <p className="sidebar__user-email" title={displayEmail}>
                  {displayEmail}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                logout();
                if (onClose) onClose();
              }}
              className="btn-icon btn-icon--xs"
              style={{
                marginLeft: "auto",
                color: "var(--danger, #f87171)",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                borderRadius: 6,
                padding: 4,
              }}
              title="Hisobdan chiqish (Log out)"
              aria-label="Hisobdan chiqish"
            >
              <LogOut size={13} />
            </button>
          </div>

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

          {/* 30 kunlik JWT Sessiya & Chiqish tugmasi */}
          <div className="sidebar__session-bar">
            <div className="sidebar__session-text">
              <ShieldCheck size={14} />
              <span>Sessiya: {daysRemaining > 0 ? `${daysRemaining} kun` : "30 kun"}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                logout();
                if (onClose) onClose();
              }}
              className="btn btn--ghost btn--xs sidebar__logout-btn"
              title="Hisobdan chiqish"
              aria-label="Hisobdan chiqish"
            >
              <LogOut size={13} />
              <span>Chiqish</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
