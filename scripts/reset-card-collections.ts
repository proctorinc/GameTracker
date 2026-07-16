import { cardDrops, cards, db, users } from "../src/lib/db";

await db.transaction(async (tx) => {
  await tx.update(users).set({ profileCardId: null });
  await tx.delete(cardDrops);
  await tx.delete(cards);
});

console.log("Owned cards, profile-card selections, and unopened packs were cleared.");
