import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createUserFixture } from "../../fixtures/users";
import { withTestDatabase } from "../../helpers/test-db";

vi.mock("server-only", () => ({}));

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

  it("creates a reusable friend invite link once and reuses it", async () => {
    await withTestDatabase(async () => {
      const user = await createUserFixture();
      mockAuthenticatedUser(user.id);
      vi.doMock("next/cache", () => ({
        revalidatePath: vi.fn(),
        revalidateTag: vi.fn(),
      }));

      const { getOrCreateFriendInviteLink } = await import("../../../src/app/actions/user");
      const { getUserById } = await import("../../../src/lib/db/store/user.store");

      const first = await getOrCreateFriendInviteLink();
      const second = await getOrCreateFriendInviteLink();
      const persisted = await getUserById(user.id);

      expect(first.invitePath).toBe(second.invitePath);
      expect(first.invitePath).toMatch(/^\/invite\//);
      expect(persisted?.friendInviteToken).toBeTruthy();
    }, "friend-invite-link-action");
  });

  it("creates a stable share token for each game", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture();
      mockAuthenticatedUser(creator.id);

      const { createConfiguredGame } = await import("../../../src/app/actions/game");
      const { getGameByShareToken, getOrCreateGameShareToken } = await import(
        "../../../src/lib/db/store/game.store"
      );

      const game = await createConfiguredGame({
        gameTitleName: "Shared Game Fixture",
        scoringMode: "lowest_wins",
        endingMode: "none",
      });

      const firstToken = await getOrCreateGameShareToken(game.id);
      const secondToken = await getOrCreateGameShareToken(game.id);
      const sharedGame = await getGameByShareToken(firstToken);

      expect(firstToken).toBe(secondToken);
      expect(sharedGame?.id).toBe(game.id);
    }, "game-share-token");
  });

  it("auto-joins a shared game before it starts and makes the users friends", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture();
      const joiner = await createUserFixture();
      mockAuthenticatedUser(creator.id);

      const { createConfiguredGame, getGame } = await import(
        "../../../src/app/actions/game"
      );
      const { getOrCreateGameShareToken } = await import(
        "../../../src/lib/db/store/game.store"
      );

      const game = await createConfiguredGame({
        gameTitleName: "Auto Join Fixture",
        scoringMode: "lowest_wins",
        endingMode: "none",
      });
      const shareToken = await getOrCreateGameShareToken(game.id);

      vi.resetModules();
      mockAuthenticatedUser(joiner.id);

      const { enterSharedGame } = await import("../../../src/app/actions/game");
      const { getFriendshipByUsers } = await import(
        "../../../src/lib/db/store/friendship.store"
      );

      const result = await enterSharedGame({ shareToken });
      const persistedGame = await getGame(game.id);
      const friendship = await getFriendshipByUsers(creator.id, joiner.id);

      expect(result).toEqual({
        status: "joined",
        gameId: game.id,
      });
      expect(persistedGame?.players.map((player) => player.userId)).toEqual(
        expect.arrayContaining([creator.id, joiner.id]),
      );
      expect(friendship).toBeTruthy();
    }, "game-share-auto-join");
  });

  it("turns off direct link joins after scoring starts and creates a join request instead", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture();
      const requester = await createUserFixture();
      mockAuthenticatedUser(creator.id);

      const { createConfiguredGame, getGame, upsertActiveRoundScore } = await import(
        "../../../src/app/actions/game"
      );
      const { getOrCreateGameShareToken } = await import(
        "../../../src/lib/db/store/game.store"
      );

      const game = await createConfiguredGame({
        gameTitleName: "Join Request Fixture",
        scoringMode: "lowest_wins",
        endingMode: "none",
      });
      const shareToken = await getOrCreateGameShareToken(game.id);

      await upsertActiveRoundScore({
        gameId: game.id,
        userId: creator.id,
        scoreDelta: 8,
      });

      expect((await getGame(game.id))?.inviteUsersEnabled).toBe(false);

      vi.resetModules();
      mockAuthenticatedUser(requester.id);

      const { enterSharedGame } = await import("../../../src/app/actions/game");
      const { getPendingJoinRequest } = await import(
        "../../../src/lib/db/store/game-join-request.store"
      );

      const result = await enterSharedGame({ shareToken });
      const request = await getPendingJoinRequest(game.id, requester.id);

      expect(result.status).toBe("requested");
      expect(request).toBeTruthy();
    }, "game-share-request");
  });

  it("approves a mid-game join request using the selected starting score mode", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture();
      const opponent = await createUserFixture();
      const requester = await createUserFixture();
      mockAuthenticatedUser(creator.id);

      const {
        addGamePlayer,
        approveGameJoinRequest,
        commitGameRound,
        createConfiguredGame,
        getGame,
        upsertActiveRoundScore,
      } = await import("../../../src/app/actions/game");
      const { getOrCreateGameShareToken } = await import(
        "../../../src/lib/db/store/game.store"
      );

      const game = await createConfiguredGame({
        gameTitleName: "Approve Join Fixture",
        scoringMode: "lowest_wins",
        endingMode: "round_count",
        targetRounds: 5,
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
        scoreDelta: 8,
      });
      await commitGameRound({
        gameId: game.id,
      });

      const shareToken = await getOrCreateGameShareToken(game.id);

      vi.resetModules();
      mockAuthenticatedUser(requester.id);
      const { enterSharedGame } = await import("../../../src/app/actions/game");
      const requestResult = await enterSharedGame({ shareToken });

      expect(requestResult.status).toBe("requested");

      vi.resetModules();
      mockAuthenticatedUser(creator.id);

      const { getPendingJoinRequest } = await import(
        "../../../src/lib/db/store/game-join-request.store"
      );
      const request = await getPendingJoinRequest(game.id, requester.id);

      expect(request).toBeTruthy();

      await approveGameJoinRequest({
        requestId: request!.id,
        startingScoreMode: "average",
      });

      const persistedGame = await getGame(game.id);
      const addedPlayer = persistedGame?.players.find(
        (player) => player.userId === requester.id,
      );

      expect(addedPlayer?.score).toBe(10);
    }, "game-share-approve");
  });

  it("makes registered participants friends when a game completes without friending guests", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture();
      const opponent = await createUserFixture();
      const third = await createUserFixture();
      const fourth = await createUserFixture();
      mockAuthenticatedUser(creator.id);

      const {
        addGamePlayer,
        addGuestGamePlayer,
        commitGameRound,
        createConfiguredGame,
        upsertActiveRoundScore,
      } = await import("../../../src/app/actions/game");
      const { listFriendships } = await import(
        "../../../src/lib/db/store/friendship.store"
      );

      const game = await createConfiguredGame({
        gameTitleName: "Completion Friendship Fixture",
        scoringMode: "lowest_wins",
        endingMode: "round_count",
        targetRounds: 1,
      });

      await addGamePlayer({ gameId: game.id, userId: opponent.id });
      await addGamePlayer({ gameId: game.id, userId: third.id });
      await addGamePlayer({ gameId: game.id, userId: fourth.id });
      await addGamePlayer({ gameId: game.id, userId: fourth.id });
      await addGamePlayer({ gameId: game.id, userId: fourth.id });
      const guestPlayer = await addGuestGamePlayer({
        gameId: game.id,
        firstName: "Guest",
      });
      await upsertActiveRoundScore({
        gameId: game.id,
        userId: creator.id,
        scoreDelta: 10,
      });
      await upsertActiveRoundScore({
        gameId: game.id,
        userId: opponent.id,
        scoreDelta: 12,
      });
      await upsertActiveRoundScore({
        gameId: game.id,
        userId: third.id,
        scoreDelta: 15,
      });
      await upsertActiveRoundScore({
        gameId: game.id,
        userId: guestPlayer.userId,
        scoreDelta: 20,
      });
      await commitGameRound({
        gameId: game.id,
        completeGame: true,
      });

      const friendships = await listFriendships();
      const friendshipPairs = friendships.map((friendship) =>
        [friendship.user1Id, friendship.user2Id].sort().join(":"),
      );

      expect(friendships).toHaveLength(3);
      expect(friendships.every((friendship) => friendship.inviterId === creator.id)).toBe(
        true,
      );
      expect(friendshipPairs).toEqual(
        expect.arrayContaining([
          [creator.id, opponent.id].sort().join(":"),
          [creator.id, third.id].sort().join(":"),
          [opponent.id, third.id].sort().join(":"),
        ]),
      );
      expect(
        friendships.some(
          (friendship) =>
            friendship.user1Id === guestPlayer.userId ||
            friendship.user2Id === guestPlayer.userId,
        ),
      ).toBe(false);
    }, "game-complete-friendships");
  });

  it("creates a rematch with the same players and settings but reset progress", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture();
      const opponent = await createUserFixture();
      mockAuthenticatedUser(creator.id);
      vi.doMock("server-only", () => ({}));
      vi.doMock("next/cache", () => ({
        revalidatePath: vi.fn(),
        revalidateTag: vi.fn(),
      }));

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

  it("preserves v2 settings and makes the previous creator a manager when another player rematches", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture();
      const manager = await createUserFixture();
      mockAuthenticatedUser(creator.id);
      vi.doMock("server-only", () => ({}));
      vi.doMock("next/cache", () => ({
        revalidatePath: vi.fn(),
        revalidateTag: vi.fn(),
      }));

      const {
        addGamePlayer,
        commitGameRound,
        createConfiguredGame,
        setGameInviteUsersEnabled,
        setGamePlayerManager,
        upsertActiveRoundScore,
      } = await import("../../../src/app/actions/game");
      const { buildCreateGameSettingsFromTemplate } = await import(
        "../../../src/lib/game/v2"
      );
      const settingsV2 = buildCreateGameSettingsFromTemplate({
        template: "point_scoring",
        roundsEnabled: true,
        endConditionMode: "manual",
        winMetric: "lowest_score",
        allowTies: false,
        initialPlayerScore: 7,
      });
      const originalGame = await createConfiguredGame({
        gameTitleName: "V2 Rematch Fixture",
        version: "v2",
        scoringMode: "lowest_wins",
        endingMode: "none",
        settingsV2,
        managementSettings: {
          defaultPlayerRole: "self_scorer",
        },
      });

      await addGamePlayer({
        gameId: originalGame.id,
        userId: manager.id,
      });
      await setGamePlayerManager({
        gameId: originalGame.id,
        userId: manager.id,
        isManager: true,
      });
      await setGameInviteUsersEnabled({
        gameId: originalGame.id,
        enabled: false,
      });
      await upsertActiveRoundScore({
        gameId: originalGame.id,
        userId: creator.id,
        scoreDelta: 3,
      });
      await upsertActiveRoundScore({
        gameId: originalGame.id,
        userId: manager.id,
        scoreDelta: 5,
      });
      await commitGameRound({
        gameId: originalGame.id,
        completeGame: true,
      });

      vi.resetModules();
      mockAuthenticatedUser(manager.id);
      vi.doMock("server-only", () => ({}));
      vi.doMock("next/cache", () => ({
        revalidatePath: vi.fn(),
        revalidateTag: vi.fn(),
      }));
      const {
        commitGameRound: commitRematchRound,
        createRematchGame,
        getGame,
        upsertActiveRoundScore: upsertRematchScore,
      } = await import("../../../src/app/actions/game");
      const { parseGameSettingsV2 } = await import("../../../src/lib/game/v2");

      const rematch = await createRematchGame(originalGame.id);
      const persistedRematch = await getGame(rematch.id);

      expect(rematch.creatorId).toBe(manager.id);
      expect(rematch.version).toBe("v2");
      expect(parseGameSettingsV2(rematch.settingsJson)).toEqual(settingsV2);
      expect(rematch.defaultPlayerRole).toBe("self_scorer");
      expect(rematch.inviteUsersEnabled).toBe(false);
      expect(persistedRematch?.rounds).toHaveLength(0);
      expect(persistedRematch?.players).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userId: creator.id,
            role: "manager",
            isManager: true,
            score: 7,
          }),
          expect.objectContaining({
            userId: manager.id,
            role: "manager",
            isManager: true,
            score: 7,
          }),
        ]),
      );

      await upsertRematchScore({
        gameId: rematch.id,
        userId: creator.id,
        scoreDelta: 1,
      });
      await upsertRematchScore({
        gameId: rematch.id,
        userId: manager.id,
        scoreDelta: 2,
      });
      await commitRematchRound({
        gameId: rematch.id,
        completeGame: true,
      });

      vi.resetModules();
      mockAuthenticatedUser(creator.id);
      vi.doMock("server-only", () => ({}));
      vi.doMock("next/cache", () => ({
        revalidatePath: vi.fn(),
        revalidateTag: vi.fn(),
      }));
      const {
        createRematchGame: createSecondRematch,
        getGame: getSecondRematch,
      } = await import("../../../src/app/actions/game");

      const secondRematch = await createSecondRematch(rematch.id);
      const persistedSecondRematch = await getSecondRematch(secondRematch.id);

      expect(secondRematch.creatorId).toBe(creator.id);
      expect(parseGameSettingsV2(secondRematch.settingsJson)).toEqual(settingsV2);
      expect(persistedSecondRematch?.players).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userId: creator.id,
            role: "manager",
            isManager: true,
            score: 7,
          }),
          expect.objectContaining({
            userId: manager.id,
            role: "manager",
            isManager: true,
            score: 7,
          }),
        ]),
      );
    }, "game-rematch-v2-manager-action");
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

  it("adds a midgame player with the average score and backfills the previous round", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture();
      const opponent = await createUserFixture();
      const teammate = await createUserFixture();
      mockAuthenticatedUser(creator.id);
      vi.doMock("next/cache", () => ({
        revalidatePath: vi.fn(),
        revalidateTag: vi.fn(),
      }));

      const {
        addGamePlayer,
        commitGameRound,
        createConfiguredGame,
        getGame,
        upsertActiveRoundScore,
      } = await import("../../../src/app/actions/game");
      const { db, gameRoundScores } = await import("../../../src/lib/db");

      const game = await createConfiguredGame({
        gameTitleName: "Midgame Average Fixture",
        scoringMode: "lowest_wins",
        endingMode: "round_count",
        targetRounds: 5,
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
        scoreDelta: 8,
      });
      await commitGameRound({
        gameId: game.id,
      });
      await addGamePlayer({
        gameId: game.id,
        userId: teammate.id,
        startingScoreMode: "average",
      });

      const persistedGame = await getGame(game.id);
      const addedPlayer = persistedGame?.players.find(
        (player) => player.userId === teammate.id,
      );
      const roundScoreRows = await db.query.gameRoundScores.findMany({
        where: eq(gameRoundScores.userId, teammate.id),
      });

      expect(addedPlayer?.score).toBe(10);
      expect(roundScoreRows).toHaveLength(1);
      expect(roundScoreRows[0]?.scoreDelta).toBe(10);
    }, "midgame-add-average-action");
  });

  it("adds a guest midgame with the disadvantage score without backfilling when no round is complete", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture();
      const opponent = await createUserFixture();
      mockAuthenticatedUser(creator.id);
      vi.doMock("next/cache", () => ({
        revalidatePath: vi.fn(),
        revalidateTag: vi.fn(),
      }));

      const {
        addGamePlayer,
        addGuestGamePlayer,
        createConfiguredGame,
        getGame,
        upsertActiveRoundScore,
      } = await import("../../../src/app/actions/game");
      const { db, gameRoundScores } = await import("../../../src/lib/db");

      const game = await createConfiguredGame({
        gameTitleName: "Midgame Guest Highest Fixture",
        scoringMode: "lowest_wins",
        endingMode: "round_count",
        targetRounds: 5,
      });

      await addGamePlayer({
        gameId: game.id,
        userId: opponent.id,
      });
      await upsertActiveRoundScore({
        gameId: game.id,
        userId: creator.id,
        scoreDelta: 7,
      });
      await upsertActiveRoundScore({
        gameId: game.id,
        userId: opponent.id,
        scoreDelta: 3,
      });
      await addGuestGamePlayer({
        gameId: game.id,
        firstName: "Guest",
        startingScoreMode: "highest",
      });

      const persistedGame = await getGame(game.id);
      const guestPlayer = persistedGame?.players.find(
        (player) => player.user.firstName === "Guest",
      );
      const guestRoundScoreRows = guestPlayer
        ? await db.query.gameRoundScores.findMany({
            where: eq(gameRoundScores.userId, guestPlayer.userId),
          })
        : [];

      expect(guestPlayer?.score).toBe(7);
      expect(guestRoundScoreRows).toHaveLength(0);
    }, "midgame-add-guest-disadvantage-action");
  });

  it("adds a midgame player with a custom score and backfills the previous round", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture();
      const opponent = await createUserFixture();
      const teammate = await createUserFixture();
      mockAuthenticatedUser(creator.id);
      vi.doMock("next/cache", () => ({
        revalidatePath: vi.fn(),
        revalidateTag: vi.fn(),
      }));

      const {
        addGamePlayer,
        commitGameRound,
        createConfiguredGame,
        getGame,
        upsertActiveRoundScore,
      } = await import("../../../src/app/actions/game");
      const { db, gameRoundScores } = await import("../../../src/lib/db");

      const game = await createConfiguredGame({
        gameTitleName: "Midgame Custom Fixture",
        scoringMode: "lowest_wins",
        endingMode: "round_count",
        targetRounds: 5,
      });

      await addGamePlayer({
        gameId: game.id,
        userId: opponent.id,
      });
      await upsertActiveRoundScore({
        gameId: game.id,
        userId: creator.id,
        scoreDelta: 9,
      });
      await upsertActiveRoundScore({
        gameId: game.id,
        userId: opponent.id,
        scoreDelta: 4,
      });
      await commitGameRound({
        gameId: game.id,
      });
      await addGamePlayer({
        gameId: game.id,
        userId: teammate.id,
        startingScoreMode: "custom",
        startingScoreValue: 17,
      });

      const persistedGame = await getGame(game.id);
      const addedPlayer = persistedGame?.players.find(
        (player) => player.userId === teammate.id,
      );
      const roundScoreRows = await db.query.gameRoundScores.findMany({
        where: eq(gameRoundScores.userId, teammate.id),
      });

      expect(addedPlayer?.score).toBe(17);
      expect(roundScoreRows).toHaveLength(1);
      expect(roundScoreRows[0]?.scoreDelta).toBe(17);
    }, "midgame-add-custom-action");
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

  it("saves Lost Cities defaults through generic round itemized scoring", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture({ role: "admin" });
      const opponent = await createUserFixture();

      mockAuthenticatedUser(creator.id);
      vi.doMock("next/cache", () => ({
        revalidateTag: vi.fn(),
      }));

      const {
        addGamePlayer,
        createConfiguredGame,
        upsertActiveRoundItemizedScore,
      } = await import("../../../src/app/actions/game");
      const { getGameForPlayPage } = await import("../../../src/lib/db/store/game.store");
      const { getGamePlayerByGameAndUserId } = await import(
        "../../../src/lib/db/store/game-players.store"
      );
      const { buildLostCitiesGameSettingsTemplate } = await import(
        "../../../src/lib/game/lost-cities"
      );

      const game = await createConfiguredGame({
        gameTitleName: "Lost Cities",
        version: "v2",
        scoringMode: "highest_wins",
        endingMode: "round_count",
        targetRounds: 3,
        settingsV2: {
          ...buildLostCitiesGameSettingsTemplate(),
          gameEndTrigger: "rounds_exhausted",
          scoringType: "points",
          roundConfig: {
            enabled: true,
            targetRounds: 3,
          },
        },
      });

      await addGamePlayer({
        gameId: game.id,
        userId: opponent.id,
      });

      const playGame = await getGameForPlayPage(game.id);

      expect(playGame).toBeTruthy();

      const categories = playGame!.itemizedScoreCategories;

      await upsertActiveRoundItemizedScore({
        gameId: game.id,
        userId: creator.id,
        entries: categories.map((category) => ({
          categoryId: category.id,
          userId: creator.id,
          values: {
            card_count: 1,
            card_sum: 25,
            wagers: 0,
          },
        })),
      });

      const refreshedGame = await getGameForPlayPage(game.id);
      const refreshedPlayer = await getGamePlayerByGameAndUserId(
        game.id,
        creator.id,
      );

      expect(refreshedPlayer?.score).toBe(30);
      expect(
        refreshedGame?.itemizedScoreEntries.filter((entry) => entry.userId === creator.id),
      ).toHaveLength(categories.length);
    }, "lost-cities-generic-itemized-round-action");
  });

  it("records winner-only and optional no-score podium placements", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture();
      const opponent = await createUserFixture();
      const third = await createUserFixture();
      const fourth = await createUserFixture();

      mockAuthenticatedUser(creator.id);
      vi.doMock("next/cache", () => ({
        revalidateTag: vi.fn(),
      }));

      const { addGamePlayer, commitGameRound, createConfiguredGame, reopenCompletedGame } =
        await import("../../../src/app/actions/game");
      const { db, gamePlayerRankResults, gameResultPlacements } = await import(
        "../../../src/lib/db"
      );

      const game = await createConfiguredGame({
        gameTitleName: "No Score Podium Fixture",
        scoringMode: "no_score",
        endingMode: "round_count",
        targetRounds: 3,
      });

      await addGamePlayer({ gameId: game.id, userId: opponent.id });
      await addGamePlayer({ gameId: game.id, userId: third.id });
      await addGamePlayer({ gameId: game.id, userId: fourth.id });

      await commitGameRound({
        gameId: game.id,
        completeGame: true,
        placementSelections: [
          { placement: 1, userIds: [creator.id] },
          { placement: 2, userIds: [opponent.id] },
          { placement: 3, userIds: [third.id] },
        ],
      });

      const placementRows = await db.query.gameResultPlacements.findMany({
        where: eq(gameResultPlacements.gameId, game.id),
      });
      const rankRows = await db.query.gamePlayerRankResults.findMany({
        where: eq(gamePlayerRankResults.gameId, game.id),
      });

      expect(
        placementRows
          .map((row) => [row.userId, row.placement] as const)
          .sort((left, right) => left[1] - right[1]),
      ).toEqual([
        [creator.id, 1],
        [opponent.id, 2],
        [third.id, 3],
      ]);
      expect(rankRows.find((row) => row.userId === creator.id)?.placement).toBe(1);
      expect(rankRows.find((row) => row.userId === opponent.id)?.placement).toBe(2);
      expect(rankRows.find((row) => row.userId === third.id)?.placement).toBe(3);

      await reopenCompletedGame({ gameId: game.id });

      const clearedPlacementRows = await db.query.gameResultPlacements.findMany({
        where: eq(gameResultPlacements.gameId, game.id),
      });

      expect(clearedPlacementRows).toHaveLength(0);
    }, "no-score-podium-action");
  });

  it("rewinds an active elimination game when a player is un-eliminated", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture();
      const opponent = await createUserFixture();
      const third = await createUserFixture();
      const fourth = await createUserFixture();

      mockAuthenticatedUser(creator.id);
      vi.doMock("next/cache", () => ({
        revalidateTag: vi.fn(),
      }));

      const {
        addGamePlayer,
        commitGameRound,
        createConfiguredGame,
        getGame,
        uneliminateGamePlayer,
      } = await import("../../../src/app/actions/game");

      const game = await createConfiguredGame({
        gameTitleName: "Elimination Rewind Fixture",
        scoringMode: "no_score",
        endingMode: "round_count",
        version: "v2",
        settingsV2: {
          gameEndTrigger: "player_eliminated",
          scoringType: "ranked_placement_only",
          winMetric: "last_man_standing",
        },
      });

      await addGamePlayer({ gameId: game.id, userId: opponent.id });
      await addGamePlayer({ gameId: game.id, userId: third.id });
      await addGamePlayer({ gameId: game.id, userId: fourth.id });

      await commitGameRound({
        gameId: game.id,
        completeGame: false,
        eliminatedUserId: third.id,
      });
      await commitGameRound({
        gameId: game.id,
        completeGame: false,
        eliminatedUserId: opponent.id,
      });

      await uneliminateGamePlayer({
        gameId: game.id,
        eliminatedUserId: third.id,
      });

      const updatedGame = await getGame(game.id);

      expect(updatedGame?.completedAt).toBeNull();
      expect(updatedGame?.completedRounds).toBe(0);
      expect(updatedGame?.eliminations).toEqual([]);
      expect(updatedGame?.rounds).toEqual([]);
      expect(updatedGame?.winners).toEqual([]);
      expect(updatedGame?.resultPlacements).toEqual([]);
    }, "elimination-uneliminate-action");
  });

  it("rejects duplicate players across no-score placements", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture();
      const opponent = await createUserFixture();

      mockAuthenticatedUser(creator.id);

      const { addGamePlayer, commitGameRound, createConfiguredGame } = await import(
        "../../../src/app/actions/game"
      );

      const game = await createConfiguredGame({
        gameTitleName: "No Score Validation Fixture",
        scoringMode: "no_score",
        endingMode: "round_count",
        targetRounds: 3,
      });

      await addGamePlayer({ gameId: game.id, userId: opponent.id });

      await expect(
        commitGameRound({
          gameId: game.id,
          completeGame: true,
          placementSelections: [
            { placement: 1, userIds: [creator.id] },
            { placement: 2, userIds: [creator.id] },
          ],
        }),
      ).rejects.toThrow("A player can only be assigned to one placement");
    }, "no-score-podium-validation");
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

  it("persists paused turn state and clears it on resume", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture();
      const opponent = await createUserFixture();

      mockAuthenticatedUser(creator.id);
      const { addGamePlayer, createConfiguredGame, getGame, pauseGame, resumeGame } =
        await import("../../../src/app/actions/game");

      const game = await createConfiguredGame({
        gameTitleName: "Pause Fixture",
        scoringMode: "lowest_wins",
        endingMode: "none",
      });
      await addGamePlayer({
        gameId: game.id,
        userId: opponent.id,
      });

      await pauseGame({
        gameId: game.id,
        nextUserId: opponent.id,
      });

      const pausedGame = await getGame(game.id);
      expect(pausedGame?.pausedAt).toBeTruthy();
      expect(pausedGame?.pausedNextUserId).toBe(opponent.id);

      await resumeGame({
        gameId: game.id,
      });

      const resumedGame = await getGame(game.id);
      expect(resumedGame?.pausedAt).toBeNull();
      expect(resumedGame?.pausedNextUserId).toBeNull();
    }, "game-pause-resume-action");
  });

  it("validates paused next turn permissions and membership", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture();
      const opponent = await createUserFixture();
      const outsider = await createUserFixture();

      mockAuthenticatedUser(creator.id);
      const { addGamePlayer, createConfiguredGame, pauseGame } = await import(
        "../../../src/app/actions/game"
      );

      const game = await createConfiguredGame({
        gameTitleName: "Pause Validation Fixture",
        scoringMode: "lowest_wins",
        endingMode: "none",
      });
      await addGamePlayer({
        gameId: game.id,
        userId: opponent.id,
      });

      await expect(
        pauseGame({
          gameId: game.id,
          nextUserId: outsider.id,
        }),
      ).rejects.toThrow("Choose a player in this game");

      vi.resetModules();
      mockAuthenticatedUser(opponent.id);

      const { pauseGame: pauseAsPlayer } = await import("../../../src/app/actions/game");

      await expect(
        pauseAsPlayer({
          gameId: game.id,
          nextUserId: creator.id,
        }),
      ).rejects.toThrow("Only the game creator or a manager can do that");
    }, "game-pause-validation-action");
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

  it("lets self scorers edit only their own score", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture();
      const selfScorer = await createUserFixture();
      const otherPlayer = await createUserFixture();

      mockAuthenticatedUser(creator.id);
      const {
        addGamePlayer,
        createConfiguredGame,
        setGamePlayerRole,
      } = await import("../../../src/app/actions/game");
      const game = await createConfiguredGame({
        gameTitleName: "Self scorer permissions",
        scoringMode: "lowest_wins",
        endingMode: "none",
      });
      await addGamePlayer({ gameId: game.id, userId: selfScorer.id });
      await addGamePlayer({ gameId: game.id, userId: otherPlayer.id });
      await setGamePlayerRole({
        gameId: game.id,
        userId: selfScorer.id,
        role: "self_scorer",
      });

      vi.resetModules();
      mockAuthenticatedUser(selfScorer.id);
      const {
        addGuestGamePlayer,
        getGame,
        upsertActiveRoundScore,
      } = await import("../../../src/app/actions/game");

      await upsertActiveRoundScore({
        gameId: game.id,
        userId: selfScorer.id,
        scoreDelta: 4,
      });
      await expect(
        upsertActiveRoundScore({
          gameId: game.id,
          userId: otherPlayer.id,
          scoreDelta: 9,
        }),
      ).rejects.toThrow("only edit scores allowed by your game role");
      await expect(
        addGuestGamePlayer({ gameId: game.id, firstName: "Blocked" }),
      ).rejects.toThrow("Only the game creator or a manager can do that");

      const persisted = await getGame(game.id);
      expect(
        persisted?.players.find((player) => player.userId === selfScorer.id)
          ?.score,
      ).toBe(4);
      expect(
        persisted?.players.find((player) => player.userId === otherPlayer.id)
          ?.score,
      ).toBe(0);
    }, "game-self-scorer-permissions-action");
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

  it("saves custom v2 settings as isolated personal title defaults", async () => {
    await withTestDatabase(async () => {
      vi.doMock("server-only", () => ({}));
      vi.doMock("next/cache", () => ({
        revalidateTag: vi.fn(),
      }));
      const { sql } = await import("../../../src/lib/db");
      await sql.execute(`
        CREATE TABLE user_game_title_settings (
          user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          game_title_id text NOT NULL REFERENCES game_title(id) ON DELETE CASCADE,
          settings_version text NOT NULL,
          settings_json text NOT NULL,
          updated_at text NOT NULL,
          PRIMARY KEY (user_id, game_title_id)
        )
      `);

      const creator = await createUserFixture();
      const secondUser = await createUserFixture();
      mockAuthenticatedUser(creator.id);

      const { createConfiguredGame } = await import("../../../src/app/actions/game");
      const {
        buildCreateGameSettingsFromTemplate,
        parseGameSettingsV2,
      } = await import("../../../src/lib/game/v2");
      const firstGame = await createConfiguredGame({
        gameTitleName: "Personal Defaults Fixture",
        scoringMode: "highest_wins",
        endingMode: "none",
        version: "v2",
        settingsSource: "custom",
        settingsV2: buildCreateGameSettingsFromTemplate({
          template: "point_scoring",
          roundsEnabled: false,
          initialPlayerScore: 0,
        }),
      });

      expect(firstGame.gameTitleId).toBeTruthy();

      const creatorSettings = buildCreateGameSettingsFromTemplate({
        template: "point_scoring",
        roundsEnabled: false,
        initialPlayerScore: 12,
      });
      await createConfiguredGame({
        gameTitleId: firstGame.gameTitleId,
        scoringMode: "highest_wins",
        endingMode: "none",
        version: "v2",
        settingsSource: "custom",
        settingsV2: creatorSettings,
      });

      const { db, gameTitle, userGameTitleSettings } = await import(
        "../../../src/lib/db"
      );
      const { shareGameTitleWithUser } = await import(
        "../../../src/lib/db/store/game.store"
      );
      let rows = await db.query.userGameTitleSettings.findMany();
      expect(rows).toHaveLength(1);
      expect(parseGameSettingsV2(rows[0]?.settingsJson)?.initialPlayerScore).toBe(12);

      await shareGameTitleWithUser({
        gameTitleId: firstGame.gameTitleId!,
        targetUserId: secondUser.id,
        sharedByUserId: creator.id,
      });
      vi.resetModules();
      mockAuthenticatedUser(secondUser.id);
      const { createConfiguredGame: createAsSecondUser } = await import(
        "../../../src/app/actions/game"
      );
      await createAsSecondUser({
        gameTitleId: firstGame.gameTitleId,
        scoringMode: "highest_wins",
        endingMode: "none",
        version: "v2",
        settingsSource: "custom",
        settingsV2: buildCreateGameSettingsFromTemplate({
          template: "point_scoring",
          roundsEnabled: false,
          initialPlayerScore: 25,
        }),
      });

      rows = await db.query.userGameTitleSettings.findMany();
      expect(rows).toHaveLength(2);
      expect(
        parseGameSettingsV2(
          rows.find((row) => row.userId === creator.id)?.settingsJson,
        )?.initialPlayerScore,
      ).toBe(12);
      expect(
        parseGameSettingsV2(
          rows.find((row) => row.userId === secondUser.id)?.settingsJson,
        )?.initialPlayerScore,
      ).toBe(25);

      const { getGameTitleLibraryEntryById } = await import(
        "../../../src/lib/db/store/game.store"
      );
      const secondUserTitle = await getGameTitleLibraryEntryById({
        userId: secondUser.id,
        gameTitleId: firstGame.gameTitleId!,
      });
      expect(secondUserTitle?.personalSettingsVersion).toBe("v2");
      expect(
        parseGameSettingsV2(secondUserTitle?.personalSettingsJson)
          ?.initialPlayerScore,
      ).toBe(25);

      await createAsSecondUser({
        gameTitleId: firstGame.gameTitleId,
        scoringMode: "highest_wins",
        endingMode: "none",
        version: "v2",
        settingsSource: "game_default",
        settingsV2: buildCreateGameSettingsFromTemplate({
          template: "point_scoring",
          roundsEnabled: false,
          initialPlayerScore: 0,
        }),
      });
      const unchanged = await db.query.userGameTitleSettings.findFirst({
        where: eq(userGameTitleSettings.userId, secondUser.id),
      });
      expect(parseGameSettingsV2(unchanged?.settingsJson)?.initialPlayerScore).toBe(25);

      await db.delete(gameTitle).where(eq(gameTitle.id, firstGame.gameTitleId!));
      expect(await db.query.userGameTitleSettings.findMany()).toHaveLength(0);
    }, "personal-game-title-defaults");
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
      const updateTag = vi.fn();
      const cookieSet = vi.fn();

      vi.doMock("next/cache", () => ({
        revalidatePath,
        revalidateTag,
        updateTag,
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
        avatarUrl: "https://img.clerk.com/example/avatar.png",
      });

      const { getUserById } = await import("../../../src/lib/db/store/user.store");
      const updatedUser = await getUserById(user.id);

      expect(updatedUser?.firstName).toBe("Sky");
      expect(updatedUser?.lastName).toBe("Bo");
      expect(updatedUser?.color).toBe("#3B82F6");
      expect(updatedUser?.avatarUrl).toBeNull();
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
        cardTemplates,
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
        label: "Skyjo",
        description: "Test deck",
      });

      const [cardTemplate] = await db.insert(cardTemplates).values({
        deckName: "skyjo",
        slug: "number-1",
        name: "Skyjo 1",
        rarity: "uncommon",
        renderer: "skyjo_number",
        configJson: JSON.stringify({ value: 1 }),
      }).returning();

      await db.insert(cards).values({
        ownerId: guest.id,
        deckName: "skyjo",
        cardTemplateId: cardTemplate.id,
        rarity: "uncommon",
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

  it("saves deck artwork and replaces game-title assignments atomically", async () => {
    await withTestDatabase(async () => {
      const admin = await createUserFixture({ role: "admin" });
      mockAuthenticatedUser(admin.id);
      vi.doMock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

      const { db, gameTitle } = await import("../../../src/lib/db");
      const titles = await db
        .insert(gameTitle)
        .values([
          { title: "Catalog Game One", normalizedTitle: "catalog-game-one" },
          { title: "Catalog Game Two", normalizedTitle: "catalog-game-two" },
        ])
        .returning();
      const { saveCardDeck } = await import("../../../src/app/actions/card-admin");

      const createData = new FormData();
      createData.set("name", "catalog-test");
      createData.set("label", "Catalog Test");
      createData.set("description", "A configured test deck");
      createData.set("packSize", "5");
      createData.set("commonOdds", "70");
      createData.set("uncommonOdds", "20");
      createData.set("rareOdds", "8");
      createData.set("legendaryOdds", "2");
      createData.set("isActive", "on");
      createData.set("backStyle", "sunburst");
      createData.set("backPrimaryColor", "#ef4444");
      createData.set("backSecondaryColor", "#450a0a");
      createData.set("backAccentColor", "#fef2f2");
      createData.append("gameTitleIds", titles[0]!.id);
      createData.append("gameTitleIds", titles[1]!.id);
      await saveCardDeck(createData);

      expect(await db.query.decks.findFirst({ where: (table, { eq }) => eq(table.name, "catalog-test") }))
        .toMatchObject({ backStyle: "sunburst", backPrimaryColor: "#ef4444" });
      expect(
        (await db.query.gameTitle.findMany({
          where: (table, { inArray }) => inArray(table.id, titles.map((title) => title.id)),
        })).every((title) => title.rewardDeckName === "catalog-test"),
      ).toBe(true);

      createData.delete("gameTitleIds");
      createData.append("gameTitleIds", titles[1]!.id);
      await saveCardDeck(createData);

      const updatedTitles = await db.query.gameTitle.findMany({
        where: (table, { inArray }) => inArray(table.id, titles.map((title) => title.id)),
        orderBy: (table, { asc }) => asc(table.normalizedTitle),
      });
      expect(updatedTitles.map((title) => title.rewardDeckName)).toEqual([null, "catalog-test"]);
    }, "card-catalog-admin-action");
  });

  it("rejects invalid deck artwork and inactive game assignments", async () => {
    await withTestDatabase(async () => {
      const admin = await createUserFixture({ role: "admin" });
      mockAuthenticatedUser(admin.id);
      vi.doMock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
      const { db, gameTitle } = await import("../../../src/lib/db");
      const [title] = await db
        .insert(gameTitle)
        .values({ title: "Deck Guard Game", normalizedTitle: "deck-guard-game" })
        .returning();
      const { saveCardDeck } = await import("../../../src/app/actions/card-admin");
      const formData = new FormData();
      formData.set("name", "guarded-deck");
      formData.set("label", "Guarded Deck");
      formData.set("packSize", "5");
      formData.set("commonOdds", "70");
      formData.set("uncommonOdds", "20");
      formData.set("rareOdds", "8");
      formData.set("legendaryOdds", "2");
      formData.set("backStyle", "classic");
      formData.set("backPrimaryColor", "red");
      formData.set("backSecondaryColor", "#450a0a");
      formData.set("backAccentColor", "#ffffff");

      await expect(saveCardDeck(formData)).rejects.toThrow(/hex color/i);
      formData.set("backPrimaryColor", "#ef4444");
      formData.append("gameTitleIds", title!.id);
      await expect(saveCardDeck(formData)).rejects.toThrow(/Inactive decks cannot be assigned/i);
    }, "card-catalog-admin-guards");
  });
});
