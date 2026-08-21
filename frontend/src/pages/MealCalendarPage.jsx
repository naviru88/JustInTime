import { useEffect, useMemo, useState } from "react";
import MealSlot from "../components/mealplan/MealSlot.jsx";
import { fetchAllRecipes, fetchMealPlan, setMealSlot, clearMealSlot } from "../services/api.js";

const MEAL_TYPES = ["breakfast", "lunch", "dinner"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const toISODate = (d) => d.toISOString().slice(0, 10);

// Monday of the week containing `d`
const startOfWeek = (d) => {
  const copy = new Date(d);
  const day = copy.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const addDays = (d, n) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
};

export default function MealCalendarPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [recipes, setRecipes] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busySlot, setBusySlot] = useState(null);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );
  const weekEnd = weekDays[6];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchAllRecipes(),
      fetchMealPlan(toISODate(weekStart), toISODate(weekEnd)),
    ])
      .then(([recipeList, planEntries]) => {
        if (cancelled) return;
        setRecipes(recipeList);
        setEntries(planEntries);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load the meal plan. Is the backend running?");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [weekStart]);

  const entriesFor = (date, mealType) =>
    entries.filter(
      (e) => toISODate(new Date(e.date)) === toISODate(date) && e.mealType === mealType
    );

  const slotKey = (date, mealType) => `${toISODate(date)}-${mealType}`;

  const handleAssign = async (date, mealType, recipeId) => {
    const key = slotKey(date, mealType);
    setBusySlot(key);
    try {
      const entry = await setMealSlot(toISODate(date), mealType, recipeId);
      setEntries((prev) => [...prev.filter((e) => e._id !== entry._id), entry]);
    } catch {
      setError("Couldn't save that slot. Try again.");
    } finally {
      setBusySlot(null);
    }
  };

  const handleClear = async (date, mealType, id) => {
    const key = slotKey(date, mealType);
    setBusySlot(key);
    try {
      await clearMealSlot(id);
      setEntries((prev) => prev.filter((e) => e._id !== id));
    } catch {
      setError("Couldn't remove that slot. Try again.");
    } finally {
      setBusySlot(null);
    }
  };

  const weekLabel = `${weekStart.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} – ${weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  return (
    <div>
      <h1>Meal calendar</h1>
      <p className="page-subtitle">Plan breakfast, lunch, and dinner across the week.</p>

      <div className="week-nav">
        <button className="btn-secondary" onClick={() => setWeekStart((w) => addDays(w, -7))}>
          ← Previous
        </button>
        <span className="week-label">{weekLabel}</span>
        <button className="btn-secondary" onClick={() => setWeekStart((w) => addDays(w, 7))}>
          Next →
        </button>
      </div>

      {loading && <p>Loading meal plan...</p>}
      {error && <p style={{ color: "#c1440e" }}>{error}</p>}

      {!loading && !error && recipes.length === 0 && (
        <div className="empty-state">
          No recipes yet. Run <code>npm run seed</code> in the backend folder to load starter
          recipes.
        </div>
      )}

      {!loading && !error && recipes.length > 0 && (
        <div className="calendar-grid">
          <div className="calendar-row calendar-header">
            <div className="calendar-corner" />
            {weekDays.map((d, i) => (
              <div className="calendar-day-label" key={i}>
                <span>{DAY_LABELS[i]}</span>
                <span className="calendar-date">{d.getDate()}</span>
              </div>
            ))}
          </div>

          {MEAL_TYPES.map((mealType) => (
            <div className="calendar-row" key={mealType}>
              <div className="calendar-meal-label">{mealType}</div>
              {weekDays.map((d, i) => {
                const slotEntries = entriesFor(d, mealType);
                const key = slotKey(d, mealType);
                return (
                  <div className="calendar-cell" key={i}>
                    <MealSlot
                      entries={slotEntries}
                      recipes={recipes}
                      busy={busySlot === key}
                      onAssign={(recipeId) => handleAssign(d, mealType, recipeId)}
                      onClear={(id) => handleClear(d, mealType, id)}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
