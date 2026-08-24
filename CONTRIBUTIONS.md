# Contributing to Just In Time

Thank you for helping improve Just In Time, an expiry-aware recipe planner.
Contributions should make it easier for people to use food they already have,
plan meals, and avoid unnecessary waste.

## Before you start

1. Read the project [README](README.md).
2. Check existing issues and pull requests before starting duplicate work.
3. For a substantial feature, open an issue first so the scope and UX can be
   discussed.
4. Never include credentials, `.env` files, database exports, uploaded images,
   or personal user data in a commit.

The repository currently has no selected open-source license. Until a license
is added, contributing code does not automatically grant permission for others
to reuse it. The maintainers should add a license before presenting this
repository as a formally licensed open-source project.

## Local setup

The app has separate frontend and backend packages:

```bash
git clone <repository-url>
cd <repository-directory>

cd backend
npm install
cp .env.example .env
# Configure MongoDB and JWT_SECRET at minimum.
npm run seed
npm run dev
```

In another terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Use separate terminals for the two development servers. The frontend normally
runs on `http://localhost:5173` and the API on `http://localhost:5000`.

## Contributors can build on these working capabilities:

### Implemented product areas

- Email/password auth with bcrypt and optional Google Sign-In.
- JWT-protected, user-scoped pantry and meal-plan data.
- Pantry items with quantity, unit, expiry date, and barcode fields.
- Expiry-aware urgency badges and browser/device expiry reminders.
- Recipe matching ranked by availability and ingredient urgency.
- Vegetarian, vegan, and gluten-free filters.
- AI recipe generation from pantry contents through OpenRouter.
- Seeded and generated recipe catalog with deletion support.
- Grocery lists for selected recipes, grouped by category.
- Weekly breakfast, lunch, and dinner planning with week navigation.

### Planned features
- Barcode camera scanning, barcode image upload, and Open Food Facts lookup.
- Pantry/fridge photo recognition, with review before saving.
- Responsive ui for mobile app
- Google Auth for mobile app
  
### These are open roadmap ideas rather than fixed commitments:
- Recipe details, serving scaling, nutrition information, favorites, and collections.
- Drag-and-drop and recurring meal plans.
- Grocery-list export, sharing, and store-aware organization.
- More dietary preferences, allergies, cuisines, and custom tags.
- Image storage, caching, and performance improvements.

Choose the smallest coherent slice of a roadmap item. A pull request that
adds a focused vertical feature is easier to review than a broad refactor
mixed with unrelated UI changes.

## How to contribute

### 1. Create a branch

Use a descriptive branch name:

```bash
git checkout -b feat/pantry-editing
git checkout -b fix/mobile-calendar-overflow
git checkout -b docs/contribution-guide
```

### 2. Make the change

Keep frontend and backend responsibilities clear:

- React components own presentation and user interaction.
- `frontend/src/services/api.js` owns API calls.
- Express routes and controllers own request handling.
- Services own matching, AI, image, and grocery business logic.
- Models own MongoDB schema definitions.

For UI work, support loading, empty, error, and narrow-screen states. Preserve
the rule that normal pages should not create horizontal scrolling; the meal
calendar may scroll inside its own container because its seven-column layout
needs it.

For API work, validate inputs, protect user-scoped routes, avoid leaking
provider errors or secrets, and return consistent status codes.

### 3. Verify locally

At minimum, run:

```bash
cd frontend
npm run build
```

If you change backend code, start the backend and exercise the affected route
with the frontend or an API client. If you add tests, document the command
needed to run them in the pull request.

Also manually check:

- Desktop and mobile widths.
- Keyboard navigation and visible focus states.
- Loading, empty, and failure behavior.
- Authenticated and unauthenticated behavior.
- Whether environment variables are documented in the relevant example file.

### 4. Commit clearly

Prefer small commits with imperative messages:

```text
Add pantry item editing
Fix mobile navigation overflow
Document OpenRouter vision setup
```

Do not commit generated dependencies, `dist` output, local configuration, or
secrets. The repository `.gitignore` contains the expected exclusions.

### 5. Open a pull request

Include:

- What changed and why.
- Screenshots or a short recording for visual changes.
- API or schema changes.
- Setup or migration steps.
- Commands used to verify the work.
- Known limitations or follow-up work.

Keep pull requests focused. Explain trade-offs when changing matching logic,
authentication, external provider usage, or data ownership.

## Reporting bugs

Open an issue with:

- A concise title.
- Steps to reproduce.
- Expected and actual behavior.
- Browser, device, and operating system.
- Relevant logs with tokens and personal data removed.
- Screenshots for visual or responsive issues.

Do not report security vulnerabilities in a public issue. Contact the
maintainers privately once a security contact is published.

## Review principles

Reviews prioritize:

1. Correctness and protection of user data.
2. Clear behavior during errors and external-service outages.
3. Accessible, responsive UX.
4. Small, maintainable changes.
5. Documentation that lets another contributor reproduce the behavior.

Be specific and respectful. Questions should focus on the code and the user
outcome, not the contributor.
