# StackPulse ⚡

> **GitHub developer profiles and explainable head-to-head comparison.**  
> Search any GitHub developer, view a clean profile, and compare up to three developers on four transparent signals, with every metric traceable to real data.

---

## 🌟 Overview

Most developer comparison tools display raw counts (followers, repos, stars) side by side. **StackPulse** adds one deliberate signature idea: **Signal Scores**.

- **Reach (0–100):** Audience size scaled logarithmically: `min(100, 25 × log10(followers + 1))` (10,000 followers = 100).
- **Impact (0–100):** Recognition of owned (non-fork) repos: `min(100, 20 × log10(totalStars + 1))` (100,000 stars = 100).
- **Activity (0–100):** Percentage of owned repos pushed in the last 90 days (`activeRepos / totalOwnedRepos * 100`).
- **Breadth (0–100):** Range of distinct primary programming languages: `min(100, distinctLanguages × 15)` (7+ = 100).

Every metric carries a **data-quality label** (e.g. *"based on 100 of N repos"*), and unavailable data is shown as *"unavailable"*, never as zero.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Recharts, React Router v7, TanStack Query v5, Lucide Icons
- **Backend:** Node.js, Express, TypeScript, Zod, Prisma ORM
- **Database:** PostgreSQL (with Docker Compose)
- **Auth:** `express-session` with session store, bcrypt password hashing, secure httpOnly cookie
- **GitHub API:** Server-side GitHub REST API client with intelligent 15-minute caching and stale-fallback on outages
- **Testing:** Vitest for Signal Score formulas and API auth/ownership verification

---

## 🚀 Quick Start (Clean Setup)

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ or v22 LTS recommended)
- [Docker & Docker Compose](https://www.docker.com/) (for PostgreSQL)

### 1. Clone & Setup Environment

```bash
git clone <repo-url>
cd Stackpulse

# Copy environment variables
cp .env.example .env
```

Configure your `.env` if needed:
- `GITHUB_TOKEN`: *(Optional)* GitHub Personal Access Token to raise rate limit from 60 to 5,000 req/hr.
- `DATABASE_URL`: Defaults to `postgresql://postgres:postgres@localhost:5432/stackpulse?schema=public`.

### 2. Start PostgreSQL

```bash
docker compose up -d
```

### 3. Install Dependencies & Initialize Database

```bash
# Install server dependencies & push database schema
cd server
npm install
npm run prisma:push

# Install client dependencies
cd ../client
npm install
cd ..

# Install root orchestration tools
npm install
```

### 4. Run Development Servers

Run both the backend API and frontend client with a single command from the project root:

```bash
npm run dev
```

- **Frontend App:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000](http://localhost:5000)
- **API Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🧪 Running Tests

```bash
npm run test
```

---

## 📂 Architecture & Project Structure

```text
Stackpulse/
├── client/                     # Vite + React + Tailwind frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components & layouts
│   │   ├── pages/              # Auth, Dashboard, Profile, Compare
│   │   ├── hooks/              # TanStack Query custom hooks
│   │   ├── services/           # API client services
│   │   └── types/              # TypeScript types
│   ├── index.html
│   └── package.json
├── server/                     # Express + TypeScript + Prisma backend
│   ├── prisma/
│   │   └── schema.prisma       # Database schema (PostgreSQL)
│   ├── src/
│   │   ├── config/             # Environment & Prisma client setup
│   │   ├── controllers/        # Route controllers (Auth, Devs, Compare, Pins)
│   │   ├── middleware/         # Auth guard & standardized error handler
│   │   ├── services/           # GitHub client & Signal Scores calculation
│   │   └── app.ts              # Express application setup
│   └── package.json
├── docker-compose.yml          # PostgreSQL container definition
├── .env.example                # Example environment configuration
└── package.json                # Root monorepo orchestration
```

---

## 🛡️ Trade-offs & Design Decisions

- **Signal Scores are heuristics:** Chosen for transparency, instant explainability, and determinism rather than opaque statistical complexity.
- **Primary language only:** Avoids extraneous GitHub API calls per repo while keeping rate limits manageable.
- **First 100 repos:** Keeps GitHub request latency fast and predictable under API quotas; prominently labeled when truncated.
- **Postgres-backed caching:** Caches profile and repo responses for 15 minutes. If GitHub rate limits or goes down, serves stale data with a clear indicator banner.
- **Strict User Isolation:** All saved comparisons and pinned repositories enforce ownership via server-side session identity, preventing cross-tenant access.
