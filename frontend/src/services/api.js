import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({ baseURL: API_URL });

export const setAuthToken = (token) => {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
};

export const signup = (name, email, password) =>
  api.post("/auth/signup", { name, email, password }).then((r) => r.data);
export const login = (email, password) =>
  api.post("/auth/login", { email, password }).then((r) => r.data);
export const googleLogin = (credential) =>
  api.post("/auth/google", { credential }).then((r) => r.data);
export const fetchMe = () => api.get("/auth/me").then((r) => r.data);
export const updateNotificationSettings = (payload) =>
  api.patch("/auth/notifications", payload).then((r) => r.data);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent("jit:unauthorized"));
    }
    return Promise.reject(error);
  }
);

export const fetchPantryItems = () => api.get("/pantry").then((r) => r.data);
export const addPantryItem = (item) => api.post("/pantry", item).then((r) => r.data);
export const addPantryItems = (items) =>
  api.post("/pantry/bulk", { items }).then((r) => r.data);
export const updatePantryItem = (id, updates) =>
  api.put(`/pantry/${id}`, updates).then((r) => r.data);
export const deletePantryItem = (id) => api.delete(`/pantry/${id}`).then((r) => r.data);

const localToday = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const lookupBarcode = (barcode) =>
  api.post("/food/barcode", { barcode, today: localToday() }).then((r) => r.data);

const MAX_PHOTO_BATCH_BYTES = 3.5 * 1024 * 1024;
const MAX_INPUT_PHOTO_BYTES = 20 * 1024 * 1024;

const compressPantryPhoto = async (file, maxDimension = 1600, quality = 0.78) => {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    const loaded = new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });
    image.src = url;
    await loaded;

    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser couldn't prepare the selected photo.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) throw new Error("This browser couldn't prepare the selected photo.");
    const name = file.name.replace(/\.[^.]+$/, "") || "pantry-photo";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(url);
  }
};

const compressPantryPhotos = async (files, maxDimension, quality) => {
  const compressed = [];
  for (const file of files) {
    compressed.push(await compressPantryPhoto(file, maxDimension, quality));
  }
  return compressed;
};

export const recognizePantryPhotos = async (files) => {
  const selected = Array.from(files);
  if (selected.length > 10) throw new Error("Choose up to 10 photos at a time.");
  if (selected.some((file) => file.size > MAX_INPUT_PHOTO_BYTES)) {
    throw new Error("Each photo must be 20 MB or smaller before compression.");
  }

  let prepared = await compressPantryPhotos(selected, 1600, 0.78);
  if (prepared.reduce((total, file) => total + file.size, 0) > MAX_PHOTO_BATCH_BYTES) {
    prepared = await compressPantryPhotos(selected, 1200, 0.62);
  }
  if (prepared.reduce((total, file) => total + file.size, 0) > MAX_PHOTO_BATCH_BYTES) {
    throw new Error("That photo batch is still too large. Choose fewer photos and try again.");
  }

  const form = new FormData();
  prepared.forEach((file) => form.append("photos", file));
  form.append("today", localToday());
  return api.post("/pantry/recognize-photos", form).then((r) => r.data.items);
};

export const fetchAllRecipes = () => api.get("/recipes").then((r) => r.data);
export const fetchMatchedRecipes = (tags = []) =>
  api
    .get("/recipes/matches", { params: tags.length ? { tags: tags.join(",") } : {} })
    .then((r) => r.data);
export const generateRecipes = (tags = [], count) =>
  api.post("/recipes/generate", { tags, count }).then((r) => r.data);
export const deleteRecipe = (id) => api.delete(`/recipes/${id}`).then((r) => r.data);

export const generateGroceryList = (recipeIds) =>
  api.post("/grocery/generate", { recipeIds }).then((r) => r.data);

export const fetchMealPlan = (start, end) =>
  api.get("/mealplan", { params: { start, end } }).then((r) => r.data);
export const setMealSlot = (date, mealType, recipeId) =>
  api.post("/mealplan", { date, mealType, recipeId }).then((r) => r.data);
export const clearMealSlot = (id) => api.delete(`/mealplan/${id}`).then((r) => r.data);

export default api;
