# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

**TopicPulse** — a Next.js (App Router) + TypeScript app that retrieves recent X (Twitter)
posts about a topic, scores topic relevance, detects near-duplicate content, and generates
a grounded, source-linked report. Full requirements: `topicpulse-application-prompt.md` —
read it in full before implementing a feature; every clause is a binding requirement, not
a suggestion, and the file is the source of truth over this summary.

## Commands

```bash
npm run dev                              # dev server
npm run build                            # production build (also type-checks)
npm run start                            # run a production build
npm run lint                             # ESLint
npm run test                             # Vitest — all tests
npx vitest run src/lib/scoring.test.ts   # a single test file
npx prisma migrate dev --name <name>     # create + apply a new migration (local dev)
npx prisma migrate deploy                # apply migrations (production/Docker)
npx prisma studio                        # inspect the local SQLite DB
```

Docker (primary deployment target — see README.md for the full command table):
`./manage.sh deploy` (first run) or `./manage.sh` for an interactive menu.

## Architecture

- **Stack**: Next.js App Router + TypeScript, Tailwind v4, Prisma ORM over SQLite, a
  small hand-rolled JWT-cookie auth (`src/lib/auth.ts` — no NextAuth).
- **Provider adapters** (`src/lib/providers/`): `XProvider` interface with `demo` and
  `x_api_v2` implementations; `AIProvider` interface with `ollama_cloud` (preferred
  default), `openai`, `deepseek`, `gemini` implementations (the three OpenAI-compatible
  ones share `openaiCompatible.ts`; Gemini has its own request shape). Add a new
  provider by implementing the interface and registering it in that directory's
  `index.ts` — nothing else should need to change.
- **Pipeline orchestrator** (`src/lib/jobs/runSearch.ts`): the actual "background job."
  Runs in-process (fire-and-forget from the API route that creates a run), advances
  `SearchRun.status` through `pending → fetching → extracting → scoring → grouping →
  generating → saving → {completed|partial|failed|canceled}`, recording an `AuditEvent`
  at each transition. Idempotent claiming via an atomic `status: "pending" → "fetching"`
  update (a duplicate trigger on the same run id is a no-op). Cancellation is a real
  `AbortController` per run tracked in `src/lib/jobs/registry.ts` (in-memory — single
  container only). `src/instrumentation.ts` recovers runs stuck non-terminal past a
  timeout on server startup.
- **Scoring & report generation** (`src/lib/scoring.ts`, `src/lib/report.ts`): each
  either calls the configured, tested AI provider (structured-JSON prompts, Zod-parsed,
  with per-post/per-run fallback to "unscorable"/heuristic on parse failure) or falls
  back to a disclosed deterministic heuristic when no AI is configured — never silently
  presented as AI-generated. Report citations are validated against the run's actual
  `CollectedPost` ids before saving; anything else is dropped and logged in
  `limitations`.
- **Near-duplicate / Similar Content %** (`src/lib/similarity.ts`): normalized 3-word
  shingle Jaccard similarity, union-find clustering, threshold `0.6`. This is a
  heuristic signal, not proof of inauthentic/coordinated activity — keep that framing
  wherever it's surfaced.
- **Data model** (`prisma/schema.prisma`): `User`, `Search` → `SearchRun` (1:many,
  `parentRunId` links "run again" reruns) → `CollectedPost`/`DuplicateCluster`/
  `RelevanceScore`/`ReportVersion` (1:many each), plus per-user `AuditEvent`,
  `XConnectionSettings`, `AIConfiguration`. `AuditEvent` is append-only, enforced by a
  SQLite `BEFORE UPDATE`/`BEFORE DELETE` trigger added in the
  `20260905144124_audit_append_only` migration — not just an application-level
  convention. Every query is scoped by owner via `src/lib/ownership.ts`
  (`getOwnedSearch`/`getOwnedRun`), which 404s rather than 403s on a cross-user
  access attempt so existence isn't leaked.
- **Security helpers**: `src/lib/crypto.ts` (AES-256-GCM for saved X/AI credentials,
  key derived from `ENCRYPTION_KEY` via scrypt), `src/lib/ssrf.ts` (blocks non-https,
  loopback/private/link-local/cloud-metadata addresses on the AI endpoint override —
  call this before ever fetching a user-supplied endpoint), `src/lib/csv.ts` (formula-
  injection-safe CSV export), `src/lib/testLock.ts` (prevents duplicate concurrent
  connection tests).
- **API routes** (`src/app/api/`): thin — auth check (`requireUserId`), Zod-validate,
  ownership check, delegate to `lib/`, `recordAuditEvent`. Keep business logic in
  `src/lib/`, not in route handlers.

## Non-obvious constraints worth knowing before touching related code

- **Topic Match** has two distinct, separately-displayed aggregates — never collapse
  them: *Average Topic Match* (mean of scored posts) and *Relevant Posts %* (share
  scoring ≥70). Both exclude unscorable posts from their denominator.
- Filtering the Posts tab by minimum relevance must never mutate the saved report or
  the underlying collected set — it's a client-side view filter only.
- `AuditEvent` metadata is sanitized before write (`src/lib/audit.ts` strips any key
  matching `token|key|secret|password|credential|authorization`) — don't bypass this
  by writing audit rows directly with `prisma.auditEvent.create`.
- Demo mode's synthetic posts deliberately include some randomized wording variety
  (`src/lib/providers/x/demo.ts`) — earlier revisions reused only ~10 fixed templates
  per topic, which made Similar Content % read as ~100% (looked like a bug). If you
  touch the templates/variation pools, sanity-check the resulting Similar Content %
  stays in a believable range (see `TEST_RESULTS.md`, case B4).
- Prisma is pinned to the 6.x line intentionally — 7.x/8.x moved to a config-file-driven,
  cloud-platform-oriented CLI incompatible with the plain `datasource { url = env(...) }`
  + `prisma migrate dev` workflow this repo relies on for local/Docker SQLite. Don't
  upgrade without re-checking that migration flow still exists.

## Author & disclaimer

Maintained by Lalit Nayyar (lalitnayyar@gmail.com, +91 95953 53336, +971 50 832 0336).
See the "Author & Disclaimer" section in `README.md` for the full liability/compliance
disclaimer — keep it in sync if this file's guidance materially changes.
