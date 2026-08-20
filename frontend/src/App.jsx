import { Routes, Route, NavLink } from "react-router-dom";
import PantryPage from "./pages/PantryPage.jsx";
import RecipesPage from "./pages/RecipesPage.jsx";

function App() {
  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="brand">
          Fridge<span>First</span>
        </div>
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            Pantry
          </NavLink>
          <NavLink to="/recipes" className={({ isActive }) => (isActive ? "active" : "")}>
            Recipes
          </NavLink>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<PantryPage />} />
        <Route path="/recipes" element={<RecipesPage />} />
      </Routes>
    </div>
  );
}

export default App;
