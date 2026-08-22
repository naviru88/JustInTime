import { Routes, Route, NavLink } from "react-router-dom";
import PantryPage from "./pages/PantryPage.jsx";
import RecipesPage from "./pages/RecipesPage.jsx";
import MealCalendarPage from "./pages/MealCalendarPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import RequireAuth from "./components/auth/RequireAuth.jsx";
import { useAuth } from "./context/AuthContext.jsx";

function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="brand">
          Just In<span>Time</span>
        </div>
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            Pantry
          </NavLink>
          <NavLink to="/recipes" className={({ isActive }) => (isActive ? "active" : "")}>
            Recipes
          </NavLink>
          <NavLink to="/calendar" className={({ isActive }) => (isActive ? "active" : "")}>
            Calendar
          </NavLink>
        </nav>
        <div className="user-menu">
          <span className="user-name">{user?.name}</span>
          <button className="btn-secondary" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<PantryPage />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/calendar" element={<MealCalendarPage />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default App;
