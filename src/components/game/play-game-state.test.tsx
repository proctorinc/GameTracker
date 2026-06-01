import { describe, expect, it } from "vitest";
import type { GameForPlayPage } from "@/lib/db/store/game.store";
import type { UserBase } from "@/lib/db/store/user.store";
import {
  applyPlayGameMutation,
  applyPlayGameMutations,
  type PlayGameSnapshot,
} from "./play-game-state";

function createUser(input: {
  id: string;
  firstName: string;
  color?: string;
  isGuest?: boolean;
}): UserBase {
  return {
    id: input.id,
    profileCardId: null,
    color: input.color ?? "#ffffff",
    role: "user",
    phoneNumber: null,
    firstName: input.firstName,
    lastName: null,
    phone_verified_at: null,
    created_by_user_id: input.isGuest ? "user-1" : null,
    mergedIntoUserId: null,
    mergedAt: null,
    isProfileComplete: true,
    isGuest: input.isGuest ?? false,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  };
}

function createSnapshot(): PlayGameSnapshot {
  const creator = createUser({ id: "user-1", firstName: "Mia", color: "#aaaaaa" });
  const opponent = createUser({ id: "user-2", firstName: "Kai", color: "#bbbbbb" });

  return {
    currentUserId: creator.id,
    isCreator: true,
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
      players: [
        {
          id: "game-player-1",
          gameId: "game-1",
          userId: creator.id,
          score: 3,
          user: creator,
        },
        {
          id: "game-player-2",
          gameId: "game-1",
          userId: opponent.id,
          score: 8,
          user: opponent,
        },
      ],
      rounds: [],
    } satisfies GameForPlayPage,
  };
}

describe("play-game-state", () => {
  it("applies optimistic score updates to totals and active round scores", () => {
    const nextSnapshot = applyPlayGameMutation(createSnapshot(), {
      type: "upsert-score",
      userId: "user-2",
      scoreDelta: 5,
    });

    expect(nextSnapshot.game.players.find((player) => player.userId === "user-2")?.score).toBe(13);
    expect(nextSnapshot.game.rounds).toHaveLength(1);
    expect(nextSnapshot.game.rounds[0]?.scores[0]?.scoreDelta).toBe(5);
  });

  it("adds optimistic guest players immediately", () => {
    const guest = createUser({
      id: "guest-1",
      firstName: "Guest",
      isGuest: true,
      color: "#ff00ff",
    });
    const nextSnapshot = applyPlayGameMutation(createSnapshot(), {
      type: "add-guest",
      user: guest,
      gamePlayerId: "game-player-guest-1",
    });

    expect(nextSnapshot.game.players).toHaveLength(3);
    expect(nextSnapshot.game.players.at(-1)?.user.firstName).toBe("Guest");
  });

  it("updates user colors across the projected game snapshot", () => {
    const nextSnapshot = applyPlayGameMutation(createSnapshot(), {
      type: "update-color",
      userId: "user-2",
      color: "#00ff00",
    });

    expect(nextSnapshot.game.players.find((player) => player.userId === "user-2")?.user.color).toBe(
      "#00ff00",
    );
    expect(nextSnapshot.playerOptions.find((player) => player.id === "user-2")?.color).toBe(
      "#00ff00",
    );
  });

  it("commits an optimistic game-ending round and computes winners", () => {
    const nextSnapshot = applyPlayGameMutations(createSnapshot(), [
      {
        type: "upsert-score",
        userId: "user-2",
        scoreDelta: -6,
      },
      {
        type: "commit-round",
        completeGame: true,
        finishedAt: "2025-01-01T00:05:00.000Z",
      },
    ]);

    expect(nextSnapshot.game.completedRounds).toBe(1);
    expect(nextSnapshot.game.completedAt).toBe("2025-01-01T00:05:00.000Z");
    expect(nextSnapshot.game.winners.map((winner) => winner.userId)).toEqual(["user-2"]);
  });

  it("reapplies pending optimistic mutations over a newer base snapshot", () => {
    const baseSnapshot = createSnapshot();
    const newerBaseSnapshot: PlayGameSnapshot = {
      ...baseSnapshot,
      game: {
        ...baseSnapshot.game,
        players: baseSnapshot.game.players.map((player) =>
          player.userId === "user-2"
            ? {
                ...player,
                score: 10,
              }
            : player,
        ),
      },
    };

    const nextSnapshot = applyPlayGameMutations(newerBaseSnapshot, [
      {
        type: "upsert-score",
        userId: "user-2",
        scoreDelta: 4,
      },
    ]);

    expect(nextSnapshot.game.players.find((player) => player.userId === "user-2")?.score).toBe(14);
  });
});
