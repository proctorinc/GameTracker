import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DEFAULT_RETURN_PATH } from "./return-path";
import { UserBase } from "../db/store/user.store";
import { loadCurrentUser } from "./auth-me";
import { logInfo, logWarn } from "../server-log";
import { getServerRequestContext } from "../server-request-context";

export type SessionData = {
  clerkUserId: string;
  sessionId: string | null;
};

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
  const { userId } = await auth();

  if (!userId) {
    logWarn("auth.protected_session.redirected", {
      ...requestContext,
      reason: "missing_clerk_user",
      redirectPath: DEFAULT_RETURN_PATH,
    });
    redirect(`/login?from=${encodeURIComponent(DEFAULT_RETURN_PATH)}`);
  }

  const userData = await loadCurrentUser();

  logInfo("auth.protected_session.succeeded", {
    ...requestContext,
    clerkUserId: userId,
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
  const { userId, sessionId } = await auth();

  if (!userId) {
    logWarn("auth.session_raw.redirected", {
      ...requestContext,
      reason: "missing_clerk_user",
      redirectPath: DEFAULT_RETURN_PATH,
    });
    redirect(`/login?from=${encodeURIComponent(DEFAULT_RETURN_PATH)}`);
  }

  logInfo("auth.session_raw.succeeded", {
    ...requestContext,
    clerkUserId: userId,
    sessionId,
  });
  return {
    clerkUserId: userId,
    sessionId,
  };
}
