import { isDev } from "@/lib/env";
import {
  deleteOtpRateLimit,
  getOtpRateLimitByPhoneNumber,
  updateOtpRateLimit,
} from "../db/store";

const MAX_REQUESTS_PER_WINDOW = 3;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface RateLimitResult {
  allowed: boolean;
  reason?: string;
}

/** Check and update rate limit for a phone number */
export async function checkRateLimit(
  phoneNumber: string,
): Promise<RateLimitResult> {
  if (isDev() || process.env.NODE_ENV === "test") {
    return { allowed: true };
  }

  const row = await getOtpRateLimitByPhoneNumber(phoneNumber);

  const lastRequestAt = row?.lastRequestAt ?? "1970-01-01T00:00:00.000Z";

  if (Date.now() - new Date(lastRequestAt).getTime() >= WINDOW_MS) {
    await updateOtpRateLimit(phoneNumber, {
      lastRequestAt: new Date().toISOString(),
      requestCountWindow: 1,
    });

    return { allowed: true };
  }

  const count = row?.requestCountWindow ?? 0;
  if (count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      reason:
        "Rate limit exceeded. Please wait before requesting another code.",
    };
  }

  await updateOtpRateLimit(phoneNumber, {
    lastRequestAt: new Date().toISOString(),
    requestCountWindow: count + 1,
  });

  return { allowed: true };
}

/** Reset rate limit for a phone number */
export async function resetRateLimit(phoneNumber: string): Promise<void> {
  await deleteOtpRateLimit(phoneNumber);
}
