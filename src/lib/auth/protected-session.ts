import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEFAULT_RETURN_PATH } from "./return-path";
import { getUserById, UserBase } from "../db/store/user.store";
import { getSessionByTokenHash, type SessionWithUser } from "../db/store";
import { hashTokenWithSecret } from "./tokens";
import { logInfo, logWarn } from "../server-log";
import { getServerRequestContext } from "../server-request-context";

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
  const requestContext = await getServerRequestContext();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("app_session")?.value;

  if (!sessionToken) {
    logWarn("auth.protected_session.redirected", {
      ...requestContext,
      reason: "missing_session_cookie",
      redirectPath: DEFAULT_RETURN_PATH,
    });
    redirect(`/login?from=${encodeURIComponent(DEFAULT_RETURN_PATH)}`);
  }

  const session = await getSessionByTokenHash(
    hashTokenWithSecret(sessionToken),
  );

  if (!session || !isValidSession(session)) {
    logWarn("auth.protected_session.redirected", {
      ...requestContext,
      reason: !session ? "invalid_session" : "expired_session",
      sessionId: session?.id ?? null,
      userId: session?.user.id ?? null,
      redirectPath: DEFAULT_RETURN_PATH,
    });
    redirect(`/login?from=${encodeURIComponent(DEFAULT_RETURN_PATH)}`);
  }

  const userData = await getUserById(session.user.id);

  if (!userData) {
    logWarn("auth.protected_session.redirected", {
      ...requestContext,
      reason: "missing_user_record",
      sessionId: session.id,
      userId: session.user.id,
      redirectPath: DEFAULT_RETURN_PATH,
    });
    redirect(`/login?from=${encodeURIComponent(DEFAULT_RETURN_PATH)}`);
  }

  logInfo("auth.protected_session.succeeded", {
    ...requestContext,
    sessionId: session.id,
    userId: userData.id,
  });
  return {
    user: userData,
  };
}

/**
 * Returns just the raw session data or redirects to login.
 * Use when you need to access session metadata without loading user/group/network.
 */
export async function requireSessionRaw(): Promise<SessionData> {
  const requestContext = await getServerRequestContext();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("app_session")?.value;

  if (!sessionToken) {
    logWarn("auth.session_raw.redirected", {
      ...requestContext,
      reason: "missing_session_cookie",
      redirectPath: DEFAULT_RETURN_PATH,
    });
    redirect(`/login?from=${encodeURIComponent(DEFAULT_RETURN_PATH)}`);
  }

  const session = await getSessionByTokenHash(
    hashTokenWithSecret(sessionToken),
  );

  if (!session || !isValidSession(session)) {
    logWarn("auth.session_raw.redirected", {
      ...requestContext,
      reason: !session ? "invalid_session" : "expired_session",
      sessionId: session?.id ?? null,
      userId: session?.user.id ?? null,
      redirectPath: DEFAULT_RETURN_PATH,
    });
    redirect(`/login?from=${encodeURIComponent(DEFAULT_RETURN_PATH)}`);
  }

  logInfo("auth.session_raw.succeeded", {
    ...requestContext,
    sessionId: session.id,
    userId: session.user.id,
  });
  return session;
}
