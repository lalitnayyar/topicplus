import { existsSync, copyFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";

// On Vercel's serverless filesystem, DATABASE_URL is pointed at /tmp (read-only
// elsewhere) and starts empty on every cold start. Seed it from a pre-migrated,
// data-free SQLite file bundled with the deployment so the app has schema/triggers
// ready before the first request, instead of crashing or lazily migrating at request
// time. See README.md "Vercel deployment" for the full persistence caveat.
function seedEphemeralDatabaseIfNeeded() {
  const url = process.env.DATABASE_URL ?? "";
  const match = url.match(/^file:(.+)$/);
  if (!match) return;
  const dbPath = match[1];
  if (!dbPath.startsWith("/tmp")) return; // only relevant for the ephemeral Vercel path
  if (existsSync(dbPath)) return; // already seeded this instance

  const seedPath = join(process.cwd(), "prisma", "seed-empty.db");
  if (!existsSync(seedPath)) {
    console.warn("[topicpulse] seed-empty.db not found — cannot seed ephemeral database.");
    return;
  }
  mkdirSync(dirname(dbPath), { recursive: true });
  copyFileSync(seedPath, dbPath);
  console.warn(`[topicpulse] seeded ephemeral database at ${dbPath} (data resets on the next cold start).`);
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    seedEphemeralDatabaseIfNeeded();

    const { recoverStuckRuns } = await import("@/lib/jobs/runSearch");
    const count = await recoverStuckRuns().catch((err) => {
      console.error("recoverStuckRuns failed", err);
      return 0;
    });
    if (count > 0) console.warn(`Recovered ${count} stuck run(s) on startup.`);
  }
}
