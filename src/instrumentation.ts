export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { recoverStuckRuns } = await import("@/lib/jobs/runSearch");
    const count = await recoverStuckRuns().catch((err) => {
      console.error("recoverStuckRuns failed", err);
      return 0;
    });
    if (count > 0) console.warn(`Recovered ${count} stuck run(s) on startup.`);
  }
}
