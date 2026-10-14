# StackPulse ⚡

> **GitHub developer profiles and explainable head-to-head comparison with deterministic Signal Scores.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-6.4-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tests](https://img.shields.io/badge/Tests-26%20Passed-success?logo=vitest&logoColor=white)](https://vitest.dev/)

**Topics:** `github-api` · `developer-analytics` · `signal-scores` · `full-stack-assessment` · `react-19`

---

## 📸 Product Preview

![StackPulse Head-to-Head Comparison](docs/assets/compare.png)

![StackPulse Telemetry Dashboard](docs/assets/dashboard.png)

📹 **Demo Video (3–4 min Walkthrough):** [Watch Video on YouTube](https://youtu.be/your-demo-link) *(Follows PRD §13 demo script)*

---

## 🌟 The Signature Idea: Transparent Signal Scores

Most developer comparison tools show raw vanity counts (followers, total repos, star totals) side-by-side. **StackPulse** introduces **Signal Scores (0–100)**: deterministic, mathematically explainable indicators calculated entirely from owned, non-fork public repositories.

| Signal | Formula | What It Measures |
| :--- | :--- | :--- |
| **Reach** | `min(100, 25 × log10(followers + 1))` | Audience and developer community footprint (10,000 followers = 100). |
| **Impact** | `min(100, 20 × log10(totalStars + 1))` | Recognition of owned repositories excluding forks (100,000 stars = 100). |
| **Activity** | `% of owned repos pushed in the last 90 days` | Whether the developer actively ships recent code. |
| **Breadth** | `min(100, distinctLanguages × 15)` | Polyglot adaptability across primary languages (7+ languages = 100). |

### 🛡️ Rigorous Data Quality Guarantees
- **No Zeros for Missing Data:** A developer with 0 owned repositories displays **"Unavailable"** for Activity and Impact—never a misleading zero or `NaN`.
- **First 100 Repos Labeling:** GitHub API returns up to 100 repos per single page. Developers with more than 100 repositories clearly carry the indicator: `Based on first 100 of N repos`.
- **Primary Language Precision:** Metrics focus solely on primary repository languages and are labeled `by repository count`.
- **Outage & Rate-Limit Resilience:** Developer profiles are cached in PostgreSQL for 15 minutes. If GitHub experiences an outage or rate limit, StackPulse serves the stale cached copy with a prominent alert banner.

---

## 🛠️ Architecture & Security

- **Strict Multi-Tenant Isolation:** All queries filter on `userId` from the signed session cookie. Accessing another user's saved comparisons or repository pins returns **404 NOT FOUND** (never 403, preventing resource enumeration). Verified by 8 automated integration tests.
- **Security Headers & Hardening:** Protected with `helmet`, IP-based rate limiting on `/api/auth/register` and `/api/auth/login`, bcrypt password hashing (min 8 characters), and `httpOnly`, `sameSite`, `secure` cookies.
- **Zero Stack Trace Leaks:** Standardized error handler maps errors into `{ error: { code, message } }`.
- **Deduplication:** Comparisons enforce 2–3 distinct developers (validated against GitHub's username regex `^[a-zA-Z0-9-]{1,39}$`) and prevent duplicate entries by toggling to a disabled **"✓ Saved"** indicator.

---

## 🚀 Quick Start (One-Command Setup)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ or v22 LTS)
- [Docker & Docker Compose](https://www.docker.com/) (for PostgreSQL)
- **GitHub Personal Access Token:** Strongly recommended. Free public tokens provide **5,000 req/hr** (unauthenticated calls are capped at 60/hr and exhaust during comparisons). Generate one at [github.com/settings/tokens](https://github.com/settings/tokens) (no scopes needed).

### 1. Clone & Configure Environment

```bash
# Clone the repository
git clone https://github.com/Prabhav04/Stackpusle.git
cd Stackpusle

# Copy environment template
cp .env.example .env
```

> **Note:** If you rename the repository on GitHub to `Stackpulse` (recommended to fix the typo), replace `Stackpusle` with `Stackpulse`.

Edit `.env` and paste your GitHub token:
```env
GITHUB_TOKEN="ghp_yourPersonalAccessTokenHere"
```

### 2. Start PostgreSQL Container

```bash
docker compose up -d
```

### 3. Run Automated Setup

Installs all root, client, and server dependencies, generates the Prisma client, and applies the database migrations in one command:

```bash
npm run setup
```

### 4. Start the Application

```bash
npm run dev
```

- **Frontend App:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000](http://localhost:5000)
- **Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🧪 Automated Testing

StackPulse includes comprehensive automated tests covering pure formula math, edge cases, and cross-tenant API isolation:

```bash
npm test
```

```text
✓ src/services/signals.test.ts (18 tests)
  ✓ Reach: min(100, 25 * log10(followers + 1))
  ✓ Impact: min(100, 20 * log10(totalStars + 1))
  ✓ Activity: % of owned repos pushed in last 90 days (handles 0 owned repos -> unavailable)
  ✓ Breadth: min(100, distinctLanguages * 15)
  ✓ calculateDeveloperSignals master function (excludes forks)

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
- **First 100 repos per developer:** Balances low latency and rate-limit quotas; explicitly labeled when sample is truncated.
- **PostgreSQL-backed cache instead of Redis:** Reduces infrastructure complexity for a self-contained 48-hour build while providing persistent caching.
- **Prisma Migrations:** Uses `prisma migrate` rather than `db push` to maintain clean, auditable SQL migration files.
