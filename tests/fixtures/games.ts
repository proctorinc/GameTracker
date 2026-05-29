export async function createGameFixture(input: {
  creatorId: string;
  title?: string;
}) {
  const { db, gameTitle } = await import("../../src/lib/db");
  const { createGame } = await import("../../src/lib/db/store/game.store");

  const normalizedTitle = (input.title ?? "Fixture Game").trim().toLowerCase();
  const [createdTitle] = await db
    .insert(gameTitle)
    .values({
      title: input.title ?? "Fixture Game",
      normalizedTitle,
      createdByUserId: input.creatorId,
    })
    .returning();

  const game = await createGame({
    creatorId: input.creatorId,
    version: "v1",
    gameTitleId: createdTitle.id,
    scoringMode: "highest_wins",
    endingMode: "none",
  });

  return {
    game,
    gameTitle: createdTitle,
  };
}
