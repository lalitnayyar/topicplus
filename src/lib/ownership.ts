import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/apiError";

// Ownership is enforced by scoping every lookup to userId, not just by checking
// after the fact — a search/run belonging to another user 404s exactly like one
// that doesn't exist, so existence isn't leaked cross-user (Section 10).

export async function getOwnedSearch(searchId: string, userId: string) {
  const search = await prisma.search.findFirst({ where: { id: searchId, userId, deletedAt: null } });
  if (!search) throw new NotFoundError("Search not found");
  return search;
}

export async function getOwnedRun(runId: string, userId: string) {
  const run = await prisma.searchRun.findFirst({
    where: { id: runId, search: { userId, deletedAt: null } },
    include: { search: true },
  });
  if (!run) throw new NotFoundError("Run not found");
  return run;
}
