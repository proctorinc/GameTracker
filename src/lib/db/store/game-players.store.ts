import { and, eq } from "drizzle-orm";
import { db, gamePlayers } from "../index";

export type GamePlayerBase = typeof gamePlayers.$inferSelect;
export type GamePlayerInsert = typeof gamePlayers.$inferInsert;
export type GamePlayerUpdate = Partial<Omit<GamePlayerInsert, "id">>;
export type GamePlayerWithGame = GamePlayerBase & {
  game: typeof db._.fullSchema.games.$inferSelect;
};
export type GamePlayerWithUser = GamePlayerBase & {
  user: typeof db._.fullSchema.users.$inferSelect;
};
export type GamePlayerFull = GamePlayerBase & {
  game: typeof db._.fullSchema.games.$inferSelect;
  user: typeof db._.fullSchema.users.$inferSelect;
};

export async function createGamePlayer(
  input: GamePlayerInsert,
): Promise<GamePlayerBase> {
  const [gamePlayer] = await db.insert(gamePlayers).values(input).returning();
  return gamePlayer;
}

export async function getGamePlayerById(
  id: string,
): Promise<GamePlayerBase | null> {
  const gamePlayer = await db.query.gamePlayers.findFirst({
    where: eq(gamePlayers.id, id),
  });

  return gamePlayer ?? null;
}

export async function getGamePlayerFullById(
  id: string,
): Promise<GamePlayerFull | null> {
  const gamePlayer = await db.query.gamePlayers.findFirst({
    where: eq(gamePlayers.id, id),
    with: {
      game: true,
      user: true,
    },
  });

  return gamePlayer ?? null;
}

export async function listGamePlayers(): Promise<GamePlayerBase[]> {
  return db.query.gamePlayers.findMany();
}

export async function getGamePlayersByGameId(
  gameId: string,
): Promise<GamePlayerBase[]> {
  return db.query.gamePlayers.findMany({
    where: eq(gamePlayers.gameId, gameId),
  });
}

export async function getGamePlayerByGameAndUserId(
  gameId: string,
  userId: string,
): Promise<GamePlayerBase | null> {
  const gamePlayer = await db.query.gamePlayers.findFirst({
    where: and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.userId, userId)),
  });

  return gamePlayer ?? null;
}

export async function getGamePlayersByUserId(
  userId: string,
): Promise<GamePlayerBase[]> {
  return db.query.gamePlayers.findMany({
    where: eq(gamePlayers.userId, userId),
  });
}

export async function updateGamePlayer(
  id: string,
  input: GamePlayerUpdate,
): Promise<GamePlayerBase | null> {
  const [gamePlayer] = await db
    .update(gamePlayers)
    .set(input)
    .where(eq(gamePlayers.id, id))
    .returning();

  return gamePlayer ?? null;
}

export async function deleteGamePlayer(
  id: string,
): Promise<GamePlayerBase | null> {
  const [gamePlayer] = await db
    .delete(gamePlayers)
    .where(eq(gamePlayers.id, id))
    .returning();
  return gamePlayer ?? null;
}
