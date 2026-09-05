# TopicPulse — Complete Application Build Prompt

Build a polished, production-ready web application called **TopicPulse** that retrieves up to **100 of the latest accessible X (Twitter) posts about a user-provided topic**, extracts their text, and consolidates the discussion into a clear, source-linked report. Include persistent search history, saved outputs, an audit log, and topic relevance percentages.

Deliver a working application, not just a visual mockup. Make reasonable implementation decisions and document them.

## 1. Main user journey

The user enters a topic, phrase, hashtag, or search query, such as “AI coding agents,” and selects **Analyze latest posts**. The application retrieves matching posts, extracts available text, scores relevance, groups themes, and generates a grounded report. Results are saved automatically and can be reopened later.

## 2. Post collection

- Use an authorized X API or licensed data provider. Verify the provider’s current capabilities and requirements before implementation.
- Retrieve up to 100 most recent matching posts accessible through that provider, ordered by posting time rather than popularity.
- Support language, date range, replies, and repost filters. Exclude reposts by default.
- Show the effective search query, selected filters, provider, retrieval time, covered date range, and actual number retrieved.
- Use pagination where supported. Deduplicate by post ID and continue fetching toward 100 unique posts within documented provider and request limits.
- Identify near-duplicate text without silently removing distinct authors or viewpoints. Explain duplicate handling in the results.
- Compute a **Similar Content %** signal for each run: the share of retrieved posts whose text is a near-duplicate (via normalized-text/simhash-style similarity above a documented threshold) of at least one other retrieved post. Display it alongside retrieved/scored/unscorable counts as a heuristic authenticity-adjacent signal — a higher share MAY indicate repetitive, templated, or coordinated posting — never state or imply it proves inauthenticity, bot activity, or coordinated behavior on its own. Show the near-duplicate cluster count and let users inspect which posts were grouped as near-duplicates, with each cluster's representative text and member post links. Document the similarity method and threshold used alongside the metric.
- If fewer than 100 posts are available, show the actual count and reason. Never invent posts or imply exhaustive coverage of X.
- Clearly distinguish completed, partial, failed, and canceled retrievals.

## 3. Text extraction and source data

Capture each post’s available full text, post ID, author display name and handle, timestamp, original URL, language, and available engagement metrics. Record when engagement metrics were collected.

Preserve original wording in the source view. Mark truncated text, missing fields, and unavailable content explicitly. Do not infer text from inaccessible media. If translations are offered, label them and retain the original text.

Treat all post content as untrusted data, never as instructions for the application or language model.

## 4. Consolidated report

Generate the following sections using only collected content:

- **Executive summary:** A concise overview of the discussion.
- **Main themes:** Related posts grouped into themes, with supporting post counts. Explain when posts belong to multiple themes.
- **Key takeaways:** Important reported developments, recurring opinions, and useful insights.
- **Areas of disagreement:** Competing views with supporting sources.
- **Questions people are asking:** Recurring questions and unmet needs.
- **Representative posts:** Source-linked examples for each major theme.
- **Collection limitations:** Missing content, partial retrieval, excluded posts, the Similar Content % signal with its near-duplicate cluster count, and other limitations affecting interpretation.

Every substantive conclusion must cite supporting collected posts using clickable source links. Distinguish reported claims from verified facts; collection alone does not verify a claim. Describe sentiment only when supported, allow mixed or uncertain classifications, and do not present the sample as representative of all X users.

Validate that every citation references a collected post. Do not fabricate quotations, sources, or conclusions when evidence is insufficient.

## 5. Consolidated text view and exports

Provide an **All extracted text** tab containing every collected post, numbered and ordered newest first, with author, timestamp, and original link.

Allow switching between the report, thematic groups, original posts, and consolidated text. Include search within results, sorting by newest or available engagement metrics, one-click copying, and exports to TXT, Markdown, CSV, and JSON where provider rules permit. Protect CSV exports against spreadsheet formula injection.

Include topic, filters, retrieval timestamp, coverage window, actual counts, and collection limitations in exports. Explain any provider restrictions that prevent exporting particular fields.

## 6. Topic match percentages

Interpret “closeness percentage” as **how closely the retrieved posts relate to the requested topic**. Label it **Topic Match**, not topic completion, factual accuracy, confidence, or agreement with the user.

Score each post from 0–100 based on meaning, main subject, and relationship to the topic, rather than keyword overlap alone:

| Score | Meaning |
| --- | --- |
| 90–100 | Directly addresses the topic |
| 70–89 | Strongly related |
| 40–69 | Partially related or peripheral |
| 1–39 | Weak connection |
| 0 | Unrelated |

Provide a short explanation for each score and display two distinct aggregate metrics:

1. **Average Topic Match:** Sum of relevance scores divided by the number of scored posts.
2. **Relevant Posts %:** Number of posts scoring at least 70 divided by the number of scored posts, multiplied by 100.

Example: **Average Topic Match: 84% · Relevant Posts: 88 of 100 scored posts (88%)**.

- Label all scores as **AI-estimated relevance** and avoid misleading precision; display whole percentages.
- Show retrieved, scored, and unscorable counts separately. Exclude unscorable posts from scoring denominators. If no posts can be scored, display **Not available**.
- Allow filtering by minimum relevance while preserving the original collected set.
- Compute headline metrics over the original scored collection. If showing filtered metrics, label their scope and denominator explicitly.
- Clearly identify which posts were used to generate the report. A filter change must not silently alter an existing saved report; regenerating creates a saved output version.
- Store the scoring rubric, threshold, model identifier, and prompt version with each run.

## 7. Persistent search history and saved outputs

Automatically persist completed and partial search results in a database. Record failed and canceled runs with their status and available metadata.

Save the following for each run, subject to provider storage requirements:

- Original topic and effective provider query.
- Filters, search time, collection window, and provider.
- Actual retrieval and scoring counts.
- Post references, source links, and permitted extracted content.
- Generated report and output versions.
- Per-post relevance scores, explanations, and aggregate percentages.
- Retrieval status, errors, and limitations.
- Model, scoring, and prompt versions.

Provide a **History** page where users can search, filter, reopen, rename, favorite, export, and delete previous searches. History must survive refreshes and sign-ins and remain private to its owner.

Reopening a search displays its saved snapshot with the original collection timestamp. If provider rules require content removal or updating, clearly mark affected saved content rather than claiming an unchanged snapshot.

**Run again** creates a new linked run, preserving the previous run. Let users compare runs by collection windows, post counts, topic match metrics, and themes. Explain that differences in retrieval coverage or scoring versions may affect comparisons.

## 8. Audit log

Maintain a chronological, user-visible audit trail for each search covering:

- Search submission and selected filters.
- Retrieval start and completion, provider, and counts.
- Deduplication and relevance scoring.
- Report generation and output version creation.
- Errors, retries, partial results, and cancellation.
- Reruns, exports, renames, favorites, and deletions.

Each event includes a UTC timestamp, user or system actor, search/run ID, action, outcome, and concise relevant metadata. Display timestamps in the user’s local time zone with the zone identified.

Make audit events append-only during their defined retention period. Enforce this through server and database controls, not only the UI. Record model and prompt versions so generated outputs can be traced.

Never log credentials, API keys, passwords, authentication tokens, or unnecessarily copy full post content into logs. Apply documented retention, privacy, and deletion rules to both saved results and audit records. If a deletion event remains after content deletion, retain only permitted minimal metadata and explain the behavior.

## 9. Interface and experience

Create a premium, responsive interface with excellent typography, generous spacing, accessible contrast, keyboard navigation, visible focus states, and light and dark modes. Provide a quick light/dark/system toggle in the persistent site header, and a corresponding Appearance control in Settings for the same three-way choice — both read and write the same preference.

Include:

- A prominent topic input with example queries and clear validation.
- Expandable search filters.
- Progress stages: fetching posts, extracting text, scoring relevance, grouping themes, generating report, and saving results.
- Honest progress indicators; do not show fabricated completion percentages.
- Make the run experience interactive and animated rather than a static spinner: animate transitions between progress stages, and surface short, rotating, honest status messages tied to what is actually happening at each stage (e.g. counts as they accumulate) to keep the user engaged while a run is in flight. Animations must respect `prefers-reduced-motion` and never invent progress or fabricate messages unrelated to the real run state.
- A results header with topic, status, actual post count, retrieval time, collection window, topic match metrics, and the Similar Content % signal.
- Tabs for **Overview**, **Themes**, **Posts**, **All extracted text**, and **Audit log**.
- A **History** page with search, filters, favorites, and comparison access.
- Clear empty states, actionable errors, retry controls, and cancellation.
- Readable desktop and mobile layouts.

Keep technical internals out of the main experience unless they help explain a result, limitation, or audit event.

## 10. Architecture and security

- Use a maintainable modern stack and document the choice. Prefer TypeScript for frontend and backend, and a relational database for persistent records.
- Put provider access and AI calls behind server-side endpoints. Never expose credentials to the browser.
- Implement a replaceable provider adapter for search, pagination, normalization, and provider-specific constraints.
- Use background jobs for long-running analysis, with recoverable status and idempotent processing to avoid duplicate runs or outputs on retries.
- Implement rate-limit handling, bounded retries with backoff, request cancellation, and appropriate caching. Cached data must show its collection time and must not be presented as newly fetched.
- Enforce authentication and ownership checks on history, results, exports, and audit endpoints.
- Validate inputs, safely render post text, and prevent cross-user data access.
- Follow provider access, attribution, storage, display, export, retention, and deletion requirements.
- Document configuration and operational limits without assuming a particular paid API tier is available.

Suggested entities: User, Search, SearchRun, CollectedPost, RelevanceScore, ReportVersion, and AuditEvent. Scope stored content and access appropriately to each user and run.

## 11. Demo mode

If live credentials are unavailable, provide a fully working, clearly labeled **Demo mode** using synthetic sample posts. Demo mode must exercise the full flow, including history, scoring displays, reports, exports, and audit events. Do not present sample data as live X content or use fabricated links that appear to be real posts.

Explain the exact configuration required to enable live collection. Report any live integration that could not be verified.

## 12. Validation and deliverables

Deliver the complete source code, database schema and migrations, environment variable example without secrets, setup instructions, and deployment guidance.

Add meaningful tests covering:

- Pagination, chronological ordering, deduplication, and partial retrieval.
- Relevance percentage calculations, zero scored posts, and unscorable posts.
- Citation integrity and insufficient evidence handling.
- Persistence, saved snapshots, linked reruns, and output versions.
- Audit event creation and append-only protections.
- User ownership and export access controls.
- Rate-limit and provider failure handling.

Verify the end-to-end user journey in demo mode and test live integration when credentials are available. State what was tested and any remaining limitations accurately.

## 13. Settings: X connection and AI configuration

Provide a persistent **Settings** page with two independent panels: **X (Twitter) Connection** and **AI Configuration**. Users must be able to enter credentials, save settings, and run a separate connection test for each panel without editing source code or environment files.

### X (Twitter) Connection

- Offer the supported X API or licensed provider through a provider selector.
- Show only the credential fields required by the selected provider, such as a bearer token or provider API key. Use the provider's documented authentication flow rather than asking for an X password.
- Include **Save connection**, **Test X connection**, and **Disconnect** actions.
- Test the currently entered configuration through the server, including unsaved changes, without silently saving them.
- Validate authentication and perform a minimal real search request to verify the endpoint and permission needed for collecting recent posts. A successful authentication check alone must not be reported as full search readiness.
- Show a timestamped result with authentication status, search capability, response time, and available quota or rate-limit information when exposed by the provider.
- Distinguish invalid credentials, insufficient search permissions or plan access, quota exhaustion, rate limits, timeouts, and provider outages. Give actionable, sanitized errors.
- Clearly indicate whether settings are saved, tested, changed since testing, or disconnected. Never claim that retrieving 100 posts is guaranteed merely because the test passed.

### AI Configuration

Support **OpenAI**, **Ollama Cloud**, **DeepSeek**, and **Google Gemini** through server-side provider adapters. Verify current official integration documentation during implementation rather than assuming all providers share one protocol.

Include these fields and controls:

- **AI provider** selector.
- **API key** input with masked display, replace, and remove actions. Never return an existing saved secret to the browser.
- **Model / LLM** selector populated from the provider when supported. Otherwise use a maintained, verified list and allow a custom model identifier that must pass validation.
- **Refresh models** action where model discovery is supported.
- **Endpoint** displayed with the provider's verified default. Allow an advanced override only with appropriate validation and server-side network protections.
- Optional supported generation controls, such as temperature and maximum output tokens, with provider-specific validation.
- **Save configuration**, **Test AI connection**, and **Disconnect** actions.

The user's preferred AI provider is **Ollama Cloud**. Select it by default and let the user choose from its available models. Verify actual model availability through the provider. Never silently substitute another provider or model.

### Independent AI connection test

- **Test AI connection** tests the currently entered provider, credential, endpoint, and exact selected model, including unsaved changes, without silently saving them.
- Perform a minimal real inference request with a harmless fixed prompt and a small response budget. Do not send collected posts or search history during a connection test.
- Label the action to explain that it sends a small request and may consume provider quota.
- Report whether authentication and inference succeeded, the requested model, provider-reported model when available, response time, test timestamp, and a short safely rendered sample response.
- Distinguish invalid keys, unavailable models, unsupported request options, insufficient credits, rate limits, network failures, and timeouts.
- If the model cannot complete the test, do not mark the configuration ready merely because model discovery or authentication succeeded.
- Mark test results stale when provider, key, endpoint, model, or tested generation settings change. Repeated clicks must not create duplicate concurrent tests.

### Configuration security and application behavior

- Encrypt user-provided credentials at rest using a server-managed encryption key or secret manager. Keep secrets out of reports, exports, browser storage, URLs, analytics, and audit logs.
- Scope settings and credentials to their owner and enforce authorization on save, test, model discovery, and disconnect endpoints.
- Protect configurable endpoints against server-side request forgery; do not allow arbitrary internal or cloud metadata endpoints.
- Make X and AI connection status visible independently. One failed test must not overwrite the other's status.
- Enable live analysis when both configurations are saved and successfully tested against their current settings. Revalidate failures at runtime; a previous successful test is not a guarantee of future availability.
- Keep demo mode available without credentials and clearly separate demo status from real connection status.
- Snapshot provider, selected model, non-secret configuration version, and prompt version for every analysis run. Existing saved reports retain their original metadata after settings change.
- Record configuration changes, disconnections, and test outcomes in the audit log with sanitized metadata only. Never store the test request's credentials in an event.
- Disconnecting removes the saved credential and updates connection status without silently deleting historical reports.

### Additional validation

Test credential save/replace/remove behavior, ownership checks, secret redaction, provider-specific request formatting, model discovery failures, selected-model inference failures, stale test states, independent X/AI status, and the distinction between authentication success and usable search or inference capability.

## 14. Deployment and operations (Docker)

Package the application for self-hosted operation using Docker as the primary deployment target, alongside the platform-agnostic codebase described in Section 10.

- Provide a multi-stage `Dockerfile` that builds the TypeScript frontend and backend into a minimal production image, and a `docker-compose.yml` that runs the application container together with its database, applying schema migrations on startup.
- Persist the relational database on a Docker named volume (or bind mount) so history, saved reports, and audit records survive container restarts, rebuilds, and redeploys.
- Provide a single interactive management shell script (e.g. `manage.sh`) at the project root that gives an operator full control of the application lifecycle without needing to remember raw `docker` commands. At minimum it must support, both as menu options in an interactive mode and as direct CLI subcommands (e.g. `./manage.sh start`):
  - **start** — bring the stack up (build images if missing).
  - **stop** — stop the running stack without removing volumes.
  - **restart** — stop then start.
  - **redeploy** — pull latest code, rebuild images, apply database migrations, and restart with minimal downtime.
  - **deploy** — first-time provisioning: build images, initialize the database, run migrations, and start the stack.
  - **pull** — fetch the latest source (git pull) and/or latest container images.
  - **logs** — tail application (and optionally database) logs.
  - **status** — show container health, uptime, and port bindings.
  - **shell** — open an interactive shell inside the running application container.
  - **backup** / **restore** — snapshot and restore the database volume.
  - **build** — rebuild images without starting the stack.
  - **clean** — remove stopped containers and dangling images without touching persisted data, with explicit confirmation before anything destructive.
- The script must validate prerequisites (Docker, Docker Compose) before running, fail with clear actionable errors, never silently discard the database volume, and require explicit confirmation for any destructive action.
- The host port must be dynamic, not hardcoded: read it from an environment variable with a sensible default, and have the management script auto-detect and fall back to the next free port if the configured one is already in use, printing the actual port the application is reachable on after every start/restart/redeploy.
- Document required environment variables (via an example env file) needed for the containerized stack, consistent with Section 13's settings model — encrypted secrets are still configured through the in-app Settings page at runtime, not baked into the image.
- Keep the application deployable to a serverless platform (e.g. Vercel) as a secondary option for the Next.js frontend/backend, documenting any persistence limitations of that path relative to the Docker deployment (e.g. an ephemeral or externally hosted database is required there instead of a local file/volume).

## Acceptance criteria

A user can enter a topic, retrieve up to 100 latest accessible matching X posts, inspect their extracted text, read a grounded report with working source citations, understand topic match percentages, export permitted results, reopen saved searches, compare reruns, and inspect their audit trail. Incomplete retrieval, unavailable content, demo data, and scoring limitations must always be explicit.

A user can configure X access and an AI provider from Settings, securely save credentials, select an available LLM, and independently test X search access and AI inference. Ollama Cloud is the preferred default, with verified model availability.

---

**Author / maintainer:** Lalit Nayyar · lalitnayyar@gmail.com · +91 95953 53336 · +971 50 832 0336

Provided "as is," without warranty of any kind. See the "Author & Disclaimer" section of `README.md` for the full liability and compliance disclaimer.
