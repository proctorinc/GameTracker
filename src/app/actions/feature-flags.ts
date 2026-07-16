"use server";

import { revalidatePath } from "next/cache";
import { loadUser } from "@/lib/auth/protected-session";
import { revalidateFeatureFlags } from "@/lib/cache-invalidation";
import { setFeatureEnabled } from "@/lib/db/store/feature-flags.store";

export async function setCardsFeatureEnabled(enabled: boolean) {
  const { user } = await loadUser();
  if (!user || user.role !== "admin") {
    throw new Error("Admin access required");
  }

  await setFeatureEnabled({
    key: "cards",
    enabled,
    updatedByUserId: user.id,
  });

  revalidateFeatureFlags();
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/card/pull");
  revalidatePath("/game/[gameId]/play", "page");

  return { enabled };
}
