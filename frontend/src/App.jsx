import { Routes, Route, NavLink } from "react-router-dom";
import PantryPage from "./pages/PantryPage.jsx";
import RecipesPage from "./pages/RecipesPage.jsx";
import MealCalendarPage from "./pages/MealCalendarPage.jsx";

function App() {
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
      </header>

      <Routes>
        <Route path="/" element={<PantryPage />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/calendar" element={<MealCalendarPage />} />
      </Routes>
    </div>
  );
}

export default App;
