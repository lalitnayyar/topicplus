// In-process registry of in-flight run AbortControllers, so a single Docker
// container can support real cancellation without a separate job queue.
// Section 10: "background jobs for long-running analysis, with recoverable status
// and idempotent processing."
const activeRuns = new Map<string, AbortController>();

export function registerRun(runId: string): AbortController {
  const controller = new AbortController();
  activeRuns.set(runId, controller);
  return controller;
}

export function unregisterRun(runId: string): void {
  activeRuns.delete(runId);
}

export function cancelRun(runId: string): boolean {
  const controller = activeRuns.get(runId);
  if (!controller) return false;
  controller.abort();
  return true;
}

export function isRunActive(runId: string): boolean {
  return activeRuns.has(runId);
}
