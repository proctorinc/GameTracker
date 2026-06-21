import { randomBytes } from "node:crypto";
import { asc, desc, eq, and, inArray, isNull, or } from "drizzle-orm";
import {
  db,
  cardDrops,
  cards,
  friendships,
  gamePlayerRankResults,
  playerRankHistory,
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
import {
  getActivePlayerRankConfig,
  rebuildPlayerRankHistoryFromDate,
} from "./player-rank.store";

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
  gamePlayerRankResultsUser: number;
  playerRankHistoryUser: number;
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

export type MergeUserIntoUserSourceType = "guest" | "registered";

export type MergeUserIntoUserInput = {
  sourceUserId: string;
  targetUserId: string;
  mergeActorUserId: string;
  sourceUserType: MergeUserIntoUserSourceType;
};

export type MergeUserIntoUserResult = {
  mergedGamePlayerCount: number;
  deletedDuplicateGamePlayerCount: number;
};

function nowIso() {
  return new Date().toISOString();
}

function createInviteToken() {
  return randomBytes(24).toString("base64url");
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

export async function getUserByFriendInviteToken(
  friendInviteToken: string,
): Promise<UserBase | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.friendInviteToken, friendInviteToken),
  });

  return user ?? null;
}

export async function getOrCreateFriendInviteToken(userId: string): Promise<string> {
  const existingUser = await getUserById(userId);

  if (!existingUser) {
    throw new Error("User not found");
  }

  if (existingUser.friendInviteToken) {
    return existingUser.friendInviteToken;
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const token = createInviteToken();
    const [tokenUser, tokenInvitation] = await Promise.all([
      getUserByFriendInviteToken(token),
      db.query.invitations.findFirst({
        where: eq(invitations.inviteToken, token),
        columns: { id: true },
      }),
    ]);

    if (tokenUser || tokenInvitation) {
      continue;
    }

    const updatedUser = await updateUser(userId, {
      friendInviteToken: token,
    });

    if (updatedUser?.friendInviteToken) {
      return updatedUser.friendInviteToken;
    }
  }

  throw new Error("Unable to generate a unique friend invite token");
}

export async function getUserFullById(id: string): Promise<UserBase | null> {
  // Use a simpler approach - just return the basic user since we can't load relations directly
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  return user ?? null;
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
    gamePlayerRankResultsUserRows,
    playerRankHistoryUserRows,
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
    db.query.gamePlayerRankResults.findMany({
      where: eq(gamePlayerRankResults.userId, userId),
      columns: { gameId: true },
    }),
    db.query.playerRankHistory.findMany({
      where: eq(playerRankHistory.userId, userId),
      columns: { historyDate: true },
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
    gamePlayerRankResultsUser: gamePlayerRankResultsUserRows.length,
    playerRankHistoryUser: playerRankHistoryUserRows.length,
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
}): Promise<MergeUserIntoUserResult> {
  return mergeUserIntoUser({
    sourceUserId: input.guestUserId,
    targetUserId: input.recipientUserId,
    mergeActorUserId: input.inviterUserId,
    sourceUserType: "guest",
  });
}

function toHistoryDateKey(value: string) {
  return value.slice(0, 10);
}

function getEarlierHistoryDate(
  current: string | null,
  candidate: string | null,
): string | null {
  if (!candidate) {
    return current;
  }

  if (!current || candidate < current) {
    return candidate;
  }

  return current;
}

export async function mergeUserIntoUser(
  input: MergeUserIntoUserInput,
): Promise<MergeUserIntoUserResult> {
  const source = await getUserById(input.sourceUserId);

  if (!source) {
    throw new Error("Source user not found");
  }

  const target = await getUserById(input.targetUserId);

  if (!target || target.mergedIntoUserId) {
    throw new Error("Target user not found");
  }

  if (source.mergedIntoUserId) {
    throw new Error("Source user has already been merged");
  }

  if (source.id === target.id) {
    throw new Error("Source and target cannot be the same user");
  }

  if (input.sourceUserType === "guest" && !source.isGuest) {
    throw new Error("Only guest users can be merged");
  }

  if (input.sourceUserType === "registered") {
    if (source.isGuest) {
      throw new Error("Registered-user merges require a non-guest source account");
    }

    if (target.isGuest) {
      throw new Error("Registered-user merges require a non-guest target account");
    }
  }

  const [
    sourcePlayers,
    targetPlayers,
    earliestSourceRankResult,
    earliestSourceRankHistory,
    earliestTargetRankHistory,
  ] = await Promise.all([
    getGamePlayersByUserId(source.id),
    getGamePlayersByUserId(target.id),
    db.query.gamePlayerRankResults.findFirst({
      where: eq(gamePlayerRankResults.userId, source.id),
      orderBy: [asc(gamePlayerRankResults.gameCompletedAt), asc(gamePlayerRankResults.gameId)],
      columns: {
        gameCompletedAt: true,
      },
    }),
    db.query.playerRankHistory.findFirst({
      where: eq(playerRankHistory.userId, source.id),
      orderBy: [asc(playerRankHistory.historyDate)],
      columns: {
        historyDate: true,
      },
    }),
    db.query.playerRankHistory.findFirst({
      where: eq(playerRankHistory.userId, target.id),
      orderBy: [asc(playerRankHistory.historyDate)],
      columns: {
        historyDate: true,
      },
    }),
  ]);

  let earliestRankRebuildDate = getEarlierHistoryDate(
    null,
    earliestSourceRankResult?.gameCompletedAt
      ? toHistoryDateKey(earliestSourceRankResult.gameCompletedAt)
      : null,
  );
  earliestRankRebuildDate = getEarlierHistoryDate(
    earliestRankRebuildDate,
    earliestSourceRankHistory?.historyDate ?? null,
  );
  earliestRankRebuildDate = getEarlierHistoryDate(
    earliestRankRebuildDate,
    earliestTargetRankHistory?.historyDate ?? null,
  );

  const targetGamePlayerByGameId = new Map(
    targetPlayers.map((player) => [player.gameId, player]),
  );

  let mergedGamePlayerCount = 0;
  let deletedDuplicateGamePlayerCount = 0;
  await db.transaction(async (tx) => {
    for (const sourcePlayer of sourcePlayers) {
      const targetPlayer = targetGamePlayerByGameId.get(sourcePlayer.gameId);

      if (targetPlayer) {
        await tx.delete(gamePlayers).where(eq(gamePlayers.id, sourcePlayer.id));
        deletedDuplicateGamePlayerCount += 1;
        continue;
      }

      await tx
        .update(gamePlayers)
        .set({
          userId: target.id,
        })
        .where(eq(gamePlayers.id, sourcePlayer.id));
      mergedGamePlayerCount += 1;
    }

    const [sourceWinnerRows, targetWinnerRows] = await Promise.all([
      tx.query.gameWinners.findMany({
        where: eq(gameWinners.userId, source.id),
      }),
      tx.query.gameWinners.findMany({
        where: eq(gameWinners.userId, target.id),
      }),
    ]);

    const targetWinnerGameIds = new Set(
      targetWinnerRows.map((winner) => winner.gameId),
    );

    for (const sourceWinner of sourceWinnerRows) {
      if (targetWinnerGameIds.has(sourceWinner.gameId)) {
        await tx
          .delete(gameWinners)
          .where(
            and(
              eq(gameWinners.gameId, sourceWinner.gameId),
              eq(gameWinners.userId, source.id),
            ),
          );
        continue;
      }

      await tx
        .update(gameWinners)
        .set({
          userId: target.id,
        })
        .where(
          and(
            eq(gameWinners.gameId, sourceWinner.gameId),
            eq(gameWinners.userId, source.id),
          ),
        );
    }

    const [sourceRankRows, targetRankRows] = await Promise.all([
      tx.query.gamePlayerRankResults.findMany({
        where: eq(gamePlayerRankResults.userId, source.id),
      }),
      tx.query.gamePlayerRankResults.findMany({
        where: eq(gamePlayerRankResults.userId, target.id),
      }),
    ]);

    const targetRankGameIds = new Set(
      targetRankRows.map((result) => result.gameId),
    );

    for (const sourceRankRow of sourceRankRows) {
      if (targetRankGameIds.has(sourceRankRow.gameId)) {
        await tx
          .delete(gamePlayerRankResults)
          .where(
            and(
              eq(gamePlayerRankResults.gameId, sourceRankRow.gameId),
              eq(gamePlayerRankResults.userId, source.id),
            ),
          );
        continue;
      }

      await tx
        .update(gamePlayerRankResults)
        .set({
          userId: target.id,
        })
        .where(
          and(
            eq(gamePlayerRankResults.gameId, sourceRankRow.gameId),
            eq(gamePlayerRankResults.userId, source.id),
          ),
        );
    }

    const [sourceRankHistoryRows, targetRankHistoryRows] = await Promise.all([
      tx.query.playerRankHistory.findMany({
        where: eq(playerRankHistory.userId, source.id),
      }),
      tx.query.playerRankHistory.findMany({
        where: eq(playerRankHistory.userId, target.id),
      }),
    ]);

    const targetHistoryDates = new Set(
      targetRankHistoryRows.map((row) => row.historyDate),
    );

    for (const sourceHistoryRow of sourceRankHistoryRows) {
      if (targetHistoryDates.has(sourceHistoryRow.historyDate)) {
        await tx
          .delete(playerRankHistory)
          .where(
            and(
              eq(playerRankHistory.userId, source.id),
              eq(playerRankHistory.historyDate, sourceHistoryRow.historyDate),
            ),
          );
        continue;
      }

      await tx
        .update(playerRankHistory)
        .set({
          userId: target.id,
        })
        .where(
          and(
            eq(playerRankHistory.userId, source.id),
            eq(playerRankHistory.historyDate, sourceHistoryRow.historyDate),
          ),
        );
    }

    await tx
      .update(gameRoundScores)
      .set({
        userId: target.id,
      })
      .where(eq(gameRoundScores.userId, source.id));

    const [sourceTitleOwnershipRows, targetTitleOwnershipRows] = await Promise.all([
      tx.query.userGameTitle.findMany({
        where: eq(userGameTitle.userId, source.id),
      }),
      tx.query.userGameTitle.findMany({
        where: eq(userGameTitle.userId, target.id),
      }),
    ]);

    const targetOwnedTitleIds = new Set(
      targetTitleOwnershipRows.map((ownership) => ownership.gameTitleId),
    );

    for (const sourceOwnership of sourceTitleOwnershipRows) {
      if (targetOwnedTitleIds.has(sourceOwnership.gameTitleId)) {
        await tx
          .delete(userGameTitle)
          .where(
            and(
              eq(userGameTitle.userId, source.id),
              eq(userGameTitle.gameTitleId, sourceOwnership.gameTitleId),
            ),
          );
        continue;
      }

      await tx
        .update(userGameTitle)
        .set({
          userId: target.id,
        })
        .where(
          and(
            eq(userGameTitle.userId, source.id),
            eq(userGameTitle.gameTitleId, sourceOwnership.gameTitleId),
          ),
        );
    }

    const sourceFriendships = await tx.query.friendships.findMany({
      where: or(eq(friendships.user1Id, source.id), eq(friendships.user2Id, source.id)),
    });

    for (const friendship of sourceFriendships) {
      const otherUserId =
        friendship.user1Id === source.id ? friendship.user2Id : friendship.user1Id;
      const [nextUser1Id, nextUser2Id] =
        otherUserId < target.id
          ? [otherUserId, target.id]
          : [target.id, otherUserId];

      if (
        otherUserId === target.id ||
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
          friendship.inviterId === source.id
            ? target.id
            : friendship.inviterId,
        createdAt: friendship.createdAt,
      });
    }

    await Promise.all([
      tx
        .update(cards)
        .set({
          ownerId: target.id,
        })
        .where(eq(cards.ownerId, source.id)),
      tx
        .update(cardDrops)
        .set({
          userId: target.id,
        })
        .where(eq(cardDrops.userId, source.id)),
      tx
        .update(invitations)
        .set({
          inviterUserId: target.id,
        })
        .where(eq(invitations.inviterUserId, source.id)),
      tx
        .update(invitations)
        .set({
          inviteeUserId: target.id,
        })
        .where(eq(invitations.inviteeUserId, source.id)),
      tx
        .update(invitations)
        .set({
          guestUserId: target.id,
        })
        .where(eq(invitations.guestUserId, source.id)),
      tx
        .update(invitations)
        .set({
          acceptedByUserId: target.id,
        })
        .where(eq(invitations.acceptedByUserId, source.id)),
      tx
        .update(gameTitle)
        .set({
          createdByUserId: target.id,
        })
        .where(eq(gameTitle.createdByUserId, source.id)),
      tx
        .update(userGameTitle)
        .set({
          acquiredFromUserId: target.id,
        })
        .where(eq(userGameTitle.acquiredFromUserId, source.id)),
      tx
        .update(games)
        .set({
          creatorId: target.id,
        })
        .where(eq(games.creatorId, source.id)),
      tx
        .update(users)
        .set({
          created_by_user_id: target.id,
        })
        .where(eq(users.created_by_user_id, source.id)),
      tx
        .update(users)
        .set({
          mergedIntoUserId: target.id,
          mergedAt: nowIso(),
          updatedAt: nowIso(),
        })
        .where(eq(users.id, source.id)),
    ]);
  });

  if (earliestRankRebuildDate && (await getActivePlayerRankConfig())) {
    await rebuildPlayerRankHistoryFromDate({
      startDate: earliestRankRebuildDate,
    });
  }

  await db.delete(users).where(eq(users.id, source.id));

  return {
    mergedGamePlayerCount,
    deletedDuplicateGamePlayerCount,
  };
}
