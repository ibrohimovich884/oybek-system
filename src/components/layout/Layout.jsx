import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Menu, Home, Wallet, PlusCircle } from "lucide-react";
import Sidebar from "./Sidebar.jsx";
import OfflineIndicator from "../OfflineIndicator.jsx";

export default function Layout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isHome = location.pathname === "/";
  const isMoney = location.pathname === "/money";

  return (
    <div className="layout">
      {/* Mobile Top Header (only on <= 768px) */}
      <header className="mobile-header">
        <div className="mobile-header__brand">
          <div className="mobile-header__logo">OS</div>
          <div className="mobile-header__titles">
            <span className="mobile-header__name">OYBEK SysteM</span>
            <span className="mobile-header__tag">
              {isHome ? "Bosh sahifa" : isMoney ? "Money manager" : "Shaxsiy panel"}
            </span>
          </div>
        </div>

        <div className="mobile-header__actions">
          <NavLink
            to="/money"
            className="mobile-header__btn-quick"
            title="Yangi amal"
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

      {/* Mobile Bottom Navigation Bar (only on <= 768px) */}
      <nav className="mobile-bottom-nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `mobile-bottom-nav__item ${isActive ? "is-active" : ""}`
          }
        >
          <Home size={20} />
          <span>Bosh sahifa</span>
        </NavLink>

        <NavLink
          to="/money"
          className={({ isActive }) =>
            `mobile-bottom-nav__item ${isActive ? "is-active" : ""}`
          }
        >
          <Wallet size={20} />
          <span>Money manager</span>
        </NavLink>
      </nav>

      <OfflineIndicator />
    </div>
  );
}
