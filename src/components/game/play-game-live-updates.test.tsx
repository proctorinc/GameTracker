import { describe, expect, it } from "vitest";
import type { GameForPlayPage } from "@/lib/db/store/game.store";
import type { UserBase } from "@/lib/db/store/user.store";
import type { PlayGameSnapshot } from "./play-game-state";
import {
  deriveRemotePlayGameEvents,
  filterLocalRemotePlayGameEvents,
  getRemoteHighlightTarget,
  summarizeRemotePlayGameEvents,
} from "./play-game-live-updates";

function createUser(input: {
  id: string;
  firstName: string;
  color?: string;
  isGuest?: boolean;
}) {
  return {
    id: input.id,
    clerkUserId: null,
    friendInviteToken: null,
    profileCardId: null,
    color: input.color ?? "#ffffff",
    role: "user",
    email: null,
    avatarUrl: null,
    firstName: input.firstName,
    lastName: null,
    created_by_user_id: input.isGuest ? "user-1" : null,
    mergedIntoUserId: null,
    mergedAt: null,
    isProfileComplete: true,
    isGuest: input.isGuest ?? false,
    playerRankLeaderboardDisabled: false,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  } satisfies UserBase;
}

function createSnapshot(): PlayGameSnapshot {
  const creator = createUser({ id: "user-1", firstName: "Mia", color: "#aaaaaa" });
  const opponent = createUser({ id: "user-2", firstName: "Kai", color: "#bbbbbb" });

  return {
    canManageLiveGame: true,
    currentUserId: creator.id,
    gameSharePath: null,
    isCreator: true,
    isManager: false,
    pendingJoinRequests: [],
    playerOptions: [creator, opponent],
    game: {
      id: "game-1",
      gameTitleId: "title-1",
      version: "v1",
      creatorId: creator.id,
      scoringMode: "lowest_wins",
      endingMode: "round_count",
      trackRounds: true,
      targetRounds: 3,
      scoreThreshold: null,
      scoreThresholdDirection: null,
      completedRounds: 0,
      pausedAt: null,
      pausedNextUserId: null,
      createdAt: "2025-01-01T00:00:00.000Z",
      completedAt: null,
      creator,
      gameTitle: {
        id: "title-1",
        title: "Skyjo",
        normalizedTitle: "skyjo",
        color: "#123456",
        imageUrl: "/images/skyjo.png",
        defaultScoringMode: null,
        defaultEndingMode: null,
        defaultTrackRounds: null,
        defaultTargetRounds: null,
        defaultScoreThreshold: null,
        defaultScoreThresholdDirection: null,
        isUniversal: true,
        createdByUserId: creator.id,
        mergedIntoGameTitleId: null,
        createdAt: "2025-01-01T00:00:00.000Z",
      },
      winners: [],
      resultPlacements: [],
      players: [
        {
          id: "game-player-1",
          gameId: "game-1",
          isManager: false,
          userId: creator.id,
          score: 0,
          user: creator,
        },
        {
          id: "game-player-2",
          gameId: "game-1",
          isManager: false,
          userId: opponent.id,
          score: 0,
          user: opponent,
        },
      ],
      rounds: [],
    } satisfies GameForPlayPage,
  };
}

describe("play-game-live-updates", () => {
  it("detects score changes and round commits separately", () => {
    const previousSnapshot = createSnapshot();
    const nextSnapshot: PlayGameSnapshot = {
      ...previousSnapshot,
      game: {
        ...previousSnapshot.game,
        completedRounds: 1,
        players: previousSnapshot.game.players.map((player) =>
          player.userId === "user-2" ? { ...player, score: 5 } : player,
        ),
        rounds: [
          {
            id: "round-1",
            gameId: previousSnapshot.game.id,
            roundNumber: 1,
            createdAt: "2025-01-01T00:00:00.000Z",
            completedAt: "2025-01-01T00:05:00.000Z",
            scores: [
              {
                id: "score-1",
                gameRoundId: "round-1",
                userId: "user-2",
                scoreDelta: 5,
                createdAt: "2025-01-01T00:00:00.000Z",
                user: previousSnapshot.game.players[1]!.user,
              },
            ],
          },
        ],
      },
    };

    const events = deriveRemotePlayGameEvents({
      previousSnapshot,
      nextSnapshot,
    });

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "score-updated",
          userId: "user-2",
          roundNumber: 1,
        }),
        expect.objectContaining({
          type: "round-committed",
          roundNumber: 1,
        }),
      ]),
    );
  });

  it("detects roster, manager, and guest-color changes", () => {
    const previousSnapshot = createSnapshot();
    const guest = createUser({
      id: "guest-1",
      firstName: "Guest",
      color: "#ff00ff",
      isGuest: true,
    });
    const nextSnapshot: PlayGameSnapshot = {
      ...previousSnapshot,
      game: {
        ...previousSnapshot.game,
        players: [
          {
            ...previousSnapshot.game.players[0]!,
            isManager: true,
            user: {
              ...previousSnapshot.game.players[0]!.user,
              color: "#00ff00",
            },
          },
          previousSnapshot.game.players[1]!,
          {
            id: "game-player-guest-1",
            gameId: previousSnapshot.game.id,
            isManager: false,
            userId: guest.id,
            score: 0,
            user: guest,
          },
        ],
      },
      playerOptions: [...previousSnapshot.playerOptions, guest],
    };

    const events = deriveRemotePlayGameEvents({
      previousSnapshot,
      nextSnapshot,
    });

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "manager-changed",
          userId: "user-1",
          isManager: true,
        }),
        expect.objectContaining({
          type: "guest-color-updated",
          userId: "user-1",
          color: "#00ff00",
        }),
        expect.objectContaining({
          type: "player-added",
          userId: "guest-1",
        }),
      ]),
    );
  });

  it("detects removals and reopen/completion changes", () => {
    const previousSnapshot = createSnapshot();
    const completedSnapshot: PlayGameSnapshot = {
      ...previousSnapshot,
      game: {
        ...previousSnapshot.game,
        completedRounds: 1,
        completedAt: "2025-01-01T00:05:00.000Z",
        players: [previousSnapshot.game.players[0]!],
      },
    };

    const completionEvents = deriveRemotePlayGameEvents({
      previousSnapshot,
      nextSnapshot: completedSnapshot,
    });

    expect(completionEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "game-completed" }),
        expect.objectContaining({
          type: "player-removed",
          userId: "user-2",
        }),
      ]),
    );

    const reopenEvents = deriveRemotePlayGameEvents({
      previousSnapshot: completedSnapshot,
      nextSnapshot: {
        ...completedSnapshot,
        game: {
          ...completedSnapshot.game,
          completedAt: null,
        },
      },
    });

    expect(reopenEvents).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "game-reopened" })]),
    );
  });

  it("detects paused state changes", () => {
    const previousSnapshot = createSnapshot();
    const pausedSnapshot: PlayGameSnapshot = {
      ...previousSnapshot,
      game: {
        ...previousSnapshot.game,
        pausedAt: "2025-01-01T00:10:00.000Z",
        pausedNextUserId: "user-2",
      },
    };

    expect(
      deriveRemotePlayGameEvents({
        previousSnapshot,
        nextSnapshot: pausedSnapshot,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "game-paused",
          pausedNextUserId: "user-2",
        }),
      ]),
    );

    const nextTurnSnapshot: PlayGameSnapshot = {
      ...pausedSnapshot,
      game: {
        ...pausedSnapshot.game,
        pausedNextUserId: null,
      },
    };

    expect(
      deriveRemotePlayGameEvents({
        previousSnapshot: pausedSnapshot,
        nextSnapshot: nextTurnSnapshot,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "paused-next-turn-updated",
          userId: null,
        }),
      ]),
    );
  });

  it("filters events that match local mutation keys", () => {
    const events = [
      {
        type: "score-updated",
        userId: "user-2",
        roundNumber: 1,
        localKeys: ["score:user-2", "round-score:1:user-2"],
      },
      {
        type: "player-added",
        userId: "user-3",
        localKeys: ["add-player:user-3"],
      },
    ] as const;

    expect(
      filterLocalRemotePlayGameEvents({
        events: [...events],
        localKeys: new Set(["score:user-2"]),
      }),
    ).toEqual([events[1]]);
  });

  it("builds merged highlight targets and concise summaries", () => {
    const events = [
      {
        type: "score-updated",
        userId: "user-2",
        roundNumber: 1,
        localKeys: ["score:user-2", "round-score:1:user-2"],
      },
      {
        type: "manager-changed",
        userId: "user-1",
        isManager: true,
        localKeys: ["manager:user-1"],
      },
      {
        type: "round-committed",
        roundNumber: 1,
        localKeys: ["commit-round"],
      },
    ] as const;

    expect(getRemoteHighlightTarget([...events])).toEqual({
      gameStatus: true,
      playerIds: ["user-2", "user-1"],
      roster: true,
      scoreUserIds: ["user-2"],
    });
    expect(summarizeRemotePlayGameEvents([...events])).toEqual([
      "Round completed",
      "Score updated",
    ]);
  });

  it("summarizes pause lifecycle events", () => {
    expect(
      summarizeRemotePlayGameEvents([
        {
          type: "game-paused",
          pausedNextUserId: "user-2",
          localKeys: ["pause-game"],
        },
      ]),
    ).toEqual(["Game paused"]);

    expect(
      summarizeRemotePlayGameEvents([
        {
          type: "game-resumed",
          localKeys: ["resume-game"],
        },
        {
          type: "paused-next-turn-updated",
          userId: null,
          localKeys: ["pause-game"],
        },
      ]),
    ).toEqual(["Game resumed", "Next turn updated"]);
  });
});
