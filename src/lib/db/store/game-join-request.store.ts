import { and, desc, eq } from "drizzle-orm";
import { db, gameJoinRequests } from "../index";

export type GameJoinRequestBase = typeof gameJoinRequests.$inferSelect;
export type GameJoinRequestInsert = typeof gameJoinRequests.$inferInsert;
export type GameJoinRequestUpdate = Partial<Omit<GameJoinRequestInsert, "id">>;
export type GameJoinRequestFull = GameJoinRequestBase & {
  requester: typeof db._.fullSchema.users.$inferSelect;
  resolvedBy: typeof db._.fullSchema.users.$inferSelect | null;
};

function nowIso() {
  return new Date().toISOString();
}

export async function getGameJoinRequestById(
  id: string,
): Promise<GameJoinRequestBase | null> {
  const request = await db.query.gameJoinRequests.findFirst({
    where: eq(gameJoinRequests.id, id),
  });

  return request ?? null;
}

export async function getGameJoinRequestFullById(
  id: string,
): Promise<GameJoinRequestFull | null> {
  const request = await db.query.gameJoinRequests.findFirst({
    where: eq(gameJoinRequests.id, id),
    with: {
      requester: true,
      resolvedBy: true,
    },
  });

  return request ?? null;
}

export async function getPendingJoinRequest(
  gameId: string,
  requesterUserId: string,
): Promise<GameJoinRequestBase | null> {
  const request = await db.query.gameJoinRequests.findFirst({
    where: and(
      eq(gameJoinRequests.gameId, gameId),
      eq(gameJoinRequests.requesterUserId, requesterUserId),
      eq(gameJoinRequests.status, "pending"),
    ),
  });

  return request ?? null;
}

export async function listPendingJoinRequestsForGame(
  gameId: string,
): Promise<GameJoinRequestFull[]> {
  return db.query.gameJoinRequests.findMany({
    where: and(
      eq(gameJoinRequests.gameId, gameId),
      eq(gameJoinRequests.status, "pending"),
    ),
    orderBy: [desc(gameJoinRequests.requestedAt)],
    with: {
      requester: true,
      resolvedBy: true,
    },
  });
}

export async function createGameJoinRequest(
  input: GameJoinRequestInsert,
): Promise<GameJoinRequestBase> {
  const existing = await getPendingJoinRequest(
    input.gameId,
    input.requesterUserId,
  );

  if (existing) {
    return existing;
  }

  const [request] = await db
    .insert(gameJoinRequests)
    .values({
      ...input,
      requestedAt: input.requestedAt ?? nowIso(),
    })
    .returning();

  return request;
}

export async function resolveGameJoinRequest(input: {
  id: string;
  resolvedByUserId: string;
  status: "approved" | "declined" | "cancelled";
}) {
  const [request] = await db
    .update(gameJoinRequests)
    .set({
      status: input.status,
      resolvedAt: nowIso(),
      resolvedByUserId: input.resolvedByUserId,
    })
    .where(eq(gameJoinRequests.id, input.id))
    .returning();

  return request ?? null;
}
