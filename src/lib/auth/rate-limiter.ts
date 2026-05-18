import { eq } from "drizzle-orm";
import { db, otpRateLimits } from "../db";
import { isDev } from "@/lib/env";

const MAX_REQUESTS_PER_WINDOW = 3;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface RateLimitResult {
  allowed: boolean;
  reason?: string;
}

/** Check and update rate limit for a phone number */
export async function checkRateLimit(
  phoneE164: string,
): Promise<RateLimitResult> {
  if (isDev() || process.env.NODE_ENV === "test") {
    return { allowed: true };
  }

  const row = await db.select().from(otpRateLimits).where(eq(otpRateLimits.phone_e164, phoneE164)).get();

  const lastRequestAt = row?.last_request_at ?? Date.now();

  if (Date.now() - Number(lastRequestAt) >= WINDOW_MS) {
    await db.update(otpRateLimits as any)
      .set({
        last_request_at: new Date().toISOString(),
        request_count_window: 1,
      })
      .where(eq(otpRateLimits.phone_e164, phoneE164))
      .run();

    return { allowed: true };
  }

  const count = (await db.select().from(otpRateLimits).where(eq(otpRateLimits.phone_e164, phoneE164)).get())?.request_count_window ?? 0;
  if (count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      reason: "Rate limit exceeded. Please wait before requesting another code.",
    };
  }

  await db.update(otpRateLimits as any)
    .set({
      last_request_at: new Date().toISOString(),
      request_count_window: count + 1,
    })
    .where(eq(otpRateLimits.phone_e164, phoneE164))
    .run();

  return { allowed: true };
}

/** Reset rate limit for a phone number */
export async function resetRateLimit(phoneE164: string): Promise<void> {
  await db.delete(otpRateLimits).where(eq(otpRateLimits.phone_e164, phoneE164)).run();
}
