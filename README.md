# TopicPulse

TopicPulse retrieves up to 100 of the latest accessible X (Twitter) posts about a topic,
extracts their text, scores how closely each post relates to the topic, and generates a
grounded, source-linked report — with persistent history, saved report versions, and a
full audit trail. Full requirements: [`topicpulse-application-prompt.md`](./topicpulse-application-prompt.md).

Live credentials aren't required to try it — **Demo mode** exercises the entire product
with clearly-labeled synthetic sample posts.

## Features

### Post collection & extraction
- Retrieves up to 100 recent matching posts, ordered by posting time, deduplicated by post ID.
- Filters: language, date range, replies, reposts (reposts and replies excluded by default).
- Shows the effective query, provider, retrieval time, coverage window, and actual retrieved count — never a fabricated one.
- Preserves original post text, author, timestamp, URL, language, and available engagement metrics; marks truncated or missing fields explicitly.
- **Similar Content %** — a near-duplicate–detection signal (normalized-text 3-word-shingle Jaccard similarity) surfaced per run, with the cluster count and member posts inspectable. It's a heuristic authenticity-*adjacent* signal, not proof of inauthentic or coordinated activity.

### Grounded report
- Executive summary, main themes (with post counts), key takeaways, areas of disagreement, questions people are asking, representative posts, and collection limitations — generated only from collected content.
- Every citation is validated against the actual collected post set; nothing is fabricated.
- **Topic Match** scoring, 0–100 per post, with a short explanation, plus two distinct aggregate metrics: **Average Topic Match** and **Relevant Posts %** (share scoring ≥70). Scores are AI-estimated when an AI provider is configured and tested, or an honestly-labeled heuristic fallback otherwise.

### Views & exports
- Tabs: **Overview**, **Themes**, **Posts**, **All extracted text**, **Audit log**.
- Search within results, sort by newest or engagement, filter by minimum relevance (without altering the saved report), one-click copy.
- Overview's **Representative posts** section shows the top 10/20/30/40/50 posts (your choice) ordered by Topic Match score, descending.
- Export to TXT, Markdown, CSV, JSON, and **PDF** — CSV is hardened against spreadsheet formula injection; the PDF export mirrors the on-screen report (summary, takeaways, questions, the same representative-posts count you're currently viewing, and limitations).

### History, versions & audit
- Every run (completed, partial, failed, or canceled) is persisted automatically.
- **History** page: search, filter, favorite, rename, reopen, export, delete (private to your account).
- **Run again** creates a new linked run, preserving the original; a side-by-side compare view shows coverage, counts, Topic Match, and Similar Content across runs.
- A chronological, append-only **Audit log** per run (submission, retrieval, dedup, scoring, report generation, reruns, exports, errors) — enforced append-only at the database layer, not just the UI.

### Settings
- **X (Twitter) Connection**: bearer-token auth, independent **Test X connection** (auth + a minimal real search request, with quota/rate-limit info when exposed).
- **AI Configuration**: OpenAI, **Ollama Cloud** (preferred default), DeepSeek, and Google Gemini via server-side adapters. Masked API key display, model discovery ("Refresh models"), advanced endpoint override (SSRF-guarded), and an independent **Test AI connection** that runs one small, harmless inference request.
- The two panels are fully independent — a failed test in one never overwrites the other's status. Live analysis only turns on once both are saved *and* successfully tested against their current settings.
- All credentials are encrypted at rest (AES-256-GCM) and never echoed back to the browser.

### Interface
- Premium, responsive, keyboard-accessible UI in shades of blue (light/dark/system), with visible focus states.
- Animated, honest progress stages while a run is in flight (no fabricated completion percentages).

## Architecture

- **Stack**: Next.js (App Router) + TypeScript, Tailwind CSS v4, Prisma ORM over SQLite, custom JWT-cookie auth.
- **Provider adapters** (`src/lib/providers/`): a swappable `XProvider` interface (`demo`, `x_api_v2`) and `AIProvider` interface (`ollama_cloud`, `openai`, `deepseek`, `gemini`), so a new data/AI provider is a new adapter, not a rewrite.
- **Pipeline** (`src/lib/jobs/runSearch.ts`): an in-process background job per run — fetch → extract → deduplicate/similarity → score → group → generate report → save — with DB-persisted, pollable status and idempotent claiming (a duplicate trigger on the same run is a no-op). Stuck runs are recovered (marked failed) on server startup (`src/instrumentation.ts`).
- **Data model** (`prisma/schema.prisma`): `User`, `Search`, `SearchRun`, `CollectedPost`, `DuplicateCluster`, `RelevanceScore`, `ReportVersion`, `AuditEvent`, `XConnectionSettings`, `AIConfiguration` — all scoped and access-checked per owner.
- **Security**: AES-256-GCM credential encryption (`src/lib/crypto.ts`), an SSRF guard on any configurable AI endpoint (`src/lib/ssrf.ts`), CSV formula-injection protection (`src/lib/csv.ts`), and a SQLite trigger that makes `AuditEvent` rows genuinely append-only at the database layer.

## Getting started (local development)

Requires Node.js 20+.

```bash
npm install
cp .env.example .env    # then edit JWT_SECRET / ENCRYPTION_KEY (see below)
npx prisma migrate deploy
npm run dev
```

Visit `http://localhost:3000`, sign up, and run a search — with no X/AI credentials
configured, it automatically runs in Demo mode.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite connection string, e.g. `file:./dev.db` (local) or `file:/data/topicpulse.db` (Docker volume) |
| `JWT_SECRET` | Signs session cookies. Generate with `openssl rand -base64 48` |
| `ENCRYPTION_KEY` | Encrypts saved X/AI credentials at rest. Generate with `openssl rand -base64 32` |
| `PORT` | Preferred port; `manage.sh` auto-picks the next free one if it's taken |

X and AI provider credentials are **not** environment variables — they're entered and
encrypted through the in-app **Settings** page at runtime.

### Commands

```bash
npm run dev      # start the dev server
npm run build    # production build (also type-checks)
npm run start    # run a production build
npm run lint      # ESLint
npm run test      # Vitest unit tests
```

To run a single test file: `npx vitest run src/lib/scoring.test.ts`.

## Docker deployment (primary, self-hosted)

Persists the SQLite database on a named Docker volume so history/reports survive
restarts and redeploys. Managed entirely through the interactive `manage.sh` script —
no raw `docker` commands required.

```bash
./manage.sh deploy     # first run: bootstraps .env, builds, migrates, starts
./manage.sh             # or run with no arguments for an interactive menu
```

| Command | What it does |
| --- | --- |
| `deploy` | First-time provisioning: build, start, migrate |
| `start` | Start (builds images only if missing) |
| `stop` | Stop without removing data |
| `restart` | Stop then start |
| `redeploy` | Pull latest source, rebuild, migrate, restart |
| `pull` | Pull latest source (git) and base images |
| `logs` | Tail application logs |
| `status` | Container status + data volume check |
| `shell` | Interactive shell inside the app container |
| `backup` / `restore` | Snapshot / restore the database volume (`./backups/`) |
| `build` | Rebuild images without starting |
| `clean` | Remove stopped containers/dangling images — never touches the data volume |

The host port is dynamic: set `PORT` in `.env` for a preferred default; if it's taken,
`manage.sh` auto-detects the next free port and prints the actual URL after every
`start`/`restart`/`redeploy`.

## Vercel deployment (secondary)

Live demo: **https://topicpulse.vercel.app** — backed by a real Postgres database
([Neon](https://neon.tech), provisioned via the Vercel Marketplace), not local SQLite.
An earlier revision of this deployment pointed `DATABASE_URL` at Vercel's ephemeral
`/tmp` filesystem; that was found to be unreliable enough to intermittently break login
itself (a request landing on a different serverless instance has its own empty `/tmp`
database) and was replaced with Neon. See `TEST_RESULTS.md` sections D and E for the
full before/after comparison.

- `prisma/postgres/schema.prisma` is a Postgres-flavored twin of the canonical SQLite
  schema at `prisma/schema.prisma` (used by local dev and the Docker deployment), with
  its own migrations under `prisma/postgres/migrations/` — including a Postgres
  (plpgsql) version of the append-only `AuditEvent` trigger. Keep both schemas in sync
  when the data model changes.
- `vercel.json`'s `buildCommand` generates the Postgres Prisma client and runs
  `prisma migrate deploy` against the Postgres schema before `next build`, so new
  migrations apply automatically on every deploy.
- Background run processing uses Next.js's `after()` API rather than a bare
  fire-and-forget promise, since Vercel can otherwise freeze a function immediately
  after it responds — this mattered even with a shared database.
- `DATABASE_URL` (and related `PG*`/`POSTGRES_*` vars) are injected automatically by the
  Neon integration; `JWT_SECRET` and `ENCRYPTION_KEY` are set separately via
  `vercel env add`.

The Docker deployment above remains the primary, self-hosted path with SQLite.

## User guide

1. **Sign up / sign in** — history and settings are private to your account.
2. **Run a search** — enter a topic, phrase, hashtag, or query on the home page (try one
   of the example chips), optionally expand **Search filters** (language, date range,
   include replies/reposts), then **Analyze latest posts**.
3. **Watch it run** — an animated progress stepper shows the real pipeline stage
   (fetching → extracting → scoring → grouping → generating → saving) with honest,
   non-fabricated status messages.
4. **Read the results** — once complete, the header shows retrieved count, coverage
   window, Average Topic Match, Relevant Posts %, and Similar Content %. Switch between
   **Overview** (the narrative report), **Themes** (expandable groups), **Posts**
   (search/sort/filter by relevance), **All extracted text** (every collected post,
   numbered, newest first), and **Audit log**.
5. **Export** — TXT, Markdown, CSV, or JSON from the toolbar above the tabs.
6. **History** — revisit, search, favorite, rename, or delete past searches. Open
   **Runs & compare** on any search to see every run and compare two side-by-side.
7. **Run again** — from a completed run, creates a new linked run without losing the
   original; compare them from the History page.
8. **Configure Settings** for live data:
   - **X (Twitter) Connection**: choose the provider, paste a bearer token, **Save
     connection**, then **Test X connection** (checks auth *and* real search access —
     a passed test is not a guarantee of retrieving 100 posts every time).
   - **AI Configuration**: **Ollama Cloud** is selected by default. Enter an API key,
     pick a model (or **Refresh models** to pull the live list), **Save configuration**,
     then **Test AI connection** (one small, harmless inference call — your search
     history is never sent).
   - Live analysis turns on only once both panels show **Tested — ready**. Either can
     fail independently without affecting the other's status.
   - **Appearance**: light/dark/system, also available as a quick toggle in the header.

## Testing

`npm run test` runs the Vitest suite (pagination/dedup/ordering, relevance-score math
including the zero/unscorable edge cases, citation integrity, CSV formula-injection
escaping, near-duplicate clustering, secret encryption, and the SSRF guard). See
[`TEST_RESULTS.md`](./TEST_RESULTS.md) for the full recorded results, including manual
end-to-end API and Docker-deployment verification.

## Known limitations

- Demo mode's fallback scorer/report generator are deterministic heuristics, clearly
  labeled as such — configure and test an AI provider for meaning-based scoring and a
  narrative report.
- The in-process background pipeline suits a single-container deployment; a
  multi-instance deployment would need an external job queue instead of the in-memory
  cancellation/idempotency registry used here.
- SQLite on Vercel's serverless filesystem is not durable — use the Docker deployment,
  or point `DATABASE_URL` at a hosted database, for real persistence there.

## Author & Disclaimer

**Author / maintainer:** Lalit Nayyar
**Email:** lalitnayyar@gmail.com
**Phone:** +91 95953 53336 · +971 50 832 0336

This software is provided "as is," without warranty of any kind, express or implied,
including but not limited to warranties of merchantability, fitness for a particular
purpose, and non-infringement. The author accepts no liability for any damages or
losses arising from the use of this project.

Using this project to collect or analyze real X (Twitter) data requires the operator's
own compliance with the X Developer Agreement and Policy and the applicable API
license terms, and with the terms of service of any configured AI provider (OpenAI,
Ollama Cloud, DeepSeek, Google Gemini). Demo mode uses clearly labeled synthetic
sample data only and does not represent real X content or real user activity.
