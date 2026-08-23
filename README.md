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
| `ANTHROPIC_API_KEY` | Powers the "scan fridge/pantry photo" feature (identifies food in a photo). Optional — barcode scanning and manual entry work without it. |
| `OPENROUTER_API_KEY` | Powers "Generate recipes from my pantry" (see below). Optional — seeded/manually-added recipes still work without it. |
| `OPENROUTER_MODEL` | Defaults to `openrouter/free`, a router that auto-picks whatever free model is currently available. Set to a specific model ID to pin one instead. |

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

### 5. Setting up AI recipe generation (optional)
1. Go to [openrouter.ai/keys](https://openrouter.ai/keys) and sign up (email or GitHub — no card needed).
2. Generate an API key.
3. Add it to `backend/.env` as `OPENROUTER_API_KEY`.
4. Restart the backend.

The default model, `openrouter/free`, auto-routes to whichever free model
OpenRouter currently has available — this matters because individual
`:free` model IDs on OpenRouter rotate and get pulled often, so pinning one
specific ID is fragile for a long-running project. If you'd rather pin a
specific model, check [openrouter.ai/models?max_price=0](https://openrouter.ai/models?max_price=0)
for the current free list and set `OPENROUTER_MODEL` to that ID.

**Free tier limits:** 20 requests/minute, 50/day with no credit purchased,
1000/day if you've ever added $10 in credits. Plenty for personal use —
each click of "Generate recipes" is one request.

### 6. Try it out
1. Open http://localhost:5173 — you'll land on the sign-up page.
2. Create an account (or use "Sign in with Google" if configured).
3. Add a few pantry items on the **Pantry** page — give one an expiry date
   of today or tomorrow to see the urgency badges. Scan a barcode, or scan
   a photo of your fridge/pantry shelf to detect and add several items at
   once.
4. Go to **Recipes** and click **"Generate recipes from my pantry"** — this
   asks the AI to write real recipes using what you actually have,
   prioritizing what's about to expire. Generated recipes are marked with
   an "AI generated" badge and saved alongside the seeded ones. Filter by
   dietary tag, generate a grocery list for missing ingredients, or add
   recipes to the **Calendar**.

Each account only sees its own pantry, meal plan, and grocery lists.
Recipes themselves are a shared catalog across all users — including
AI-generated ones, so recipes generated from your pantry become available
to everyone using the app (same as the seeded starter recipes).

## Core feature: the matching engine
`backend/services/matchingEngine.js` scores every recipe against your
pantry based on how urgent each ingredient is (days until expiry), not just
whether you happen to have the ingredient. This applies equally to seeded,
manually-added, and AI-generated recipes.

## AI recipe generation
`backend/services/openRouterService.js` sends your current pantry (with
per-item expiry countdowns) to an LLM via OpenRouter and asks it to write
recipes that primarily use what you have, in the same shape as the seeded
recipes (title, ingredients, steps, tags) so they slot into the matching
engine and dietary filters identically. Generated recipes are saved to the
database with `source: "generated"` — they don't disappear after the
session, and they're re-ranked against your pantry the same way every
other recipe is.

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
