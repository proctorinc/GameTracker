"use server";

import { CardRow, createUserCard } from "@/lib/db/store/cards.store";
import { revalidatePath } from "next/cache";
import { loadCurrentUser } from "@/lib/auth/auth-me";
import { logError, logInfo } from "@/lib/server-log";

export async function pullCard(
  userId: string, 
) {
  let actorUserId: string | null = null;

  try {
    const user = await loadCurrentUser();
    actorUserId = user.id;

    if (user.id !== userId) {
      throw new Error("You can only pull cards for your own account");
    }

    const card = await createUserCard(userId);
    revalidatePath("/card/pull");
    logInfo("card.pull.succeeded", {
      actorUserId: user.id,
      cardId: card.id,
      deckName: card.deckName,
      value: card.value,
      modifier: card.modifier,
    });

    return card;
  } catch (error) {
    logError("card.pull.failed", error, {
      actorUserId,
      targetUserId: userId,
    });
    throw error;
  }
}

export async function pullPack(
    userId: string, 
) {
    let actorUserId: string | null = null;

    try {
        const user = await loadCurrentUser();
        actorUserId = user.id;

        if (user.id !== userId) {
            throw new Error("You can only pull cards for your own account");
        }

        const cards:CardRow[] = [];
        for (let i = 0; i < 5; i++) {
            const card = await createUserCard(userId);
            cards.push(card);
        }
        revalidatePath("/card/pull");
        logInfo("card.pack_pull.succeeded", {
          actorUserId: user.id,
          cardCount: cards.length,
          deckName: cards[0]?.deckName ?? null,
          cardIds: cards.map((card) => card.id),
        });
      
        return cards;
    } catch (error) {
        logError("card.pack_pull.failed", error, {
          actorUserId,
          targetUserId: userId,
        });
        throw error;
    }
}
