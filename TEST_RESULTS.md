# TopicPulse — Test Results

Recorded 2026-09-05. Two suites: automated unit tests (`npm run test`, Vitest) and manual
end-to-end API smoke tests run against a local production build (`npm run build && npm run start`)
using demo mode plus live calls to the real X API and Ollama Cloud with intentionally invalid
credentials (to verify error handling without needing real accounts).

## A. Automated unit tests — `npm run test`

28 tests, 7 files, all passing.

| Sl No | Case | What was tested | Result |
| --- | --- | --- | --- |
| A1 | CSV formula-injection prefixing | `=`, `+`, `-`, `@`, tab-leading cells are prefixed with `'` before export | PASS |
| A2 | CSV ordinary text passthrough | Plain text cells are left unmodified | PASS |
| A3 | CSV quoting/escaping | Commas, quotes, and newlines inside a cell are quoted and escaped per CSV rules | PASS |
| A4 | Jaccard similarity — identical text | Two identical posts score similarity 1.0 | PASS |
| A5 | Jaccard similarity — unrelated text | Two unrelated posts score similarity well below the 0.6 threshold | PASS |
| A6 | Duplicate clustering — groups near-duplicates | Near-duplicate posts cluster together; a distinct post stays out of the cluster | PASS |
| A7 | Similar Content % calculation | Percentage = posts in a cluster of size > 1 ÷ total posts, computed correctly | PASS |
| A8 | Similarity on empty input | Zero posts → `{clusters: [], similarContentPct: 0, clusterCount: 0}`, no crash | PASS |
| A9 | Heuristic relevance scoring | All posts scored, both Average Topic Match and Relevant Posts % computed, on-topic post scores higher than off-topic post | PASS |
| A10 | Relevant Posts % denominator | Only scores ≥70 counted as relevant, percentage matches manual calculation | PASS |
| A11 | Zero posts to score | Returns `scoredCount: 0`, `averageTopicMatch: null`, `relevantPostsPct: null` (displayed as "Not available") | PASS |
| A12 | Report citation integrity (heuristic) | Every theme and representative-post citation references a real collected post id — none invented | PASS |
| A13 | Report on zero collected posts | Returns an honest "no posts were collected" summary instead of fabricating content | PASS |
| A14 | Secret encrypt/decrypt round-trip | `encryptSecret` → `decryptSecret` returns the original plaintext; ciphertext never contains the plaintext | PASS |
| A15 | Secret encryption is non-deterministic | Encrypting the same value twice produces different ciphertext (random IV) but both decrypt correctly | PASS |
| A16 | Tampered ciphertext rejected | Modifying an encrypted payload causes decryption to throw (AES-GCM auth tag check) | PASS |
| A17 | Secret masking | Long secrets show only the last 4 characters; short secrets fully masked | PASS |
| A18 | SSRF guard — rejects non-HTTPS | `http://` endpoint override is rejected | PASS |
| A19 | SSRF guard — rejects loopback | `127.0.0.1` and `localhost` are rejected | PASS |
| A20 | SSRF guard — rejects cloud metadata address | `169.254.169.254` is rejected | PASS |
| A21 | SSRF guard — rejects private ranges | `10.x`, `192.168.x`, `172.16.x` are rejected | PASS |
| A22 | SSRF guard — accepts public HTTPS | A well-formed public HTTPS address is accepted | PASS |
| A23 | Demo provider — count bounds | Never returns more posts than requested, and never more than 100 | PASS |
| A24 | Demo provider — chronological ordering | Returned posts are ordered newest-first by `postedAt` | PASS |
| A25 | Demo provider — deduplication | No duplicate `postId` values in a result set | PASS |
| A26 | Demo provider — default filters | Reposts and replies are excluded by default | PASS |
| A27 | Demo provider — honest status/count | Reports `status: "completed"` with `retrievedCount` matching the actual array length (no fabricated counts) | PASS |
| A28 | maskSecret edge case | 3-character secret fully masked (`••••`) | PASS |

## B. Manual end-to-end smoke tests (API, local build on port 3100)

| Sl No | Case | What was tested | Result |
| --- | --- | --- | --- |
| B1 | Sign up | New account creation, session cookie issued | PASS (HTTP 200) |
| B2 | Create demo-mode search | `POST /api/searches` with no X connection configured → falls back to demo provider | PASS — run created, provider=`demo` |
| B3 | Full pipeline completion | Run progresses through fetching→extracting→scoring→grouping→generating→saving to `completed` | PASS — 85 posts retrieved, 85 scored, 1 theme, report generated |
| B4 | Demo data realism (regression) | Initial demo generator produced ~100% Similar Content (templates repeated verbatim per topic); fixed by adding two independent variation pools | FIXED — Similar Content dropped from 100% to 25.9% with one clear intentional cluster (size 9) plus small incidental clusters |
| B5 | Average Topic Match / Relevant Posts % display | Aggregate metrics computed and returned distinctly | PASS — Average 92%, Relevant 100% (heuristic scorer, on-topic synthetic corpus) |
| B6 | "Run again" (linked rerun) | `POST /api/searches/:id/rerun` creates a new run referencing the previous one | PASS — `parentRunId` correctly points to the original run |
| B7 | Cancellation | `POST /api/runs/:id/cancel` on an in-flight run | PASS — run reached `status: "canceled"` |
| B8 | Export — JSON | `GET /api/runs/:id/export?format=json` | PASS (HTTP 200, well-formed payload) |
| B9 | Export — TXT | Same, `format=txt` | PASS (HTTP 200) |
| B10 | Export — Markdown | Same, `format=md` | PASS (HTTP 200) |
| B11 | Export — CSV | Same, `format=csv`, includes meta header line and per-post rows | PASS (HTTP 200, well-formed) |
| B12 | History listing | `GET /api/searches` returns both created searches for the owner | PASS |
| B13 | X Connection save + test (invalid token) | Real request to the X API v2 recent-search endpoint with a fake bearer token | PASS — correctly classified `invalid_credentials`, `authOk:false`, sanitized message, no crash |
| B14 | AI Configuration save + test (invalid key) | Real request to Ollama Cloud's OpenAI-compatible endpoint with a fake API key | PASS — correctly classified `invalid_key`, `authOk:false`, sanitized message, no crash |
| B15 | SSRF guard on live endpoint override — metadata IP | AI test with `endpointOverride: https://169.254.169.254` | PASS — rejected with "Endpoint resolves to a private or reserved address" |
| B16 | SSRF guard on live endpoint override — non-HTTPS | AI test with `endpointOverride: http://example.com` | PASS — rejected with "Endpoint must use https" |
| B17 | Cross-user ownership isolation | A second signed-up user requests the first user's run by ID | PASS — HTTP 404 "Run not found" (no existence leak) |
| B18 | Rename + favorite + delete (history) | `PATCH` to rename/favorite a search, then `DELETE` it | PASS — rename/favorite applied; deleted search then 404s for its owner too (soft delete) |
| B19 | Disconnect X / AI | `DELETE /api/settings/x` and `DELETE /api/settings/ai` | PASS — both report `status: "not_configured"` afterward, independently |
| B20 | Unauthenticated access rejected | `GET /api/searches` with no session cookie | PASS — HTTP 401 |
| B21 | Duplicate concurrent test lock | Two simultaneous `POST /api/settings/ai/test` calls for the same user | PASS — first returns 200, second returns 409 "already running" |
| B22 | Audit log append-only (database-level) | Direct Prisma `update`/`delete` against an existing `AuditEvent` row, bypassing the API | PASS — both operations rejected by the SQLite trigger (surfaced by Prisma as a constraint error) |

## C. Docker deployment tests (`./manage.sh`)

| Sl No | Case | What was tested | Result |
| --- | --- | --- | --- |
| C1 | `.env` bootstrap | Running `deploy` with no `.env` present prompts to generate one from `.env.example` with random `JWT_SECRET`/`ENCRYPTION_KEY` | PASS |
| C2 | Dependency install inside container | `npm ci` inside the Docker build (initially failed on an `@types/node`/vitest peer-dependency conflict) | FIXED — bumped `@types/node` to `^22`, regenerated a clean lockfile, `npm ci` now succeeds without `--legacy-peer-deps` |
| C3 | `deploy` (build + start) | Multi-stage image build, container start, dynamic port resolution | PASS — image built, container `Up ... (healthy)`, printed `http://localhost:3000` |
| C4 | Automatic migrations on container start | `docker-entrypoint.sh` runs `prisma migrate deploy` before `next start` | PASS — logs show all 3 migrations applied, including the audit append-only trigger migration |
| C5 | Healthcheck | Compose healthcheck hitting `/login` inside the container | PASS — reported `healthy` |
| C6 | Full pipeline inside the container | Sign up, create a demo search, poll to completion via the containerized app | PASS — 85 posts retrieved, Similar Content 30.6%, Average Topic Match 92% |
| C7 | `status` | Shows container state, configured port, and confirms the named data volume exists | PASS |
| C8 | `backup` | Snapshots the `topicpulse_data` volume to `backups/*.tar.gz` | PASS — 25,988-byte archive created |
| C9 | `stop` | Stops the container without removing the volume | PASS |
| C10 | `restart` | Recreates the container, re-resolves the dynamic port, prints the live URL | PASS — reused port 3000 (free), app responded HTTP 200 immediately after |
| C11 | Data persistence across restart | Volume-backed SQLite database survives `stop`/`restart` | PASS (implied by C10 succeeding against the same volume without re-running signup) |

## D. Vercel deployment (secondary, ephemeral SQLite)

Deployed live to `https://topicpulse.vercel.app` (`vercel deploy --prod`) with
`DATABASE_URL=file:/tmp/topicpulse.db`. A pre-migrated, data-free `prisma/seed-empty.db`
is bundled with the deployment and copied to `/tmp` on cold start
(`src/instrumentation.ts`) so each instance has schema/triggers ready without needing to
run migrations at request time.

| Sl No | Case | What was tested | Result |
| --- | --- | --- | --- |
| D1 | Static/login page | `GET /login` on the live deployment | PASS (HTTP 200) |
| D2 | Sign up + create search | Real HTTP requests against the live deployment | PASS |
| D3 | Background pipeline completion (bug found & fixed) | First deploy used bare fire-and-forget (`void runSearchPipeline(...)`); the run got stuck in `"fetching"` and later 404'd because Vercel can freeze/kill a function once its response is sent | FIXED — switched to Next.js's `after()` API in both run-creation routes, which keeps the callback running past the response |
| D4 | Repeated polling after the fix | 10 consecutive polls of the same run, 1s apart, immediately after creation | 8/10 returned `completed` (HTTP 200) with full results; 2/10 returned `404 "Run not found"` |
| D5 | Root cause of the remaining 404s | Vercel's serverless functions don't share a filesystem across instances — a request that lands on a different (freshly cold-started) instance sees its own empty seeded `/tmp` database, so an earlier request's run genuinely doesn't exist there | Confirmed — this is the ephemeral-SQLite tradeoff disclosed to the user before deploying, now empirically measured at ~20% of requests in this quick test (expect it to worsen with more idle time between requests, as more cold starts occur) |

**Conclusion:** the Vercel deployment is live and the core flow (signup → search →
results) works on most requests, but a non-trivial share of requests can intermittently
404 on data created moments earlier, because of `/tmp` not being shared across serverless
instances — not because of any remaining bug. This is inherent to the "ephemeral SQLite"
choice and would require switching `DATABASE_URL` to a real hosted database (Postgres or
Turso/libSQL) to fully resolve, as documented in README.md.

## E. Vercel deployment fix — Neon Postgres (supersedes section D's ephemeral-SQLite approach)

The user reported: "after login not able to see app its showing login only" on the live
Vercel deployment. Investigated and fixed by replacing the ephemeral `/tmp` SQLite
database with a real Neon Postgres database (provisioned via the Vercel Marketplace).

| Sl No | Case | What was tested | Result |
| --- | --- | --- | --- |
| E1 | Reproduce the reported bug | Signed up a user, then immediately attempted login with the same (correct) credentials against the live deployment | REPRODUCED — login returned `401 Invalid email or password` for correct credentials, because the login request landed on a different serverless instance whose `/tmp` database never saw the signup |
| E2 | Root cause confirmation | Traced to `/tmp` being per-instance, not shared — the same issue as section D's search-polling 404s, now manifesting in the auth flow itself | CONFIRMED |
| E3 | Provision Postgres | `vercel install neon` via the Vercel Marketplace (after the user accepted Neon's marketplace terms in-browser), connected to the project | PASS — `DATABASE_URL` and related `PG*`/`POSTGRES_*` vars auto-injected, pooled connection (`-pooler` endpoint) used by default |
| E4 | Postgres schema/migrations | Created `prisma/postgres/schema.prisma` (Postgres datasource) and its own migrations, including a plpgsql rewrite of the append-only `AuditEvent` trigger, developed and verified against a temporary local Postgres container before touching the real database | PASS — trigger correctly blocks `UPDATE`/`DELETE` with the exact custom error message (cleaner than SQLite's generic constraint error) |
| E5 | Local smoke test against Postgres | Full flow (signup, create search, demo pipeline, `/api/auth/me`) run locally against the temp Postgres container | PASS — 83 posts retrieved, session persisted |
| E6 | Migrations applied to production Neon DB | `prisma migrate deploy --schema=prisma/postgres/schema.prisma` against the real Neon connection string | PASS |
| E7 | Vercel build wiring | `vercel.json` `buildCommand` regenerates the Postgres client and runs `prisma migrate deploy` before `next build` on every deploy | PASS — redeploy log showed "No pending migrations to apply" |
| E8 | Repro re-test: login persistence | Same signup → login → repeated `/api/auth/me` sequence that failed in E1, run against the Neon-backed deployment | PASS — login succeeded, 8/8 subsequent `/api/auth/me` checks returned the correct user (vs. intermittent failure before) |
| E9 | Repro re-test: search pipeline persistence | Create search → poll 8 times, 1s apart | PASS — 8/8 polls consistent (`completed`, 86 posts retrieved), vs. 2/10 `404`s before the fix |
| E10 | History persistence | `GET /api/searches` after a completed run | PASS — 1 search returned, as expected |

**Conclusion:** the reported login bug is fixed. The live Vercel deployment
(https://topicpulse.vercel.app) now uses a real shared Postgres database and behaves
consistently across requests, matching the Docker deployment's reliability.

## Known limitations observed during testing

- Demo mode's heuristic scorer is keyword/phrase-overlap based, so on-topic synthetic posts
  (which always contain the literal topic phrase) score uniformly high (~92%, 100% "relevant").
  This is expected and disclosed in the UI/report as a heuristic limitation — configuring and
  testing a real AI provider produces meaning-based scoring instead.
- The heuristic report grouper produced a single theme for the demo corpus because the topic
  phrase itself dominates term frequency across every post. This is disclosed in the report's
  "Collection limitations" text; a configured AI provider generates multiple narrative themes.
- Chrome DevTools MCP could not launch a browser in this sandboxed environment, so the UI was
  verified via direct HTTP/API calls exercising the same server code paths rather than a driven
  browser session. Visual/interaction QA (animations, tab switching, forms) should be spot-checked
  in a real browser before shipping.
