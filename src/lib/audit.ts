import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const SECRET_KEY_PATTERN = /token|key|secret|password|credential|authorization/i;

// Strip anything that looks like a credential before it ever reaches the audit log.
// Section 8: "Never log credentials, API keys, passwords, authentication tokens..."
function sanitizeMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SECRET_KEY_PATTERN.test(key)) continue;
    if (typeof value === "string" && value.length > 300) {
      clean[key] = `${value.slice(0, 300)}…(truncated)`;
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export type AuditActorType = "user" | "system";

export async function recordAuditEvent(params: {
  searchId?: string | null;
  runId?: string | null;
  userId?: string | null;
  actorType: AuditActorType;
  action: string;
  outcome: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.auditEvent.create({
    data: {
      searchId: params.searchId ?? null,
      runId: params.runId ?? null,
      userId: params.userId ?? null,
      actorType: params.actorType,
      action: params.action,
      outcome: params.outcome,
      metadataJson: (sanitizeMetadata(params.metadata) as Prisma.InputJsonValue) ?? undefined,
    },
  });
}
