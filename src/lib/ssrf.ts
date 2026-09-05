import { lookup } from "dns/promises";
import { isIP } from "net";

// Guards configurable AI endpoint overrides against SSRF (Section 13:
// "Protect configurable endpoints against server-side request forgery; do not allow
// arbitrary internal or cloud metadata endpoints.")
const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal"]);

function isPrivateOrReservedIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const [a, b] = parts;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // private
  if (a === 169 && b === 254) return true; // link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 0) return true;
  return false;
}

function isPrivateOrReservedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fe80:") || // link-local
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") // unique local
  );
}

export class UnsafeEndpointError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeEndpointError";
  }
}

export async function assertSafeEndpoint(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeEndpointError("Endpoint must be a valid URL");
  }

  if (url.protocol !== "https:") {
    throw new UnsafeEndpointError("Endpoint must use https");
  }

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new UnsafeEndpointError("Endpoint host is not allowed");
  }

  const ipVersion = isIP(hostname);
  if (ipVersion === 4 && isPrivateOrReservedIPv4(hostname)) {
    throw new UnsafeEndpointError("Endpoint resolves to a private or reserved address");
  }
  if (ipVersion === 6 && isPrivateOrReservedIPv6(hostname)) {
    throw new UnsafeEndpointError("Endpoint resolves to a private or reserved address");
  }

  if (!ipVersion) {
    try {
      const resolved = await lookup(hostname, { all: true });
      for (const { address, family } of resolved) {
        if (family === 4 && isPrivateOrReservedIPv4(address)) {
          throw new UnsafeEndpointError("Endpoint resolves to a private or reserved address");
        }
        if (family === 6 && isPrivateOrReservedIPv6(address)) {
          throw new UnsafeEndpointError("Endpoint resolves to a private or reserved address");
        }
      }
    } catch (err) {
      if (err instanceof UnsafeEndpointError) throw err;
      throw new UnsafeEndpointError("Could not resolve endpoint host");
    }
  }
}
