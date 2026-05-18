import { eq } from "drizzle-orm";
import { db, users, sessions } from "../db";
import type { AuthUser } from "./session";
import type { UserRow } from "./user-store";
import { isPhoneVerified } from "./user-store";

export interface SessionData {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: number; // SQLite integer timestamp (milliseconds)
  created_at: string | null;
  user: AuthUser;
}

/** Create a new session */
export async function createSession(
  userId: UserRow["id"],
  tokenHash: string,
  expiresAtMs: number,
): Promise<SessionData> {
  const user: UserRow | undefined = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!user || !isPhoneVerified(user)) {
    throw new Error("Cannot create session for unverified user");
  }

  const [session] = await db
    .insert(sessions)
    .values({
      user_id: userId,
      token_hash: tokenHash,
    })
    .returning();

  // Set timestamps after insert (SQLite requires NULL for optional integer columns unless specified)
  await db.update(sessions).set({
    expires_at: expiresAtMs as any,
    created_at: new Date().toISOString(),
  }).where(eq(sessions.id, session.id));

  const updatedSession = session as any;
  // Ensure non-null values are properly set
  return {
    id: updatedSession.id,
    user_id: updatedSession.user_id,
    token_hash: updatedSession.token_hash || "",
    expires_at: Number(updatedSession.expires_at) || expiresAtMs,
    created_at: updatedSession.created_at ?? null,
    user: toAuthUser(user),
  };
}

/** Hash a token - only works in server contexts (API routes). Throws in Edge Runtime. */
async function hashToken(token: string): Promise<string> {
  const crypto = await import("node:crypto");
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function getSessionByToken(sessionToken: string): Promise<SessionData | null> {
  // This function is ONLY called from server-side contexts, not middleware
  const tokenHash = await hashToken(sessionToken);
  const row = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.user_id, users.id))
    .where(eq(sessions.token_hash, tokenHash))
    .get();

  if (!row || !isPhoneVerified(row.user)) {
    return null;
  }

  const session = row.session as any;
  return {
    id: session.id,
    user_id: session.user_id,
    token_hash: session.token_hash || "",
    expires_at: Number(session.expires_at) || 0,
    created_at: session.created_at ?? null,
    user: toAuthUser(row.user),
  };
}

/** Delete a session (logout) */
export async function deleteSession(sessionId: SessionData["id"]): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export function isValidSession(session: Pick<SessionData, "expires_at">): boolean {
  const expiresAt = Number(session.expires_at);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function toAuthUser(user: UserRow): AuthUser {
  return {
    id: user.id,
    phone_e164: user.phone_e164,
    first_name: user.first_name,
    last_name: user.last_name,
    group_id: user.group_id,
    phone_verified_at: user.phone_verified_at,
  };
}
