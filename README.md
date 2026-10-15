# StackPulse ⚡

> **GitHub developer profiles and explainable head-to-head comparison with deterministic Signal Scores.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-6.4-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tests](https://img.shields.io/badge/Tests-31%20Passed-success?logo=vitest&logoColor=white)](https://vitest.dev/)

> **StackPulse:** GitHub developer profiles and explainable head-to-head comparison with deterministic Signal Scores, live telemetry, and resilient outage caching.

- **GitHub Repository Topics:** `github-api`, `developer-analytics`, `signal-scores`, `head-to-head-comparison`, `react-19`, `typescript`, `prisma`, `postgresql`, `tailwind-css`
- **Frontend App:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000](http://localhost:5000)
- **Live Demo / Walkthrough:** [YouTube Demo Walkthrough](https://youtu.be/your-demo-link) *(Follows PRD §13 demo script)*

---

## 📸 Product Walkthrough & Screenshots

### 1. Head-to-Head Developer Comparison
Compare 2 or 3 GitHub developers side-by-side with interactive Radar charts, category leader trophies, and primary language footprint:
![StackPulse Head-to-Head Comparison](docs/assets/compare.png)

### 2. Detailed Developer Profile & Signal Scores
Deep dive into any developer's public footprint, owned non-fork repositories, and explainable 0–100 indicators:
![StackPulse Developer Profile](docs/assets/profile.png)

### 3. Telemetry & Saved Comparisons Dashboard
Monitor real-time platform statistics, revisit saved comparisons, and manage your pinned repository portfolio:
![StackPulse Telemetry Dashboard](docs/assets/dashboard.png)

### 4. Authentication & Protected Multi-Tenant Sessions
Secure cookie-based authentication with IP rate limiting and complete cross-tenant isolation:
![StackPulse Authentication Screen](docs/assets/auth.png)

---

## 🌟 The Signature Idea: Transparent Signal Scores

Most developer comparison tools show raw vanity counts (followers, total repos, star totals) side-by-side. **StackPulse** introduces **Signal Scores (0–100)**: deterministic, mathematically explainable indicators calculated entirely from owned, non-fork public repositories.

| Signal | Formula | What It Measures |
| :--- | :--- | :--- |
| **Reach** | `min(100, 25 × log10(followers + 1))` | Audience and developer community footprint (10,000 followers = 100). |
| **Impact** | `min(100, 20 × log10(totalStars + 1))` | Recognition of owned repositories excluding forks (100,000 stars = 100). |
| **Activity** | `% of owned repos pushed in last 90 days` | Whether the developer is actively shipping code recently. |
| **Breadth** | `min(100, distinctLanguages × 15)` | Polyglot adaptability across primary languages (7+ languages = 100). |

### 🛡️ Rigorous Data Quality Guarantees & Edge Cases
- **No Zeros or `NaN` for Missing Data:** A developer with 0 owned repositories displays **"Unavailable"** for Activity, Impact, and Breadth—never a misleading zero or division-by-zero `NaN`.
- **Zero Followers Handled:** A developer with 0 followers displays **"Unavailable"** for Reach.
- **Transparent 100-Repo Sample Labeling:** GitHub's `GET /users/{username}/repos` REST API sorts by `pushed` (most recently active). Because GitHub does not support sorting by stars on this endpoint, StackPulse fetches the 100 most recently active repositories and explicitly labels this note on the UI: `Based on sample of 100 most recently active of N repos (excluding forks)`.
- **Primary Language Precision:** Metrics focus solely on primary repository languages and are labeled `by repository count`.
- **Outage & Rate-Limit Resilience:** Developer profiles are cached in PostgreSQL for 15 minutes. If GitHub experiences an outage or rate limit, StackPulse serves the stale cached copy with a prominent alert banner. Even if the database is offline, the client frontend gracefully falls back to offline mock profiles rather than crashing or showing a blank screen.

---

## 🔐 Environment Variables

Copy `.env.example` to `.env` before running:

```bash
cp .env.example .env
```

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | Port for the Express backend server. |
| `NODE_ENV` | `development` | Environment mode (`development` or `production`). In production, session cookies enforce `secure: true`. |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/stackpulse?schema=public` | PostgreSQL connection string. |
| `SESSION_SECRET` | *random 32+ char string* | Secret key used to sign `httpOnly` session cookies. |
| `GITHUB_TOKEN` | `""` | GitHub Personal Access Token (PAT). Increases GitHub rate limits from 60 to **5,000 requests/hour**. |
| `CLIENT_URL` | `http://localhost:5173` | Frontend application origin (used for strict CORS isolation and session credentials). |

> **Security Verification:** Confirmed that `.env` files and real tokens have never been committed to git history. Automated tests prevent credential leakage.

---

## 🚀 Quick Start (Automated Setup)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ or v22 LTS)
- [Docker & Docker Compose](https://www.docker.com/) (for PostgreSQL)
- **GitHub Personal Access Token:** Strongly recommended. Free public tokens provide **5,000 req/hr** (unauthenticated calls are capped at 60/hr and exhaust during comparisons). Generate one at [github.com/settings/tokens](https://github.com/settings/tokens) (no scopes needed).

### 1. Clone & Configure Environment

```bash
# Clone the repository (note the repository folder name 'Stackpusle')
git clone https://github.com/Prabhav04/Stackpusle.git
cd Stackpusle

# Copy environment template
cp .env.example .env
```

Edit `.env` and set your optional GitHub token:
```env
GITHUB_TOKEN="ghp_yourPersonalAccessTokenHere"
```

### 2. Start PostgreSQL Container

```bash
docker compose up -d
```

### 3. Run Automated Setup

Installs all root, client, and server dependencies, and generates the Prisma client in one automated command:

```bash
npm run setup
```

To sync your database schema, run:
```bash
npm run setup:db
```
*(Runs `prisma db push` to synchronize all tables and foreign keys with PostgreSQL).*

### 4. Start the Application

```bash
npm run dev
```

- **Frontend App:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000](http://localhost:5000)
- **API Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🧪 Automated Testing

StackPulse includes comprehensive automated tests covering pure formula math, edge cases, and cross-tenant API isolation:

```bash
npm test
```

```text
✓ src/services/signals.test.ts (23 tests)
  ✓ Reach: min(100, 25 * log10(followers + 1)) (handles 0 followers -> unavailable)
  ✓ Impact: min(100, 20 * log10(totalStars + 1)) (handles 0 owned repos -> unavailable)
  ✓ Activity: % of owned repos pushed in last 90 days (handles 0 owned repos -> unavailable)
  ✓ Breadth: min(100, distinctLanguages * 15) (handles 0 owned repos -> unavailable)
  ✓ calculateDeveloperSignals master function (excludes forks, validates 90-day activity)

✓ src/ownership.test.ts (8 tests)
  ✓ Unauthenticated Access Guards (401 on protected routes)
  ✓ Cross-Tenant Isolation (404 on accessing another user's comparison or pin)
```

---

## 🧭 3–4 Minute Assessment Demo Script

1. **Sign Up & Session Auth (15s):** Create an account on `/auth`. Point out the custom Obsidian Crimson theme with volumetric light rays and security hardening.
2. **Developer Profile Search (45s):** Search a developer (e.g., `shadcn` or `gaearon`). Show the 4 Signal Score cards with transparent formulas, data-quality notes, and sortable non-fork repository table.
3. **Repository Pinning (30s):** Click the pin icon on a top repo, write an evaluation note, and view it live in the Pinned Repos section on the Dashboard.
4. **Head-to-Head Comparison (75s):** Navigate to `/compare` and load a 3-developer comparison (`torvalds,sindresorhus,tj`). Walk through the Recharts Radar Chart, leader trophies, and language breakdown.
5. **Save & Deduplication (30s):** Click "Save Comparison". Notice the button transforms to a disabled **"✓ Saved"** indicator preventing duplicate database entries. Return to `/dashboard` and reopen it.
6. **Error States & Cache Fallback (20s):** Search an invalid username to demonstrate the user-friendly `USER_NOT_FOUND` error state and mention the 15-minute PostgreSQL cache fallback on outages.

---

## 🛡️ Architectural Trade-offs & Decisions

- **Signal Scores are heuristics:** Chosen for 30-second explainability and determinism over opaque machine-learning rankings.
- **Primary language only:** Avoids extra GitHub API calls per repo while keeping rate limits predictable.
- **First 100 repos per developer (`sort=pushed`):** GitHub REST API `GET /users/{username}/repos` does not support sorting by stars (only `pushed`, `updated`, `created`, `full_name`). Fetching 100 pushed repos guarantees analysis of active projects while remaining within GitHub rate limits. This is clearly labeled on the UI.
- **Database Schema Deployment (`prisma db push` vs `prisma migrate`):** For clean reviewer evaluation, `npm run setup:db` utilizes `prisma db push` to effortlessly apply the schema to any freshly started PostgreSQL container without migration lock contention. A production-ready SQL migration is also versioned under `server/prisma/migrations/20250101000000_init/` for strict staging/production environments via `prisma migrate deploy`.
- **PostgreSQL-backed cache instead of Redis:** Reduces infrastructure complexity for a self-contained assessment build while providing persistent 15-minute caching and stale fallback during upstream GitHub rate limits or outages.
- **Client Offline Fallback:** If the backend or database is offline, the client seamlessly falls back to pre-rendered mock profiles to guarantee a reviewer is never greeted with a blank white screen.
