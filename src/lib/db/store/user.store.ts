import { asc, desc, eq, and, inArray, isNull, or } from "drizzle-orm";
import {
  db,
  cardDrops,
  cards,
  friendships,
  gamePlayers,
  gameRoundScores,
  gameTitle,
  gameWinners,
  games,
  invitations,
  userGameTitle,
  users,
} from "../index";
import { GameFull } from "./game.store";
import { getGamePlayersByUserId } from "./game-players.store";

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
export type UserReferenceSummary = {
  cardsOwner: number;
  cardDropsUser: number;
  gamePlayersUser: number;
  gameWinnersUser: number;
  gameRoundScoresUser: number;
  gamesCreator: number;
  gameTitlesCreatedBy: number;
  userGameTitlesOwned: number;
  userGameTitlesAcquiredFrom: number;
  invitationsInviter: number;
  invitationsInvitee: number;
  invitationsGuest: number;
  invitationsAcceptedBy: number;
  friendshipsUser1: number;
  friendshipsUser2: number;
  usersCreatedBy: number;
};
export type GuestMergeReferenceReport = {
  guestUserId: string;
  recipientUserId: string | null;
  guest: UserBase | null;
  recipient: UserBase | null;
  guestReferences: UserReferenceSummary;
  recipientReferences: UserReferenceSummary | null;
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

async function getUserReferenceSummary(userId: string): Promise<UserReferenceSummary> {
  const [
    cardsOwnerRows,
    cardDropsUserRows,
    gamePlayersUserRows,
    gameWinnersUserRows,
    gameRoundScoresUserRows,
    gamesCreatorRows,
    gameTitlesCreatedByRows,
    userGameTitlesOwnedRows,
    userGameTitlesAcquiredFromRows,
    invitationsInviterRows,
    invitationsInviteeRows,
    invitationsGuestRows,
    invitationsAcceptedByRows,
    friendshipsUser1Rows,
    friendshipsUser2Rows,
    usersCreatedByRows,
  ] = await Promise.all([
    db.query.cards.findMany({
      where: eq(cards.ownerId, userId),
      columns: { id: true },
    }),
    db.query.cardDrops.findMany({
      where: eq(cardDrops.userId, userId),
      columns: { id: true },
    }),
    db.query.gamePlayers.findMany({
      where: eq(gamePlayers.userId, userId),
      columns: { id: true },
    }),
    db.query.gameWinners.findMany({
      where: eq(gameWinners.userId, userId),
      columns: { gameId: true },
    }),
    db.query.gameRoundScores.findMany({
      where: eq(gameRoundScores.userId, userId),
      columns: { id: true },
    }),
    db.query.games.findMany({
      where: eq(games.creatorId, userId),
      columns: { id: true },
    }),
    db.query.gameTitle.findMany({
      where: eq(gameTitle.createdByUserId, userId),
      columns: { id: true },
    }),
    db.query.userGameTitle.findMany({
      where: eq(userGameTitle.userId, userId),
      columns: { gameTitleId: true },
    }),
    db.query.userGameTitle.findMany({
      where: eq(userGameTitle.acquiredFromUserId, userId),
      columns: { gameTitleId: true },
    }),
    db.query.invitations.findMany({
      where: eq(invitations.inviterUserId, userId),
      columns: { id: true },
    }),
    db.query.invitations.findMany({
      where: eq(invitations.inviteeUserId, userId),
      columns: { id: true },
    }),
    db.query.invitations.findMany({
      where: eq(invitations.guestUserId, userId),
      columns: { id: true },
    }),
    db.query.invitations.findMany({
      where: eq(invitations.acceptedByUserId, userId),
      columns: { id: true },
    }),
    db.query.friendships.findMany({
      where: eq(friendships.user1Id, userId),
      columns: { user1Id: true },
    }),
    db.query.friendships.findMany({
      where: eq(friendships.user2Id, userId),
      columns: { user2Id: true },
    }),
    db.query.users.findMany({
      where: eq(users.created_by_user_id, userId),
      columns: { id: true },
    }),
  ]);

  return {
    cardsOwner: cardsOwnerRows.length,
    cardDropsUser: cardDropsUserRows.length,
    gamePlayersUser: gamePlayersUserRows.length,
    gameWinnersUser: gameWinnersUserRows.length,
    gameRoundScoresUser: gameRoundScoresUserRows.length,
    gamesCreator: gamesCreatorRows.length,
    gameTitlesCreatedBy: gameTitlesCreatedByRows.length,
    userGameTitlesOwned: userGameTitlesOwnedRows.length,
    userGameTitlesAcquiredFrom: userGameTitlesAcquiredFromRows.length,
    invitationsInviter: invitationsInviterRows.length,
    invitationsInvitee: invitationsInviteeRows.length,
    invitationsGuest: invitationsGuestRows.length,
    invitationsAcceptedBy: invitationsAcceptedByRows.length,
    friendshipsUser1: friendshipsUser1Rows.length,
    friendshipsUser2: friendshipsUser2Rows.length,
    usersCreatedBy: usersCreatedByRows.length,
  };
}

export async function getGuestMergeReferenceReport(input: {
  guestUserId: string;
  recipientUserId?: string | null;
}): Promise<GuestMergeReferenceReport> {
  const guest = await getUserById(input.guestUserId);
  const recipientUserId = input.recipientUserId ?? guest?.mergedIntoUserId ?? null;
  const [guestReferences, recipient] = await Promise.all([
    getUserReferenceSummary(input.guestUserId),
    recipientUserId ? getUserById(recipientUserId) : Promise.resolve(null),
  ]);

  return {
    guestUserId: input.guestUserId,
    recipientUserId,
    guest,
    recipient,
    guestReferences,
    recipientReferences: recipientUserId
      ? await getUserReferenceSummary(recipientUserId)
      : null,
  };
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
  await db.transaction(async (tx) => {
    for (const guestPlayer of guestPlayers) {
      const recipientPlayer = recipientGamePlayerByGameId.get(guestPlayer.gameId);

      if (recipientPlayer) {
        await tx.delete(gamePlayers).where(eq(gamePlayers.id, guestPlayer.id));
        deletedDuplicateGamePlayerCount += 1;
        continue;
      }

      await tx
        .update(gamePlayers)
        .set({
          userId: input.recipientUserId,
        })
        .where(eq(gamePlayers.id, guestPlayer.id));
      mergedGamePlayerCount += 1;
    }

    const [guestWinnerRows, recipientWinnerRows] = await Promise.all([
      tx.query.gameWinners.findMany({
        where: eq(gameWinners.userId, guest.id),
      }),
      tx.query.gameWinners.findMany({
        where: eq(gameWinners.userId, input.recipientUserId),
      }),
    ]);

    const recipientWinnerGameIds = new Set(
      recipientWinnerRows.map((winner) => winner.gameId),
    );

    for (const guestWinner of guestWinnerRows) {
      if (recipientWinnerGameIds.has(guestWinner.gameId)) {
        await tx
          .delete(gameWinners)
          .where(
            and(
              eq(gameWinners.gameId, guestWinner.gameId),
              eq(gameWinners.userId, guest.id),
            ),
          );
        continue;
      }

      await tx
        .update(gameWinners)
        .set({
          userId: input.recipientUserId,
        })
        .where(
          and(
            eq(gameWinners.gameId, guestWinner.gameId),
            eq(gameWinners.userId, guest.id),
          ),
        );
    }

    await tx
      .update(gameRoundScores)
      .set({
        userId: input.recipientUserId,
      })
      .where(eq(gameRoundScores.userId, guest.id));

    const [guestTitleOwnershipRows, recipientTitleOwnershipRows] = await Promise.all([
      tx.query.userGameTitle.findMany({
        where: eq(userGameTitle.userId, guest.id),
      }),
      tx.query.userGameTitle.findMany({
        where: eq(userGameTitle.userId, input.recipientUserId),
      }),
    ]);

    const recipientOwnedTitleIds = new Set(
      recipientTitleOwnershipRows.map((ownership) => ownership.gameTitleId),
    );

    for (const guestOwnership of guestTitleOwnershipRows) {
      if (recipientOwnedTitleIds.has(guestOwnership.gameTitleId)) {
        await tx
          .delete(userGameTitle)
          .where(
            and(
              eq(userGameTitle.userId, guest.id),
              eq(userGameTitle.gameTitleId, guestOwnership.gameTitleId),
            ),
          );
        continue;
      }

      await tx
        .update(userGameTitle)
        .set({
          userId: input.recipientUserId,
        })
        .where(
          and(
            eq(userGameTitle.userId, guest.id),
            eq(userGameTitle.gameTitleId, guestOwnership.gameTitleId),
          ),
        );
    }

    const guestFriendships = await tx.query.friendships.findMany({
      where: or(eq(friendships.user1Id, guest.id), eq(friendships.user2Id, guest.id)),
    });

    for (const friendship of guestFriendships) {
      const otherUserId =
        friendship.user1Id === guest.id ? friendship.user2Id : friendship.user1Id;
      const [nextUser1Id, nextUser2Id] =
        otherUserId < input.recipientUserId
          ? [otherUserId, input.recipientUserId]
          : [input.recipientUserId, otherUserId];

      if (
        otherUserId === input.recipientUserId ||
        (await tx.query.friendships.findFirst({
          where: and(
            eq(friendships.user1Id, nextUser1Id),
            eq(friendships.user2Id, nextUser2Id),
          ),
        }))
      ) {
        await tx
          .delete(friendships)
          .where(
            and(
              eq(friendships.user1Id, friendship.user1Id),
              eq(friendships.user2Id, friendship.user2Id),
            ),
          );
        continue;
      }

      await tx
        .delete(friendships)
        .where(
          and(
            eq(friendships.user1Id, friendship.user1Id),
            eq(friendships.user2Id, friendship.user2Id),
          ),
        );

      await tx.insert(friendships).values({
        user1Id: nextUser1Id,
        user2Id: nextUser2Id,
        inviterId:
          friendship.inviterId === guest.id
            ? input.recipientUserId
            : friendship.inviterId,
        createdAt: friendship.createdAt,
      });
    }

    await Promise.all([
      tx
        .update(cards)
        .set({
          ownerId: input.recipientUserId,
        })
        .where(eq(cards.ownerId, guest.id)),
      tx
        .update(cardDrops)
        .set({
          userId: input.recipientUserId,
        })
        .where(eq(cardDrops.userId, guest.id)),
      tx
        .update(invitations)
        .set({
          inviterUserId: input.recipientUserId,
        })
        .where(eq(invitations.inviterUserId, guest.id)),
      tx
        .update(invitations)
        .set({
          inviteeUserId: input.recipientUserId,
        })
        .where(eq(invitations.inviteeUserId, guest.id)),
      tx
        .update(invitations)
        .set({
          guestUserId: input.recipientUserId,
        })
        .where(eq(invitations.guestUserId, guest.id)),
      tx
        .update(invitations)
        .set({
          acceptedByUserId: input.recipientUserId,
        })
        .where(eq(invitations.acceptedByUserId, guest.id)),
      tx
        .update(gameTitle)
        .set({
          createdByUserId: input.recipientUserId,
        })
        .where(eq(gameTitle.createdByUserId, guest.id)),
      tx
        .update(userGameTitle)
        .set({
          acquiredFromUserId: input.recipientUserId,
        })
        .where(eq(userGameTitle.acquiredFromUserId, guest.id)),
      tx
        .update(games)
        .set({
          creatorId: input.recipientUserId,
        })
        .where(eq(games.creatorId, guest.id)),
      tx
        .update(users)
        .set({
          created_by_user_id: input.recipientUserId,
        })
        .where(eq(users.created_by_user_id, guest.id)),
    ]);

    await tx.delete(users).where(eq(users.id, guest.id));
  });

  return {
    mergedGamePlayerCount,
    deletedDuplicateGamePlayerCount,
  };
}
