// entries: array of meal-plan entries assigned to this date+mealType slot (can be empty)
// recipes: full recipe list, used to populate the "add another" picker
export default function MealSlot({ entries, recipes, onAssign, onClear, busy }) {
  const assignedIds = new Set(entries.map((e) => e.recipe._id));
  const available = recipes.filter((r) => !assignedIds.has(r._id));

  return (
    <div className="meal-slot">
      {entries.map((entry) => (
        <div className="meal-slot-item" key={entry._id}>
          <span className="meal-slot-title">{entry.recipe.title}</span>
          <button
            className="meal-slot-clear"
            title="Remove from plan"
            onClick={() => onClear(entry._id)}
            disabled={busy}
          >
            &times;
          </button>
        </div>
      ))}

      {available.length > 0 && (
        <select
          className="meal-slot-add"
          value=""
          disabled={busy}
          onChange={(e) => {
            if (e.target.value) onAssign(e.target.value);
          }}
        >
          <option value="" disabled>
            {entries.length > 0 ? "+ Add another" : "+ Add recipe"}
          </option>
          {available.map((r) => (
            <option value={r._id} key={r._id}>
              {r.title}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
