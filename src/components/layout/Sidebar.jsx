import { NavLink } from "react-router-dom";
import { Home, Wallet, X, ShieldCheck } from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Bosh sahifa", icon: Home },
  { to: "/money", label: "Money manager", icon: Wallet },
];

export default function Sidebar({ isOpen, onClose }) {
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
          <div className="sidebar__brand">
            <div className="sidebar__logo-badge">OS</div>
            <div className="sidebar__brand-text">
              <span className="sidebar__brand-name">OYBEK SysteM</span>
              <span className="sidebar__brand-tag">Shaxsiy panel</span>
            </div>
          </div>

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
          {NAV_ITEMS.map((item) => {
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
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__system-badge">
            <ShieldCheck size={14} className="text-emerald" />
            <div className="sidebar__system-info">
              <span className="sidebar__system-title">Xavfsiz & Mahalliy</span>
              <span className="sidebar__system-sub">Ma'lumotlar qurilmada</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
