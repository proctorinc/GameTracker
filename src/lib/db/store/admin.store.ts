import { and, asc, desc, eq, exists, gte, inArray, isNotNull, isNull } from "drizzle-orm";
import { db, friendships, gamePlayers, games, invitations, users } from "../index";
import { gameFullRelations } from "./game.store";

export type AdminManageableUser = Pick<
  typeof users.$inferSelect,
  | "id"
  | "firstName"
  | "lastName"
  | "color"
  | "avatarUrl"
  | "role"
  | "isGuest"
  | "mergedIntoUserId"
  | "playerRankLeaderboardDisabled"
  | "createdAt"
>;

export type AdminInvitationFull = typeof invitations.$inferSelect & {
  inviter: typeof db._.fullSchema.users.$inferSelect;
  invitee: typeof db._.fullSchema.users.$inferSelect | null;
  guestUser: typeof db._.fullSchema.users.$inferSelect | null;
  acceptedBy: typeof db._.fullSchema.users.$inferSelect | null;
};

export type AdminFriendshipPair = Pick<
  typeof friendships.$inferSelect,
  "user1Id" | "user2Id"
>;

export async function listAdminManageableUsers(): Promise<AdminManageableUser[]> {
  return db.query.users.findMany({
    where: isNull(users.mergedIntoUserId),
    columns: {
      id: true,
      firstName: true,
      lastName: true,
      color: true,
      avatarUrl: true,
      role: true,
      isGuest: true,
      mergedIntoUserId: true,
      playerRankLeaderboardDisabled: true,
      createdAt: true,
    },
    orderBy: [asc(users.isGuest), asc(users.firstName), asc(users.lastName), desc(users.createdAt)],
  });
}

export async function listAdminVisibleLeaderboardUsers() {
  return db.query.users.findMany({
    where: and(
      eq(users.isGuest, false),
      isNull(users.mergedIntoUserId),
      eq(users.playerRankLeaderboardDisabled, false),
    ),
    orderBy: [asc(users.firstName), asc(users.lastName), desc(users.createdAt)],
  });
}

export async function listAdminInvitations(): Promise<AdminInvitationFull[]> {
  return db.query.invitations.findMany({
    orderBy: [desc(invitations.createdAt)],
    with: {
      inviter: true,
      invitee: true,
      guestUser: true,
      acceptedBy: true,
    },
  });
}

export async function listAdminFriendshipPairs(): Promise<AdminFriendshipPair[]> {
  return db.query.friendships.findMany({
    columns: {
      user1Id: true,
      user2Id: true,
    },
  });
}

export async function listGlobalActivityGames(input: {
  userIds: string[];
  since: string;
}) {
  const userIds = Array.from(
    new Set(input.userIds.filter((userId) => userId.trim().length > 0)),
  );

  if (userIds.length === 0) {
    return [];
  }

  return db.query.games.findMany({
    where: and(
      isNotNull(games.completedAt),
      gte(games.completedAt, input.since),
      exists(
        db
          .select()
          .from(gamePlayers)
          .where(
            and(
              eq(gamePlayers.gameId, games.id),
              inArray(gamePlayers.userId, userIds),
            ),
          ),
      ),
    ),
    orderBy: [desc(games.completedAt), desc(games.createdAt)],
    with: gameFullRelations,
  });
}
