import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// Pantry
export const fetchPantryItems = () => api.get("/pantry").then((r) => r.data);
export const addPantryItem = (item) => api.post("/pantry", item).then((r) => r.data);
export const updatePantryItem = (id, updates) =>
  api.put(`/pantry/${id}`, updates).then((r) => r.data);
export const deletePantryItem = (id) => api.delete(`/pantry/${id}`).then((r) => r.data);

// Recipes
export const fetchAllRecipes = () => api.get("/recipes").then((r) => r.data);
export const fetchMatchedRecipes = (tags = []) =>
  api
    .get("/recipes/matches", { params: tags.length ? { tags: tags.join(",") } : {} })
    .then((r) => r.data);

export default api;
