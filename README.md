# Just In Time — Expiry-Aware Recipe Planner

A MERN app that suggests recipes ranked by how many of your about-to-expire
pantry ingredients they use — turning "what can I cook" into "what should I
cook before it goes bad." Each user has their own account, pantry, and meal
plan.

## Stack
- MongoDB (Atlas recommended) + Mongoose
- Express + Node
- React (Vite) + React Router + Axios
- Auth: JWT (email/password) + Google Sign-In (`@react-oauth/google` /
  `google-auth-library`)
- Barcode scanning: `@zxing/browser`

## Project structure
```
recipe-planner/
├── backend/     # Express API + Mongo models + matching engine
└── frontend/    # React (Vite) client
```

## Setup

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
# edit .env — see "Environment variables" below
npm run seed   # loads starter recipes into the DB
npm run dev    # starts the API on http://localhost:5000
```

### 2. Frontend
In a second terminal:
```bash
cd frontend
npm install
cp .env.example .env
# edit .env — see "Environment variables" below
npm run dev    # starts the app on http://localhost:5173
```

### 3. Environment variables

**`backend/.env`**
| Variable | Notes |
|---|---|
| `MONGO_URI` | MongoDB Atlas (or local) connection string |
| `JWT_SECRET` | Any long random string — used to sign login tokens |
| `GOOGLE_CLIENT_ID` | OAuth client ID from Google Cloud Console (see below). Optional — email/password login works without it. |

**`frontend/.env`**
| Variable | Notes |
|---|---|
| `VITE_API_URL` | Defaults to `http://localhost:5000/api` |
| `VITE_GOOGLE_CLIENT_ID` | Same client ID as the backend's `GOOGLE_CLIENT_ID`. Optional — if unset, the Google button is hidden and email/password still works. |

### 4. Setting up Google Sign-In (optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Create an **OAuth client ID** of type **Web application**.
3. Under **Authorized JavaScript origins**, add `http://localhost:5173` (and your deployed frontend URL, once you have one).
4. Copy the generated Client ID into both `backend/.env` (`GOOGLE_CLIENT_ID`) and `frontend/.env` (`VITE_GOOGLE_CLIENT_ID`).
5. Restart both servers.

### 5. Try it out
1. Open http://localhost:5173 — you'll land on the sign-up page.
2. Create an account (or use "Sign in with Google" if configured).
3. Add a few pantry items on the **Pantry** page — give one an expiry date
   of today or tomorrow to see the urgency badges. Scan a barcode or upload
   a photo of one to prefill details automatically.
4. Go to **Recipes** — recipes using your soon-to-expire items rank at the
   top. Filter by dietary tag, generate a grocery list for missing
   ingredients, or add recipes to the **Calendar**.

Each account only sees its own pantry, meal plan, and grocery lists.
Recipes themselves are a shared catalog across all users.

## Core feature: the matching engine
`backend/services/matchingEngine.js` scores every recipe against your
pantry based on how urgent each ingredient is (days until expiry), not just
whether you happen to have the ingredient.

## Auth model
- Email/password accounts are hashed with bcrypt (never stored in plain text).
- Google accounts are verified server-side against Google's token endpoint
  via `google-auth-library` — the frontend never handles a raw password for
  Google users.
- If someone signs up with email/password and later uses "Sign in with
  Google" with the same email, the accounts are linked automatically rather
  than creating a duplicate.
- Sessions are JWTs valid for 30 days, sent as `Authorization: Bearer
  <token>` and stored in `localStorage` on the client.
