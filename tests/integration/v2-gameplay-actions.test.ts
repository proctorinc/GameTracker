import { afterEach, describe, expect, it, vi } from "vitest";
import { createUserFixture } from "../fixtures/users";
import { withTestDatabase } from "../helpers/test-db";
import {
  REPRESENTATIVE_ITEMIZED_CATEGORIES,
  V2_SETTINGS_CASES,
  type V2SettingsCase,
} from "../helpers/v2-settings-cases";

function mockAuthenticatedUser(userId: string) {
  vi.doMock("@/lib/auth/auth-me", () => ({
    loadCurrentUser: async () => {
      const { getUserById } = await import("@/lib/db/store/user.store");
      return getUserById(userId);
    },
  }));
  vi.doMock("@/lib/auth/protected-session", () => ({
    loadUser: async () => {
      const { getUserById } = await import("@/lib/db/store/user.store");
      return { user: await getUserById(userId) };
    },
  }));
  vi.doMock("@/lib/server-request-context", () => ({
    getServerRequestContext: async () => ({}),
    getRequestContextFromRequest: () => ({}),
  }));
  vi.doMock("next/cache", () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
  }));
  vi.doMock("@/lib/card-rewards", () => ({
    grantCardPacksForCompletedGame: vi.fn(),
    grantSkyjoPacksForCompletedGame: vi.fn(),
  }));
}

describe("v2 gameplay actions", () => {
  afterEach(() => vi.resetModules());

  it("completes a roundless winner-selection game after one choice", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture();
      const opponent = await createUserFixture();
      mockAuthenticatedUser(creator.id);

      const { addGamePlayer, commitGameRound, createConfiguredGame } =
        await import("@/app/actions/game");
      const { getGameForPlayPage } = await import("@/lib/db/store/game.store");
      const { buildCreateGameSettingsFromTemplate } = await import(
        "@/lib/game/v2"
      );
      const settings = buildCreateGameSettingsFromTemplate({
        template: "choose_winner",
        roundsEnabled: false,
      });
      const game = await createConfiguredGame({
        gameTitleName: "Single Winner Fixture",
        version: "v2",
        scoringMode: "highest_wins",
        endingMode: "none",
        trackRounds: false,
        settingsV2: settings,
      });
      await addGamePlayer({ gameId: game.id, userId: opponent.id });

      await commitGameRound({
        gameId: game.id,
        winnerUserIds: [opponent.id],
      });

      const updated = await getGameForPlayPage(game.id);
      expect(updated?.completedAt).not.toBeNull();
      expect(
        updated?.players.find((player) => player.userId === opponent.id)?.score,
      ).toBe(1);
      expect(updated?.winners.map((winner) => winner.userId)).toEqual([
        opponent.id,
      ]);
    }, "v2-single-winner");
  });

  it("resets elimination state each round and awards the survivor a point", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture();
      const opponent = await createUserFixture();
      const third = await createUserFixture();
      mockAuthenticatedUser(creator.id);

      const { addGamePlayer, commitGameRound, completeGame, createConfiguredGame } =
        await import("@/app/actions/game");
      const { getGameForPlayPage } = await import("@/lib/db/store/game.store");
      const { buildCreateGameSettingsFromTemplate } = await import(
        "@/lib/game/v2"
      );
      const settings = buildCreateGameSettingsFromTemplate({
        template: "elimination",
        roundsEnabled: true,
        endConditionMode: "fixed_rounds",
        targetRounds: 2,
      });
      const game = await createConfiguredGame({
        gameTitleName: "Round Elimination Fixture",
        version: "v2",
        scoringMode: "highest_wins",
        endingMode: "round_count",
        trackRounds: true,
        targetRounds: 2,
        settingsV2: settings,
      });
      await addGamePlayer({ gameId: game.id, userId: opponent.id });
      await addGamePlayer({ gameId: game.id, userId: third.id });

      await commitGameRound({ gameId: game.id, eliminatedUserId: opponent.id });
      let updated = await getGameForPlayPage(game.id);
      expect(updated?.completedRounds).toBe(0);
      await expect(completeGame({ gameId: game.id })).rejects.toThrow(
        /Finish the current elimination round/i,
      );

      await commitGameRound({ gameId: game.id, eliminatedUserId: third.id });
      updated = await getGameForPlayPage(game.id);
      expect(updated?.completedRounds).toBe(1);
      expect(
        updated?.players.find((player) => player.userId === creator.id)?.score,
      ).toBe(1);

      await commitGameRound({ gameId: game.id, eliminatedUserId: opponent.id });
      await commitGameRound({ gameId: game.id, eliminatedUserId: third.id });
      updated = await getGameForPlayPage(game.id);

      expect(updated?.completedRounds).toBe(2);
      expect(updated?.completedAt).not.toBeNull();
      expect(updated?.eliminations.map((entry) => entry.roundNumber)).toEqual([
        1, 1, 2, 2,
      ]);
      expect(
        updated?.players.find((player) => player.userId === creator.id)?.score,
      ).toBe(2);
      expect(updated?.winners.map((winner) => winner.userId)).toEqual([
        creator.id,
      ]);
    }, "v2-round-elimination");
  });

  it("plays and completes every distinct v2 settings combination", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture({ role: "admin" });
      const opponent = await createUserFixture();
      const third = await createUserFixture();
      mockAuthenticatedUser(creator.id);

      const actions = await import("@/app/actions/game");
      const { getGameForPlayPage } = await import("@/lib/db/store/game.store");
      const { parseGameSettingsV2 } = await import("@/lib/game/v2");

      async function loadGame(gameId: string) {
        const game = await getGameForPlayPage(gameId);
        expect(game, `game ${gameId} should exist`).toBeTruthy();
        return game!;
      }

      async function savePointScores(input: {
        gameId: string;
        creatorValue: number;
        opponentValue: number;
        itemized: boolean;
        roundBased: boolean;
      }) {
        if (!input.itemized) {
          await actions.upsertActiveRoundScore({
            gameId: input.gameId,
            userId: creator.id,
            scoreDelta: input.creatorValue,
          });
          await actions.upsertActiveRoundScore({
            gameId: input.gameId,
            userId: opponent.id,
            scoreDelta: input.opponentValue,
          });
          return;
        }

        const game = await loadGame(input.gameId);
        const category = game.itemizedScoreCategories[0]!;
        const save = input.roundBased
          ? actions.upsertActiveRoundItemizedScore
          : actions.upsertEndGameTallyItemizedScore;

        await save({
          gameId: input.gameId,
          userId: creator.id,
          entries: [
            {
              userId: creator.id,
              categoryId: category.id,
              values: { count: input.creatorValue },
            },
          ],
        });
        await save({
          gameId: input.gameId,
          userId: opponent.id,
          entries: [
            {
              userId: opponent.id,
              categoryId: category.id,
              values: { count: input.opponentValue },
            },
          ],
        });
      }

      async function completePointGame(testCase: V2SettingsCase, gameId: string) {
        const { settings } = testCase;
        const itemized = settings.itemizedCategories.length > 0;
        const isLowest = settings.winMetric === "lowest_score";
        const shouldTie = settings.tiePolicy.allowTies;
        const roundsToPlay =
          settings.gameEndTrigger === "rounds_exhausted" ? 2 : 1;

        if (!settings.roundConfig.enabled) {
          const creatorValue = shouldTie ? 4 : isLowest ? 1 : 5;
          const opponentValue = shouldTie ? 4 : isLowest ? 5 : 1;
          await savePointScores({
            gameId,
            creatorValue,
            opponentValue,
            itemized,
            roundBased: false,
          });

          if (itemized) {
            const game = await loadGame(gameId);
            const categoryId = game.itemizedScoreCategories[0]!.id;
            await actions.completeGame({
              gameId,
              itemizedScoreEntries: [
                { userId: creator.id, categoryId, values: { count: creatorValue } },
                { userId: opponent.id, categoryId, values: { count: opponentValue } },
              ],
            });
          } else {
            await actions.completeGame({ gameId });
          }
          return;
        }

        for (let round = 1; round <= roundsToPlay; round += 1) {
          const reachesThreshold =
            settings.gameEndTrigger === "points_threshold_reached";
          const creatorValue = reachesThreshold
            ? isLowest
              ? -2
              : 2
            : shouldTie
              ? 1
              : isLowest
                ? -1
                : 2;
          const opponentValue = reachesThreshold && shouldTie
            ? creatorValue
            : shouldTie
              ? 1
              : 0;
          await savePointScores({
            gameId,
            creatorValue,
            opponentValue,
            itemized,
            roundBased: true,
          });
          await actions.commitGameRound({
            gameId,
            completeGame:
              settings.gameEndTrigger === "manual_finish" &&
              round === roundsToPlay,
          });

          if (round < roundsToPlay) {
            expect((await loadGame(gameId)).completedAt, testCase.name).toBeNull();
          }
        }
      }

      async function completeWinnerSelectionGame(
        testCase: V2SettingsCase,
        gameId: string,
      ) {
        const { settings } = testCase;
        if (!settings.roundConfig.enabled) {
          await actions.commitGameRound({
            gameId,
            winnerUserIds: [creator.id],
          });
          return;
        }

        const shouldTie =
          settings.tiePolicy.allowTies &&
          settings.gameEndTrigger !== "points_threshold_reached";
        const roundsToPlay =
          settings.gameEndTrigger === "points_threshold_reached" || shouldTie
            ? 2
            : settings.gameEndTrigger === "rounds_exhausted"
              ? 2
              : 1;

        for (let round = 1; round <= roundsToPlay; round += 1) {
          await actions.commitGameRound({
            gameId,
            winnerUserIds: [shouldTie && round === 2 ? opponent.id : creator.id],
            completeGame:
              settings.gameEndTrigger === "manual_finish" &&
              round === roundsToPlay,
          });
        }
      }

      async function playEliminationRound(gameId: string, winnerUserId: string) {
        const eliminated = [creator.id, opponent.id, third.id].filter(
          (userId) => userId !== winnerUserId,
        );
        await actions.commitGameRound({
          gameId,
          eliminatedUserId: eliminated[0],
        });
        await actions.commitGameRound({
          gameId,
          eliminatedUserId: eliminated[1],
        });
      }

      async function completeEliminationGame(
        testCase: V2SettingsCase,
        gameId: string,
      ) {
        const { settings } = testCase;
        if (!settings.roundConfig.enabled) {
          await playEliminationRound(gameId, creator.id);
          return;
        }

        const shouldTie =
          settings.tiePolicy.allowTies &&
          settings.gameEndTrigger !== "points_threshold_reached";
        const roundsToPlay =
          settings.gameEndTrigger === "points_threshold_reached" ||
          settings.gameEndTrigger === "rounds_exhausted" ||
          shouldTie
            ? 2
            : 1;

        for (let round = 1; round <= roundsToPlay; round += 1) {
          const winnerUserId = shouldTie && round === 2 ? opponent.id : creator.id;
          const eliminated = [creator.id, opponent.id, third.id].filter(
            (userId) => userId !== winnerUserId,
          );
          await actions.commitGameRound({ gameId, eliminatedUserId: eliminated[0] });
          await actions.commitGameRound({
            gameId,
            eliminatedUserId: eliminated[1],
            completeGame:
              settings.gameEndTrigger === "manual_finish" &&
              round === roundsToPlay,
          });
        }
      }

      for (const [index, testCase] of V2_SETTINGS_CASES.entries()) {
        const { settings } = testCase;
        const game = await actions.createConfiguredGame({
          gameTitleName: `V2 matrix ${index + 1}`,
          version: "v2",
          scoringMode: "highest_wins",
          endingMode: "none",
          settingsV2: settings,
        });
        await actions.addGamePlayer({ gameId: game.id, userId: opponent.id });
        if (settings.scoringType === "elimination") {
          await actions.addGamePlayer({ gameId: game.id, userId: third.id });
        }

        const created = await loadGame(game.id);
        const persistedSettings = parseGameSettingsV2(created.settingsJson)!;
        expect(persistedSettings, testCase.name).toMatchObject({
          gameEndTrigger: settings.gameEndTrigger,
          scoringType: settings.scoringType,
          winMetric: settings.winMetric,
          initialPlayerScore: settings.initialPlayerScore,
          roundConfig: settings.roundConfig,
          thresholdConfig: settings.thresholdConfig,
          tiePolicy: settings.tiePolicy,
          playerConfig: settings.playerConfig,
        });
        expect(persistedSettings.itemizedCategories, testCase.name).toHaveLength(
          settings.itemizedCategories.length,
        );

        if (settings.scoringType === "points") {
          await completePointGame(testCase, game.id);
        } else if (settings.scoringType === "winner_selection") {
          await completeWinnerSelectionGame(testCase, game.id);
        } else {
          await completeEliminationGame(testCase, game.id);
        }

        const completed = await loadGame(game.id);
        expect(completed.completedAt, testCase.name).not.toBeNull();
        const expectedWinnerCount =
          settings.tiePolicy.allowTies &&
          (settings.scoringType === "points" ||
            settings.gameEndTrigger !== "points_threshold_reached")
            ? 2
            : 1;
        expect(completed.winners, testCase.name).toHaveLength(expectedWinnerCount);
      }
    }, "v2-settings-matrix");
  });

  it("enforces every player-limit and personal manager-default combination", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture({ role: "admin" });
      const opponent = await createUserFixture();
      const third = await createUserFixture();
      mockAuthenticatedUser(creator.id);

      const actions = await import("@/app/actions/game");
      const { getGameForPlayPage } = await import("@/lib/db/store/game.store");
      const { buildCreateGameSettingsFromTemplate } = await import("@/lib/game/v2");
      const playerCases = [
        [null, null, false],
        [2, null, false],
        [null, 2, false],
        [2, 2, false],
        [null, null, true],
        [2, null, true],
        [null, 2, true],
        [2, 2, true],
      ] as const;

      for (const [index, [minPlayers, maxPlayers, defaultManagers]] of
        playerCases.entries()) {
        const settings = buildCreateGameSettingsFromTemplate({
          template: "point_scoring",
          roundsEnabled: false,
          playerConfig: { minPlayers, maxPlayers, allPlayersAreManagers: false },
        });
        const game = await actions.createConfiguredGame({
          gameTitleName: `V2 player rules ${index + 1}`,
          version: "v2",
          scoringMode: "highest_wins",
          endingMode: "none",
          settingsV2: settings,
          managementSettings: {
            defaultPlayerRole: defaultManagers ? "manager" : "player",
          },
        });

        if (minPlayers !== null) {
          await expect(actions.completeGame({ gameId: game.id })).rejects.toThrow(
            /(?:at least|exactly) 2 players/i,
          );
        }

        await actions.addGamePlayer({ gameId: game.id, userId: opponent.id });
        const playable = await getGameForPlayPage(game.id);
        expect(
          playable?.players.find((player) => player.userId === opponent.id)
            ?.isManager,
        ).toBe(defaultManagers);

        if (maxPlayers !== null) {
          await expect(
            actions.addGamePlayer({ gameId: game.id, userId: third.id }),
          ).rejects.toThrow(/(?:at most|exactly) 2 players/i);
        }

        const creatorPlayer = playable!.players.find(
          (player) => player.userId === creator.id,
        )!;
        const opponentPlayer = playable!.players.find(
          (player) => player.userId === opponent.id,
        )!;
        await actions.updateGamePlayerScore({ gamePlayerId: creatorPlayer.id, score: 2 });
        await actions.updateGamePlayerScore({ gamePlayerId: opponentPlayer.id, score: 1 });
        await actions.completeGame({ gameId: game.id });
        expect((await getGameForPlayPage(game.id))?.completedAt).not.toBeNull();
      }
    }, "v2-player-options-matrix");
  });

  it("loads and completes a title-backed custom itemized PlayGame", async () => {
    await withTestDatabase(async () => {
      const creator = await createUserFixture({ role: "admin" });
      const opponent = await createUserFixture();
      mockAuthenticatedUser(creator.id);

      const { db, gameTitle } = await import("@/lib/db");
      const actions = await import("@/app/actions/game");
      const { getGameForPlayPage } = await import("@/lib/db/store/game.store");
      const { buildLostCitiesGameSettingsTemplate } = await import(
        "@/lib/game/lost-cities"
      );
      const { buildPlayGameV2Config } = await import(
        "@/components/game/play-game-v2/config"
      );
      const settings = buildLostCitiesGameSettingsTemplate();
      const [title] = await db
        .insert(gameTitle)
        .values({
          title: "Lost Cities",
          normalizedTitle: "lost cities",
          customPlayScreenEnabled: true,
          defaultSettingsVersion: "v2",
          defaultSettingsJson: JSON.stringify(settings),
          isUniversal: true,
        })
        .returning();

      const game = await actions.createConfiguredGame({
        gameTitleId: title.id,
        version: "v2",
        scoringMode: "highest_wins",
        endingMode: "none",
      });
      await actions.addGamePlayer({ gameId: game.id, userId: opponent.id });

      const playable = await getGameForPlayPage(game.id);
      expect(playable?.gameTitle).toMatchObject({
        normalizedTitle: "lost cities",
        customPlayScreenEnabled: true,
      });
      expect(buildPlayGameV2Config(playable!).itemizedCategories).toHaveLength(
        REPRESENTATIVE_ITEMIZED_CATEGORIES.length + 5,
      );

      const entries = playable!.players.flatMap((player) =>
        playable!.itemizedScoreCategories.map((category) => ({
          userId: player.userId,
          categoryId: category.id,
          values: { card_sum: 25, wagers: 0, card_count: 1 },
        })),
      );
      await actions.completeGame({ gameId: game.id, itemizedScoreEntries: entries });

      const completed = await getGameForPlayPage(game.id);
      expect(completed?.completedAt).not.toBeNull();
      expect(completed?.winners.map((winner) => winner.userId).sort()).toEqual(
        [creator.id, opponent.id].sort(),
      );
    }, "v2-custom-title-play-game");
  });

  it("keeps game-specific and management defaults personal per title", async () => {
    await withTestDatabase(async () => {
      const firstCreator = await createUserFixture({ role: "admin" });
      const secondCreator = await createUserFixture({ role: "admin" });
      const { db, gameTitle } = await import("@/lib/db");
      const { buildLostCitiesGameSettingsTemplate } = await import(
        "@/lib/game/lost-cities"
      );
      const { serializeGameSettingsV2 } = await import("@/lib/game/v2");
      const [title] = await db
        .insert(gameTitle)
        .values({
          title: "Lost Cities",
          normalizedTitle: "lost cities",
          isUniversal: true,
          defaultSettingsVersion: "v2",
          defaultSettingsJson: serializeGameSettingsV2(
            buildLostCitiesGameSettingsTemplate(),
          ),
        })
        .returning();

      mockAuthenticatedUser(firstCreator.id);
      let actions = await import("@/app/actions/game");
      const firstGame = await actions.createConfiguredGame({
        gameTitleId: title!.id,
        version: "v2",
        scoringMode: "highest_wins",
        endingMode: "none",
        gameSpecificSettings: { expeditionCount: 6 },
        managementSettings: { defaultPlayerRole: "self_scorer" },
      });

      vi.resetModules();
      mockAuthenticatedUser(secondCreator.id);
      actions = await import("@/app/actions/game");
      const secondGame = await actions.createConfiguredGame({
        gameTitleId: title!.id,
        version: "v2",
        scoringMode: "highest_wins",
        endingMode: "none",
        gameSpecificSettings: { expeditionCount: 5 },
        managementSettings: { defaultPlayerRole: "player" },
      });

      const preferences = await db.query.userGameTitlePreferences.findMany();
      expect(preferences).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userId: firstCreator.id,
            gameTitleId: title!.id,
            gameSpecificSettingsJson: JSON.stringify({ expeditionCount: 6 }),
            defaultPlayerRole: "self_scorer",
          }),
          expect.objectContaining({
            userId: secondCreator.id,
            gameTitleId: title!.id,
            gameSpecificSettingsJson: JSON.stringify({ expeditionCount: 5 }),
            defaultPlayerRole: "player",
          }),
        ]),
      );
      expect(firstGame.defaultPlayerRole).toBe("self_scorer");
      expect(secondGame.defaultPlayerRole).toBe("player");
      expect(JSON.parse(firstGame.gameSpecificSettingsJson!)).toEqual({
        expeditionCount: 6,
      });
      expect(JSON.parse(secondGame.gameSpecificSettingsJson!)).toEqual({
        expeditionCount: 5,
      });
    }, "personal-game-title-preferences");
  });
});
