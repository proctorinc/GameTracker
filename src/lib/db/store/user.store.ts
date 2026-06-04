import { asc, desc, eq, and, inArray, isNull } from "drizzle-orm";
import { db, cardDrops, cards, gamePlayers, users } from "../index";
import { GameFull } from "./game.store";
import {
  deleteGamePlayer,
  getGamePlayersByUserId,
  updateGamePlayer,
} from "./game-players.store";

export type UserBase = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
export type UserUpdate = Partial<Omit<UserInsert, "id">>;
export type UserWithActiveProfileCard = UserBase & {
  activeProfileCard: typeof db._.fullSchema.cards.$inferSelect | null;
};
export type UserWithCreatedBy = UserBase & {
  createdBy: UserBase | null;
};
export type UserWithCards = UserBase & {
  cards: Array<typeof db._.fullSchema.cards.$inferSelect>;
};
export type UserWithCardDrops = UserBase & {
  cardDrops: Array<typeof db._.fullSchema.cardDrops.$inferSelect>;
};
export type UserWithGamePlayers = UserBase & {
  gamePlayers: Array<typeof db._.fullSchema.gamePlayers.$inferSelect>;
};
export type UserWithCreatedGames = UserBase & {
  createdGames: Array<typeof db._.fullSchema.games.$inferSelect>;
};
export type UserWithFriendships = UserBase & {
  friendshipsAsUser1: Array<typeof db._.fullSchema.friendships.$inferSelect>;
  friendshipsAsUser2: Array<typeof db._.fullSchema.friendships.$inferSelect>;
};
export type UserFull = UserBase & {
  activeProfileCard: typeof db._.fullSchema.cards.$inferSelect | null;
  createdBy: UserBase | null;
  cards: Array<typeof db._.fullSchema.cards.$inferSelect>;
  cardDrops: Array<typeof db._.fullSchema.cardDrops.$inferSelect>;
  gamePlayers: Array<typeof db._.fullSchema.gamePlayers.$inferSelect>;
  createdGames: GameFull[];
  friendshipsAsUser1: Array<typeof db._.fullSchema.friendships.$inferSelect>;
  friendshipsAsUser2: Array<typeof db._.fullSchema.friendships.$inferSelect>;
};

/** User with optional profileCardId reference - used in components that show user profiles */
export type UserFullRow = UserBase & {
  activeProfileCard?: typeof db._.fullSchema.cards.$inferSelect | null;
  cards?: Array<typeof db._.fullSchema.cards.$inferSelect>;
};

function nowIso() {
  return new Date().toISOString();
}

export async function createUser(input: UserInsert): Promise<UserBase> {
  const [user] = await db
    .insert(users)
    .values({
      ...input,
      createdAt: input.createdAt ?? nowIso(),
      updatedAt: input.updatedAt ?? nowIso(),
    })
    .returning();

  return user;
}

export async function getUserById(id: string): Promise<UserBase | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  return user ?? null;
}

/** Get user by ID with their profile card if assigned */
export async function getUserWithProfileCard(
  id: string,
): Promise<
  | null
  | UserBase
  | (UserBase & { activeProfileCard?: typeof db._.fullSchema.cards.$inferSelect | null })
> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!user) return null;

  // The profileCardId references cards.id, so we need to look it up by that ID
  const profileCard = await db.query.cards.findFirst({
    where: eq(cards.id, user.profileCardId ?? ""),
  });

  return {
    ...user,
    activeProfileCard: profileCard,
  };
}

export async function getUserByPhoneNumber(
  phoneNumber: string,
): Promise<UserBase | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.phoneNumber, phoneNumber),
  });

  return user ?? null;
}

export async function getUserByEmail(email: string): Promise<UserBase | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  return user ?? null;
}

export async function getUserByClerkUserId(
  clerkUserId: string,
): Promise<UserBase | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });

  return user ?? null;
}

export async function getUserFullById(id: string): Promise<UserBase | null> {
  // Use a simpler approach - just return the basic user since we can't load relations directly
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  return user ?? null;
}

export async function findUserByPhone(
  phoneNumber: string,
): Promise<UserBase | null> {
  return getUserByPhoneNumber(phoneNumber);
}

export async function findUserById(id: string): Promise<UserBase | null> {
  return getUserById(id);
}

export async function listUsers(): Promise<UserBase[]> {
  return db.query.users.findMany();
}

export async function listGuestsCreatedByUser(
  userId: string,
): Promise<UserBase[]> {
  return db.query.users.findMany({
    where: and(
      eq(users.created_by_user_id, userId),
      eq(users.isGuest, true),
      isNull(users.mergedIntoUserId),
    ),
    orderBy: [asc(users.firstName), asc(users.lastName), desc(users.createdAt)],
  });
}

export async function listRecentlyPlayedWithForUser(input: {
  userId: string;
  friendUserIds?: string[];
}): Promise<Array<{ user: UserBase; lastPlayedAt: string | null }>> {
  const currentUserGamePlayers = await db.query.gamePlayers.findMany({
    where: eq(gamePlayers.userId, input.userId),
    columns: {
      gameId: true,
    },
  });

  const gameIds = Array.from(
    new Set(currentUserGamePlayers.map((player) => player.gameId)),
  );

  if (gameIds.length === 0) {
    return [];
  }

  const playedWithRows = await db.query.gamePlayers.findMany({
    where: inArray(gamePlayers.gameId, gameIds),
    with: {
      user: true,
      game: {
        columns: {
          createdAt: true,
        },
      },
    },
    orderBy: [desc(gamePlayers.gameId)],
  });

  const excludedIds = new Set([input.userId, ...(input.friendUserIds ?? [])]);
  const latestByUserId = new Map<string, { user: UserBase; lastPlayedAt: string | null }>();

  for (const row of playedWithRows) {
    const candidate = row.user;

    if (excludedIds.has(candidate.id) || candidate.mergedIntoUserId) {
      continue;
    }

    const lastPlayedAt = row.game?.createdAt ?? null;
    const existing = latestByUserId.get(candidate.id);

    if (
      !existing ||
      (lastPlayedAt &&
        (!existing.lastPlayedAt || lastPlayedAt > existing.lastPlayedAt))
    ) {
      latestByUserId.set(candidate.id, {
        user: candidate,
        lastPlayedAt,
      });
    }
  }

  return Array.from(latestByUserId.values()).sort((entryA, entryB) => {
    if (entryA.lastPlayedAt && entryB.lastPlayedAt) {
      return entryB.lastPlayedAt.localeCompare(entryA.lastPlayedAt);
    }

    if (entryA.lastPlayedAt) {
      return -1;
    }

    if (entryB.lastPlayedAt) {
      return 1;
    }

    return getDisplayNameForSort(entryA.user).localeCompare(
      getDisplayNameForSort(entryB.user),
    );
  });
}

function getDisplayNameForSort(user: Pick<UserBase, "firstName" | "lastName">) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ");
}

export async function updateUser(
  id: string,
  input: UserUpdate,
): Promise<UserBase | null> {
  const [user] = await db
    .update(users)
    .set({
      ...input,
      updatedAt: nowIso(),
    })
    .where(eq(users.id, id))
    .returning();

  return user ?? null;
}

export async function deleteUser(id: string): Promise<UserBase | null> {
  const [user] = await db.delete(users).where(eq(users.id, id)).returning();
  return user ?? null;
}

export async function updateUserProfile(
  userId: string,
  input: {
    firstName?: string;
    lastName?: string;
    profileCardId?: string | null;
  },
): Promise<UserBase | null> {
  return updateUser(userId, {
    firstName: input.firstName,
    lastName: input.lastName,
    profileCardId: input.profileCardId,
    isProfileComplete: true,
  });
}

export async function mergeGuestUserIntoUser(input: {
  guestUserId: string;
  recipientUserId: string;
  inviterUserId: string;
}): Promise<{
  mergedGamePlayerCount: number;
  deletedDuplicateGamePlayerCount: number;
}> {
  const guest = await getUserById(input.guestUserId);

  if (!guest) {
    throw new Error("Guest user not found");
  }

  if (!guest.isGuest) {
    throw new Error("Only guest users can be merged");
  }

  if (guest.mergedIntoUserId) {
    if (guest.mergedIntoUserId === input.recipientUserId) {
      return {
        mergedGamePlayerCount: 0,
        deletedDuplicateGamePlayerCount: 0,
      };
    }

    throw new Error("This guest has already been merged");
  }

  if (guest.created_by_user_id !== input.inviterUserId) {
    throw new Error("Only the guest creator can link this guest");
  }

  if (guest.id === input.recipientUserId) {
    throw new Error("Guest and recipient cannot be the same user");
  }

  const [guestPlayers, recipientPlayers] = await Promise.all([
    getGamePlayersByUserId(guest.id),
    getGamePlayersByUserId(input.recipientUserId),
  ]);

  const recipientGamePlayerByGameId = new Map(
    recipientPlayers.map((player) => [player.gameId, player]),
  );

  let mergedGamePlayerCount = 0;
  let deletedDuplicateGamePlayerCount = 0;

  for (const guestPlayer of guestPlayers) {
    const recipientPlayer = recipientGamePlayerByGameId.get(guestPlayer.gameId);

    if (recipientPlayer) {
      await deleteGamePlayer(guestPlayer.id);
      deletedDuplicateGamePlayerCount += 1;
      continue;
    }

    await updateGamePlayer(guestPlayer.id, {
      userId: input.recipientUserId,
    });
    mergedGamePlayerCount += 1;
  }

  await Promise.all([
    db
      .update(cards)
      .set({
        ownerId: input.recipientUserId,
      })
      .where(eq(cards.ownerId, guest.id)),
    db
      .update(cardDrops)
      .set({
        userId: input.recipientUserId,
      })
      .where(eq(cardDrops.userId, guest.id)),
    updateUser(guest.id, {
      mergedIntoUserId: input.recipientUserId,
      mergedAt: nowIso(),
    }),
  ]);

  return {
    mergedGamePlayerCount,
    deletedDuplicateGamePlayerCount,
  };
}
