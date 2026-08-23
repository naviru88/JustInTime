import { Routes, Route } from "react-router-dom";
import PantryPage from "./pages/PantryPage.jsx";
import RecipesPage from "./pages/RecipesPage.jsx";
import MealCalendarPage from "./pages/MealCalendarPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import RequireAuth from "./components/auth/RequireAuth.jsx";
import Sidebar from "./components/layout/Sidebar.jsx";

function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<PantryPage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/calendar" element={<MealCalendarPage />} />
        </Routes>
      </main>
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
