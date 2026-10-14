# StackPulse — PRD

**GitHub developer profiles and explainable head-to-head comparison.** Interview technical assessment · 48-hour build · Responsive web app

---

## 1. One-line pitch

Search any GitHub developer, see a clean profile, and compare up to three developers on four transparent signals, with every number traceable to real data.

## 2. What makes it ours

Most submissions for this assignment will show raw counts (followers, repos, stars) side by side. StackPulse adds one deliberate idea: **Signal Scores**.

- Four scores (0–100) per developer: **Reach, Impact, Activity, Breadth**.
- Formulas are deterministic, shown in the UI, and explainable in 30 seconds. No AI, no black box.
- Every metric carries a **data-quality label** (for example, "based on first 100 owned repos"). Missing data is shown as "unavailable", never as zero.

This is the only signature feature. Everything else exists to make it work reliably.

## 3. Scope: lock it now

**Build (all must be polished and working)**

1. Register, login, logout (session cookie auth).
2. Search a GitHub username → profile page with live data.
3. Repository table: stars, language, last pushed. Sort by stars or recent activity.
4. Compare 2–3 developers: stat cards, Signal Score radar chart, language breakdown.
5. Save a named comparison; reopen and delete it.
6. Pin a repository with a note; edit and remove the note.
7. Visible handling of rate limits, not-found users and GitHub outages.

**Cut (do not build, mention in trade-offs)**

- Commit activity charts, tags, AI summaries, private repos, roles, background jobs, animations, OAuth login.

**Rule:** if a feature is not in the Build list, it does not get built until the acceptance checklist is fully green.

## 4. User journey

1. **Sign in** → lands on Dashboard.
2. **Search** a username → Profile.
3. **Explore** profile stats and repos; pin a repo and write a note.
4. **Compare** → add 2–3 usernames → see Signal Scores side by side.
5. **Save** the comparison with a name; find it again on the Dashboard.

## 5. Screens (four only)

| Screen | Contents |
| --- | --- |
| **Auth** | One page, login/register toggle, inline validation errors. |
| **Dashboard** | Search bar, recently viewed developers, saved comparisons (open / delete), pinned repos with notes. |
| **Profile** | Avatar, name, bio, followers, public repos, total stars, language chart, sortable repo table with pin button. |
| **Compare** | Username chips (2–3), stat cards with the leader highlighted, radar chart of Signal Scores, language bars, "Save comparison" with name input. |

**UI bar:** one consistent component set (Tailwind), light/dark-neutral palette, real loading skeletons, real empty states, mobile layout that stacks cleanly. A small number of screens done well beats many done adequately.

## 6. Signal Scores (the signature feature)

Computed on the backend from cached data. Forks are excluded from all repo-based metrics.

| Signal | Formula | Reads as |
| --- | --- | --- |
| **Reach** | `min(100, 25 × log10(followers + 1))` | Audience size (10,000 followers = 100). |
| **Impact** | `min(100, 20 × log10(totalStars + 1))` | Recognition of owned repos (100,000 stars = 100). |
| **Activity** | `% of owned repos pushed in the last 90 days` | Is the developer still shipping. |
| **Breadth** | `min(100, distinctLanguages × 15)` | Range of languages used (7+ = 100). |

Log scaling keeps one viral repo from drowning everyone else. Show the formula in a tooltip or info popover on each score. These are heuristics, so label them "indicators, not rankings".

**Data-quality labels**

- Repo metrics use up to the first 100 owned repos (one GitHub page). If the developer has more, show "based on 100 of N repos".
- Language data is the repo's primary language only. Label the chart "by repository count".
- If GitHub fails and no cache exists, show an error state for that developer, not zeros.

## 7. Tech stack

- **Frontend:** React, TypeScript, Vite, Tailwind, Recharts, React Router, TanStack Query.
- **Backend:** Node.js, Express, TypeScript, Zod for validation.
- **Database:** PostgreSQL with Prisma.
- **Auth:** `express-session` with a Postgres session store, bcrypt for passwords, httpOnly cookie.
- **GitHub:** REST API, token kept server-side only.
- **Run:** `docker compose up` for Postgres; one `npm run dev` for client and server.

## 8. Data model

| Table | Fields |
| --- | --- |
| `users` | id, email (unique), passwordHash, createdAt |
| `developers` | id, username (unique, lowercase), name, avatarUrl, bio, followers, publicRepos, fetchedAt |
| `repos` | id, developerId, githubId, name, url, description, stars, language, isFork, pushedAt |
| `comparisons` | id, userId, name, createdAt |
| `comparison_developers` | comparisonId, developerId |
| `pins` | id, userId, repoId, note, createdAt (unique on userId + repoId) |
| `recent_views` | userId, developerId, viewedAt (unique on userId + developerId) |

All user-owned queries filter by `userId` from the session, never from the request body.

## 9. API

All routes under `/api`. Errors return `{ error: { code, message } }`.

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | no | Create account and start session |
| POST | `/auth/login` | no | Start session |
| POST | `/auth/logout` | yes | End session |
| GET | `/auth/me` | yes | Current user |
| GET | `/developers/:username` | yes | Profile, repos and Signal Scores |
| GET | `/compare?users=a,b,c` | yes | Profiles, scores and language data for 2–3 users |
| GET / POST | `/comparisons` | yes | List / save a named comparison |
| GET / DELETE | `/comparisons/:id` | yes | Reopen / delete (owner only) |
| GET / POST | `/pins` | yes | List / pin a repo with optional note |
| PATCH / DELETE | `/pins/:id` | yes | Edit note / unpin (owner only) |

Profile and repos come from one endpoint, since the profile page always needs both. Recent views are recorded as a side effect of the profile call.

**Caching:** on each developer request, return the database copy if `fetchedAt` is under 15 minutes old. Otherwise refetch. If GitHub fails and a stale copy exists, return it with `stale: true` and show a "showing cached data" banner.

**Error codes the UI must handle:** `USER_NOT_FOUND`, `RATE_LIMITED`, `GITHUB_UNAVAILABLE`, `UNAUTHENTICATED`, `VALIDATION_ERROR`.

## 10. Build order

Each step ends with something demoable. Commit after every step.

1. **Foundation (0–3h):** repo, monorepo folders, Docker Postgres, Prisma schema, env setup, README skeleton.
2. **Auth (3–7h):** register, login, logout, protected routes, auth page.
3. **GitHub + cache (7–13h):** GitHub client, `/developers/:username`, caching, error mapping.
4. **Profile screen (13–20h):** stats, language chart, repo table, sorting.
5. **Signal Scores + Compare (20–30h):** score logic with unit tests, `/compare`, radar chart, stat cards.
6. **Persistence (30–36h):** saved comparisons, pins and notes, dashboard sections.
7. **Hardening (36–42h):** loading, empty and error states, mobile pass, ownership tests, clean-setup test from the README.
8. **Submission (42–48h):** demo video, trade-off notes, final commit cleanup.

If behind schedule, simplify the UI of steps 6–7. Do not cut steps 1–5.

## 11. Quality bar (what the reviewer will notice)

- Clean setup works from the README on the first try.
- Incremental, meaningful commit messages.
- Unit tests for the Signal Score functions and API tests for auth and ownership.
- No secrets committed; `.env.example` provided.
- Input validation on every route; no stack traces in responses.
- A user can never read or change another user's comparisons or pins.

## 12. Acceptance checklist

- [ ] Register, login and logout work; protected routes redirect.
- [ ] A valid username loads a real profile; an invalid one shows a clear message.
- [ ] Repo table shows stars, language and last pushed, and sorts correctly.
- [ ] 2–3 developers compare in one view with Signal Scores and formulas visible.
- [ ] Metrics carry data-quality labels; unavailable data never shows as zero.
- [ ] Comparisons can be saved, reopened and deleted.
- [ ] Repos can be pinned; notes can be added, edited and removed.
- [ ] Another user's data returns 404 (verified by test).
- [ ] Rate limit and GitHub outage show visible, useful states.
- [ ] Data survives a restart; frontend only uses the app's own API.
- [ ] Desktop and mobile layouts both work.
- [ ] README, demo video and trade-off notes are done.

## 13. Demo script (3–4 minutes)

1. Register and log in (15s).
2. Search a well-known developer; show the profile and pin a repo with a note (45s).
3. Open Compare with three developers; walk through the radar and explain one formula (75s).
4. Save the comparison; return to the Dashboard and reopen it (30s).
5. Trigger a not-found search and mention the cached-fallback behavior (20s).
6. Close with the trade-offs slide (30s).

## 14. Trade-offs to state in the submission

- **Signal Scores are heuristics.** Chosen for explainability over statistical rigor.
- **Primary language only.** Avoids one extra API call per repo; labeled in the UI.
- **First 100 repos.** Keeps requests predictable under rate limits; labeled when truncated.
- **Postgres cache instead of Redis.** One less moving part for a 48-hour build.
- **Session auth instead of JWT.** Simpler, safer cookies, easy logout.
- **No commit analytics.** Real commit data needs per-repo calls and would not meet the quality bar in the time given.
