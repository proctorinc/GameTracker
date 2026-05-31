"use server";

import { loadUser } from "@/lib/auth/protected-session";
import { getWinningUserIds } from "@/lib/game/v1";
import { listAcceptedFriendsForUser } from "@/lib/db/store/friendship.store";
import {
  addPlayerToGame,
  createGameRound,
  createGameRoundScores,
  createOrFindGameTitle,
  createGame,
  getAccessibleGameTitleById,
  getGameForPlayPage,
  getGameById,
  getGameRoundByGameAndNumber,
  getGameRoundScoreByRoundAndUser,
  getGameTitleLibraryEntryById,
  getGameTitleById,
  grantGameTitleToGameParticipants,
  listSuggestedGameTitles,
  mergeGameTitles,
  promoteGameTitleToUniversal,
  replaceGameWinners,
  shareGameTitleWithUser,
  updateGameTitleDefaults,
  updateGame,
  updateGameRound,
  updateGameRoundScore,
  deleteGame,
} from "@/lib/db/store/game.store";
import { listGuestsCreatedByUser } from "@/lib/db/store/user.store";
import {
  gameSettingsToTitleDefaults,
  normalizeGameTitleDefaults,
} from "@/lib/game/title-defaults";
import {
  getGamePlayerFullById,
  getGamePlayerByGameAndUserId,
  updateGamePlayer,
} from "@/lib/db/store/game-players.store";
import { createUser } from "@/lib/db/store/user.store";

function nowIso() {
  return new Date().toISOString();
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
  const isPlayer = game.players.some((player) => player.userId === user.id);

  if (!isCreator && !isPlayer) {
    throw new Error("Unauthorized");
  }

  return { user, game, isCreator };
}

async function requireGameCreator(gameId: string) {
  const context = await requireGameMembership(gameId);

  if (!context.isCreator) {
    throw new Error("Only the game creator can do that");
  }

  return context;
}

export async function getPlayGameSnapshot(gameId: string) {
  const { user, game, isCreator } = await requireGameMembership(gameId);
  const [friends, guests] = await Promise.all([
    listAcceptedFriendsForUser(user.id),
    listGuestsCreatedByUser(user.id),
  ]);

  return {
    currentUserId: user.id,
    isCreator,
    playerOptions: [...friends, ...guests],
    game,
  };
}

export async function getCreateGameTitleSuggestions() {
  const user = await requireCurrentUser();

  return listSuggestedGameTitles({
    userId: user.id,
    limit: 5,
  });
}

export async function getCreateGameTitleById(gameTitleId: string) {
  const user = await requireCurrentUser();

  return getGameTitleLibraryEntryById({
    userId: user.id,
    gameTitleId,
  });
}

async function requireAdminUser() {
  const user = await requireCurrentUser();

  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }

  return user;
}

export async function getGame(gameId: string) {
  return getGameById(gameId);
}

function normalizePositiveInteger(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.trunc(value);
  return rounded > 0 ? rounded : null;
}

function validateGameSettings(input: {
  endingMode: "none" | "round_count" | "score_threshold";
  targetRounds?: number | null;
  scoreThreshold?: number | null;
  scoreThresholdDirection?: "at_least" | "at_most" | null;
}) {
  const targetRounds = normalizePositiveInteger(input.targetRounds);
  const scoreThreshold = normalizePositiveInteger(input.scoreThreshold);

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
    targetRounds: input.endingMode === "round_count" ? targetRounds : null,
    scoreThreshold:
      input.endingMode === "score_threshold" ? scoreThreshold : null,
    scoreThresholdDirection:
      input.endingMode === "score_threshold"
        ? input.scoreThresholdDirection ?? null
        : null,
  };
}

async function resolveGameTitleId(input: {
  currentUserId: string;
  gameTitleId?: string | null;
  gameTitleName?: string | null;
  defaultSettings?: ReturnType<typeof gameSettingsToTitleDefaults>;
}) {
  if (input.gameTitleName?.trim()) {
    const gameTitle = await createOrFindGameTitle({
      title: input.gameTitleName,
      currentUserId: input.currentUserId,
      defaultSettings: input.defaultSettings,
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
  scoringMode: "highest_wins" | "lowest_wins";
  endingMode: "none" | "round_count" | "score_threshold";
  targetRounds?: number | null;
  scoreThreshold?: number | null;
  scoreThresholdDirection?: "at_least" | "at_most" | null;
}) {
  const user = await requireCurrentUser();
  const validatedSettings = validateGameSettings(input);
  const resolvedGameTitleId = await resolveGameTitleId({
    currentUserId: user.id,
    gameTitleId: input.gameTitleId,
    gameTitleName: input.gameTitleName,
    defaultSettings: input.gameTitleName?.trim()
      ? gameSettingsToTitleDefaults({
          scoringMode: input.scoringMode,
          endingMode: input.endingMode,
          targetRounds: validatedSettings.targetRounds ?? 1,
          scoreThreshold: validatedSettings.scoreThreshold ?? 100,
          scoreThresholdDirection:
            validatedSettings.scoreThresholdDirection ?? "at_least",
        })
      : undefined,
  });

  const game = await createGame({
    creatorId: user.id,
    version: "v1",
    gameTitleId: resolvedGameTitleId,
    scoringMode: input.scoringMode,
    endingMode: input.endingMode,
    targetRounds: validatedSettings.targetRounds,
    scoreThreshold: validatedSettings.scoreThreshold,
    scoreThresholdDirection: validatedSettings.scoreThresholdDirection,
    completedRounds: 0,
  });

  await addPlayerToGame(game.id, user.id);

  if (resolvedGameTitleId) {
    await grantGameTitleToGameParticipants({
      gameId: game.id,
      gameTitleId: resolvedGameTitleId,
      source: "played",
      acquiredFromUserId: user.id,
    });
  }

  return game;
}

export async function updateGamePlayerScore(input: {
  gamePlayerId: string;
  delta?: number;
  score?: number;
}) {
  const { gamePlayerId, delta, score } = input;

  if (delta === undefined && score === undefined) {
    throw new Error("A score delta or absolute score is required");
  }

  const gamePlayer = await getGamePlayerFullById(gamePlayerId);

  if (!gamePlayer) {
    throw new Error("Game player not found");
  }

  const { game: fullGame } = await requireGameMembership(gamePlayer.gameId);

  const player = fullGame.players.find((entry) => entry.id === gamePlayerId);

  if (!player) {
    throw new Error("Game player not found");
  }

  const nextScore = score ?? player.score + delta!;

  return updateGamePlayer(gamePlayerId, {
    score: nextScore,
  });
}

export async function commitGameRound(input: {
  gameId: string;
  completeGame?: boolean;
}) {
  const { user, game } = await requireGameCreator(input.gameId);

  if (game.completedAt) {
    throw new Error("Game is already complete");
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

  const nextWinningUserIds = getWinningUserIds(game);
  const finishedAt = nowIso();

  const updatedGame = await updateGame(game.id, {
    completedRounds: game.completedRounds + 1,
    completedAt: input.completeGame ? nowIso() : game.completedAt,
  });

  await updateGameRound(round.id, {
    completedAt: finishedAt,
  });

  if (input.completeGame) {
    await replaceGameWinners({
      gameId: game.id,
      userIds: nextWinningUserIds,
    });

    if (game.gameTitleId) {
      await grantGameTitleToGameParticipants({
        gameId: game.id,
        gameTitleId: game.gameTitleId,
        source: "played",
        acquiredFromUserId: user.id,
      });
    }
  }

  return updatedGame;
}

export async function upsertActiveRoundScore(input: {
  gameId: string;
  userId: string;
  scoreDelta: number;
}) {
  const { game } = await requireGameCreator(input.gameId);

  if (game.completedAt) {
    throw new Error("Game is already complete");
  }

  if (!Number.isFinite(input.scoreDelta)) {
    throw new Error("Round scores must be valid numbers");
  }

  const normalizedDelta = Math.trunc(input.scoreDelta);
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

  if (existingScore) {
    await updateGameRoundScore(existingScore.id, {
      scoreDelta: existingScore.scoreDelta + normalizedDelta,
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

  await updateGamePlayer(player.id, {
    score: player.score + normalizedDelta,
  });
}

export async function addGamePlayer(input: { gameId: string; userId: string }) {
  const { gameId, userId } = input;
  await requireGameCreator(gameId);

  const existing = await getGamePlayerByGameAndUserId(gameId, userId);

  if (existing) {
    throw new Error("That player is already in the game");
  }

  return addPlayerToGame(gameId, userId);
}

export async function addGuestGamePlayer(input: {
  gameId: string;
  firstName: string;
  lastName?: string;
}) {
  const { gameId, firstName, lastName } = input;
  const { user } = await requireGameCreator(gameId);
  const trimmedFirstName = firstName.trim();

  if (!trimmedFirstName) {
    throw new Error("Guest first name is required");
  }

  const guest = await createUser({
    firstName: trimmedFirstName,
    lastName: lastName?.trim() || null,
    isGuest: true,
    created_by_user_id: user.id,
    isProfileComplete: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  return addPlayerToGame(gameId, guest.id);
}

export async function updateGameDetails(input: {
  gameId: string;
  gameTitleId: string | null;
  gameTitleName?: string | null;
}) {
  const { gameId, gameTitleId, gameTitleName } = input;
  const { user } = await requireGameCreator(gameId);

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

  return updatedGame;
}

export async function completeGame(input: {
  gameId: string;
}) {
  const { gameId } = input;
  const { user, game } = await requireGameCreator(gameId);

  if (game.completedAt) {
    throw new Error("Game is already complete");
  }

  const winningUserIds = getWinningUserIds(game);

  const updatedGame = await updateGame(gameId, {
    completedAt: nowIso(),
  });

  await replaceGameWinners({
    gameId,
    userIds: winningUserIds,
  });

  if (game.gameTitleId) {
    await grantGameTitleToGameParticipants({
      gameId,
      gameTitleId: game.gameTitleId,
      source: "played",
      acquiredFromUserId: user.id,
    });
  }

  return updatedGame;
}

export async function shareGameTitle(input: {
  gameTitleId: string;
  targetUserId: string;
}) {
  const user = await requireCurrentUser();
  const gameTitle = await getAccessibleGameTitleById({
    userId: user.id,
    gameTitleId: input.gameTitleId,
  });

  if (!gameTitle) {
    throw new Error("Choose a title from your library");
  }

  return shareGameTitleWithUser({
    gameTitleId: gameTitle.id,
    targetUserId: input.targetUserId,
    sharedByUserId: user.id,
  });
}

export async function promoteTitleToUniversal(input: { gameTitleId: string }) {
  await requireAdminUser();
  const gameTitle = await getGameTitleById(input.gameTitleId);

  if (!gameTitle) {
    throw new Error("Title not found");
  }

  return promoteGameTitleToUniversal(gameTitle.id);
}

export async function saveGameTitleDefaults(input: {
  gameTitleId: string;
  defaultScoringMode?: "highest_wins" | "lowest_wins" | null;
  defaultEndingMode?: "none" | "round_count" | "score_threshold" | null;
  defaultTargetRounds?: number | null;
  defaultScoreThreshold?: number | null;
  defaultScoreThresholdDirection?: "at_least" | "at_most" | null;
}) {
  const user = await requireCurrentUser();
  const gameTitle = await getGameTitleById(input.gameTitleId);

  if (!gameTitle) {
    throw new Error("Title not found");
  }

  if (gameTitle.isUniversal) {
    if (user.role !== "admin") {
      throw new Error("Admin access required");
    }
  } else if (gameTitle.createdByUserId !== user.id) {
    throw new Error("Only the title owner can update defaults");
  }

  return updateGameTitleDefaults(
    gameTitle.id,
    normalizeGameTitleDefaults({
      defaultScoringMode: input.defaultScoringMode,
      defaultEndingMode: input.defaultEndingMode,
      defaultTargetRounds: input.defaultTargetRounds,
      defaultScoreThreshold: input.defaultScoreThreshold,
      defaultScoreThresholdDirection: input.defaultScoreThresholdDirection,
    }),
  );
}

export async function mergeTitleIntoAnother(input: {
  sourceGameTitleId: string;
  targetGameTitleId: string;
}) {
  await requireAdminUser();

  return mergeGameTitles(input);
}

export async function deleteCreatedGame(input: { gameId: string }) {
  const { gameId } = input;
  const { game } = await requireGameCreator(gameId);

  if (game.completedAt) {
    throw new Error("Game is already complete");
  }

  return deleteGame(gameId);
}
