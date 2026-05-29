import { cookies } from "next/headers";
import { UnauthorizedError, type AuthUser } from "./session";
import { isValidSession } from "./protected-session";
import { hashTokenWithSecret } from "./tokens";
import { getSessionByTokenHash } from "../db/store/session.store";
import { type UserBase } from "../db/store/user.store";
import { getAcceptedFriendshipsByUserId } from "../db/store/friendship.store";

/**
 * Load the current authenticated user from session cookie.
 * Use this in server actions to get the authenticated user without passing userId.
 */
export async function loadCurrentUser(): Promise<AuthUser> {
  const user = await loadOptionalCurrentUser();

  if (!user) {
    throw new UnauthorizedError("No session cookie found in actions");
  }

  return user;
}

export async function loadOptionalCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("app_session")?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await getSessionByTokenHash(hashTokenWithSecret(sessionToken));

  if (!session || !isValidSession(session)) {
    return null;
  }

  // Return user base data - we don't load relations here to avoid "referencedTable" errors
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

  // Load accepted friend data for this user from friendship store
  return {
    ...authUser as UserBase,
    network: (await getAcceptedFriendshipsByUserId(userId)).map((friendship) =>
      friendship.user1Id === userId ? friendship.user2 : friendship.user1,
    ),
  };
}
