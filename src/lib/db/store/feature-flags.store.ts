import "server-only";

import { eq } from "drizzle-orm";
import { db, featureFlags, type FeatureFlagKey } from "@/lib/db";

export async function isFeatureEnabled(key: FeatureFlagKey) {
  const flag = await db.query.featureFlags.findFirst({
    where: eq(featureFlags.key, key),
    columns: { enabled: true },
  });

  return flag?.enabled ?? false;
}

export function areCardsEnabled() {
  return isFeatureEnabled("cards");
}

export async function setFeatureEnabled(input: {
  key: FeatureFlagKey;
  enabled: boolean;
  updatedByUserId: string;
}) {
  const [flag] = await db
    .insert(featureFlags)
    .values({
      key: input.key,
      enabled: input.enabled,
      updatedByUserId: input.updatedByUserId,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: featureFlags.key,
      set: {
        enabled: input.enabled,
        updatedByUserId: input.updatedByUserId,
        updatedAt: new Date().toISOString(),
      },
    })
    .returning();

  return flag;
}
