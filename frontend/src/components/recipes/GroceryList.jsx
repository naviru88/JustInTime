export default function GroceryList({ data }) {
  if (!data || data.groceryList.length === 0) {
    return (
      <div className="empty-state">
        Nothing to buy — you already have everything for the selected recipes.
      </div>
    );
  }

  return (
    <div className="grocery-list">
      <p className="page-subtitle" style={{ marginBottom: 20 }}>
        For: {data.recipesUsed.join(", ")}
      </p>

      {data.groceryList.map((group) => (
        <div className="grocery-category card" key={group.category}>
          <h3 className="grocery-category-title">{group.category}</h3>
          <ul className="grocery-items">
            {group.items.map((item) => (
              <li className="grocery-item" key={item.name}>
                <label>
                  <input type="checkbox" />
                  <span className="name">{item.name}</span>
                </label>
                {item.quantities.length > 0 && (
                  <span className="meta">{item.quantities.join(", ")}</span>
                )}
                <span className="meta needed-for">
                  for {item.neededFor.join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
