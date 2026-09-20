import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Bosh sahifa" },
  { to: "/money", label: "Money manager" },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__brand-name">Oybek-system</span>
        <span className="sidebar__brand-tag">Shaxsiy panel</span>
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              isActive ? "sidebar__link is-active" : "sidebar__link"
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
