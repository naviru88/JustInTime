import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
});

// Uploaded photos are served from the backend's origin at /uploads/..., not
// under /api, so strip the API suffix to get a base for building full URLs.
const ASSET_BASE_URL = API_URL.replace(/\/api\/?$/, "");
export const resolvePhotoUrl = (photoUrl) => (photoUrl ? `${ASSET_BASE_URL}${photoUrl}` : null);

// Pantry
export const fetchPantryItems = () => api.get("/pantry").then((r) => r.data);
export const addPantryItem = (item) => api.post("/pantry", item).then((r) => r.data);
export const updatePantryItem = (id, updates) =>
  api.put(`/pantry/${id}`, updates).then((r) => r.data);
export const deletePantryItem = (id) => api.delete(`/pantry/${id}`).then((r) => r.data);
export const lookupBarcode = (barcode) =>
  api.get(`/pantry/lookup/${barcode}`).then((r) => r.data);
export const uploadPantryPhoto = (id, file) => {
  const form = new FormData();
  form.append("photo", file);
  return api.put(`/pantry/${id}/photo`, form).then((r) => r.data);
};

// Recipes
export const fetchAllRecipes = () => api.get("/recipes").then((r) => r.data);
export const fetchMatchedRecipes = (tags = []) =>
  api
    .get("/recipes/matches", { params: tags.length ? { tags: tags.join(",") } : {} })
    .then((r) => r.data);
export const uploadRecipePhoto = (id, file) => {
  const form = new FormData();
  form.append("photo", file);
  return api.put(`/recipes/${id}/photo`, form).then((r) => r.data);
};

// Grocery
export const generateGroceryList = (recipeIds) =>
  api.post("/grocery/generate", { recipeIds }).then((r) => r.data);

// Meal plan
export const fetchMealPlan = (start, end) =>
  api.get("/mealplan", { params: { start, end } }).then((r) => r.data);
export const setMealSlot = (date, mealType, recipeId) =>
  api.post("/mealplan", { date, mealType, recipeId }).then((r) => r.data);
export const clearMealSlot = (id) => api.delete(`/mealplan/${id}`).then((r) => r.data);

export default api;
