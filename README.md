# FridgeFirst — Expiry-Aware Recipe Planner

A MERN pet project that suggests recipes ranked by how many of your
about-to-expire pantry ingredients they use — turning "what can I cook"
into "what should I cook before it goes bad."

## Stack
- MongoDB (Atlas recommended) + Mongoose
- Express + Node
- React (Vite) + React Router + Axios

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
# edit .env and paste your MongoDB Atlas connection string
npm run seed   # loads 5 starter recipes into the DB
npm run dev    # starts the API on http://localhost:5000
```

### 2. Frontend
In a second terminal:
```bash
cd frontend
npm install
cp .env.example .env   # defaults already point at localhost:5000
npm run dev             # starts the app on http://localhost:5173
```

### 3. Try it out
1. Open http://localhost:5173
2. Add a few pantry items on the **Pantry** page — give one an expiry date
   of today or tomorrow to see the urgency badges.
3. Go to **Recipes** — recipes using your soon-to-expire items should rank
   at the top, with an "uses N items expiring soon" callout.

## Core feature: the matching engine
`backend/services/matchingEngine.js` is where the actual "edge" of this
project lives — it scores every recipe against your pantry based on how
urgent each ingredient is (days until expiry), not just whether you happen
to have the ingredient. See the MVP roadmap below for what to build next.

## Roadmap (not yet implemented)
- Barcode scanning to auto-fill pantry items
- Photo-based fridge recognition (multimodal LLM)
- Dietary restriction / nutrition filtering
- Meal calendar (weekly planning view)
- Grocery list generation from missing ingredients
- LLM-generated recipe fallback when no seeded recipe matches well

## API reference (MVP)
| Method | Endpoint              | Description                          |
|--------|------------------------|---------------------------------------|
| GET    | /api/pantry            | List pantry items                     |
| POST   | /api/pantry            | Add a pantry item                     |
| PUT    | /api/pantry/:id        | Update a pantry item                  |
| DELETE | /api/pantry/:id        | Remove a pantry item                  |
| GET    | /api/recipes           | List all recipes                      |
| GET    | /api/recipes/matches   | Ranked recipes vs. current pantry      |
| POST   | /api/recipes           | Add a recipe                          |
