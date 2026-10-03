import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Menu, Home, Wallet, HandCoins, PlusCircle, Bell, User } from "lucide-react";
import Sidebar from "./Sidebar.jsx";
import OfflineIndicator from "../OfflineIndicator.jsx";
import { useNotifications } from "../../context/NotificationsContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function Layout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const { user } = useAuth();

  const isHome = location.pathname === "/";
  const isMoney = location.pathname === "/money";
  const isHistory = location.pathname === "/history" || location.pathname === "/transactions";
  const isDebts = location.pathname === "/debts";
  const isControl = location.pathname === "/control";
  const isExercises = location.pathname === "/exercises";
  const isNotifications = location.pathname === "/notifications";
  const isSettings = location.pathname === "/settings";

  const getPageTag = () => {
    if (isHome) return "Bosh sahifa";
    if (isMoney) return "Money manager";
    if (isHistory) return "Tranzaksiyalar tarixi";
    if (isDebts) return "Qarz daftari";
    if (isNotifications) return "Bildirishnomalar";
    if (isControl) return "Boshqaruv paneli";
    if (isExercises) return "Mashqlar";
    if (isSettings) return "Sozlamalar & DB";
    return "Shaxsiy panel";
  };

  const displayName = user?.fullName || user?.name || "Oybek";

  return (
    <div className="layout">
      {/* Mobile Top Header (only on <= 768px) */}
      <header className="mobile-header">
        <NavLink
          to="/"
          className="mobile-header__brand"
          title="Bosh sahifaga qaytish"
        >
          <div className="mobile-header__logo">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="mobile-header__titles">
            <span className="mobile-header__name">{displayName}</span>
            <span className="mobile-header__tag">{getPageTag()}</span>
          </div>
        </NavLink>

        <div className="mobile-header__actions">
          <NavLink
            to="/notifications"
            className="mobile-header__btn-quick mobile-header__btn-notif"
            title="Bildirishnomalar"
            aria-label="Bildirishnomalar"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="mobile-header__notif-badge">{unreadCount}</span>
            )}
          </NavLink>
          <NavLink
            to="/money"
            className="mobile-header__btn-quick"
            title="Yangi amal kiritish"
            aria-label="Yangi amal"
          >
            <PlusCircle size={18} />
          </NavLink>
          <button
            type="button"
            className="mobile-header__toggle"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Menyuni ochish"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* Sidebar / Drawer */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Asosiy kontent */}
      <main className="content">{children}</main>

      {/* Mobile Bottom Navigation Bar (4 ta element - 375px+ ekranlar uchun ideal) */}
      <nav className="mobile-bottom-nav" aria-label="Mobil asosiy navigatsiya">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `mobile-bottom-nav__item ${isActive ? "is-active" : ""}`
          }
        >
          <Home size={19} />
          <span>Asosiy</span>
        </NavLink>

        <NavLink
          to="/money"
          className={({ isActive }) =>
            `mobile-bottom-nav__item ${isActive ? "is-active" : ""}`
          }
        >
          <Wallet size={19} />
          <span>Money</span>
        </NavLink>

        <NavLink
          to="/debts"
          className={({ isActive }) =>
            `mobile-bottom-nav__item ${isActive ? "is-active" : ""}`
          }
        >
          <HandCoins size={19} />
          <span>Qarzlar</span>
        </NavLink>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className={`mobile-bottom-nav__item ${mobileMenuOpen ? "is-active" : ""}`}
          aria-label="To'liq menyu"
        >
          <Menu size={19} />
          <span>Menyu</span>
        </button>
      </nav>

      <OfflineIndicator />
    </div>
  );
}
