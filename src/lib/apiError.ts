import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/lib/auth";
import { UnsafeEndpointError } from "@/lib/ssrf";

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (err instanceof NotFoundError) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
  if (err instanceof UnsafeEndpointError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err && typeof err === "object" && "issues" in err) {
    return NextResponse.json({ error: "Invalid request", details: (err as { issues: unknown }).issues }, { status: 400 });
  }
  console.error(err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
