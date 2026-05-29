import { eq } from "drizzle-orm";
import { db, sessions } from "../index";
import { UserBase } from "./user.store";

export type SessionBase = typeof sessions.$inferSelect;
export type SessionInsert = typeof sessions.$inferInsert;
export type SessionUpdate = Partial<Omit<SessionInsert, "id">>;
export type SessionWithUser = SessionBase & {
  user: UserBase;
};

function nowIso() {
  return new Date().toISOString();
}

export async function createSession(
  userId: string,
  tokenHash: string,
  expiresAt: string,
): Promise<SessionBase> {
  const [session] = await db
    .insert(sessions)
    .values({
      userId,
      tokenHash,
      expiresAt,
      createdAt: nowIso(),
    })
    .returning();

  return session;
}

export async function getSessionById(
  id: string,
): Promise<SessionWithUser | null> {
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, id),
    with: {
      user: true,
    },
  });

  return session ?? null;
}

export async function getSessionByTokenHash(
  tokenHash: string,
): Promise<SessionWithUser | null> {
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.tokenHash, tokenHash),
    with: {
      user: true,
    },
  });

  return session ?? null;
}

export async function getSessionsByUserId(
  userId: string,
): Promise<SessionBase[]> {
  return db.query.sessions.findMany({
    where: eq(sessions.userId, userId),
  });
}

export async function listSessions(): Promise<SessionBase[]> {
  return db.query.sessions.findMany();
}

export async function updateSession(
  id: string,
  input: SessionUpdate,
): Promise<SessionBase | null> {
  const [session] = await db
    .update(sessions)
    .set(input)
    .where(eq(sessions.id, id))
    .returning();

  return session ?? null;
}

export async function deleteSessionByToken(
  tokenHash: string,
): Promise<SessionBase | null> {
  const [session] = await db
    .delete(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .returning();
  return session ?? null;
}
