import { cookies } from "next/headers";
import { UnauthorizedError, type AuthUser } from "./session";
import { isValidSession } from "./protected-session";
import { hashTokenWithSecret } from "./tokens";
import { getSessionByTokenHash } from "../db/store/session.store";
import { type UserBase } from "../db/store/user.store";
import { getAcceptedFriendshipsByUserId } from "../db/store/friendship.store";
import { logError, logInfo, logWarn } from "../server-log";
import { getServerRequestContext } from "../server-request-context";

/**
 * Load the current authenticated user from session cookie.
 * Use this in server actions to get the authenticated user without passing userId.
 */
export async function loadCurrentUser(): Promise<AuthUser> {
  const user = await loadOptionalCurrentUser();
  const requestContext = await getServerRequestContext();

  if (!user) {
    logWarn("auth.current_user.rejected", {
      ...requestContext,
      reason: "missing_authenticated_user",
    });
    throw new UnauthorizedError("No session cookie found in actions");
  }

  logInfo("auth.current_user.succeeded", {
    ...requestContext,
    userId: user.id,
  });
  return user;
}

export async function loadOptionalCurrentUser(): Promise<AuthUser | null> {
  const requestContext = await getServerRequestContext();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("app_session")?.value;

  if (!sessionToken) {
    logInfo("auth.optional_current_user.missing", {
      ...requestContext,
      reason: "missing_session_cookie",
    });
    return null;
  }

  const session = await getSessionByTokenHash(hashTokenWithSecret(sessionToken));

  if (!session || !isValidSession(session)) {
    logWarn("auth.optional_current_user.rejected", {
      ...requestContext,
      reason: !session ? "invalid_session" : "expired_session",
      sessionId: session?.id ?? null,
      userId: session?.user.id ?? null,
    });
    return null;
  }

  // Return user base data - we don't load relations here to avoid "referencedTable" errors
  logInfo("auth.optional_current_user.succeeded", {
    ...requestContext,
    sessionId: session.id,
    userId: session.user.id,
  });
  return session.user;
}

/**
 * Load lightweight user data with accepted friends network.
 * Used for /me endpoint and dashboard networks.
 */
export async function loadAuthMeData(authUser: AuthUser): Promise<{
  id: string;
  role: "user" | "admin";
  firstName: string | null;
  lastName: string | null;
  color: string;
  phoneNumber: string | null;
  profileCardId: string | null;
  isProfileComplete: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  isGuest: boolean;
  network: Array<{
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    color: string;
    phoneNumber: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    isProfileComplete: boolean;
    isGuest: boolean;
  }>;
}> {
  const userId = authUser.id;

  try {
    const network = (await getAcceptedFriendshipsByUserId(userId)).map((friendship) =>
      friendship.user1Id === userId ? friendship.user2 : friendship.user1,
    );
    logInfo("auth.me_data.succeeded", {
      ...(await getServerRequestContext()),
      userId,
      networkSize: network.length,
    });

    // Load accepted friend data for this user from friendship store
    return {
      ...authUser as UserBase,
      network,
    };
  } catch (error) {
    logError("auth.me_data.failed", error, {
      ...(await getServerRequestContext()),
      userId,
    });
    throw error;
  }
}
