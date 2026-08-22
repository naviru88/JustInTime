import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
});

// Called by AuthContext whenever the token changes (login/logout/refresh).
export const setAuthToken = (token) => {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
};

// Uploaded photos are served from the backend's origin at /uploads/..., not
// under /api, so strip the API suffix to get a base for building full URLs.
const ASSET_BASE_URL = API_URL.replace(/\/api\/?$/, "");
export const resolvePhotoUrl = (photoUrl) => (photoUrl ? `${ASSET_BASE_URL}${photoUrl}` : null);

// Auth
export const signup = (name, email, password) =>
  api.post("/auth/signup", { name, email, password }).then((r) => r.data);
export const login = (email, password) =>
  api.post("/auth/login", { email, password }).then((r) => r.data);
export const googleLogin = (credential) =>
  api.post("/auth/google", { credential }).then((r) => r.data);
export const fetchMe = () => api.get("/auth/me").then((r) => r.data);

// If any request comes back 401 (expired/invalid token), broadcast an event
// so AuthContext can clear the stale session instead of leaving the UI stuck
// making authenticated calls that will keep failing.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent("jit:unauthorized"));
    }
    return Promise.reject(error);
  }
);

// Pantry
export const fetchPantryItems = () => api.get("/pantry").then((r) => r.data);
export const addPantryItem = (item) => api.post("/pantry", item).then((r) => r.data);
export const updatePantryItem = (id, updates) =>
  api.put(`/pantry/${id}`, updates).then((r) => r.data);
export const deletePantryItem = (id) => api.delete(`/pantry/${id}`).then((r) => r.data);
export const lookupBarcode = (barcode) =>
  api.get(`/pantry/lookup/${barcode}`).then((r) => r.data);
export const uploadPantryPhotos = (id, files) => {
  const form = new FormData();
  Array.from(files).forEach((file) => form.append("photos", file));
  return api.put(`/pantry/${id}/photos`, form).then((r) => r.data);
};
// Analyzes photos of a fridge/pantry and returns detected food items —
// nothing is saved yet, this is for review before adding to the pantry.
export const recognizePantryPhotos = (files) => {
  const form = new FormData();
  Array.from(files).forEach((file) => form.append("photos", file));
  return api.post("/pantry/recognize-photos", form).then((r) => r.data.items);
};

// Recipes
export const fetchAllRecipes = () => api.get("/recipes").then((r) => r.data);
export const fetchMatchedRecipes = (tags = []) =>
  api
    .get("/recipes/matches", { params: tags.length ? { tags: tags.join(",") } : {} })
    .then((r) => r.data);
export const generateRecipes = (tags = [], count) =>
  api.post("/recipes/generate", { tags, count }).then((r) => r.data);
export const deleteRecipe = (id) => api.delete(`/recipes/${id}`).then((r) => r.data);

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
