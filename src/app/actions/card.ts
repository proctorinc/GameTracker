"use server";

import { CardRow, createUserCard } from "@/lib/db/cards-store";
import { revalidatePath } from "next/cache";

export async function pullCard(
  userId: string, 
) {
  const card = await createUserCard(userId);
  revalidatePath("/card/pull");

  return card;
}

export async function pullPack(
    userId: string, 
) {
    const cards:CardRow[] = [];
    for (let i = 0; i < 5; i++) {
        const card = await createUserCard(userId);
        cards.push(card);
    }
    revalidatePath("/card/pull");
  
    return cards;
}