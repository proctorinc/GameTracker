import { getEnv } from "@/lib/env-config";
import * as crypto from "node:crypto";

function sessionSecret(): string {
  return getEnv().SESSION_SECRET;
}

/**
 * Generate session token and hash it. Used by OTP verify route (server-side).
 */
export async function createSessionTokenWithSecret(tokenLength = 32): Promise<{ raw: string; hashed: string }> {
  const raw = crypto.randomBytes(tokenLength).toString("base64url");

  // Try HMAC first (better entropy), fallback to plain hash
  try {
    const hmac = crypto.createHmac("sha256", sessionSecret());
    hmac.update(raw);
    return { raw, hashed: hmac.digest("hex") };
  } catch {
    // Fallback: plain SHA-256 hash
    return { raw, hashed: crypto.createHash("sha256").update(raw).digest("hex") };
  }
}

/**
 * Hash a token using HMAC-SHA256 with secret (for cookie-based tokens).
 */
export function hashTokenWithSecret(token: string): string {
  return crypto.createHmac("sha256", sessionSecret()).update(token).digest("hex");
}

/**
 * Hash a token without secret (for legacy tokens or when secret not available).
 */
export async function hashToken(token: string): Promise<string> {
  return crypto.createHash("sha256").update(token).digest("hex");
}
