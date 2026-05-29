import { eq } from "drizzle-orm";
import { db, otpRateLimits } from "../index";

export type OtpRateLimitBase = typeof otpRateLimits.$inferSelect;
export type OtpRateLimitInsert = typeof otpRateLimits.$inferInsert;
export type OtpRateLimitUpdate = Partial<OtpRateLimitInsert>;

export async function createOtpRateLimit(
  input: OtpRateLimitInsert,
): Promise<OtpRateLimitBase> {
  const [otpRateLimit] = await db
    .insert(otpRateLimits)
    .values(input)
    .returning();
  return otpRateLimit;
}

export async function upsertOtpRateLimit(
  input: OtpRateLimitInsert,
): Promise<OtpRateLimitBase> {
  const [otpRateLimit] = await db
    .insert(otpRateLimits)
    .values(input)
    .onConflictDoUpdate({
      target: otpRateLimits.phoneNumber,
      set: {
        lastRequestAt: input.lastRequestAt ?? null,
        requestCountWindow: input.requestCountWindow ?? 0,
      },
    })
    .returning();

  return otpRateLimit;
}

export async function getOtpRateLimitByPhoneNumber(
  phoneNumber: string,
): Promise<OtpRateLimitBase | null> {
  const otpRateLimit = await db.query.otpRateLimits.findFirst({
    where: eq(otpRateLimits.phoneNumber, phoneNumber),
  });

  return otpRateLimit ?? null;
}

export async function listOtpRateLimits(): Promise<OtpRateLimitBase[]> {
  return db.query.otpRateLimits.findMany();
}

export async function updateOtpRateLimit(
  phoneNumber: string,
  input: OtpRateLimitUpdate,
): Promise<OtpRateLimitBase | null> {
  const [otpRateLimit] = await db
    .update(otpRateLimits)
    .set(input)
    .where(eq(otpRateLimits.phoneNumber, phoneNumber))
    .returning();

  return otpRateLimit ?? null;
}

export async function deleteOtpRateLimit(
  phoneNumber: string,
): Promise<OtpRateLimitBase | null> {
  const [otpRateLimit] = await db
    .delete(otpRateLimits)
    .where(eq(otpRateLimits.phoneNumber, phoneNumber))
    .returning();

  return otpRateLimit ?? null;
}
