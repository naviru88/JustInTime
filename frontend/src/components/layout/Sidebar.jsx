import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

const NAV_ITEMS = [
  { to: "/", end: true, label: "Pantry", icon: "📦" },
  { to: "/recipes", label: "Recipes", icon: "🍳" },
  { to: "/calendar", label: "Calendar", icon: "📅" },
];

const COLLAPSE_KEY = "jit_sidebar_collapsed";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Defaults to collapsed on narrow screens so it doesn't eat the whole
  // viewport on first load; otherwise respects whatever the person left it as.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(COLLAPSE_KEY);
      if (stored !== null) return stored === "true";
    } catch {
      // localStorage unavailable (private browsing, etc.) — fall through to the default below
    }
    return typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches;
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, String(collapsed));
    } catch {
      // Not persisting the preference isn't worth failing over
    }
  }, [collapsed]);

  const closeMobileMenu = () => setMobileOpen(false);

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark" role="img" aria-label="Just In Time">
          </span>
          <span className="sidebar-brand-text">
            Just In<span>Time</span>
          </span>
        </div>
        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "»" : "«"}
        </button>
        <button
          type="button"
          className="mobile-menu-button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-controls="primary-navigation"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          <span aria-hidden="true">{mobileOpen ? "×" : "☰"}</span>
        </button>
      </div>

      <nav id="primary-navigation" className="sidebar-nav" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            title={collapsed ? item.label : undefined}
            onClick={closeMobileMenu}
          >
            <span className="sidebar-link-icon" role="img" aria-hidden="true">
              {item.icon}
            </span>
            <span className="sidebar-link-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <span className="sidebar-user-name">{user?.name}</span>
        <button
          type="button"
          className="sidebar-logout"
          onClick={logout}
          title="Log out"
        >
          <span className="sidebar-logout-icon" aria-hidden="true">⎋</span>
          <span className="sidebar-logout-label">Log out</span>
        </button>
      </div>
    </aside>
  );
}
