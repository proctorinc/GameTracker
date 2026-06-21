import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createUserFixture } from "../../fixtures/users";
import { withTestDatabase } from "../../helpers/test-db";

function mockAuthenticatedUser(userId: string) {
  vi.doMock("@/lib/auth/auth-me", () => ({
    loadCurrentUser: async () => {
      const { getUserById } = await import("@/lib/db/store/user.store");
      const user = await getUserById(userId);

      if (!user) {
        throw new Error(`Missing test user ${userId}`);
      }

      return user;
    },
  }));
  vi.doMock("@/lib/auth/protected-session", () => ({
    loadUser: async () => {
      const { getUserById } = await import("@/lib/db/store/user.store");
      const user = await getUserById(userId);

      if (!user) {
        throw new Error(`Missing test user ${userId}`);
      }

      return { user };
    },
  }));
  vi.doMock("@/lib/server-request-context", () => ({
    getServerRequestContext: async () => ({}),
    getRequestContextFromRequest: () => ({}),
  }));
  vi.doMock("next/navigation", () => ({
    redirect: (location: string) => {
      throw new Error(`Unexpected redirect to ${location}`);
    },
  }));
}

describe("server action integration", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("creates a phone invitation for the authenticated user", async () => {
    await withTestDatabase(async () => {
      const user = await createUserFixture();
      mockAuthenticatedUser(user.id);
      const revalidatePath = vi.fn();
      const revalidateTag = vi.fn();
      vi.doMock("next/cache", () => ({
        revalidatePath,
        revalidateTag,
      }));

      const { createFriendInvitationByPhone } = await import("../../../src/app/actions/friends");

      const formData = new FormData();
      formData.set("phoneNumber", "15554443333");

      const result = await createFriendInvitationByPhone(formData);
      expect(result.targetType).toBe("phone");

      const { getInvitationById } = await import("../../../src/lib/db/store/invitation.store");
      const invitation = await getInvitationById(result.invitationId);

      expect(invitation?.inviteePhoneNumber).toBe("+15554443333");
      const { getFriendsTag } = await import("../../../src/lib/cache-tags");
      expect(revalidateTag).toHaveBeenCalledWith(getFriendsTag(user.id), "max");
    }, "friends-action");
  });

  it("creates a configured game and adds the current user as a player", async () => {
    await withTestDatabase(async () => {
      const user = await createUserFixture();
      mockAuthenticatedUser(user.id);

      const { createConfiguredGame } = await import("../../../src/app/actions/game");

      const createdGame = await createConfiguredGame({
        gameTitleName: "Skybo Test Title",
        scoringMode: "highest_wins",
        endingMode: "round_count",
        targetRounds: 5,
      });

      const { getGameById, listGameTitles } = await import("../../../src/lib/db/store/game.store");
      const persistedGame = await getGameById(createdGame.id);
      const titles = await listGameTitles(user.id);

      expect(persistedGame?.creatorId).toBe(user.id);
      expect(persistedGame?.players).toHaveLength(1);
      expect(persistedGame?.targetRounds).toBe(5);
      expect(titles.some((title) => title.title === "Skybo Test Title")).toBe(true);
    }, "game-action");
  });

  it("creates a rematch with the same players and settings but reset progress", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture();
      const opponent = await createUserFixture();
      mockAuthenticatedUser(creator.id);

      const {
        createConfiguredGame,
        commitGameRound,
        addGamePlayer,
        createRematchGame,
        setGamePlayerManager,
      } = await import("../../../src/app/actions/game");

      const originalGame = await createConfiguredGame({
        gameTitleName: "Rematch Fixture",
        scoringMode: "lowest_wins",
        endingMode: "round_count",
        targetRounds: 3,
      });

      await addGamePlayer({
        gameId: originalGame.id,
        userId: opponent.id,
      });
      await setGamePlayerManager({
        gameId: originalGame.id,
        userId: opponent.id,
        isManager: true,
      });

      const { upsertActiveRoundScore, getGame } = await import(
        "../../../src/app/actions/game"
      );

      await upsertActiveRoundScore({
        gameId: originalGame.id,
        userId: creator.id,
        scoreDelta: 10,
      });
      await upsertActiveRoundScore({
        gameId: originalGame.id,
        userId: opponent.id,
        scoreDelta: 15,
      });
      await commitGameRound({
        gameId: originalGame.id,
        completeGame: true,
      });

      const rematch = await createRematchGame(originalGame.id);
      const persistedRematch = await getGame(rematch.id);

      expect(rematch.id).not.toBe(originalGame.id);
      expect(rematch.creatorId).toBe(creator.id);
      expect(rematch.gameTitleId).toBe(originalGame.gameTitleId);
      expect(rematch.scoringMode).toBe("lowest_wins");
      expect(rematch.endingMode).toBe("round_count");
      expect(rematch.targetRounds).toBe(3);
      expect(rematch.completedRounds).toBe(0);
      expect(rematch.completedAt).toBeNull();
      expect(persistedRematch?.players.map((player) => player.userId)).toEqual(
        expect.arrayContaining([creator.id, opponent.id]),
      );
      expect(persistedRematch?.players).toHaveLength(2);
      expect(
        persistedRematch?.players.find((player) => player.userId === opponent.id)?.isManager,
      ).toBe(true);
      expect(persistedRematch?.rounds).toHaveLength(0);
    }, "game-rematch-action");
  });

  it("lets the creator promote a player to manager", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture();
      const teammate = await createUserFixture();
      mockAuthenticatedUser(creator.id);

      const { createConfiguredGame, addGamePlayer, setGamePlayerManager, getGame } =
        await import("../../../src/app/actions/game");

      const game = await createConfiguredGame({
        gameTitleName: "Manager Fixture",
        scoringMode: "lowest_wins",
        endingMode: "none",
      });

      await addGamePlayer({
        gameId: game.id,
        userId: teammate.id,
      });
      await setGamePlayerManager({
        gameId: game.id,
        userId: teammate.id,
        isManager: true,
      });

      const persistedGame = await getGame(game.id);

      expect(
        persistedGame?.players.find((player) => player.userId === teammate.id)?.isManager,
      ).toBe(true);
    }, "game-manager-promote-action");
  });

  it("writes and clears player rank history when a game is completed and reopened", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture();
      const opponent = await createUserFixture();

      mockAuthenticatedUser(creator.id);
      vi.doMock("next/cache", () => ({
        revalidateTag: vi.fn(),
      }));

      const {
        addGamePlayer,
        completeGame,
        createConfiguredGame,
        reopenCompletedGame,
        upsertActiveRoundScore,
      } = await import("../../../src/app/actions/game");

      const game = await createConfiguredGame({
        gameTitleName: "Player Rank Fixture",
        scoringMode: "lowest_wins",
        endingMode: "none",
      });

      await addGamePlayer({
        gameId: game.id,
        userId: opponent.id,
      });

      await upsertActiveRoundScore({
        gameId: game.id,
        userId: creator.id,
        scoreDelta: 12,
      });
      await upsertActiveRoundScore({
        gameId: game.id,
        userId: opponent.id,
        scoreDelta: 24,
      });
      await completeGame({
        gameId: game.id,
      });

      const { db, gamePlayerRankResults } = await import("../../../src/lib/db");
      const rankRows = await db.query.gamePlayerRankResults.findMany({
        where: eq(gamePlayerRankResults.gameId, game.id),
      });
      const historyRows = await db.query.playerRankHistory.findMany();

      expect(rankRows).toHaveLength(2);
      expect(historyRows.length).toBeGreaterThan(0);
      expect(
        rankRows.find((row) => row.userId === creator.id)?.pointsAwardedMinor,
      ).toBe(5000);
      expect(
        rankRows.find((row) => row.userId === opponent.id)?.pointsAwardedMinor,
      ).toBe(0);

      await reopenCompletedGame({
        gameId: game.id,
      });

      const clearedRows = await db.query.gamePlayerRankResults.findMany({
        where: eq(gamePlayerRankResults.gameId, game.id),
      });
      const clearedHistoryRows = await db.query.playerRankHistory.findMany();

      expect(clearedRows).toHaveLength(0);
      expect(clearedHistoryRows).toHaveLength(0);
    }, "player-rank-complete-action");
  });

  it("blocks non-manager players from updating live scores", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture();
      const opponent = await createUserFixture();

      mockAuthenticatedUser(creator.id);
      const { createConfiguredGame, addGamePlayer } = await import(
        "../../../src/app/actions/game"
      );

      const game = await createConfiguredGame({
        gameTitleName: "Manager Permissions",
        scoringMode: "lowest_wins",
        endingMode: "none",
      });
      await addGamePlayer({
        gameId: game.id,
        userId: opponent.id,
      });

      vi.resetModules();
      mockAuthenticatedUser(opponent.id);

      const { upsertActiveRoundScore } = await import("../../../src/app/actions/game");

      await expect(
        upsertActiveRoundScore({
          gameId: game.id,
          userId: creator.id,
          scoreDelta: 5,
        }),
      ).rejects.toThrow("Only the game creator or a manager can do that");
    }, "game-manager-score-block-action");
  });

  it("lets managers run live play actions", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture();
      const manager = await createUserFixture();

      mockAuthenticatedUser(creator.id);
      const { createConfiguredGame, addGamePlayer, setGamePlayerManager } = await import(
        "../../../src/app/actions/game"
      );

      const game = await createConfiguredGame({
        gameTitleName: "Manager Live Play",
        scoringMode: "lowest_wins",
        endingMode: "none",
      });
      await addGamePlayer({
        gameId: game.id,
        userId: manager.id,
      });
      await setGamePlayerManager({
        gameId: game.id,
        userId: manager.id,
        isManager: true,
      });

      vi.resetModules();
      mockAuthenticatedUser(manager.id);

      const { addGuestGamePlayer, upsertActiveRoundScore, getGame } = await import(
        "../../../src/app/actions/game"
      );

      await upsertActiveRoundScore({
        gameId: game.id,
        userId: creator.id,
        scoreDelta: 7,
      });
      await addGuestGamePlayer({
        gameId: game.id,
        firstName: "Guest",
      });

      const persistedGame = await getGame(game.id);

      expect(
        persistedGame?.players.find((player) => player.userId === creator.id)?.score,
      ).toBe(7);
      expect(persistedGame?.players.some((player) => player.user.firstName === "Guest")).toBe(
        true,
      );
    }, "game-manager-live-play-action");
  });

  it("keeps manager-only ownership actions blocked for managers", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture();
      const manager = await createUserFixture();

      mockAuthenticatedUser(creator.id);
      const { createConfiguredGame, addGamePlayer, setGamePlayerManager } = await import(
        "../../../src/app/actions/game"
      );

      const game = await createConfiguredGame({
        gameTitleName: "Manager Owner Boundary",
        scoringMode: "lowest_wins",
        endingMode: "none",
      });
      await addGamePlayer({
        gameId: game.id,
        userId: manager.id,
      });
      await setGamePlayerManager({
        gameId: game.id,
        userId: manager.id,
        isManager: true,
      });

      vi.resetModules();
      mockAuthenticatedUser(manager.id);

      const {
        deleteCreatedGame,
        setGamePlayerManager: setManagerAsManager,
        updateGameSettings,
      } = await import("../../../src/app/actions/game");

      await expect(
        setManagerAsManager({
          gameId: game.id,
          userId: creator.id,
          isManager: true,
        }),
      ).rejects.toThrow("Only the game creator can do that");

      await expect(
        updateGameSettings({
          gameId: game.id,
          scoringMode: "highest_wins",
          endingMode: "none",
          trackRounds: false,
          targetRounds: null,
          scoreThreshold: null,
          scoreThresholdDirection: null,
        }),
      ).rejects.toThrow("Only the game creator can do that");

      await expect(
        deleteCreatedGame({
          gameId: game.id,
        }),
      ).rejects.toThrow("Only the game creator can do that");
    }, "game-manager-owner-boundary-action");
  });

  it("marks the profile complete and sets a short-lived bypass cookie", async () => {
    await withTestDatabase(async () => {
      const user = await createUserFixture({
        firstName: null,
        lastName: null,
        color: "#FFFFFF",
        isProfileComplete: false,
      });
      mockAuthenticatedUser(user.id);

      const revalidatePath = vi.fn();
      const revalidateTag = vi.fn();
      const cookieSet = vi.fn();

      vi.doMock("next/cache", () => ({
        revalidatePath,
        revalidateTag,
      }));
      vi.doMock("next/headers", () => ({
        cookies: async () => ({
          set: cookieSet,
        }),
      }));

      const {
        updateUserProfile,
      } = await import("../../../src/app/actions/user");
      const {
        PROFILE_COMPLETION_BYPASS_COOKIE,
      } = await import("../../../src/lib/auth/profile-completion-cookie");
      await updateUserProfile({
        firstName: "Sky",
        lastName: "Bo",
        color: "#3B82F6",
      });

      const { getUserById } = await import("../../../src/lib/db/store/user.store");
      const updatedUser = await getUserById(user.id);

      expect(updatedUser?.firstName).toBe("Sky");
      expect(updatedUser?.lastName).toBe("Bo");
      expect(updatedUser?.color).toBe("#3B82F6");
      expect(updatedUser?.isProfileComplete).toBe(true);
      expect(cookieSet).toHaveBeenCalledWith(
        PROFILE_COMPLETION_BYPASS_COOKIE,
        "1",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          secure: true,
          path: "/",
          maxAge: 30,
        }),
      );
    }, "profile-complete-action");
  });

  it("replaces guest references across game and relationship records during merge", async () => {
    await withTestDatabase(async () => {
      const inviter = await createUserFixture();
      const recipient = await createUserFixture();
      const guest = await createUserFixture({
        isGuest: true,
        created_by_user_id: inviter.id,
      });
      const otherUser = await createUserFixture();
      const childUser = await createUserFixture({
        created_by_user_id: guest.id,
      });

      const {
        db,
        cards,
        cardDrops,
        decks,
        gamePlayers,
        gameRounds,
        gameRoundScores,
        gameTitle,
        gameWinners,
        games,
        userGameTitle,
        users,
      } = await import("../../../src/lib/db");
      const { createFriendship } = await import(
        "../../../src/lib/db/store/friendship.store"
      );
      const { createInvitation } = await import(
        "../../../src/lib/db/store/invitation.store"
      );
      const { mergeGuestUserIntoUser, getUserById } = await import(
        "../../../src/lib/db/store/user.store"
      );

      await createFriendship({
        user1Id: guest.id,
        user2Id: otherUser.id,
        inviterId: guest.id,
      });
      await createFriendship({
        user1Id: recipient.id,
        user2Id: otherUser.id,
        inviterId: recipient.id,
      });

      const [guestCreatedTitle] = await db
        .insert(gameTitle)
        .values({
          title: "Merge Fixture",
          normalizedTitle: `merge-fixture-${guest.id}`,
          createdByUserId: guest.id,
        })
        .returning();

      await db.insert(userGameTitle).values({
        userId: guest.id,
        gameTitleId: guestCreatedTitle.id,
        source: "played",
        acquiredFromUserId: guest.id,
      });
      await db.insert(userGameTitle).values({
        userId: recipient.id,
        gameTitleId: guestCreatedTitle.id,
        source: "shared",
        acquiredFromUserId: guest.id,
      });

      const [soloGuestGame] = await db
        .insert(games)
        .values({
          gameTitleId: guestCreatedTitle.id,
          creatorId: guest.id,
          scoringMode: "highest_wins",
          endingMode: "none",
        })
        .returning();
      const [duplicateSeatGame] = await db
        .insert(games)
        .values({
          gameTitleId: guestCreatedTitle.id,
          creatorId: guest.id,
          scoringMode: "highest_wins",
          endingMode: "none",
        })
        .returning();

      await db.insert(gamePlayers).values([
        {
          gameId: soloGuestGame.id,
          userId: guest.id,
          score: 42,
        },
        {
          gameId: duplicateSeatGame.id,
          userId: guest.id,
          score: 12,
        },
        {
          gameId: duplicateSeatGame.id,
          userId: recipient.id,
          score: 7,
        },
      ]);

      await db.insert(gameWinners).values([
        {
          gameId: soloGuestGame.id,
          userId: guest.id,
        },
        {
          gameId: duplicateSeatGame.id,
          userId: guest.id,
        },
        {
          gameId: duplicateSeatGame.id,
          userId: recipient.id,
        },
      ]);

      const [soloRound] = await db
        .insert(gameRounds)
        .values({
          gameId: soloGuestGame.id,
          roundNumber: 1,
        })
        .returning();
      const [duplicateRound] = await db
        .insert(gameRounds)
        .values({
          gameId: duplicateSeatGame.id,
          roundNumber: 1,
        })
        .returning();

      await db.insert(gameRoundScores).values([
        {
          gameRoundId: soloRound.id,
          userId: guest.id,
          scoreDelta: 42,
        },
        {
          gameRoundId: duplicateRound.id,
          userId: guest.id,
          scoreDelta: 12,
        },
        {
          gameRoundId: duplicateRound.id,
          userId: recipient.id,
          scoreDelta: 7,
        },
      ]);

      await db.insert(decks).values({
        name: "skyjo",
        description: "Test deck",
      });

      await db.insert(cards).values({
        ownerId: guest.id,
        deckName: "skyjo",
        value: 1,
        suit: "sun",
        weight: 1,
        probability: 1,
        suitProbability: 1,
      });
      await db.insert(cardDrops).values({
        userId: guest.id,
        gameId: soloGuestGame.id,
        cardCount: 1,
        deckName: "skyjo",
      });

      await createInvitation({
        inviterUserId: guest.id,
        targetType: "user",
        inviteeUserId: otherUser.id,
        guestUserId: guest.id,
        acceptedByUserId: guest.id,
        kind: "claim_guest",
        status: "accepted",
      });
      await createInvitation({
        inviterUserId: inviter.id,
        targetType: "user",
        inviteeUserId: guest.id,
        kind: "friend",
        status: "pending",
      });

      const mergeResult = await mergeGuestUserIntoUser({
        guestUserId: guest.id,
        recipientUserId: recipient.id,
        inviterUserId: inviter.id,
      });

      expect(mergeResult).toEqual({
        mergedGamePlayerCount: 1,
        deletedDuplicateGamePlayerCount: 1,
      });

      const [
        mergedGuest,
        updatedChild,
        winnerRows,
        playerRows,
        roundScoreRows,
        cardRows,
        cardDropRows,
        invitationRows,
        titleRows,
        titleOwnershipRows,
        friendshipRows,
        createdGames,
      ] = await Promise.all([
        getUserById(guest.id),
        getUserById(childUser.id),
        db.query.gameWinners.findMany(),
        db.query.gamePlayers.findMany(),
        db.query.gameRoundScores.findMany(),
        db.query.cards.findMany(),
        db.query.cardDrops.findMany(),
        db.query.invitations.findMany(),
        db.query.gameTitle.findMany(),
        db.query.userGameTitle.findMany(),
        db.query.friendships.findMany(),
        db.query.games.findMany(),
      ]);

      expect(mergedGuest).toBeNull();
      expect(updatedChild?.created_by_user_id).toBe(recipient.id);
      expect(createdGames.every((game) => game.creatorId !== guest.id)).toBe(true);
      expect(createdGames.every((game) => game.creatorId === recipient.id)).toBe(true);
      expect(titleRows.every((title) => title.createdByUserId === recipient.id)).toBe(true);
      expect(cardRows.every((card) => card.ownerId === recipient.id)).toBe(true);
      expect(cardDropRows.every((drop) => drop.userId === recipient.id)).toBe(true);
      expect(winnerRows.every((winner) => winner.userId === recipient.id)).toBe(true);
      expect(playerRows.every((player) => player.userId === recipient.id)).toBe(true);
      expect(roundScoreRows.every((score) => score.userId === recipient.id)).toBe(true);
      expect(
        winnerRows.filter((winner) => winner.gameId === duplicateSeatGame.id),
      ).toHaveLength(1);
      expect(
        playerRows.filter((player) => player.gameId === duplicateSeatGame.id),
      ).toHaveLength(1);
      expect(
        titleOwnershipRows.filter(
          (ownership) =>
            ownership.userId === recipient.id &&
            ownership.gameTitleId === guestCreatedTitle.id,
        ),
      ).toHaveLength(1);
      expect(titleOwnershipRows.some((ownership) => ownership.userId === guest.id)).toBe(
        false,
      );
      expect(
        friendshipRows.some(
          (friendship) =>
            friendship.user1Id === guest.id || friendship.user2Id === guest.id,
        ),
      ).toBe(false);
      expect(
        invitationRows.some(
          (invitation) =>
            invitation.inviterUserId === guest.id ||
            invitation.inviteeUserId === guest.id ||
            invitation.guestUserId === guest.id ||
            invitation.acceptedByUserId === guest.id,
        ),
      ).toBe(false);

      const refreshedGuest = await db.query.users.findFirst({
        where: eq(users.id, guest.id),
      });
      expect(refreshedGuest).toBeFalsy();
    }, "guest-merge");
  });

  it("allows a non-creator to merge a guest into another user", async () => {
    await withTestDatabase(async () => {
      const guestCreator = await createUserFixture();
      const mergeActor = await createUserFixture();
      const recipient = await createUserFixture();
      const guest = await createUserFixture({
        isGuest: true,
        created_by_user_id: guestCreator.id,
      });

      const { db, gamePlayers, games, gameTitle } = await import(
        "../../../src/lib/db"
      );
      const { mergeGuestUserIntoUser, getUserById } = await import(
        "../../../src/lib/db/store/user.store"
      );

      const [title] = await db
        .insert(gameTitle)
        .values({
          title: "Non Creator Merge Fixture",
          normalizedTitle: `non-creator-merge-${guest.id}`,
          createdByUserId: guestCreator.id,
        })
        .returning();

      const [game] = await db
        .insert(games)
        .values({
          gameTitleId: title.id,
          creatorId: guest.id,
          scoringMode: "highest_wins",
          endingMode: "none",
        })
        .returning();

      await db.insert(gamePlayers).values({
        gameId: game.id,
        userId: guest.id,
        score: 18,
      });

      const mergeResult = await mergeGuestUserIntoUser({
        guestUserId: guest.id,
        recipientUserId: recipient.id,
        inviterUserId: mergeActor.id,
      });

      expect(mergeResult).toEqual({
        mergedGamePlayerCount: 1,
        deletedDuplicateGamePlayerCount: 0,
      });

      const [mergedGuest, playerRows] = await Promise.all([
        getUserById(guest.id),
        db.query.gamePlayers.findMany(),
      ]);

      expect(mergedGuest).toBeNull();
      expect(playerRows).toHaveLength(1);
      expect(playerRows[0]).toMatchObject({
        gameId: game.id,
        userId: recipient.id,
        score: 18,
      });
    }, "guest-merge-non-creator");
  });

  it("rebuilds player rank history onto the recipient during a guest merge", async () => {
    await withTestDatabase(async () => {
      const dayOne = "2026-06-10T12:00:00.000Z";
      const dayTwo = "2026-06-11T12:00:00.000Z";
      const inviter = await createUserFixture({ createdAt: dayOne });
      const recipient = await createUserFixture({
        firstName: "Recipient",
        createdAt: dayOne,
      });
      const guest = await createUserFixture({
        firstName: "Guest",
        isGuest: true,
        created_by_user_id: inviter.id,
        createdAt: dayOne,
      });

      const { db, games, gamePlayerRankResults, playerRankConfigs, playerRankHistory } =
        await import("../../../src/lib/db");
      const {
        getGuestMergeReferenceReport,
        getUserById,
        mergeGuestUserIntoUser,
      } = await import("../../../src/lib/db/store/user.store");
      const {
        getUserPlayerRankSummary,
        listPlayerRankHistorySeries,
        rebuildPlayerRankHistoryFromDate,
      } = await import("../../../src/lib/db/store/player-rank.store");

      const [config] = await db
        .insert(playerRankConfigs)
        .values({
          version: "v1",
          isActive: true,
          windowMonths: 6,
          defaultMaxPrizePool: 40000,
          prizePoolByPlayerCountJson: JSON.stringify({
            2: 5000,
            3: 10000,
            4: 20000,
          }),
          smallGameDistributionJson: JSON.stringify({
            2: [10000, 0, 0],
            3: [10000, 0, 0],
          }),
          largeGameDistributionJson: JSON.stringify([6000, 3000, 1000]),
          createdByUserId: inviter.id,
          createdAt: dayOne,
        })
        .returning();

      if (!config) {
        throw new Error("Missing player rank config");
      }

      await db.insert(games).values([
        {
          id: "guest-rank-game",
          creatorId: guest.id,
          scoringMode: "highest_wins",
          completedAt: dayOne,
        },
        {
          id: "recipient-rank-game",
          creatorId: recipient.id,
          scoringMode: "highest_wins",
          completedAt: dayTwo,
        },
      ]);

      await db.insert(gamePlayerRankResults).values([
        {
          gameId: "guest-rank-game",
          userId: guest.id,
          gameCompletedAt: dayOne,
          playerCount: 2,
          placement: 1,
          tieSize: 1,
          rankConfigId: config.id,
          prizePoolMinor: 5000,
          payoutPercentBps: 10000,
          pointsAwardedMinor: 5000,
          createdAt: dayOne,
        },
        {
          gameId: "recipient-rank-game",
          userId: recipient.id,
          gameCompletedAt: dayTwo,
          playerCount: 2,
          placement: 1,
          tieSize: 1,
          rankConfigId: config.id,
          prizePoolMinor: 2000,
          payoutPercentBps: 10000,
          pointsAwardedMinor: 2000,
          createdAt: dayTwo,
        },
      ]);

      await rebuildPlayerRankHistoryFromDate({
        startDate: dayOne,
        now: new Date(dayTwo),
      });

      await db.insert(playerRankHistory).values({
        userId: guest.id,
        historyDate: "2026-06-10",
        playerRankPosition: 1,
        playerRankTotalMinor: 5000,
        playerRankGamesCount: 1,
        topThreeFinishes: 1,
        createdAt: dayOne,
        updatedAt: dayOne,
      });

      const beforeReport = await getGuestMergeReferenceReport({
        guestUserId: guest.id,
        recipientUserId: recipient.id,
      });
      expect(beforeReport.guestReferences.playerRankHistoryUser).toBe(1);

      await mergeGuestUserIntoUser({
        guestUserId: guest.id,
        recipientUserId: recipient.id,
        inviterUserId: inviter.id,
      });

      expect(await getUserById(guest.id)).toBeNull();

      const [historyRows, rankSummary, historySeries] = await Promise.all([
        db.query.playerRankHistory.findMany({
          orderBy: (table, { asc }) => [asc(table.historyDate), asc(table.userId)],
        }),
        getUserPlayerRankSummary(recipient.id),
        listPlayerRankHistorySeries({
          userIds: [recipient.id],
          days: 2,
          now: new Date(dayTwo),
        }),
      ]);

      expect(historyRows.some((row) => row.userId === guest.id)).toBe(false);
      expect(
        historyRows.filter((row) => row.userId === recipient.id).map((row) => row.historyDate),
      ).toEqual(["2026-06-10", "2026-06-11"]);
      expect(rankSummary?.playerRankTotalMinor).toBe(7000);
      expect(
        historySeries.pointsByUserId[recipient.id]?.map(
          (point) => point.playerRankTotalMinor,
        ),
      ).toEqual([5000, 7000]);
    }, "guest-merge-rank-history");
  });

  it("deduplicates overlapping ranked-game rows during guest merge rebuilds", async () => {
    await withTestDatabase(async () => {
      const rankedAt = "2026-06-10T12:00:00.000Z";
      const inviter = await createUserFixture({ createdAt: rankedAt });
      const recipient = await createUserFixture({
        firstName: "Recipient",
        createdAt: rankedAt,
      });
      const guest = await createUserFixture({
        firstName: "Guest",
        isGuest: true,
        created_by_user_id: inviter.id,
        createdAt: rankedAt,
      });

      const { db, games, gamePlayerRankResults, playerRankConfigs } = await import(
        "../../../src/lib/db"
      );
      const { mergeGuestUserIntoUser } = await import(
        "../../../src/lib/db/store/user.store"
      );
      const {
        getUserPlayerRankSummary,
        rebuildPlayerRankHistoryFromDate,
      } = await import("../../../src/lib/db/store/player-rank.store");

      const [config] = await db
        .insert(playerRankConfigs)
        .values({
          version: "v1",
          isActive: true,
          windowMonths: 6,
          defaultMaxPrizePool: 40000,
          prizePoolByPlayerCountJson: JSON.stringify({
            2: 5000,
            3: 10000,
          }),
          smallGameDistributionJson: JSON.stringify({
            2: [10000, 0, 0],
            3: [10000, 0, 0],
          }),
          largeGameDistributionJson: JSON.stringify([6000, 3000, 1000]),
          createdByUserId: inviter.id,
          createdAt: rankedAt,
        })
        .returning();

      if (!config) {
        throw new Error("Missing player rank config");
      }

      await db.insert(games).values({
        id: "shared-rank-game",
        creatorId: inviter.id,
        scoringMode: "highest_wins",
        completedAt: rankedAt,
      });

      await db.insert(gamePlayerRankResults).values([
        {
          gameId: "shared-rank-game",
          userId: recipient.id,
          gameCompletedAt: rankedAt,
          playerCount: 2,
          placement: 1,
          tieSize: 1,
          rankConfigId: config.id,
          prizePoolMinor: 5000,
          payoutPercentBps: 10000,
          pointsAwardedMinor: 5000,
          createdAt: rankedAt,
        },
        {
          gameId: "shared-rank-game",
          userId: guest.id,
          gameCompletedAt: rankedAt,
          playerCount: 2,
          placement: 2,
          tieSize: 1,
          rankConfigId: config.id,
          prizePoolMinor: 5000,
          payoutPercentBps: 0,
          pointsAwardedMinor: 0,
          createdAt: rankedAt,
        },
      ]);

      await rebuildPlayerRankHistoryFromDate({
        startDate: rankedAt,
        now: new Date(rankedAt),
      });

      const mergeResult = await mergeGuestUserIntoUser({
        guestUserId: guest.id,
        recipientUserId: recipient.id,
        inviterUserId: inviter.id,
      });

      const [rankRows, summary, historyRows] = await Promise.all([
        db.query.gamePlayerRankResults.findMany({
          where: eq(gamePlayerRankResults.gameId, "shared-rank-game"),
        }),
        getUserPlayerRankSummary(recipient.id),
        db.query.playerRankHistory.findMany(),
      ]);

      expect(mergeResult.deletedDuplicateGamePlayerCount).toBe(0);
      expect(rankRows).toHaveLength(1);
      expect(rankRows[0]?.userId).toBe(recipient.id);
      expect(summary?.playerRankTotalMinor).toBe(5000);
      expect(historyRows.some((row) => row.userId === guest.id)).toBe(false);
    }, "guest-merge-rank-duplicates");
  });
});
