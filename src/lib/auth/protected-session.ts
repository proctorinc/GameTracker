import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEFAULT_RETURN_PATH } from "./return-path";
import { getUserById, UserBase } from "../db/store/user.store";
import { getSessionByTokenHash, type SessionWithUser } from "../db/store";
import { hashTokenWithSecret } from "./tokens";

export type SessionData = SessionWithUser;

export function isValidSession(session: Pick<SessionData, "expiresAt">) {
  if (!session.expiresAt) {
    return false;
  }

  return new Date(session.expiresAt).getTime() > Date.now();
}

/** Combined session + auth me data for protected pages */
export interface ProtectedSession {
  user: UserBase;
}

/**
 * Returns a loaded session or redirects to login if not authenticated.
 * Used by protected pages that need user/group/network data.
 */
export async function loadUser(): Promise<ProtectedSession> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("app_session")?.value;

  if (!sessionToken) {
    redirect(`/login?from=${encodeURIComponent(DEFAULT_RETURN_PATH)}`);
  }

  const session = await getSessionByTokenHash(
    hashTokenWithSecret(sessionToken),
  );

  if (!session || !isValidSession(session)) {
    redirect(`/login?from=${encodeURIComponent(DEFAULT_RETURN_PATH)}`);
  }

  const userData = await getUserById(session.user.id);

  if (!userData) {
    redirect(`/login?from=${encodeURIComponent(DEFAULT_RETURN_PATH)}`);
  }

  return {
    user: userData,
  };
}

/**
 * Returns just the raw session data or redirects to login.
 * Use when you need to access session metadata without loading user/group/network.
 */
export async function requireSessionRaw(): Promise<SessionData> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("app_session")?.value;

  if (!sessionToken) {
    redirect(`/login?from=${encodeURIComponent(DEFAULT_RETURN_PATH)}`);
  }

  const session = await getSessionByTokenHash(
    hashTokenWithSecret(sessionToken),
  );

  if (!session || !isValidSession(session)) {
    redirect(`/login?from=${encodeURIComponent(DEFAULT_RETURN_PATH)}`);
  }

  return session;
}
