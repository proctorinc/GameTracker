import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionByToken, isValidSession, type SessionData } from "./session-store";
import { DEFAULT_RETURN_PATH } from "./return-path";
import { getUserFullById, UserFullRow } from "./user-store";

/** Combined session + auth me data for protected pages */
export interface ProtectedSession {
  session: SessionData;
  user: UserFullRow | null;
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

  const session = await getSessionByToken(sessionToken);

  if (!session || !isValidSession(session)) {
    redirect(`/login?from=${encodeURIComponent(DEFAULT_RETURN_PATH)}`);
  }

  const userData = await getUserFullById(session.user.id);

  return {
    user: userData,
    session,
  }
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

  const session = await getSessionByToken(sessionToken);

  if (!session || !isValidSession(session)) {
    redirect(`/login?from=${encodeURIComponent(DEFAULT_RETURN_PATH)}`);
  }

  return session;
}
