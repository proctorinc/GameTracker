"use server";

import { loadCurrentUser } from "@/lib/auth/auth-me";
import { openCardDropForUser } from "@/lib/card-rewards";
import {
  revalidateDashboardPage,
  revalidateProfileOverviewPage,
  revalidatePublicProfilePage,
} from "@/lib/cache-invalidation";
import type { CollectibleCardViewModel } from "@/lib/card-catalog";
import { logError, logInfo } from "@/lib/server-log";
import { revalidatePath } from "next/cache";

export async function openCardDrop(input: {
  cardDropId: string;
}): Promise<CollectibleCardViewModel[]> {
  let actorUserId: string | null = null;

  try {
    const user = await loadCurrentUser();
    actorUserId = user.id;
    const cards = await openCardDropForUser({
      cardDropId: input.cardDropId,
      userId: user.id,
    });

    revalidateDashboardPage(user.id);
    revalidateProfileOverviewPage(user.id);
    revalidatePublicProfilePage(user.id);
    revalidatePath("/card/pull");

    logInfo("card.pack_open.succeeded", {
      actorUserId: user.id,
      cardDropId: input.cardDropId,
      cardCount: cards.length,
      deckName: cards[0]?.deckName ?? null,
      cardIds: cards.map((card) => card.instanceId),
    });

    return cards;
  } catch (error) {
    logError("card.pack_open.failed", error, {
      actorUserId,
      cardDropId: input.cardDropId,
    });
    throw error;
  }
}
