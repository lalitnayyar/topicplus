// Prevents duplicate concurrent connection tests from repeated clicks (Section 13:
// "Repeated clicks must not create duplicate concurrent tests.")
const inFlight = new Set<string>();

export function tryAcquireTestLock(key: string): boolean {
  if (inFlight.has(key)) return false;
  inFlight.add(key);
  return true;
}

export function releaseTestLock(key: string): void {
  inFlight.delete(key);
}
