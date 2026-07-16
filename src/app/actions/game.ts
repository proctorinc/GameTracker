"use server";

import {
  revalidateDashboardPage,
  revalidateDashboardPages,
  revalidateFriendsPage,
  revalidateGameHistoryPage,
  revalidateGameHistoryPages,
  revalidatePlayerRankHistory,
  revalidatePlayerRankPages,
  revalidatePlayerRankStandings,
  revalidateProfileOverviewPage,
  revalidatePublicProfilePage,
  revalidateTitlesGlobal,
  revalidateTitlesPage,
  revalidateTitlesPages,
} from "@/lib/cache-invalidation";
import { loadOptionalCurrentUser } from "@/lib/auth/auth-me";
import { loadUser } from "@/lib/auth/protected-session";
import { grantCardPacksForCompletedGame } from "@/lib/card-rewards";
import { getWinningUserIds } from "@/lib/game/v1";
import {
  ensureFriendshipExists,
  listAcceptedFriendsForUser,
} from "@/lib/db/store/friendship.store";
import {
  createGameJoinRequest,
  getGameJoinRequestFullById,
  getPendingJoinRequest,
  listPendingJoinRequestsForGame,
  resolveGameJoinRequest,
} from "@/lib/db/store/game-join-request.store";
import {
  addPlayerToGame,
  addPlayerToGameWithStartingScore,
  createGameElimination,
  createGameRound,
  createGameRoundScores,
  createOrFindGameTitle,
  createGame,
  getAccessibleGameTitleById,
  getGameByShareToken,
  getGameForPlayPage,
  getOrCreateGameShareToken,
  deleteGameEliminationsByIds,
  deleteGameRoundsByNumbers,
  type GameForPlayPage,
  getGameById,
  getGameRoundByGameAndNumber,
  getGameRoundScoreByRoundAndUser,
  getGameTitleLibraryEntryById,
  getGameTitleById,
  grantGameTitleToGameParticipants,
  listAffectedUserIdsForGameTitle,
  listSuggestedGameTitles,
  mergeGameTitles,
  promoteGameTitleToUniversal,
  replaceGameWinners,
  replaceGameResultPlacements,
  replaceGameItemizedScoreCategories,
  replaceGameItemizedScoreEntries,
  replaceGameItemizedScoreEntriesForPlayer,
  removePlayerFromGame,
  shareGameTitleWithUser,
  updateGameTitleImageAndColor,
  updateGameTitleDefaults,
  upsertUserGameTitleSettings,
  upsertUserGameTitlePreferences,
  updateGame,
  updateGameRound,
  updateGameRoundScore,
  deleteGame,
  type GamePlayerStartingScoreMode,
} from "@/lib/db/store/game.store";
import {
  deleteGamePlayerRankResults,
  rebuildPlayerRankHistoryFromDate,
  listPlayerRankGameDeltasForGame,
  writePlayerRankResultsForCompletedGame,
} from "@/lib/db/store/player-rank.store";
import { listGuestsCreatedByUser } from "@/lib/db/store/user.store";
import {
  gameSettingsToTitleDefaults,
  normalizeGameTitleDefaults,
} from "@/lib/game/title-defaults";
import {
  evaluateItemizedCategoryFormula,
  extractItemizedMetadataValues,
  ITEMIZED_SCORE_INCLUDED_METADATA_KEY,
  normalizeItemizedValues,
  type ItemizedScoreEntryValues,
} from "@/lib/game/itemized-scoring";
import {
  buildLostCitiesItemizedCategories,
  buildLostCitiesGameSettingsTemplate,
  cloneGameSettingsV2WithFreshItemizedCategoryIds,
  isLostCitiesTitle,
} from "@/lib/game/lost-cities";
import {
  normalizeDefaultPlayerRole,
  normalizeGameSpecificSettings,
  parseGameSpecificSettings,
  serializeGameSpecificSettings,
  type GameManagementSettings,
  type GameSpecificSettings,
} from "@/lib/game/title-specific-settings";
import {
  canRoleEditScore,
  canRoleManageGame,
  getEffectiveGamePlayerRole,
  getStoredGamePlayerRole,
  roleToLegacyManager,
} from "@/lib/game/player-roles";
import type { GamePlayerRole } from "@/lib/db/schema";
import {
  getV2InitialPlayerScore,
  isGameSettingsV2Elimination,
  isGameSettingsV2EndGameTally,
  parseGameSettingsV2,
  projectV2SettingsToLegacy,
  usesWinnerSelection,
  serializeGameSettingsV2,
  supportsGameSettingsV2ItemizedScoring,
  type GameSettingsV2,
  usesGameSettingsV2ItemizedScoring,
  validateGameSettingsV2,
} from "@/lib/game/v2";
import { pickRandomProfileColor } from "@/lib/profile-colors";
import { DEFAULT_TITLE_IMAGE_VERTICAL_FOCUS } from "@/lib/title-image";
import {
  buildTitleImageCandidate,
  parseTitleImageDataUrl,
  prepareTitleImageAsset,
  deriveTitleColorFromImageUrl,
  getTitleColorOptionsFromImageUrl,
  normalizeTitleImageUrl,
} from "@/lib/title-image-color";
import { uploadGameTitleImageToS3 } from "@/lib/title-image-storage";
import { generateGameTitleImageCandidate } from "@/lib/openai-title-image";
import {
  getGamePlayerFullById,
  getGamePlayerByGameAndUserId,
  updateGamePlayer,
} from "@/lib/db/store/game-players.store";
import { createUser } from "@/lib/db/store/user.store";
import { logError, logInfo, type LogMeta } from "@/lib/server-log";
import { redirect } from "next/navigation";

function nowIso() {
  return new Date().toISOString();
}

function getFormDataString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function buildGameSharePath(shareToken: string) {
  return `/invite/game/${shareToken}`;
}

function hasGameStarted(
  game: Pick<GameForPlayPage, "completedRounds" | "rounds">,
) {
  return (
    game.completedRounds > 0 ||
    game.rounds.some((round) => round.scores.length > 0)
  );
}

function getGameSettingsV2FromGame(
  game: Pick<GameForPlayPage, "version" | "settingsJson">,
) {
  return game.version === "v2" ? parseGameSettingsV2(game.settingsJson) : null;
}

function getGameSettingsV2PlayerConfig(
  gameSettingsV2: GameSettingsV2 | null | undefined,
) {
  return (
    gameSettingsV2?.playerConfig ?? {
      minPlayers: null,
      maxPlayers: null,
      allPlayersAreManagers: false,
    }
  );
}

function getDefaultPlayerRoleForGame(
  game: Pick<GameForPlayPage, "defaultPlayerRole" | "settingsJson" | "version">,
): GamePlayerRole {
  if (game.defaultPlayerRole) return game.defaultPlayerRole;
  return getGameSettingsV2PlayerConfig(getGameSettingsV2FromGame(game))
    .allPlayersAreManagers
    ? "manager"
    : "player";
}

function getTitlePlayerCountError(config: ReturnType<typeof getGameSettingsV2PlayerConfig>) {
  if (
    config.minPlayers !== null &&
    config.maxPlayers !== null &&
    config.minPlayers === config.maxPlayers
  ) {
    return `This game requires exactly ${config.minPlayers} players`;
  }

  if (config.minPlayers !== null) {
    return `This game requires at least ${config.minPlayers} players`;
  }

  if (config.maxPlayers !== null) {
    return `This game supports at most ${config.maxPlayers} players`;
  }

  return "This game's player limits were reached";
}

function assertGameCanAcceptAnotherPlayer(game: GameForPlayPage) {
  const config = getGameSettingsV2PlayerConfig(getGameSettingsV2FromGame(game));

  if (config.maxPlayers !== null && game.players.length >= config.maxPlayers) {
    throw new Error(getTitlePlayerCountError(config));
  }
}

function assertGameCanRemovePlayer(game: GameForPlayPage) {
  const config = getGameSettingsV2PlayerConfig(getGameSettingsV2FromGame(game));

  if (config.minPlayers !== null && game.players.length <= config.minPlayers) {
    throw new Error(getTitlePlayerCountError(config));
  }
}

function assertGameMeetsPlayerRequirements(game: GameForPlayPage) {
  const config = getGameSettingsV2PlayerConfig(getGameSettingsV2FromGame(game));

  if (config.minPlayers !== null && game.players.length < config.minPlayers) {
    throw new Error(getTitlePlayerCountError(config));
  }

  if (config.maxPlayers !== null && game.players.length > config.maxPlayers) {
    throw new Error(getTitlePlayerCountError(config));
  }
}

function supportsDirectEndGameItemizedScoring(
  game: Pick<GameForPlayPage, "settingsJson" | "version">,
  gameSettingsV2 = getGameSettingsV2FromGame(game),
) {
  return Boolean(
    gameSettingsV2 &&
      gameSettingsV2.itemizedCategories.length > 0 &&
      isGameSettingsV2EndGameTally(gameSettingsV2),
  );
}

function getGameSettingsV2FromTitle(
  gameTitle:
    | Pick<
        NonNullable<Awaited<ReturnType<typeof getGameTitleById>>>,
        "defaultSettingsVersion" | "defaultSettingsJson"
      >
    | null
    | undefined,
) {
  if (!gameTitle || gameTitle.defaultSettingsVersion !== "v2") {
    return null;
  }

  return parseGameSettingsV2(gameTitle.defaultSettingsJson);
}

function hasGameStartedWithSettings(
  game: Pick<
    GameForPlayPage,
    | "completedRounds"
    | "rounds"
    | "players"
    | "version"
    | "settingsJson"
    | "eliminations"
    | "itemizedScoreEntries"
  >,
) {
  const settings = getGameSettingsV2FromGame(game);

  if (!settings) {
    return hasGameStarted(game);
  }

  const initialScore = getV2InitialPlayerScore(settings);

  return (
    game.completedRounds > 0 ||
    game.rounds.some((round) => round.scores.length > 0) ||
    game.eliminations.length > 0 ||
    game.itemizedScoreEntries.length > 0 ||
    game.players.some((player) => player.score !== initialScore)
  );
}

async function runGameAction<T>(
  action: string,
  meta: LogMeta,
  operation: () => Promise<T>,
  getSuccessMeta?: (result: T) => LogMeta,
) {
  try {
    const result = await operation();
    logInfo(`game.${action}.succeeded`, {
      ...meta,
      ...(getSuccessMeta?.(result) ?? {}),
    });
    return result;
  } catch (error) {
    logError(`game.${action}.failed`, error, meta);
    throw error;
  }
}

async function requireCurrentUser() {
  const { user } = await loadUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

async function requireGameMembership(gameId: string) {
  const user = await requireCurrentUser();
  const game = await getGameForPlayPage(gameId);

  if (!game) {
    throw new Error("Game not found");
  }

  const isCreator = game.creatorId === user.id;
  const gamePlayer = game.players.find((player) => player.userId === user.id);
  const isPlayer = Boolean(gamePlayer);
  const effectiveRole = getEffectiveGamePlayerRole({
    creatorId: game.creatorId,
    player: gamePlayer,
    userId: user.id,
  });
  const isManager = effectiveRole === "manager";
  const canManageLiveGame = canRoleManageGame(effectiveRole);
  const canEditOwnScore = canRoleEditScore({
    actorUserId: user.id,
    role: effectiveRole,
    targetUserId: user.id,
  });

  if (!isCreator && !isPlayer) {
    throw new Error("Unauthorized");
  }

  return {
    user,
    game,
    isCreator,
    isManager,
    effectiveRole,
    canManageLiveGame,
    canEditOwnScore,
  };
}

async function requireGameScoreEditor(gameId: string, targetUserId: string) {
  const context = await requireGameMembership(gameId);
  if (
    !canRoleEditScore({
      actorUserId: context.user.id,
      role: context.effectiveRole,
      targetUserId,
    })
  ) {
    throw new Error("You can only edit scores allowed by your game role");
  }
  return context;
}

async function requireGameLiveManager(gameId: string) {
  const context = await requireGameMembership(gameId);

  if (!context.canManageLiveGame) {
    throw new Error("Only the game creator or a manager can do that");
  }

  return context;
}

function assertGameIsNotPaused(game: GameForPlayPage) {
  if (game.pausedAt) {
    throw new Error("Game is paused");
  }
}

async function requireGameCreator(gameId: string) {
  const context = await requireGameMembership(gameId);

  if (!context.isCreator) {
    throw new Error("Only the game creator can do that");
  }

  return context;
}

function getDashboardUserIdsForGame(
  game: Awaited<ReturnType<typeof getGameForPlayPage>>,
) {
  return [
    game?.creatorId ?? null,
    ...(game?.players.map((player) => player.userId) ?? []),
  ];
}

function revalidateRankRelatedPages(userIds: Array<string | null | undefined>) {
  revalidatePlayerRankHistory();
  revalidatePlayerRankPages(userIds);
  revalidatePlayerRankStandings();

  for (const userId of new Set(
    userIds.filter((value): value is string => Boolean(value)),
  )) {
    revalidateProfileOverviewPage(userId);
    revalidatePublicProfilePage(userId);
  }
}

function revalidateFriendsPages(userIds: Array<string | null | undefined>) {
  for (const userId of new Set(
    userIds.filter((value): value is string => Boolean(value)),
  )) {
    revalidateFriendsPage(userId);
  }
}

async function ensureParticipantsAreFriends(input: {
  game: GameForPlayPage;
  inviterId: string;
}) {
  const participants = input.game.players
    .map((player) => player.user)
    .filter((user) => !user.isGuest && !user.mergedIntoUserId);

  for (let index = 0; index < participants.length; index += 1) {
    const participant = participants[index];

    if (!participant) {
      continue;
    }

    for (
      let compareIndex = index + 1;
      compareIndex < participants.length;
      compareIndex += 1
    ) {
      const otherParticipant = participants[compareIndex];

      if (!otherParticipant) {
        continue;
      }

      await ensureFriendshipExists({
        userAId: participant.id,
        userBId: otherParticipant.id,
        inviterId: input.inviterId,
      });
    }
  }
}

async function syncPlayerRankForCompletedGame(input: {
  gameId: string;
  completedAt: string;
  scoringMode: GameForPlayPage["scoringMode"];
  players: Array<{ userId: string; score: number }>;
  winnerUserIds: string[];
  placementSelections?: Array<{ placement: 1 | 2 | 3; userIds: string[] }>;
}) {
  await writePlayerRankResultsForCompletedGame({
    gameId: input.gameId,
    game: {
      completedAt: input.completedAt,
      scoringMode: input.scoringMode,
      players: input.players,
      winnerUserIds: input.winnerUserIds,
      placementSelections: input.placementSelections,
    },
  });
  await rebuildPlayerRankHistoryFromDate({
    startDate: input.completedAt,
  });
}

type NoScorePlacementSelection = {
  placement: 1 | 2 | 3;
  userIds: string[];
};

type ItemizedScoreEntryInput = {
  userId: string;
  categoryId: string;
  values: ItemizedScoreEntryValues;
};

function normalizeNoScorePlacementSelections(input: {
  participants: Array<{ userId: string }>;
  placementSelections?: Array<{
    placement: 1 | 2 | 3;
    userIds: string[];
  }> | null;
  winnerUserIds?: string[] | null;
}) {
  const allowedUserIds = new Set(
    input.participants.map((player) => player.userId),
  );
  const normalizedSelections =
    input.placementSelections && input.placementSelections.length > 0
      ? input.placementSelections
      : input.winnerUserIds && input.winnerUserIds.length > 0
        ? [{ placement: 1 as const, userIds: input.winnerUserIds }]
        : [];
  const seenUserIds = new Set<string>();
  const byPlacement = new Map<1 | 2 | 3, string[]>();

  for (const selection of normalizedSelections) {
    if (selection.placement < 1 || selection.placement > 3) {
      throw new Error("Only 1st, 2nd, and 3rd place can be recorded");
    }

    const uniqueUserIds = Array.from(new Set(selection.userIds)).filter(
      (userId) => {
        if (!allowedUserIds.has(userId)) {
          throw new Error(
            "Only players in the game can be assigned a placement",
          );
        }

        if (seenUserIds.has(userId)) {
          throw new Error("A player can only be assigned to one placement");
        }

        seenUserIds.add(userId);
        return true;
      },
    );

    if (uniqueUserIds.length === 0) {
      continue;
    }

    byPlacement.set(selection.placement, uniqueUserIds);
  }

  if (!byPlacement.has(1)) {
    throw new Error("Choose at least one 1st-place winner");
  }

  if (byPlacement.has(3) && !byPlacement.has(2)) {
    throw new Error("Choose 2nd place before recording 3rd");
  }

  const placements: NoScorePlacementSelection[] = [1, 2, 3]
    .map((placement) => {
      const userIds = byPlacement.get(placement as 1 | 2 | 3) ?? [];

      return userIds.length > 0
        ? {
            placement: placement as 1 | 2 | 3,
            userIds,
          }
        : null;
    })
    .filter(
      (selection): selection is NoScorePlacementSelection => selection !== null,
    );

  return {
    placements,
    winnerUserIds: byPlacement.get(1) ?? [],
  };
}

async function replaceNoScoreGameResults(input: {
  gameId: string;
  placementSelections: NoScorePlacementSelection[];
}) {
  await replaceGameResultPlacements({
    gameId: input.gameId,
    placements: input.placementSelections.flatMap((selection) =>
      selection.userIds.map((userId) => ({
        userId,
        placement: selection.placement,
      })),
    ),
  });
  await replaceGameWinners({
    gameId: input.gameId,
    userIds:
      input.placementSelections.find((selection) => selection.placement === 1)
        ?.userIds ?? [],
  });
}

function deriveEliminationPlacements(input: {
  players: Array<{ userId: string }>;
  eliminatedUserIds: string[];
}) {
  const remainingUserIds = input.players
    .map((player) => player.userId)
    .filter((userId) => !input.eliminatedUserIds.includes(userId));
  const placements = new Map<string, 1 | 2 | 3>();
  const podiumUserIds: string[] = [];

  if (remainingUserIds.length === 1) {
    placements.set(remainingUserIds[0]!, 1);
    podiumUserIds.push(remainingUserIds[0]!);
  }

  const reverseEliminations = [...input.eliminatedUserIds].reverse();
  const placementOrder: Array<2 | 3> = [2, 3];

  for (const placement of placementOrder) {
    const userId = reverseEliminations.shift();

    if (!userId) {
      continue;
    }

    placements.set(userId, placement);
    podiumUserIds.push(userId);
  }

  return Array.from(placements.entries())
    .filter(([, placement]) => placement >= 1 && placement <= 3)
    .map(([userId, placement]) => ({
      userId,
      placement,
    }));
}

function sortGameEliminations(
  eliminations: GameForPlayPage["eliminations"],
) {
  return [...eliminations].sort((left, right) => {
    const leftRound = left.roundNumber ?? Number.POSITIVE_INFINITY;
    const rightRound = right.roundNumber ?? Number.POSITIVE_INFINITY;

    if (leftRound !== rightRound) {
      return leftRound - rightRound;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

async function applyItemizedGameScores(input: {
  game: GameForPlayPage;
  entries: ItemizedScoreEntryInput[];
}) {
  const gameSettingsV2 = getGameSettingsV2FromGame(input.game);

  if (
    !gameSettingsV2 ||
    !supportsDirectEndGameItemizedScoring(input.game, gameSettingsV2)
  ) {
    throw new Error("This game is not configured for end-game tally scoring");
  }

  const categories = gameSettingsV2.itemizedCategories;

  if (categories.length === 0) {
    throw new Error(
      "No itemized score categories are configured for this game",
    );
  }

  const categoryIds = new Set(categories.map((category) => category.id));
  const playerIds = new Set(input.game.players.map((player) => player.userId));
  const submittedEntries = new Map<string, ItemizedScoreEntryInput>();

  for (const entry of input.entries) {
    if (!categoryIds.has(entry.categoryId)) {
      throw new Error("Choose a valid itemized score category");
    }

    if (!playerIds.has(entry.userId)) {
      throw new Error("Only players in the game can receive itemized scores");
    }

    const dedupeKey = `${entry.userId}:${entry.categoryId}`;

    if (submittedEntries.has(dedupeKey)) {
      throw new Error("Each player can only submit one score entry per category");
    }

    submittedEntries.set(dedupeKey, entry);
  }

  const totalsByUserId = new Map<string, number>();
  const entriesToPersist: ItemizedScoreEntryInput[] = [];

  for (const player of input.game.players) {
    totalsByUserId.set(player.userId, 0);

    for (const category of categories) {
      const persistedEntry =
        submittedEntries.get(`${player.userId}:${category.id}`) ?? null;
      const values = normalizeItemizedValues({
        category,
        values: persistedEntry?.values,
      });
      const metadata = extractItemizedMetadataValues(persistedEntry?.values);
      const evaluation = evaluateItemizedCategoryFormula({
        category,
        values,
      });

      entriesToPersist.push({
        userId: player.userId,
        categoryId: category.id,
        values: {
          ...values,
          ...metadata,
        },
      });
      const included =
        !category.optional ||
        metadata[ITEMIZED_SCORE_INCLUDED_METADATA_KEY] !== 0;
      totalsByUserId.set(
        player.userId,
        (totalsByUserId.get(player.userId) ?? 0) +
          (included ? evaluation.normalizedScore : 0),
      );
    }
  }

  await replaceGameItemizedScoreEntries({
    gameId: input.game.id,
    gameRoundId: null,
    entries: entriesToPersist,
  });

  for (const player of input.game.players) {
    await updateGamePlayer(player.id, {
      score: totalsByUserId.get(player.userId) ?? 0,
    });
  }
}

function buildValidatedItemizedEntriesForPlayer(input: {
  categories: GameSettingsV2["itemizedCategories"];
  entries: ItemizedScoreEntryInput[];
  userId: string;
}) {
  const categoryIds = new Set(input.categories.map((category) => category.id));
  const submittedEntries = new Map<string, ItemizedScoreEntryInput>();

  for (const entry of input.entries) {
    if (entry.userId !== input.userId) {
      throw new Error("Only one player's itemized score can be submitted at a time");
    }

    if (!categoryIds.has(entry.categoryId)) {
      throw new Error("Choose a valid itemized score category");
    }

    if (submittedEntries.has(entry.categoryId)) {
      throw new Error("Each player can only submit one score entry per category");
    }

    submittedEntries.set(entry.categoryId, entry);
  }

  let totalScore = 0;
  const entriesToPersist = input.categories.map((category) => {
    const values = normalizeItemizedValues({
      category,
      values: submittedEntries.get(category.id)?.values,
    });
    const metadata = extractItemizedMetadataValues(
      submittedEntries.get(category.id)?.values,
    );
    const evaluation = evaluateItemizedCategoryFormula({
      category,
      values,
    });

    const included =
      !category.optional ||
      metadata[ITEMIZED_SCORE_INCLUDED_METADATA_KEY] !== 0;
    totalScore += included ? evaluation.normalizedScore : 0;

    return {
      categoryId: category.id,
      values: {
        ...values,
        ...metadata,
      },
    };
  });

  return {
    entriesToPersist,
    totalScore,
  };
}

export async function getPlayGameSnapshot(gameId: string) {
  const meta: LogMeta = { gameId, actorUserId: null };
  return runGameAction(
    "play_snapshot.read",
    meta,
    async () => {
      const [viewer, game] = await Promise.all([
        loadOptionalCurrentUser(),
        getGameForPlayPage(gameId),
      ]);

      if (!game) {
        throw new Error("Game not found");
      }

      meta.actorUserId = viewer?.id ?? null;
      const isCreator = viewer ? game.creatorId === viewer.id : false;
      const currentGamePlayer = viewer
        ? (game.players.find((player) => player.userId === viewer.id) ?? null)
        : null;
      const effectiveRole = viewer
        ? getEffectiveGamePlayerRole({
            creatorId: game.creatorId,
            player: currentGamePlayer,
            userId: viewer.id,
          })
        : "player";
      const isManager = effectiveRole === "manager";
      const canManageLiveGame = canRoleManageGame(effectiveRole);
      const canEditOwnScore = viewer
        ? canRoleEditScore({
            actorUserId: viewer.id,
            role: effectiveRole,
            targetUserId: viewer.id,
          })
        : false;
      const [friends, guests] = viewer
        ? await Promise.all([
            listAcceptedFriendsForUser(viewer.id),
            listGuestsCreatedByUser(viewer.id),
          ])
        : [[], []];
      const [shareToken, pendingJoinRequests] = canManageLiveGame
        ? await Promise.all([
            getOrCreateGameShareToken(game.id),
            listPendingJoinRequestsForGame(game.id),
          ])
        : [game.shareToken ?? null, []];
      const playerRankDeltas = await listPlayerRankGameDeltasForGame(gameId);

      return {
        currentUserId: viewer?.id ?? "",
        isCreator,
        isManager,
        effectiveRole,
        canManageLiveGame,
        canEditOwnScore,
        gameSharePath: shareToken ? buildGameSharePath(shareToken) : null,
        pendingJoinRequests,
        playerOptions: [...friends, ...guests],
        playerRankDeltas,
        game,
      };
    },
    (result) => ({
      canManageLiveGame: result.canManageLiveGame,
      isCreator: result.isCreator,
      isManager: result.isManager,
      pendingJoinRequestCount: result.pendingJoinRequests.length,
      playerOptionCount: result.playerOptions.length,
      playerRankDeltaCount: result.playerRankDeltas.length,
      playerCount: result.game.players.length,
    }),
  );
}

type EnterSharedGameResult =
  | { status: "joined"; gameId: string }
  | { status: "already_joined"; gameId: string }
  | { status: "own_game"; gameId: string }
  | { status: "requested"; gameId: string; requestId: string }
  | { status: "request_pending"; gameId: string; requestId: string }
  | { status: "unavailable"; reason: string };

export async function enterSharedGame(input: {
  shareToken: string;
}): Promise<EnterSharedGameResult> {
  const meta: LogMeta = {
    actorUserId: null,
    shareTokenPresent: Boolean(input.shareToken),
  };

  return runGameAction(
    "shared_link.enter",
    meta,
    async () => {
      const user = await requireCurrentUser();
      meta.actorUserId = user.id;
      const game = await getGameByShareToken(input.shareToken);

      if (!game || game.completedAt) {
        return {
          status: "unavailable",
          reason: "This shared game is no longer available.",
        } satisfies EnterSharedGameResult;
      }

      meta.gameId = game.id;

      if (game.creatorId === user.id) {
        return {
          status: "own_game",
          gameId: game.id,
        } satisfies EnterSharedGameResult;
      }

      if (game.players.some((player) => player.userId === user.id)) {
        return {
          status: "already_joined",
          gameId: game.id,
        } satisfies EnterSharedGameResult;
      }

      const gameStarted = hasGameStarted(game);
      const titlePlayerConfig = getGameSettingsV2PlayerConfig(
        getGameSettingsV2FromGame(game),
      );

      if (
        titlePlayerConfig.maxPlayers !== null &&
        game.players.length >= titlePlayerConfig.maxPlayers
      ) {
        return {
          status: "unavailable",
          reason: getTitlePlayerCountError(titlePlayerConfig),
        } satisfies EnterSharedGameResult;
      }

      if (game.inviteUsersEnabled && !gameStarted) {
        await ensureFriendshipExists({
          userAId: game.creatorId,
          userBId: user.id,
          inviterId: game.creatorId,
        });
        await addPlayerToGame(game.id, user.id, {
          role: getDefaultPlayerRoleForGame(game),
        });

        const pendingRequest = await getPendingJoinRequest(game.id, user.id);

        if (pendingRequest) {
          await resolveGameJoinRequest({
            id: pendingRequest.id,
            resolvedByUserId: game.creatorId,
            status: "approved",
          });
        }

        revalidateDashboardPages([
          ...getDashboardUserIdsForGame(game),
          user.id,
        ]);
        revalidateGameHistoryPages([
          ...getDashboardUserIdsForGame(game),
          user.id,
        ]);
        revalidateFriendsPages([game.creatorId, user.id]);

        return {
          status: "joined",
          gameId: game.id,
        } satisfies EnterSharedGameResult;
      }

      const existingRequest = await getPendingJoinRequest(game.id, user.id);

      if (existingRequest) {
        return {
          status: "request_pending",
          gameId: game.id,
          requestId: existingRequest.id,
        } satisfies EnterSharedGameResult;
      }

      const request = await createGameJoinRequest({
        gameId: game.id,
        requesterUserId: user.id,
        status: "pending",
      });

      return {
        status: "requested",
        gameId: game.id,
        requestId: request.id,
      } satisfies EnterSharedGameResult;
    },
    (result) => ({
      resultStatus: result.status,
      gameId: "gameId" in result ? result.gameId : null,
    }),
  );
}

export async function setGameInviteUsersEnabled(input: {
  gameId: string;
  enabled: boolean;
}) {
  const meta: LogMeta = {
    actorUserId: null,
    gameId: input.gameId,
    enabled: input.enabled,
  };

  return runGameAction(
    "share_link.toggle",
    meta,
    async () => {
      const { user, game } = await requireGameLiveManager(input.gameId);
      meta.actorUserId = user.id;

      const updatedGame = await updateGame(game.id, {
        inviteUsersEnabled: input.enabled,
      });

      revalidateDashboardPages(getDashboardUserIdsForGame(game));
      return updatedGame;
    },
    (result) => ({
      inviteUsersEnabled: result?.inviteUsersEnabled ?? null,
    }),
  );
}

export async function approveGameJoinRequest(input: {
  requestId: string;
  startingScoreMode?: GamePlayerStartingScoreMode;
  startingScoreValue?: number | null;
}) {
  const meta: LogMeta = {
    actorUserId: null,
    requestId: input.requestId,
  };

  return runGameAction(
    "join_request.approve",
    meta,
    async () => {
      const request = await getGameJoinRequestFullById(input.requestId);

      if (!request || request.status !== "pending") {
        throw new Error("Join request not found");
      }

      const { user, game } = await requireGameLiveManager(request.gameId);
      meta.actorUserId = user.id;
      meta.gameId = game.id;
      meta.subjectUserId = request.requesterUserId;

      if (
        game.players.some((player) => player.userId === request.requesterUserId)
      ) {
        await resolveGameJoinRequest({
          id: request.id,
          resolvedByUserId: user.id,
          status: "approved",
        });

        return {
          requestId: request.id,
          requesterUserId: request.requesterUserId,
        };
      }

      assertGameCanAcceptAnotherPlayer(game);

      await ensureFriendshipExists({
        userAId: game.creatorId,
        userBId: request.requesterUserId,
        inviterId: game.creatorId,
      });

      if (hasGameStarted(game)) {
        await addPlayerToGameWithStartingScore({
          gameId: game.id,
          userId: request.requesterUserId,
          role: getDefaultPlayerRoleForGame(game),
          startingScoreMode: input.startingScoreMode,
          startingScoreValue: input.startingScoreValue,
        });
      } else {
        await addPlayerToGame(game.id, request.requesterUserId, {
          role: getDefaultPlayerRoleForGame(game),
        });
      }

      await resolveGameJoinRequest({
        id: request.id,
        resolvedByUserId: user.id,
        status: "approved",
      });

      revalidateDashboardPages([
        ...getDashboardUserIdsForGame(game),
        request.requesterUserId,
      ]);
      revalidateGameHistoryPages([
        ...getDashboardUserIdsForGame(game),
        request.requesterUserId,
      ]);
      revalidateFriendsPages([game.creatorId, request.requesterUserId]);

      return {
        requestId: request.id,
        requesterUserId: request.requesterUserId,
      };
    },
    (result) => ({
      requesterUserId: result.requesterUserId,
    }),
  );
}

export async function declineGameJoinRequest(input: { requestId: string }) {
  const meta: LogMeta = {
    actorUserId: null,
    requestId: input.requestId,
  };

  return runGameAction(
    "join_request.decline",
    meta,
    async () => {
      const request = await getGameJoinRequestFullById(input.requestId);

      if (!request || request.status !== "pending") {
        throw new Error("Join request not found");
      }

      const { user, game } = await requireGameLiveManager(request.gameId);
      meta.actorUserId = user.id;
      meta.gameId = game.id;
      meta.subjectUserId = request.requesterUserId;

      await resolveGameJoinRequest({
        id: request.id,
        resolvedByUserId: user.id,
        status: "declined",
      });

      return request;
    },
    (result) => ({
      gameId: result.gameId,
      requesterUserId: result.requesterUserId,
    }),
  );
}

export async function getCreateGameTitleSuggestions() {
  const meta: LogMeta = { actorUserId: null };
  return runGameAction(
    "title_suggestions.read",
    meta,
    async () => {
      const user = await requireCurrentUser();
      meta.actorUserId = user.id;

      return listSuggestedGameTitles({
        userId: user.id,
        limit: 5,
      });
    },
    (result) => ({
      suggestionCount: result.length,
    }),
  );
}

export async function getCreateGameTitleById(gameTitleId: string) {
  const meta: LogMeta = { actorUserId: null, gameTitleId };
  return runGameAction(
    "title.read",
    meta,
    async () => {
      const user = await requireCurrentUser();
      meta.actorUserId = user.id;

      return getGameTitleLibraryEntryById({
        userId: user.id,
        gameTitleId,
      });
    },
    (result) => ({
      foundTitle: Boolean(result),
    }),
  );
}

async function requireAdminUser() {
  const user = await requireCurrentUser();

  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }

  return user;
}

function assertCanManageGameTitle(input: {
  user: Awaited<ReturnType<typeof requireCurrentUser>>;
  gameTitle: NonNullable<Awaited<ReturnType<typeof getGameTitleById>>>;
}) {
  if (input.gameTitle.isUniversal) {
    if (input.user.role !== "admin") {
      throw new Error("Admin access required");
    }

    return;
  }

  if (input.gameTitle.createdByUserId !== input.user.id) {
    throw new Error("Only the title owner can update this title");
  }
}

export async function getGame(gameId: string) {
  return runGameAction(
    "read",
    { gameId },
    async () => getGameById(gameId),
    (result) => ({
      foundGame: Boolean(result),
      playerCount: result?.players.length ?? 0,
    }),
  );
}

function normalizePositiveInteger(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.trunc(value);
  return rounded > 0 ? rounded : null;
}

function validateGameSettings(input: {
  scoringMode: "highest_wins" | "lowest_wins" | "no_score";
  endingMode: "none" | "round_count" | "score_threshold";
  trackRounds?: boolean | null;
  targetRounds?: number | null;
  scoreThreshold?: number | null;
  scoreThresholdDirection?: "at_least" | "at_most" | null;
}) {
  const targetRounds = normalizePositiveInteger(input.targetRounds);
  const scoreThreshold = normalizePositiveInteger(input.scoreThreshold);

  if (
    input.scoringMode === "no_score" &&
    input.endingMode === "score_threshold"
  ) {
    throw new Error("Score targets are not available when scores are hidden");
  }

  if (input.endingMode === "round_count" && targetRounds === null) {
    throw new Error("Choose how many rounds the game should target");
  }

  if (input.endingMode === "score_threshold") {
    if (scoreThreshold === null) {
      throw new Error("Choose a score threshold");
    }

    if (!input.scoreThresholdDirection) {
      throw new Error("Choose how the score threshold should work");
    }
  }

  return {
    trackRounds:
      input.endingMode === "none" ? Boolean(input.trackRounds) : true,
    targetRounds: input.endingMode === "round_count" ? targetRounds : null,
    scoreThreshold:
      input.endingMode === "score_threshold" ? scoreThreshold : null,
    scoreThresholdDirection:
      input.endingMode === "score_threshold"
        ? (input.scoreThresholdDirection ?? null)
        : null,
  };
}

async function resolveGameTitleId(input: {
  currentUserId: string;
  gameTitleId?: string | null;
  gameTitleName?: string | null;
  defaultSettings?: ReturnType<typeof gameSettingsToTitleDefaults>;
  defaultSettingsV2?: GameSettingsV2 | null;
}) {
  if (input.gameTitleName?.trim()) {
    const gameTitle = await createOrFindGameTitle({
      title: input.gameTitleName,
      currentUserId: input.currentUserId,
      defaultSettings: input.defaultSettings,
      defaultSettingsV2: input.defaultSettingsV2,
    });

    return gameTitle.id;
  }

  if (input.gameTitleId) {
    const gameTitle = await getAccessibleGameTitleById({
      userId: input.currentUserId,
      gameTitleId: input.gameTitleId,
    });

    if (!gameTitle) {
      throw new Error("Choose a title from your library");
    }

    return gameTitle.id;
  }

  throw new Error("Choose a game title");
}

export async function createConfiguredGame(input: {
  gameTitleId?: string | null;
  gameTitleName?: string | null;
  scoringMode: "highest_wins" | "lowest_wins" | "no_score";
  endingMode: "none" | "round_count" | "score_threshold";
  trackRounds?: boolean | null;
  targetRounds?: number | null;
  scoreThreshold?: number | null;
  scoreThresholdDirection?: "at_least" | "at_most" | null;
  version?: "v1" | "v2";
  settingsV2?: Partial<GameSettingsV2> | null;
  settingsSource?: "game_default" | "user_default" | "custom";
  gameSpecificSettings?: GameSpecificSettings | null;
  managementSettings?: GameManagementSettings | null;
}) {
  const meta: LogMeta = {
    actorUserId: null,
    requestedGameTitleId: input.gameTitleId ?? null,
    createdTitleFromName: Boolean(input.gameTitleName?.trim()),
    scoringMode: input.scoringMode,
    endingMode: input.endingMode,
  };

  return runGameAction(
    "create",
    meta,
    async () => {
      const user = await requireCurrentUser();
      meta.actorUserId = user.id;
      const version = input.version ?? (input.settingsV2 ? "v2" : "v1");
      const requestedGameTitle =
        version === "v2" && input.gameTitleId
          ? await getGameTitleLibraryEntryById({
              userId: user.id,
              gameTitleId: input.gameTitleId,
            })
          : null;
      const gameSpecificSettings = normalizeGameSpecificSettings(
        input.gameSpecificSettings ??
          parseGameSpecificSettings(
            requestedGameTitle?.personalGameSpecificSettingsJson,
            requestedGameTitle,
          ),
        requestedGameTitle,
      );
      const defaultPlayerRole = normalizeDefaultPlayerRole(
        input.managementSettings?.defaultPlayerRole ??
          requestedGameTitle?.personalDefaultPlayerRole,
      );
      const baseSettingsV2 =
        version === "v2"
          ? input.settingsV2 ??
            (getGameSettingsV2FromTitle(requestedGameTitle) ??
              (requestedGameTitle &&
              isLostCitiesTitle(requestedGameTitle)
                ? buildLostCitiesGameSettingsTemplate()
                : {}))
          : null;
      let validatedSettingsV2 =
        version === "v2"
          ? validateGameSettingsV2(baseSettingsV2 ?? {})
          : null;
      if (validatedSettingsV2 && isLostCitiesTitle(requestedGameTitle)) {
        const expeditionCount =
          "expeditionCount" in gameSpecificSettings
            ? gameSpecificSettings.expeditionCount
            : 5;
        validatedSettingsV2 = validateGameSettingsV2({
          ...validatedSettingsV2,
          itemizedCategories: buildLostCitiesItemizedCategories(expeditionCount),
          playerConfig: {
            ...validatedSettingsV2.playerConfig,
            allPlayersAreManagers: false,
          },
        });
      }
      let requestedTitleSettingsV2 = getGameSettingsV2FromTitle(
        requestedGameTitle,
      );
      if (requestedTitleSettingsV2 && isLostCitiesTitle(requestedGameTitle)) {
        const expeditionCount =
          "expeditionCount" in gameSpecificSettings
            ? gameSpecificSettings.expeditionCount
            : 5;
        requestedTitleSettingsV2 = validateGameSettingsV2({
          ...requestedTitleSettingsV2,
          itemizedCategories: buildLostCitiesItemizedCategories(expeditionCount),
          playerConfig: {
            ...requestedTitleSettingsV2.playerConfig,
            allPlayersAreManagers: false,
          },
        });
      }

      if (
        validatedSettingsV2 &&
        usesGameSettingsV2ItemizedScoring(validatedSettingsV2) &&
        user.role !== "admin" &&
        serializeGameSettingsV2(validatedSettingsV2) !==
          serializeGameSettingsV2(
            requestedTitleSettingsV2 ?? validateGameSettingsV2({}),
          )
      ) {
        throw new Error("Admin access required for custom itemized scoring");
      }

      if (
        validatedSettingsV2 &&
        user.role !== "admin" &&
        JSON.stringify(validatedSettingsV2.playerConfig) !==
          JSON.stringify(
            requestedTitleSettingsV2?.playerConfig ?? {
              minPlayers: null,
              maxPlayers: null,
              allPlayersAreManagers: false,
            },
          )
      ) {
        throw new Error("Admin access required for title player-limit defaults");
      }
      const validatedSettings =
        version === "v2"
          ? projectV2SettingsToLegacy(validatedSettingsV2!)
          : validateGameSettings(input);
      const gameSettingsV2ForGame =
        validatedSettingsV2 && usesGameSettingsV2ItemizedScoring(validatedSettingsV2)
          ? cloneGameSettingsV2WithFreshItemizedCategoryIds(validatedSettingsV2)
          : validatedSettingsV2;
      const resolvedGameTitleId = await resolveGameTitleId({
        currentUserId: user.id,
        gameTitleId: input.gameTitleId,
        gameTitleName: input.gameTitleName,
        defaultSettings: input.gameTitleName?.trim()
          ? gameSettingsToTitleDefaults({
              scoringMode: input.scoringMode,
              endingMode: input.endingMode,
              trackRounds: validatedSettings.trackRounds,
              targetRounds: validatedSettings.targetRounds ?? 1,
              scoreThreshold: validatedSettings.scoreThreshold ?? 100,
              scoreThresholdDirection:
                validatedSettings.scoreThresholdDirection ?? "at_least",
            })
          : undefined,
        defaultSettingsV2: input.gameTitleName?.trim()
          ? validatedSettingsV2
          : undefined,
      });

      meta.gameTitleId = resolvedGameTitleId;
      meta.targetRounds = validatedSettings.targetRounds;
      meta.scoreThreshold = validatedSettings.scoreThreshold;
      meta.scoreThresholdDirection = validatedSettings.scoreThresholdDirection;
      const scoringMode =
        version === "v2"
          ? projectV2SettingsToLegacy(gameSettingsV2ForGame!).scoringMode
          : input.scoringMode;
      const endingMode =
        version === "v2"
          ? projectV2SettingsToLegacy(gameSettingsV2ForGame!).endingMode
          : input.endingMode;

      const game = await createGame({
        creatorId: user.id,
        version,
        gameTitleId: resolvedGameTitleId,
        scoringMode,
        endingMode,
        trackRounds: validatedSettings.trackRounds,
        targetRounds: validatedSettings.targetRounds,
        scoreThreshold: validatedSettings.scoreThreshold,
        scoreThresholdDirection: validatedSettings.scoreThresholdDirection,
        settingsJson: gameSettingsV2ForGame
          ? serializeGameSettingsV2(gameSettingsV2ForGame)
          : null,
        gameSpecificSettingsJson:
          serializeGameSpecificSettings(gameSpecificSettings),
        defaultPlayerRole,
        completedRounds: 0,
      });

      await addPlayerToGameWithStartingScore({
        gameId: game.id,
        userId: user.id,
        role: "player",
        gameSettingsV2: gameSettingsV2ForGame,
      });

      if (
        gameSettingsV2ForGame &&
        usesGameSettingsV2ItemizedScoring(gameSettingsV2ForGame)
      ) {
        await replaceGameItemizedScoreCategories({
          gameId: game.id,
          categories: gameSettingsV2ForGame.itemizedCategories,
        });
      }

      if (version === "v2") {
        await upsertUserGameTitlePreferences({
          userId: user.id,
          gameTitleId: resolvedGameTitleId,
          gameSpecificSettingsJson:
            serializeGameSpecificSettings(gameSpecificSettings),
          defaultPlayerRole,
        });
      }

      if (resolvedGameTitleId) {
        await grantGameTitleToGameParticipants({
          gameId: game.id,
          gameTitleId: resolvedGameTitleId,
          source: "played",
          acquiredFromUserId: user.id,
        });
      }

      if (
        version === "v2" &&
        input.settingsSource === "custom" &&
        input.gameTitleId &&
        validatedSettingsV2
      ) {
        await upsertUserGameTitleSettings({
          userId: user.id,
          gameTitleId: resolvedGameTitleId,
          settings: validatedSettingsV2,
        });
      }

      revalidateDashboardPage(user.id);
      revalidateGameHistoryPage(user.id);
      revalidateTitlesPage(user.id);

      return game;
    },
    (result) => ({
      gameId: result.id,
    }),
  );
}

export async function createRematchGame(sourceGameId: string) {
  const meta: LogMeta = {
    sourceGameId,
    actorUserId: null,
  };

  return runGameAction(
    "rematch.create",
    meta,
    async () => {
      const { user, game } = await requireGameMembership(sourceGameId);
      meta.actorUserId = user.id;

      if (!game.completedAt) {
        throw new Error("Only completed games can be rematched");
      }

      const sourceGameSettingsV2 = getGameSettingsV2FromGame(game);
      const rematchSettingsV2 =
        sourceGameSettingsV2 &&
        usesGameSettingsV2ItemizedScoring(sourceGameSettingsV2)
          ? cloneGameSettingsV2WithFreshItemizedCategoryIds(sourceGameSettingsV2)
          : sourceGameSettingsV2;

      const rematch = await createGame({
        creatorId: user.id,
        version: game.version,
        gameTitleId: game.gameTitleId,
        scoringMode: game.scoringMode,
        endingMode: game.endingMode,
        trackRounds: game.trackRounds,
        targetRounds: game.targetRounds,
        scoreThreshold: game.scoreThreshold,
        scoreThresholdDirection: game.scoreThresholdDirection,
        settingsJson: rematchSettingsV2
          ? serializeGameSettingsV2(rematchSettingsV2)
          : game.settingsJson,
        gameSpecificSettingsJson: game.gameSpecificSettingsJson,
        defaultPlayerRole: game.defaultPlayerRole,
        inviteUsersEnabled: game.inviteUsersEnabled,
        completedRounds: 0,
      });

      const playerUserIds = Array.from(
        new Set(game.players.map((player) => player.userId)),
      );

      for (const player of game.players) {
        const sourceRole = getStoredGamePlayerRole(player);

        await addPlayerToGameWithStartingScore({
          gameId: rematch.id,
          userId: player.userId,
          // Ownership moves to the member who starts the rematch. Preserve the
          // previous creator's management access after that ownership change.
          role: player.userId === game.creatorId ? "manager" : sourceRole,
          gameSettingsV2: rematchSettingsV2,
        });
      }

      if (rematchSettingsV2 && usesGameSettingsV2ItemizedScoring(rematchSettingsV2)) {
        await replaceGameItemizedScoreCategories({
          gameId: rematch.id,
          categories: rematchSettingsV2.itemizedCategories,
        });
      }

      if (game.gameTitleId) {
        await grantGameTitleToGameParticipants({
          gameId: rematch.id,
          gameTitleId: game.gameTitleId,
          source: "played",
          acquiredFromUserId: user.id,
        });
      }

      const affectedUserIds = Array.from(new Set([user.id, ...playerUserIds]));
      revalidateDashboardPages(affectedUserIds);
      revalidateGameHistoryPages(affectedUserIds);
      revalidateTitlesPages(affectedUserIds);

      return rematch;
    },
    (result) => ({
      gameId: result.id,
    }),
  );
}

export async function createRematchGameAndRedirect(sourceGameId: string) {
  const game = await createRematchGame(sourceGameId);
  redirect(`/game/${game.id}/play`);
}

export async function updateGamePlayerScore(input: {
  gamePlayerId: string;
  delta?: number;
  score?: number;
}) {
  const { gamePlayerId, delta, score } = input;
  const meta: LogMeta = {
    gamePlayerId,
    delta: delta ?? null,
    score: score ?? null,
    actorUserId: null,
    gameId: null,
  };

  return runGameAction(
    "player_score.update",
    meta,
    async () => {
      if (delta === undefined && score === undefined) {
        throw new Error("A score delta or absolute score is required");
      }

      const gamePlayer = await getGamePlayerFullById(gamePlayerId);

      if (!gamePlayer) {
        throw new Error("Game player not found");
      }

      meta.gameId = gamePlayer.gameId;
      const { user, game: fullGame } = await requireGameScoreEditor(
        gamePlayer.gameId,
        gamePlayer.userId,
      );
      meta.actorUserId = user.id;

      const player = fullGame.players.find(
        (entry) => entry.id === gamePlayerId,
      );

      if (!player) {
        throw new Error("Game player not found");
      }

      const nextScore = score ?? player.score + delta!;

      const result = await updateGamePlayer(gamePlayerId, {
        score: nextScore,
      });

      revalidateDashboardPages(getDashboardUserIdsForGame(fullGame));
      revalidateGameHistoryPages(getDashboardUserIdsForGame(fullGame));
      return result;
    },
    (result) => ({
      updatedScore: result?.score ?? null,
    }),
  );
}

export async function commitGameRound(input: {
  gameId: string;
  completeGame?: boolean;
  winnerUserIds?: string[] | null;
  placementSelections?: Array<{
    placement: 1 | 2 | 3;
    userIds: string[];
  }> | null;
  eliminatedUserId?: string | null;
}) {
  const meta: LogMeta = {
    gameId: input.gameId,
    completeGame: Boolean(input.completeGame),
    actorUserId: null,
  };

  return runGameAction(
    "round.commit",
    meta,
    async () => {
      const { user, game } = await requireGameLiveManager(input.gameId);
      meta.actorUserId = user.id;

      if (game.completedAt) {
        throw new Error("Game is already complete");
      }

      assertGameIsNotPaused(game);

      const activeRoundNumber = game.completedRounds + 1;
      const existingRound =
        game.rounds.find((round) => round.roundNumber === activeRoundNumber) ??
        (await getGameRoundByGameAndNumber({
          gameId: game.id,
          roundNumber: activeRoundNumber,
        }));

      const round =
        existingRound ??
        (await createGameRound({
          gameId: game.id,
          roundNumber: activeRoundNumber,
        }));

      if (!round) {
        throw new Error("Could not create round");
      }

      const gameSettingsV2 = getGameSettingsV2FromGame(game);
      const roundScores = existingRound?.scores ?? [];

      if (gameSettingsV2 && isGameSettingsV2Elimination(gameSettingsV2)) {
        const usesRounds = gameSettingsV2.roundConfig.enabled;
        const activeEliminations = usesRounds
          ? game.eliminations.filter(
              (entry) => entry.roundNumber === activeRoundNumber,
            )
          : game.eliminations;
        const eliminatedUserId = input.eliminatedUserId?.trim() ?? "";

        if (!eliminatedUserId) {
          throw new Error("Choose a player to eliminate");
        }

        if (
          !game.players.some((player) => player.userId === eliminatedUserId)
        ) {
          throw new Error("Choose a player in this game");
        }

        if (
          activeEliminations.some(
            (entry) => entry.eliminatedUserId === eliminatedUserId,
          )
        ) {
          throw new Error("That player has already been eliminated");
        }

        const finishedAt = nowIso();
        const placement = game.players.length - activeEliminations.length;
        await createGameElimination({
          gameId: game.id,
          eliminatedUserId,
          placement,
          roundNumber: activeRoundNumber,
        });

        const remainingUserIds = game.players
          .map((player) => player.userId)
          .filter(
            (userId) =>
              userId !== eliminatedUserId &&
              !activeEliminations.some(
                (entry) => entry.eliminatedUserId === userId,
              ),
          );

        if (usesRounds && remainingUserIds.length > 1) {
          revalidateDashboardPages(getDashboardUserIdsForGame(game));
          revalidateGameHistoryPages(getDashboardUserIdsForGame(game));
          return game;
        }

        const nextCompletedRounds = game.completedRounds + 1;
        const roundWinnerUserId = remainingUserIds[0] ?? null;
        const roundWinner = roundWinnerUserId
          ? game.players.find((player) => player.userId === roundWinnerUserId)
          : null;
        const nextWinnerScore = usesRounds
          ? (roundWinner?.score ?? 0) + 1
          : (roundWinner?.score ?? 0);
        let shouldComplete = usesRounds
          ? input.completeGame ||
            (gameSettingsV2.gameEndTrigger === "rounds_exhausted" &&
              nextCompletedRounds >=
                (gameSettingsV2.roundConfig.targetRounds ?? Number.MAX_SAFE_INTEGER)) ||
            (gameSettingsV2.gameEndTrigger === "points_threshold_reached" &&
              nextWinnerScore >=
                (gameSettingsV2.thresholdConfig.value ?? Number.MAX_SAFE_INTEGER))
          : remainingUserIds.length <= 1;
        const playersWithRoundWin = game.players.map((player) => ({
          ...player,
          score:
            player.userId === roundWinnerUserId
              ? nextWinnerScore
              : player.score,
        }));

        if (
          shouldComplete &&
          usesRounds &&
          !gameSettingsV2.tiePolicy.allowTies
        ) {
          const highestScore = Math.max(
            ...playersWithRoundWin.map((player) => player.score),
          );
          shouldComplete =
            playersWithRoundWin.filter(
              (player) => player.score === highestScore,
            ).length === 1;
        }

        if (usesRounds && roundWinner) {
          await createGameRoundScores({
            gameRoundId: round.id,
            scores: [{ userId: roundWinner.userId, scoreDelta: 1 }],
          });
          await updateGamePlayer(roundWinner.id, { score: nextWinnerScore });
        }

        const updatedGame = await updateGame(game.id, {
          completedRounds: nextCompletedRounds,
          completedAt: shouldComplete ? finishedAt : game.completedAt,
        });

        await updateGameRound(round.id, {
          completedAt: finishedAt,
        });

        if (shouldComplete && !usesRounds) {
          const eliminatedUserIds = [
            ...activeEliminations.map((entry) => entry.eliminatedUserId),
            eliminatedUserId,
          ];
          const placements = deriveEliminationPlacements({
            players: game.players,
            eliminatedUserIds,
          });
          const winnerUserIds = placements
            .filter((placementEntry) => placementEntry.placement === 1)
            .map((placementEntry) => placementEntry.userId);

          await replaceGameResultPlacements({
            gameId: game.id,
            placements,
          });
          await replaceGameWinners({
            gameId: game.id,
            userIds: winnerUserIds,
          });
          await syncPlayerRankForCompletedGame({
            gameId: game.id,
            completedAt: finishedAt,
            scoringMode: "no_score",
            players: game.players.map((player) => ({
              userId: player.userId,
              score: player.score,
            })),
            winnerUserIds,
            placementSelections: [1, 2, 3]
              .map((placementValue) => {
                const userIds = placements
                  .filter((entry) => entry.placement === placementValue)
                  .map((entry) => entry.userId);

                return userIds.length > 0
                  ? {
                      placement: placementValue as 1 | 2 | 3,
                      userIds,
                    }
                  : null;
              })
              .filter(
                (value): value is { placement: 1 | 2 | 3; userIds: string[] } =>
                  value !== null,
              ),
          });
        }

        if (shouldComplete && usesRounds) {
          const highestScore = Math.max(
            ...playersWithRoundWin.map((player) => player.score),
          );
          const winnerUserIds = playersWithRoundWin
            .filter((player) => player.score === highestScore)
            .map((player) => player.userId);
          await replaceGameWinners({ gameId: game.id, userIds: winnerUserIds });
          await syncPlayerRankForCompletedGame({
            gameId: game.id,
            completedAt: finishedAt,
            scoringMode: "highest_wins",
            players: playersWithRoundWin.map((player) => ({
              userId: player.userId,
              score: player.score,
            })),
            winnerUserIds,
          });
        }

        if (shouldComplete) {
          await grantCardPacksForCompletedGame(game);
        }

        revalidateDashboardPages(getDashboardUserIdsForGame(game));
        revalidateGameHistoryPages(getDashboardUserIdsForGame(game));

        if (shouldComplete) {
          revalidateFriendsPages(getDashboardUserIdsForGame(game));
          revalidateTitlesPages(getDashboardUserIdsForGame(game));
          revalidateRankRelatedPages(getDashboardUserIdsForGame(game));
        }

        return updatedGame;
      }

      if (gameSettingsV2 && usesWinnerSelection(gameSettingsV2)) {
        const winnerUserIds = Array.from(new Set(input.winnerUserIds ?? []));

        if (winnerUserIds.length !== 1) {
          throw new Error("Choose exactly one round winner");
        }

        const winnerUserId = winnerUserIds[0]!;
        const winnerPlayer = game.players.find(
          (player) => player.userId === winnerUserId,
        );

        if (!winnerPlayer) {
          throw new Error("Choose a player in this game");
        }

        const existingWinnerScore =
          roundScores.find((score) => score.userId === winnerUserId) ??
          (await getGameRoundScoreByRoundAndUser({
            gameRoundId: round.id,
            userId: winnerUserId,
          }));

        if (roundScores.some((score) => score.userId !== winnerUserId)) {
          throw new Error("Round winner games only allow one winner per round");
        }

        if (existingWinnerScore) {
          await updateGameRoundScore(existingWinnerScore.id, {
            scoreDelta: 1,
          });
        } else {
          await createGameRoundScores({
            gameRoundId: round.id,
            scores: [{ userId: winnerUserId, scoreDelta: 1 }],
          });
        }

        await updateGamePlayer(winnerPlayer.id, {
          score:
            winnerPlayer.score + (1 - (existingWinnerScore?.scoreDelta ?? 0)),
        });

        const nextWinnerScore =
          winnerPlayer.score + (1 - (existingWinnerScore?.scoreDelta ?? 0));
        input.completeGame =
          Boolean(input.completeGame) ||
          !gameSettingsV2.roundConfig.enabled ||
          (gameSettingsV2.gameEndTrigger === "rounds_exhausted" &&
            activeRoundNumber >=
              (gameSettingsV2.roundConfig.targetRounds ?? Number.MAX_SAFE_INTEGER)) ||
          (gameSettingsV2.gameEndTrigger === "points_threshold_reached" &&
            nextWinnerScore >=
              (gameSettingsV2.thresholdConfig.value ?? Number.MAX_SAFE_INTEGER));
      }

      if (
        gameSettingsV2?.scoringType === "points" &&
        gameSettingsV2.roundConfig.enabled
      ) {
        const threshold = gameSettingsV2.thresholdConfig.value;
        const thresholdReached =
          gameSettingsV2.gameEndTrigger === "points_threshold_reached" &&
          threshold !== null &&
          game.players.some((player) =>
            gameSettingsV2.thresholdConfig.direction === "at_most"
              ? player.score <= threshold
              : player.score >= threshold,
          );

        input.completeGame =
          Boolean(input.completeGame) ||
          (gameSettingsV2.gameEndTrigger === "rounds_exhausted" &&
            activeRoundNumber >=
              (gameSettingsV2.roundConfig.targetRounds ??
                Number.MAX_SAFE_INTEGER)) ||
          thresholdReached;
      }

      const noScorePlacements =
        game.scoringMode === "no_score" && input.completeGame
          ? normalizeNoScorePlacementSelections({
              participants: game.players,
              placementSelections: input.placementSelections,
              winnerUserIds: input.winnerUserIds,
            })
          : null;
      const nextWinningUserIds =
        game.scoringMode === "no_score"
          ? (noScorePlacements?.winnerUserIds ?? [])
          : getWinningUserIds({
              ...game,
              players: game.players.map((player) => ({
                userId: player.userId,
                score:
                  gameSettingsV2 && usesWinnerSelection(gameSettingsV2)
                    ? player.score +
                      (input.winnerUserIds?.includes(player.userId) ? 1 : 0)
                    : player.score,
              })),
            });
      if (
        input.completeGame &&
        gameSettingsV2 &&
        !gameSettingsV2.tiePolicy.allowTies &&
        nextWinningUserIds.length > 1
      ) {
        input.completeGame = false;
      }
      const finishedAt = nowIso();
      meta.roundId = round.id;
      meta.roundNumber = activeRoundNumber;
      meta.winnerCount = nextWinningUserIds.length;

      const updatedGame = await updateGame(game.id, {
        completedRounds: game.completedRounds + 1,
        completedAt: input.completeGame ? finishedAt : game.completedAt,
      });

      await updateGameRound(round.id, {
        completedAt: finishedAt,
      });

      if (input.completeGame) {
        if (game.scoringMode === "no_score") {
          await replaceNoScoreGameResults({
            gameId: game.id,
            placementSelections: noScorePlacements?.placements ?? [],
          });
        } else {
          await replaceGameWinners({
            gameId: game.id,
            userIds: nextWinningUserIds,
          });
        }

        await syncPlayerRankForCompletedGame({
          gameId: game.id,
          completedAt: finishedAt,
          scoringMode: game.scoringMode,
          players: game.players.map((player) => ({
            userId: player.userId,
            score: player.score,
          })),
          winnerUserIds: nextWinningUserIds,
          placementSelections: noScorePlacements?.placements,
        });

        if (game.gameTitleId) {
          await grantGameTitleToGameParticipants({
            gameId: game.id,
            gameTitleId: game.gameTitleId,
            source: "played",
            acquiredFromUserId: user.id,
          });
        }

        await ensureParticipantsAreFriends({
          game,
          inviterId: game.creatorId,
        });

        await grantCardPacksForCompletedGame(game);
      }

      revalidateDashboardPages(getDashboardUserIdsForGame(game));
      revalidateGameHistoryPages(getDashboardUserIdsForGame(game));

      if (input.completeGame) {
        revalidateFriendsPages(getDashboardUserIdsForGame(game));
        revalidateTitlesPages(getDashboardUserIdsForGame(game));
        revalidateRankRelatedPages(getDashboardUserIdsForGame(game));
      }

      return updatedGame;
    },
    (result) => ({
      completedRounds: result?.completedRounds ?? null,
      gameCompleted: Boolean(result?.completedAt),
    }),
  );
}

export async function reopenCompletedGame(input: { gameId: string }) {
  const meta: LogMeta = {
    gameId: input.gameId,
    actorUserId: null,
  };

  return runGameAction(
    "reopen",
    meta,
    async () => {
      const { user, game } = await requireGameLiveManager(input.gameId);
      meta.actorUserId = user.id;

      if (!game.completedAt) {
        throw new Error("Game is already active");
      }

      const updatedGame = await updateGame(game.id, {
        completedAt: null,
        pausedAt: null,
        pausedNextUserId: null,
      });

      await replaceGameWinners({
        gameId: game.id,
        userIds: [],
      });
      await replaceGameResultPlacements({
        gameId: game.id,
        placements: [],
      });
      await deleteGamePlayerRankResults(game.id);
      await rebuildPlayerRankHistoryFromDate({
        startDate: game.completedAt,
      });

      revalidateDashboardPages(getDashboardUserIdsForGame(game));
      revalidateGameHistoryPages(getDashboardUserIdsForGame(game));
      revalidateTitlesPages(getDashboardUserIdsForGame(game));
      revalidateRankRelatedPages(getDashboardUserIdsForGame(game));

      return updatedGame;
    },
    (result) => ({
      completedAt: result?.completedAt ?? null,
    }),
  );
}

export async function uneliminateGamePlayer(input: {
  gameId: string;
  eliminatedUserId: string;
}) {
  const meta: LogMeta = {
    gameId: input.gameId,
    actorUserId: null,
    subjectUserId: input.eliminatedUserId,
  };

  return runGameAction(
    "uneliminate",
    meta,
    async () => {
      const { user, game } = await requireGameLiveManager(input.gameId);
      meta.actorUserId = user.id;

      if (game.completedAt) {
        throw new Error("Completed games cannot be un-eliminated");
      }

      const gameSettingsV2 = getGameSettingsV2FromGame(game);

      if (!gameSettingsV2 || !isGameSettingsV2Elimination(gameSettingsV2)) {
        throw new Error("This game does not use elimination mode");
      }

      const activeRoundNumber = game.completedRounds + 1;
      const sortedEliminations = sortGameEliminations(
        gameSettingsV2.roundConfig.enabled
          ? game.eliminations.filter(
              (entry) => entry.roundNumber === activeRoundNumber,
            )
          : game.eliminations,
      );
      const targetIndex = sortedEliminations.findIndex(
        (entry) => entry.eliminatedUserId === input.eliminatedUserId,
      );

      if (targetIndex < 0) {
        throw new Error("That player is not currently eliminated");
      }

      const eliminationsToRemove = sortedEliminations.slice(targetIndex);
      const roundNumbersToRemove = Array.from(
        new Set(
          eliminationsToRemove
            .map((entry) => entry.roundNumber)
            .filter((value): value is number => value !== null),
        ),
      );

      await deleteGameEliminationsByIds(
        eliminationsToRemove.map((entry) => entry.id),
      );
      await deleteGameRoundsByNumbers({
        gameId: game.id,
        roundNumbers: roundNumbersToRemove,
      });
      await replaceGameWinners({
        gameId: game.id,
        userIds: [],
      });
      await replaceGameResultPlacements({
        gameId: game.id,
        placements: [],
      });

      const updatedGame = await updateGame(game.id, {
        completedAt: null,
        completedRounds: targetIndex,
      });

      revalidateDashboardPages(getDashboardUserIdsForGame(game));
      revalidateGameHistoryPages(getDashboardUserIdsForGame(game));

      return updatedGame;
    },
    (result) => ({
      completedAt: result?.completedAt ?? null,
      completedRounds: result?.completedRounds ?? null,
    }),
  );
}

export async function pauseGame(input: {
  gameId: string;
  nextUserId?: string | null;
}) {
  const meta: LogMeta = {
    gameId: input.gameId,
    actorUserId: null,
    subjectUserId: input.nextUserId ?? null,
  };

  return runGameAction(
    "pause",
    meta,
    async () => {
      const { user, game } = await requireGameLiveManager(input.gameId);
      meta.actorUserId = user.id;

      if (game.completedAt) {
        throw new Error("Game is already complete");
      }

      const nextUserId = input.nextUserId?.trim() || null;

      if (
        nextUserId !== null &&
        !game.players.some((player) => player.userId === nextUserId)
      ) {
        throw new Error("Choose a player in this game");
      }

      const updatedGame = await updateGame(game.id, {
        pausedAt: nowIso(),
        pausedNextUserId: nextUserId,
      });

      revalidateDashboardPages(getDashboardUserIdsForGame(game));
      revalidateGameHistoryPages(getDashboardUserIdsForGame(game));
      return updatedGame;
    },
    (result) => ({
      pausedAt: result?.pausedAt ?? null,
      pausedNextUserId: result?.pausedNextUserId ?? null,
    }),
  );
}

export async function resumeGame(input: { gameId: string }) {
  const meta: LogMeta = {
    gameId: input.gameId,
    actorUserId: null,
  };

  return runGameAction(
    "resume",
    meta,
    async () => {
      const { user, game } = await requireGameLiveManager(input.gameId);
      meta.actorUserId = user.id;

      if (game.completedAt) {
        throw new Error("Game is already complete");
      }

      if (!game.pausedAt) {
        throw new Error("Game is already active");
      }

      const updatedGame = await updateGame(game.id, {
        pausedAt: null,
        pausedNextUserId: null,
      });

      revalidateDashboardPages(getDashboardUserIdsForGame(game));
      revalidateGameHistoryPages(getDashboardUserIdsForGame(game));
      return updatedGame;
    },
    (result) => ({
      pausedAt: result?.pausedAt ?? null,
      pausedNextUserId: result?.pausedNextUserId ?? null,
    }),
  );
}

export async function upsertActiveRoundScore(input: {
  gameId: string;
  userId: string;
  scoreDelta: number;
}) {
  const meta: LogMeta = {
    gameId: input.gameId,
    subjectUserId: input.userId,
    scoreDelta: input.scoreDelta,
    actorUserId: null,
  };

  return runGameAction(
    "round_score.upsert",
    meta,
    async () => {
      const { user, game } = await requireGameScoreEditor(
        input.gameId,
        input.userId,
      );
      meta.actorUserId = user.id;

      if (game.completedAt) {
        throw new Error("Game is already complete");
      }

      assertGameIsNotPaused(game);
      assertGameMeetsPlayerRequirements(game);

      const gameSettingsV2 = getGameSettingsV2FromGame(game);

      if (gameSettingsV2) {
        if (usesWinnerSelection(gameSettingsV2)) {
          throw new Error(
            "Round winner games score by selecting the round winner",
          );
        }

        if (isGameSettingsV2Elimination(gameSettingsV2)) {
          throw new Error("Elimination games do not use manual score entry");
        }

        if (usesGameSettingsV2ItemizedScoring(gameSettingsV2)) {
          throw new Error("Itemized scoring games use scoring breakdown entry");
        }
      }

      if (!Number.isFinite(input.scoreDelta)) {
        throw new Error("Round scores must be valid numbers");
      }

      const normalizedDelta = Math.trunc(input.scoreDelta);
      const player = game.players.find(
        (entry) => entry.userId === input.userId,
      );

      if (!player) {
        throw new Error("Game player not found");
      }

      if (gameSettingsV2?.scoringType === "points" && !gameSettingsV2.roundConfig.enabled) {
        const updatedPlayer = await updateGamePlayer(player.id, {
          score: normalizedDelta,
        });
        revalidateDashboardPages(getDashboardUserIdsForGame(game));
        revalidateGameHistoryPages(getDashboardUserIdsForGame(game));
        return updatedPlayer;
      }

      const activeRoundNumber = game.completedRounds + 1;
      const existingRound =
        game.rounds.find((round) => round.roundNumber === activeRoundNumber) ??
        (await getGameRoundByGameAndNumber({
          gameId: game.id,
          roundNumber: activeRoundNumber,
        }));

      const round =
        existingRound ??
        (await createGameRound({
          gameId: game.id,
          roundNumber: activeRoundNumber,
        }));

      if (!round) {
        throw new Error("Could not create round");
      }

      const existingScore =
        existingRound?.scores.find((score) => score.userId === input.userId) ??
        (await getGameRoundScoreByRoundAndUser({
          gameRoundId: round.id,
          userId: input.userId,
        }));

      meta.roundId = round.id;
      meta.roundNumber = activeRoundNumber;
      meta.createdScore = !existingScore;
      meta.normalizedScoreDelta = normalizedDelta;
      meta.previousScoreDelta = existingScore?.scoreDelta ?? 0;

      if (existingScore) {
        await updateGameRoundScore(existingScore.id, {
          scoreDelta: normalizedDelta,
        });
      } else {
        await createGameRoundScores({
          gameRoundId: round.id,
          scores: [
            {
              userId: input.userId,
              scoreDelta: normalizedDelta,
            },
          ],
        });
      }

      const result = await updateGamePlayer(player.id, {
        score:
          player.score + (normalizedDelta - (existingScore?.scoreDelta ?? 0)),
      });

      if (game.inviteUsersEnabled) {
        await updateGame(game.id, {
          inviteUsersEnabled: false,
        });
      }

      revalidateDashboardPages(getDashboardUserIdsForGame(game));
      revalidateGameHistoryPages(getDashboardUserIdsForGame(game));
      return result;
    },
    (result) => ({
      gamePlayerId: result?.id ?? null,
      updatedScore: result?.score ?? null,
    }),
  );
}

export async function upsertActiveRoundItemizedScore(input: {
  gameId: string;
  userId: string;
  entries: ItemizedScoreEntryInput[];
}) {
  const meta: LogMeta = {
    gameId: input.gameId,
    subjectUserId: input.userId,
    actorUserId: null,
  };

  return runGameAction(
    "round_score.itemized.upsert",
    meta,
    async () => {
      const { user, game } = await requireGameScoreEditor(
        input.gameId,
        input.userId,
      );
      meta.actorUserId = user.id;

      if (game.completedAt) {
        throw new Error("Game is already complete");
      }

      assertGameIsNotPaused(game);
      assertGameMeetsPlayerRequirements(game);

      const gameSettingsV2 = getGameSettingsV2FromGame(game);

      if (
        !gameSettingsV2 ||
        !supportsGameSettingsV2ItemizedScoring(gameSettingsV2) ||
        !usesGameSettingsV2ItemizedScoring(gameSettingsV2) ||
        isGameSettingsV2EndGameTally(gameSettingsV2)
      ) {
        throw new Error("This game is not configured for round itemized scoring");
      }

      const player = game.players.find((entry) => entry.userId === input.userId);

      if (!player) {
        throw new Error("Game player not found");
      }

      const activeRoundNumber = game.completedRounds + 1;
      const existingRound =
        game.rounds.find((round) => round.roundNumber === activeRoundNumber) ??
        (await getGameRoundByGameAndNumber({
          gameId: game.id,
          roundNumber: activeRoundNumber,
        }));
      const round =
        existingRound ??
        (await createGameRound({
          gameId: game.id,
          roundNumber: activeRoundNumber,
        }));

      if (!round) {
        throw new Error("Could not create round");
      }

      const existingScore =
        existingRound?.scores.find((score) => score.userId === input.userId) ??
        (await getGameRoundScoreByRoundAndUser({
          gameRoundId: round.id,
          userId: input.userId,
        }));
      const { entriesToPersist, totalScore } = buildValidatedItemizedEntriesForPlayer({
        categories: gameSettingsV2.itemizedCategories,
        entries: input.entries,
        userId: input.userId,
      });

      meta.roundId = round.id;
      meta.roundNumber = activeRoundNumber;
      meta.createdScore = !existingScore;
      meta.normalizedScoreDelta = totalScore;
      meta.previousScoreDelta = existingScore?.scoreDelta ?? 0;

      await replaceGameItemizedScoreEntriesForPlayer({
        gameId: game.id,
        gameRoundId: round.id,
        userId: input.userId,
        entries: entriesToPersist,
      });

      if (existingScore) {
        await updateGameRoundScore(existingScore.id, {
          scoreDelta: totalScore,
        });
      } else {
        await createGameRoundScores({
          gameRoundId: round.id,
          scores: [{ userId: input.userId, scoreDelta: totalScore }],
        });
      }

      const result = await updateGamePlayer(player.id, {
        score: player.score + (totalScore - (existingScore?.scoreDelta ?? 0)),
      });

      if (game.inviteUsersEnabled) {
        await updateGame(game.id, {
          inviteUsersEnabled: false,
        });
      }

      revalidateDashboardPages(getDashboardUserIdsForGame(game));
      revalidateGameHistoryPages(getDashboardUserIdsForGame(game));
      return result;
    },
    (result) => ({
      gamePlayerId: result?.id ?? null,
      updatedScore: result?.score ?? null,
    }),
  );
}

export async function upsertEndGameTallyItemizedScore(input: {
  gameId: string;
  userId: string;
  entries: ItemizedScoreEntryInput[];
}) {
  const meta: LogMeta = {
    gameId: input.gameId,
    subjectUserId: input.userId,
    actorUserId: null,
  };

  return runGameAction(
    "tally_score.itemized.upsert",
    meta,
    async () => {
      const { user, game } = await requireGameScoreEditor(
        input.gameId,
        input.userId,
      );
      meta.actorUserId = user.id;

      if (game.completedAt) {
        throw new Error("Game is already complete");
      }

      assertGameIsNotPaused(game);
      assertGameMeetsPlayerRequirements(game);

      const gameSettingsV2 = getGameSettingsV2FromGame(game);

      if (
        !gameSettingsV2 ||
        !supportsDirectEndGameItemizedScoring(game, gameSettingsV2)
      ) {
        throw new Error("This game is not configured for end-game itemized scoring");
      }

      const player = game.players.find((entry) => entry.userId === input.userId);

      if (!player) {
        throw new Error("Game player not found");
      }

      const { entriesToPersist, totalScore } = buildValidatedItemizedEntriesForPlayer({
        categories: gameSettingsV2.itemizedCategories,
        entries: input.entries,
        userId: input.userId,
      });

      meta.normalizedScoreDelta = totalScore;
      meta.previousScoreDelta = player.score ?? 0;

      await replaceGameItemizedScoreEntries({
        gameId: game.id,
        gameRoundId: null,
        entries: entriesToPersist.map((entry) => ({
          ...entry,
          userId: input.userId,
        })),
      });

      const result = await updateGamePlayer(player.id, {
        score: totalScore,
      });

      if (game.inviteUsersEnabled) {
        await updateGame(game.id, {
          inviteUsersEnabled: false,
        });
      }

      revalidateDashboardPages(getDashboardUserIdsForGame(game));
      revalidateGameHistoryPages(getDashboardUserIdsForGame(game));
      return result;
    },
    (result) => ({
      updatedScore: result?.score ?? null,
    }),
  );
}

export async function updateRecordedRoundScore(input: {
  gameId: string;
  roundNumber: number;
  userId: string;
  scoreDelta: number;
}) {
  const meta: LogMeta = {
    gameId: input.gameId,
    roundNumber: input.roundNumber,
    subjectUserId: input.userId,
    scoreDelta: input.scoreDelta,
    actorUserId: null,
  };

  return runGameAction(
    "round_score.recorded.update",
    meta,
    async () => {
      const { user, game } = await requireGameScoreEditor(
        input.gameId,
        input.userId,
      );
      meta.actorUserId = user.id;
      assertGameMeetsPlayerRequirements(game);

      if (game.completedAt) {
        throw new Error("Game is already complete");
      }

      assertGameIsNotPaused(game);

      if (!Number.isFinite(input.scoreDelta)) {
        throw new Error("Round scores must be valid numbers");
      }

      const normalizedDelta = Math.trunc(input.scoreDelta);
      const player = game.players.find(
        (entry) => entry.userId === input.userId,
      );

      if (!player) {
        throw new Error("Game player not found");
      }

      const round =
        game.rounds.find((entry) => entry.roundNumber === input.roundNumber) ??
        (await getGameRoundByGameAndNumber({
          gameId: game.id,
          roundNumber: input.roundNumber,
        }));

      if (!round) {
        throw new Error("Round not found");
      }

      const existingScore =
        round.scores.find((score) => score.userId === input.userId) ??
        (await getGameRoundScoreByRoundAndUser({
          gameRoundId: round.id,
          userId: input.userId,
        }));

      meta.roundId = round.id;
      meta.createdScore = !existingScore;
      meta.previousScoreDelta = existingScore?.scoreDelta ?? 0;
      meta.normalizedScoreDelta = normalizedDelta;

      if (existingScore) {
        await updateGameRoundScore(existingScore.id, {
          scoreDelta: normalizedDelta,
        });
      } else {
        await createGameRoundScores({
          gameRoundId: round.id,
          scores: [
            {
              userId: input.userId,
              scoreDelta: normalizedDelta,
            },
          ],
        });
      }

      const result = await updateGamePlayer(player.id, {
        score:
          player.score + (normalizedDelta - (existingScore?.scoreDelta ?? 0)),
      });

      if (game.inviteUsersEnabled) {
        await updateGame(game.id, {
          inviteUsersEnabled: false,
        });
      }

      revalidateDashboardPages(getDashboardUserIdsForGame(game));
      revalidateGameHistoryPages(getDashboardUserIdsForGame(game));
      return result;
    },
    (result) => ({
      updatedScore: result?.score ?? null,
    }),
  );
}

export async function updateRecordedRoundItemizedScore(input: {
  gameId: string;
  roundNumber: number;
  userId: string;
  entries: ItemizedScoreEntryInput[];
}) {
  const meta: LogMeta = {
    gameId: input.gameId,
    roundNumber: input.roundNumber,
    subjectUserId: input.userId,
    actorUserId: null,
  };

  return runGameAction(
    "round_score.itemized.recorded.update",
    meta,
    async () => {
      const { user, game } = await requireGameScoreEditor(
        input.gameId,
        input.userId,
      );
      meta.actorUserId = user.id;

      if (game.completedAt) {
        throw new Error("Game is already complete");
      }

      assertGameIsNotPaused(game);

      const gameSettingsV2 = getGameSettingsV2FromGame(game);

      if (
        !gameSettingsV2 ||
        !supportsGameSettingsV2ItemizedScoring(gameSettingsV2) ||
        !usesGameSettingsV2ItemizedScoring(gameSettingsV2) ||
        isGameSettingsV2EndGameTally(gameSettingsV2)
      ) {
        throw new Error("This game is not configured for round itemized scoring");
      }

      const player = game.players.find((entry) => entry.userId === input.userId);

      if (!player) {
        throw new Error("Game player not found");
      }

      const round =
        game.rounds.find((entry) => entry.roundNumber === input.roundNumber) ??
        (await getGameRoundByGameAndNumber({
          gameId: game.id,
          roundNumber: input.roundNumber,
        }));

      if (!round) {
        throw new Error("Round not found");
      }

      const existingScore =
        round.scores.find((score) => score.userId === input.userId) ??
        (await getGameRoundScoreByRoundAndUser({
          gameRoundId: round.id,
          userId: input.userId,
        }));
      const { entriesToPersist, totalScore } = buildValidatedItemizedEntriesForPlayer({
        categories: gameSettingsV2.itemizedCategories,
        entries: input.entries,
        userId: input.userId,
      });

      meta.roundId = round.id;
      meta.createdScore = !existingScore;
      meta.previousScoreDelta = existingScore?.scoreDelta ?? 0;
      meta.normalizedScoreDelta = totalScore;

      await replaceGameItemizedScoreEntriesForPlayer({
        gameId: game.id,
        gameRoundId: round.id,
        userId: input.userId,
        entries: entriesToPersist,
      });

      if (existingScore) {
        await updateGameRoundScore(existingScore.id, {
          scoreDelta: totalScore,
        });
      } else {
        await createGameRoundScores({
          gameRoundId: round.id,
          scores: [{ userId: input.userId, scoreDelta: totalScore }],
        });
      }

      const result = await updateGamePlayer(player.id, {
        score: player.score + (totalScore - (existingScore?.scoreDelta ?? 0)),
      });

      if (game.inviteUsersEnabled) {
        await updateGame(game.id, {
          inviteUsersEnabled: false,
        });
      }

      revalidateDashboardPages(getDashboardUserIdsForGame(game));
      revalidateGameHistoryPages(getDashboardUserIdsForGame(game));
      return result;
    },
    (result) => ({
      updatedScore: result?.score ?? null,
    }),
  );
}

export async function addGamePlayer(input: {
  gameId: string;
  userId: string;
  startingScoreMode?: GamePlayerStartingScoreMode;
  startingScoreValue?: number | null;
}) {
  const { gameId, userId } = input;
  const meta: LogMeta = { gameId, playerUserId: userId, actorUserId: null };
  return runGameAction(
    "player.add",
    meta,
    async () => {
      const { user, game } = await requireGameLiveManager(gameId);
      meta.actorUserId = user.id;
      assertGameCanAcceptAnotherPlayer(game);

      const existing = await getGamePlayerByGameAndUserId(gameId, userId);

      if (existing) {
        throw new Error("That player is already in the game");
      }

      const result = await addPlayerToGameWithStartingScore({
        gameId,
        userId,
        role: getDefaultPlayerRoleForGame(game),
        startingScoreMode: input.startingScoreMode,
        startingScoreValue: input.startingScoreValue,
        gameSettingsV2: getGameSettingsV2FromGame(game),
      });
      revalidateDashboardPages([...getDashboardUserIdsForGame(game), userId]);
      revalidateGameHistoryPages([...getDashboardUserIdsForGame(game), userId]);
      return result;
    },
    (result) => ({
      gamePlayerId: result.id,
    }),
  );
}

export async function addGuestGamePlayer(input: {
  color?: string;
  gameId: string;
  firstName: string;
  lastName?: string;
  startingScoreMode?: GamePlayerStartingScoreMode;
  startingScoreValue?: number | null;
}) {
  const { gameId, firstName, lastName } = input;
  const meta: LogMeta = {
    gameId,
    actorUserId: null,
    hasLastName: Boolean(lastName?.trim()),
  };
  return runGameAction(
    "guest_player.add",
    meta,
    async () => {
      const { user, game } = await requireGameLiveManager(gameId);
      meta.actorUserId = user.id;
      assertGameCanAcceptAnotherPlayer(game);
      const trimmedFirstName = firstName.trim();

      if (!trimmedFirstName) {
        throw new Error("Guest first name is required");
      }

      const guest = await createUser({
        color: input.color,
        firstName: trimmedFirstName,
        lastName: lastName?.trim() || null,
        isGuest: true,
        created_by_user_id: user.id,
        isProfileComplete: true,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });

      meta.guestUserId = guest.id;
      const result = await addPlayerToGameWithStartingScore({
        gameId,
        userId: guest.id,
        role: getDefaultPlayerRoleForGame(game),
        startingScoreMode: input.startingScoreMode,
        startingScoreValue: input.startingScoreValue,
        gameSettingsV2: getGameSettingsV2FromGame(game),
      });
      revalidateDashboardPages(getDashboardUserIdsForGame(game));
      revalidateGameHistoryPages(getDashboardUserIdsForGame(game));
      return result;
    },
    (result) => ({
      gamePlayerId: result.id,
      guestUserId: result.userId,
    }),
  );
}

export async function removeGamePlayer(input: {
  gameId: string;
  userId: string;
}) {
  const { gameId, userId } = input;
  const meta: LogMeta = { gameId, playerUserId: userId, actorUserId: null };
  return runGameAction(
    "player.remove",
    meta,
    async () => {
      const { user, game } = await requireGameLiveManager(gameId);
      meta.actorUserId = user.id;

      if (game.completedAt) {
        throw new Error("Completed games can't be changed");
      }

      if (userId === game.creatorId) {
        throw new Error("The game creator can't be removed");
      }

      if (game.players.length <= 1) {
        throw new Error("A game needs at least one player");
      }

      assertGameCanRemovePlayer(game);

      const existing = await getGamePlayerByGameAndUserId(gameId, userId);

      if (!existing) {
        throw new Error("That player is no longer in the game");
      }

      const result = await removePlayerFromGame({ gameId, userId });
      const { game: updatedGame } = await requireGameMembership(gameId);

      revalidateDashboardPages([
        ...getDashboardUserIdsForGame(updatedGame),
        userId,
      ]);
      revalidateGameHistoryPages([
        ...getDashboardUserIdsForGame(updatedGame),
        userId,
      ]);

      return result;
    },
    (result) => ({
      gamePlayerId: result?.id ?? null,
    }),
  );
}

export async function setGamePlayerRole(input: {
  gameId: string;
  userId: string;
  role: GamePlayerRole;
}) {
  const { gameId, userId } = input;
  const role = normalizeDefaultPlayerRole(input.role);
  const meta: LogMeta = {
    actorUserId: null,
    gameId,
    playerUserId: userId,
    playerRole: role,
  };

  return runGameAction(
    "player_role.update",
    meta,
    async () => {
      const { user, game } = await requireGameCreator(gameId);
      meta.actorUserId = user.id;

      if (game.completedAt) {
        throw new Error("Completed games can't be changed");
      }

      if (userId === game.creatorId) {
        throw new Error("The game creator always has manager access");
      }

      const existing = await getGamePlayerByGameAndUserId(gameId, userId);

      if (!existing) {
        throw new Error("That player is no longer in the game");
      }

      const result = await updateGamePlayer(existing.id, {
        role,
        isManager: roleToLegacyManager(role),
      });

      revalidateDashboardPages(getDashboardUserIdsForGame(game));
      revalidateGameHistoryPages(getDashboardUserIdsForGame(game));
      return result;
    },
    (result) => ({
      gamePlayerId: result?.id ?? null,
      isManager: result?.isManager ?? null,
      playerRole: result?.role ?? null,
    }),
  );
}

export async function setGamePlayerManager(input: {
  gameId: string;
  userId: string;
  isManager: boolean;
}) {
  return setGamePlayerRole({
    gameId: input.gameId,
    userId: input.userId,
    role: input.isManager ? "manager" : "player",
  });
}

export async function updateGameDetails(input: {
  gameId: string;
  gameTitleId: string | null;
  gameTitleName?: string | null;
}) {
  const { gameId, gameTitleId, gameTitleName } = input;
  const meta: LogMeta = {
    gameId,
    requestedGameTitleId: gameTitleId,
    createdTitleFromName: Boolean(gameTitleName?.trim()),
    actorUserId: null,
  };
  return runGameAction(
    "details.update",
    meta,
    async () => {
      const { user, game } = await requireGameCreator(gameId);
      meta.actorUserId = user.id;

      let resolvedGameTitleId: string | null = null;

      if (gameTitleName?.trim()) {
        const gameTitle = await createOrFindGameTitle({
          title: gameTitleName,
          currentUserId: user.id,
        });

        resolvedGameTitleId = gameTitle.id;
      } else if (gameTitleId) {
        const gameTitle = await getAccessibleGameTitleById({
          userId: user.id,
          gameTitleId,
        });

        if (!gameTitle) {
          throw new Error("Choose a title from your library");
        }

        resolvedGameTitleId = gameTitle.id;
      }

      meta.gameTitleId = resolvedGameTitleId;
      const updatedGame = await updateGame(gameId, {
        gameTitleId: resolvedGameTitleId,
      });

      if (resolvedGameTitleId) {
        await grantGameTitleToGameParticipants({
          gameId,
          gameTitleId: resolvedGameTitleId,
          source: "played",
          acquiredFromUserId: user.id,
        });
      }

      revalidateDashboardPages(getDashboardUserIdsForGame(game));
      revalidateGameHistoryPages(getDashboardUserIdsForGame(game));

      if (resolvedGameTitleId) {
        revalidateTitlesPages(getDashboardUserIdsForGame(game));
      }

      return updatedGame;
    },
    (result) => ({
      updatedGameTitleId: result?.gameTitleId ?? null,
    }),
  );
}

export async function updateGameSettings(input: {
  gameId: string;
  scoringMode: "highest_wins" | "lowest_wins" | "no_score";
  endingMode: "none" | "round_count" | "score_threshold";
  trackRounds?: boolean | null;
  targetRounds?: number | null;
  scoreThreshold?: number | null;
  scoreThresholdDirection?: "at_least" | "at_most" | null;
  version?: "v1" | "v2";
  settingsV2?: Partial<GameSettingsV2> | null;
}) {
  const meta: LogMeta = {
    actorUserId: null,
    gameId: input.gameId,
    scoringMode: input.scoringMode,
    endingMode: input.endingMode,
  };

  return runGameAction(
    "settings.update",
    meta,
    async () => {
      const { user, game } = await requireGameCreator(input.gameId);
      meta.actorUserId = user.id;

      if (game.completedAt) {
        throw new Error("Completed games can't be changed");
      }

      const existingSettingsV2 = getGameSettingsV2FromGame(game);
      const hasRecordedActivity = hasGameStartedWithSettings(game);

      if (hasRecordedActivity && existingSettingsV2) {
        throw new Error(
          "Settings can't be changed after scorekeeping has started",
        );
      }

      if (hasRecordedActivity && !existingSettingsV2) {
        if (input.scoringMode !== game.scoringMode) {
          throw new Error(
            "Scoring mode can't be changed after scorekeeping has started",
          );
        }

        if (input.endingMode !== game.endingMode) {
          throw new Error(
            "Ending mode can't be changed after rounds or scores are recorded",
          );
        }

        if (
          game.endingMode === "none" &&
          input.trackRounds !== game.trackRounds
        ) {
          throw new Error(
            "Round tracking can't be changed after rounds or scores are recorded",
          );
        }
      }

      const nextVersion = input.version ?? game.version;
      const validatedSettingsV2 =
        nextVersion === "v2"
          ? validateGameSettingsV2(input.settingsV2 ?? existingSettingsV2 ?? {})
          : null;
      const validatedSettings =
        nextVersion === "v2"
          ? projectV2SettingsToLegacy(validatedSettingsV2!)
          : validateGameSettings(input);
      const scoringMode =
        nextVersion === "v2"
          ? projectV2SettingsToLegacy(validatedSettingsV2!).scoringMode
          : input.scoringMode;
      const endingMode =
        nextVersion === "v2"
          ? projectV2SettingsToLegacy(validatedSettingsV2!).endingMode
          : input.endingMode;

      if (
        endingMode === "round_count" &&
        validatedSettings.targetRounds !== null &&
        validatedSettings.targetRounds <= game.completedRounds
      ) {
        throw new Error("Target rounds must be greater than completed rounds");
      }

      meta.targetRounds = validatedSettings.targetRounds;
      meta.scoreThreshold = validatedSettings.scoreThreshold;
      meta.scoreThresholdDirection = validatedSettings.scoreThresholdDirection;

      const result = await updateGame(game.id, {
        version: nextVersion,
        scoringMode,
        endingMode,
        trackRounds: validatedSettings.trackRounds,
        targetRounds: validatedSettings.targetRounds,
        scoreThreshold: validatedSettings.scoreThreshold,
        scoreThresholdDirection: validatedSettings.scoreThresholdDirection,
        settingsJson: validatedSettingsV2
          ? serializeGameSettingsV2(validatedSettingsV2)
          : null,
      });

      if (
        validatedSettingsV2 &&
        usesGameSettingsV2ItemizedScoring(validatedSettingsV2)
      ) {
        await replaceGameItemizedScoreCategories({
          gameId: game.id,
          categories: validatedSettingsV2.itemizedCategories,
        });
      }

      revalidateDashboardPages(getDashboardUserIdsForGame(game));
      revalidateGameHistoryPages(getDashboardUserIdsForGame(game));

      return result;
    },
    (result) => ({
      updatedGameId: result?.id ?? null,
    }),
  );
}

export async function completeGame(input: {
  gameId: string;
  winnerUserIds?: string[] | null;
  placementSelections?: Array<{
    placement: 1 | 2 | 3;
    userIds: string[];
  }> | null;
  itemizedScoreEntries?: ItemizedScoreEntryInput[] | null;
}) {
  const { gameId } = input;
  const meta: LogMeta = { gameId, actorUserId: null };
  return runGameAction(
    "complete",
    meta,
    async () => {
      const { user, game } = await requireGameLiveManager(gameId);
      meta.actorUserId = user.id;
      assertGameMeetsPlayerRequirements(game);

      if (game.completedAt) {
        throw new Error("Game is already complete");
      }

      const gameSettingsV2 = getGameSettingsV2FromGame(game);
      const isSingleWinnerSelection = Boolean(
        gameSettingsV2 &&
          usesWinnerSelection(gameSettingsV2) &&
          !gameSettingsV2.roundConfig.enabled,
      );

      if (isSingleWinnerSelection) {
        const winnerUserIds = Array.from(new Set(input.winnerUserIds ?? []));
        if (winnerUserIds.length !== 1) {
          throw new Error("Choose exactly one winner");
        }
        const winner = game.players.find(
          (player) => player.userId === winnerUserIds[0],
        );
        if (!winner) {
          throw new Error("Choose a player in this game");
        }
        await updateGamePlayer(winner.id, { score: 1 });
      }

      if (
        gameSettingsV2?.scoringType === "elimination" &&
        gameSettingsV2.roundConfig.enabled
      ) {
        const activeRoundNumber = game.completedRounds + 1;
        const activeEliminationCount = game.eliminations.filter(
          (entry) => entry.roundNumber === activeRoundNumber,
        ).length;
        if (
          activeEliminationCount > 0 &&
          activeEliminationCount < game.players.length - 1
        ) {
          throw new Error("Finish the current elimination round first");
        }
      }
      const supportsDirectItemizedScoring = supportsDirectEndGameItemizedScoring(
        game,
        gameSettingsV2,
      );

      if (supportsDirectItemizedScoring) {
        await applyItemizedGameScores({
          game,
          entries: input.itemizedScoreEntries ?? [],
        });
      }

      const refreshedGame = supportsDirectItemizedScoring || isSingleWinnerSelection
        ? await getGameForPlayPage(gameId)
        : game;

      if (!refreshedGame) {
        throw new Error("Game not found");
      }

      const noScorePlacements =
        refreshedGame.scoringMode === "no_score" ||
        (gameSettingsV2?.tiePolicy.allowTies === false &&
          Boolean(
            input.placementSelections?.length || input.winnerUserIds?.length,
          ))
          ? normalizeNoScorePlacementSelections({
              participants: refreshedGame.players,
              placementSelections: input.placementSelections,
              winnerUserIds: input.winnerUserIds,
            })
          : null;
      const winningUserIds =
        refreshedGame.scoringMode === "no_score"
          ? (noScorePlacements?.winnerUserIds ?? [])
          : getWinningUserIds(refreshedGame);

      if (
        gameSettingsV2 &&
        !gameSettingsV2.tiePolicy.allowTies &&
        refreshedGame.scoringMode !== "no_score" &&
        winningUserIds.length > 1 &&
        !noScorePlacements
      ) {
        throw new Error(
          "Choose an explicit winner or placements to break the tie",
        );
      }

      meta.winnerCount = winningUserIds.length;

      const finishedAt = nowIso();
      const updatedGame = await updateGame(gameId, {
        completedAt: finishedAt,
      });

      if (refreshedGame.scoringMode === "no_score") {
        await replaceNoScoreGameResults({
          gameId,
          placementSelections: noScorePlacements?.placements ?? [],
        });
      } else {
        await replaceGameWinners({
          gameId,
          userIds: winningUserIds,
        });

        if (noScorePlacements?.placements?.length) {
          await replaceGameResultPlacements({
            gameId,
            placements: noScorePlacements.placements.flatMap((selection) =>
              selection.userIds.map((userId) => ({
                userId,
                placement: selection.placement,
              })),
            ),
          });
        }
      }

      await syncPlayerRankForCompletedGame({
        gameId,
        completedAt: finishedAt,
        scoringMode:
          refreshedGame.scoringMode === "no_score" || noScorePlacements
            ? "no_score"
            : refreshedGame.scoringMode,
        players: refreshedGame.players.map((player) => ({
          userId: player.userId,
          score: player.score,
        })),
        winnerUserIds: winningUserIds,
        placementSelections: noScorePlacements?.placements,
      });

      if (refreshedGame.gameTitleId) {
        await grantGameTitleToGameParticipants({
          gameId,
          gameTitleId: refreshedGame.gameTitleId,
          source: "played",
          acquiredFromUserId: user.id,
        });
      }

      await grantCardPacksForCompletedGame(refreshedGame);

      revalidateDashboardPages(getDashboardUserIdsForGame(refreshedGame));
      revalidateGameHistoryPages(getDashboardUserIdsForGame(refreshedGame));
      revalidateTitlesPages(getDashboardUserIdsForGame(refreshedGame));
      revalidateRankRelatedPages(getDashboardUserIdsForGame(refreshedGame));

      return updatedGame;
    },
    (result) => ({
      completedAt: result?.completedAt ?? null,
    }),
  );
}

export async function shareGameTitle(input: {
  gameTitleId: string;
  targetUserId: string;
}) {
  const meta: LogMeta = {
    actorUserId: null,
    gameTitleId: input.gameTitleId,
    targetUserId: input.targetUserId,
  };
  return runGameAction("title.share", meta, async () => {
    const user = await requireCurrentUser();
    meta.actorUserId = user.id;
    const gameTitle = await getAccessibleGameTitleById({
      userId: user.id,
      gameTitleId: input.gameTitleId,
    });

    if (!gameTitle) {
      throw new Error("Choose a title from your library");
    }

    const result = await shareGameTitleWithUser({
      gameTitleId: gameTitle.id,
      targetUserId: input.targetUserId,
      sharedByUserId: user.id,
    });

    revalidateTitlesPage(input.targetUserId);
    revalidateGameHistoryPage(input.targetUserId);
    return result;
  });
}

export async function promoteTitleToUniversal(input: { gameTitleId: string }) {
  const meta: LogMeta = { actorUserId: null, gameTitleId: input.gameTitleId };
  return runGameAction("title.promote_universal", meta, async () => {
    const user = await requireAdminUser();
    meta.actorUserId = user.id;
    const gameTitle = await getGameTitleById(input.gameTitleId);

    if (!gameTitle) {
      throw new Error("Title not found");
    }

    const result = await promoteGameTitleToUniversal(gameTitle.id);
    revalidateTitlesGlobal();
    return result;
  });
}

export async function saveGameTitleDefaults(input: {
  gameTitleId: string;
  defaultScoringMode?: "highest_wins" | "lowest_wins" | "no_score" | null;
  defaultEndingMode?: "none" | "round_count" | "score_threshold" | null;
  defaultTrackRounds?: boolean | null;
  defaultTargetRounds?: number | null;
  defaultScoreThreshold?: number | null;
  defaultScoreThresholdDirection?: "at_least" | "at_most" | null;
  settingsV2?: Partial<GameSettingsV2> | null;
}) {
  const meta: LogMeta = { actorUserId: null, gameTitleId: input.gameTitleId };
  return runGameAction("title_defaults.update", meta, async () => {
    const user = await requireCurrentUser();
    meta.actorUserId = user.id;
    const gameTitle = await getGameTitleById(input.gameTitleId);

    if (!gameTitle) {
      throw new Error("Title not found");
    }

    assertCanManageGameTitle({ user, gameTitle });

    meta.isUniversalTitle = gameTitle.isUniversal;
    const validatedSettingsV2 = input.settingsV2
      ? validateGameSettingsV2(input.settingsV2)
      : null;

    if (
      validatedSettingsV2 &&
      usesGameSettingsV2ItemizedScoring(validatedSettingsV2) &&
      user.role !== "admin"
    ) {
      throw new Error("Admin access required for itemized scoring defaults");
    }

    if (
      validatedSettingsV2 &&
      (
        validatedSettingsV2.playerConfig.minPlayers !== null ||
        validatedSettingsV2.playerConfig.maxPlayers !== null ||
        validatedSettingsV2.playerConfig.allPlayersAreManagers
      ) &&
      user.role !== "admin"
    ) {
      throw new Error("Admin access required for title player-limit defaults");
    }

    const result = await updateGameTitleDefaults(
      gameTitle.id,
      normalizeGameTitleDefaults({
        defaultScoringMode: input.defaultScoringMode,
        defaultEndingMode: input.defaultEndingMode,
        defaultTrackRounds: input.defaultTrackRounds,
        defaultTargetRounds: input.defaultTargetRounds,
        defaultScoreThreshold: input.defaultScoreThreshold,
        defaultScoreThresholdDirection: input.defaultScoreThresholdDirection,
      }),
      validatedSettingsV2,
    );
    revalidateTitlesPage(user.id);
    return result;
  });
}

export async function saveGameTitleImage(input: {
  gameTitleId: string;
  imageUrl: string | null;
  imageVerticalFocus?: number | null;
  selectedColor?: string | null;
}) {
  const meta: LogMeta = { actorUserId: null, gameTitleId: input.gameTitleId };
  return runGameAction("title_image.update", meta, async () => {
    const user = await requireAdminUser();
    meta.actorUserId = user.id;
    const gameTitle = await getGameTitleById(input.gameTitleId);

    if (!gameTitle) {
      throw new Error("Title not found");
    }

    const normalizedImageUrl = normalizeTitleImageUrl(input.imageUrl);
    const colorOptions = normalizedImageUrl
      ? await getTitleColorOptionsFromImageUrl(normalizedImageUrl)
      : [pickRandomProfileColor()];
    const nextColor =
      colorOptions.find((color) => color === input.selectedColor) ??
      colorOptions[0] ??
      (normalizedImageUrl
        ? await deriveTitleColorFromImageUrl(normalizedImageUrl)
        : pickRandomProfileColor());

    meta.isUniversalTitle = gameTitle.isUniversal;
    meta.clearedImage = normalizedImageUrl.length === 0;
    meta.hasImageUrl = normalizedImageUrl.length > 0;
    meta.previousColor = gameTitle.color;
    meta.nextColor = nextColor;

    const result = await updateGameTitleImageAndColor(gameTitle.id, {
      imageUrl: normalizedImageUrl,
      color: nextColor,
      imageVerticalFocus:
        input.imageVerticalFocus ?? gameTitle.imageVerticalFocus ?? DEFAULT_TITLE_IMAGE_VERTICAL_FOCUS,
    });
    const affectedUserIds = await listAffectedUserIdsForGameTitle(gameTitle.id);

    revalidateTitlesGlobal();
    revalidateDashboardPages(affectedUserIds);
    revalidateGameHistoryPages(affectedUserIds);
    revalidateTitlesPages(affectedUserIds);

    for (const affectedUserId of affectedUserIds) {
      revalidateProfileOverviewPage(affectedUserId);
      revalidatePublicProfilePage(affectedUserId);
    }

    revalidateTitlesPage(user.id);
    return result;
  });
}

export async function getSavedGameTitleImageOptions(input: {
  gameTitleId: string;
}) {
  const meta: LogMeta = { actorUserId: null, gameTitleId: input.gameTitleId };

  return runGameAction("title_image.options", meta, async () => {
    const user = await requireAdminUser();
    meta.actorUserId = user.id;
    const gameTitle = await getGameTitleById(input.gameTitleId);

    if (!gameTitle) {
      throw new Error("Title not found");
    }

    if (!gameTitle.imageUrl) {
      return {
        colorOptions: [gameTitle.color],
        selectedColor: gameTitle.color,
        verticalFocus:
          gameTitle.imageVerticalFocus ?? DEFAULT_TITLE_IMAGE_VERTICAL_FOCUS,
      };
    }

    const colorOptions = await getTitleColorOptionsFromImageUrl(
      gameTitle.imageUrl,
    );
    const selectedColor =
      colorOptions.find((color) => color === gameTitle.color) ??
      colorOptions[0] ??
      gameTitle.color;

    return {
      colorOptions,
      selectedColor,
      verticalFocus:
        gameTitle.imageVerticalFocus ?? DEFAULT_TITLE_IMAGE_VERTICAL_FOCUS,
    };
  });
}

async function savePreparedGameTitleImageAsAdmin(input: {
  actorUserId: string;
  gameTitleId: string;
  source: "upload" | "openai";
  buffer: Buffer | Uint8Array;
  mimeType?: string | null;
  imageVerticalFocus?: number | null;
  selectedColor?: string | null;
}) {
  const gameTitle = await getGameTitleById(input.gameTitleId);

  if (!gameTitle) {
    throw new Error("Title not found");
  }

  const preparedAsset = await prepareTitleImageAsset({
    buffer: input.buffer,
    mimeType: input.mimeType,
    verticalFocus: input.imageVerticalFocus,
    selectedColor: input.selectedColor,
  });
  const imageUrl = await uploadGameTitleImageToS3({
    gameTitleId: gameTitle.id,
    buffer: preparedAsset.buffer,
    contentType: preparedAsset.mimeType,
  });
  const result = await updateGameTitleImageAndColor(gameTitle.id, {
    imageUrl,
    color: preparedAsset.selectedColor,
    imageVerticalFocus: preparedAsset.verticalFocus,
  });

  if (!result) {
    throw new Error("Could not update title image");
  }

  const affectedUserIds = await listAffectedUserIdsForGameTitle(gameTitle.id);

  revalidateTitlesGlobal();
  revalidateDashboardPages(affectedUserIds);
  revalidateGameHistoryPages(affectedUserIds);
  revalidateTitlesPages(affectedUserIds);

  for (const affectedUserId of affectedUserIds) {
    revalidateProfileOverviewPage(affectedUserId);
    revalidatePublicProfilePage(affectedUserId);
  }

  revalidateTitlesPage(input.actorUserId);

  return {
    result,
    gameTitle,
    imageUrl,
    color: preparedAsset.selectedColor,
    imageVerticalFocus: preparedAsset.verticalFocus,
    source: input.source,
  };
}

export async function generateGameTitleImage(input: {
  gameTitleId: string;
  gameName: string;
  prompt?: string | null;
}) {
  const meta: LogMeta = {
    actorUserId: null,
    gameTitleId: input.gameTitleId,
  };

  return runGameAction(
    "title_image.generate",
    meta,
    async () => {
      const user = await requireAdminUser();
      meta.actorUserId = user.id;

      const gameTitle = await getGameTitleById(input.gameTitleId);

      if (!gameTitle) {
        throw new Error("Title not found");
      }

      const candidate = await generateGameTitleImageCandidate({
        gameName: input.gameName,
        prompt: input.prompt,
      });

      meta.isUniversalTitle = gameTitle.isUniversal;
      meta.hasImageUrl = Boolean(candidate.previewUrl);
      meta.nextColor = candidate.selectedColor;

      return candidate;
    },
    (result) => ({
      hasImageUrl: Boolean(result.previewUrl),
      nextColor: result.selectedColor,
    }),
  );
}

export async function prepareUploadedGameTitleImage(formData: FormData) {
  const gameTitleId = getFormDataString(formData, "gameTitleId").trim();
  const fileEntry = formData.get("file");
  const imageVerticalFocus = Number.parseInt(
    getFormDataString(formData, "imageVerticalFocus") || "",
    10,
  );
  const meta: LogMeta = {
    actorUserId: null,
    gameTitleId,
  };

  return runGameAction("title_image.prepare_upload", meta, async () => {
    const user = await requireAdminUser();
    meta.actorUserId = user.id;

    if (!gameTitleId) {
      throw new Error("Title id is required");
    }

    if (!(fileEntry instanceof File)) {
      throw new Error("Choose an image file first");
    }

    const gameTitle = await getGameTitleById(gameTitleId);

    if (!gameTitle) {
      throw new Error("Title not found");
    }

    const candidate = await buildTitleImageCandidate({
      buffer: Buffer.from(await fileEntry.arrayBuffer()),
      mimeType: fileEntry.type,
      source: "upload",
      verticalFocus: Number.isFinite(imageVerticalFocus)
        ? imageVerticalFocus
        : gameTitle.imageVerticalFocus,
    });

    meta.isUniversalTitle = gameTitle.isUniversal;
    meta.hasImageUrl = Boolean(candidate.previewUrl);
    meta.nextColor = candidate.selectedColor;

    return candidate;
  });
}

export async function saveUploadedGameTitleImage(formData: FormData) {
  const gameTitleId = getFormDataString(formData, "gameTitleId").trim();
  const fileEntry = formData.get("file");
  const selectedColor = getFormDataString(formData, "selectedColor").trim();
  const imageVerticalFocus = Number.parseInt(
    getFormDataString(formData, "imageVerticalFocus") || "",
    10,
  );
  const meta: LogMeta = {
    actorUserId: null,
    gameTitleId,
  };

  return runGameAction("title_image.upload", meta, async () => {
    const user = await requireAdminUser();
    meta.actorUserId = user.id;

    if (!gameTitleId) {
      throw new Error("Title id is required");
    }

    if (!(fileEntry instanceof File)) {
      throw new Error("Choose an image file first");
    }

    const saved = await savePreparedGameTitleImageAsAdmin({
      actorUserId: user.id,
      gameTitleId,
      source: "upload",
      buffer: Buffer.from(await fileEntry.arrayBuffer()),
      mimeType: fileEntry.type,
      imageVerticalFocus,
      selectedColor,
    });

    meta.isUniversalTitle = saved.gameTitle.isUniversal;
    meta.hasImageUrl = true;
    meta.nextColor = saved.color;

    return saved.result;
  });
}

export async function saveGeneratedGameTitleImage(input: {
  gameTitleId: string;
  previewUrl: string;
  selectedColor: string;
  imageVerticalFocus: number;
}) {
  const meta: LogMeta = {
    actorUserId: null,
    gameTitleId: input.gameTitleId,
  };

  return runGameAction("title_image.save_generated", meta, async () => {
    const user = await requireAdminUser();
    meta.actorUserId = user.id;

    const parsed = parseTitleImageDataUrl(input.previewUrl);
    const saved = await savePreparedGameTitleImageAsAdmin({
      actorUserId: user.id,
      gameTitleId: input.gameTitleId,
      source: "openai",
      buffer: parsed.buffer,
      mimeType: parsed.mimeType,
      imageVerticalFocus: input.imageVerticalFocus,
      selectedColor: input.selectedColor,
    });

    meta.isUniversalTitle = saved.gameTitle.isUniversal;
    meta.hasImageUrl = true;
    meta.nextColor = saved.color;

    return saved.result;
  });
}

export async function mergeTitleIntoAnother(input: {
  sourceGameTitleId: string;
  targetGameTitleId: string;
}) {
  const meta: LogMeta = {
    actorUserId: null,
    sourceGameTitleId: input.sourceGameTitleId,
    targetGameTitleId: input.targetGameTitleId,
  };
  return runGameAction("title.merge", meta, async () => {
    const user = await requireAdminUser();
    meta.actorUserId = user.id;
    const result = await mergeGameTitles(input);
    revalidateTitlesGlobal();
    return result;
  });
}

export async function deleteCreatedGame(input: { gameId: string }) {
  const { gameId } = input;
  const meta: LogMeta = { gameId, actorUserId: null };
  return runGameAction("delete", meta, async () => {
    const { user, game } = await requireGameCreator(gameId);
    meta.actorUserId = user.id;

    if (game.completedAt) {
      throw new Error("Game is already complete");
    }

    const result = await deleteGame(gameId);
    revalidateDashboardPages(getDashboardUserIdsForGame(game));
    revalidateGameHistoryPages(getDashboardUserIdsForGame(game));
    return result;
  });
}
