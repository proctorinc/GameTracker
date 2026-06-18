import { describe, expect, it } from "vitest";
import { buildActivityLeaderboard } from "./leaderboard-utils";

function createFriend(
  id: string,
  firstName: string,
  lastName = "Player",
  color = "#22c55e",
  playerRankLeaderboardDisabled = false,
) {
  return {
    id,
    firstName,
    lastName,
    color,
    playerRankLeaderboardDisabled,
  } as never;
}

function createGame(input: {
  id: string;
  completedAt: string;
  players: string[];
  winners?: string[];
}) {
  return {
    id: input.id,
    createdAt: input.completedAt,
    completedAt: input.completedAt,
    players: input.players.map((userId) => ({ userId })),
    winners: (input.winners ?? []).map((userId) => ({ userId })),
  };
}

describe("buildActivityLeaderboard", () => {
  it("includes the current user alongside friends", () => {
    const rows = buildActivityLeaderboard({
      currentUser: createFriend("me", "Casey"),
      friends: [createFriend("u1", "Amy")],
      friendActivity: [],
      standings: [
        {
          userId: "me",
          firstName: "Casey",
          lastName: "Player",
          displayName: "Casey Player",
          playerRankTotal: "250",
          playerRankTotalMinor: 25_000,
          playerRankPosition: 2,
          playerRankWindowLabel: "6-month rolling rank",
          playerRankGamesCount: 6,
          topThreeFinishes: 4,
        },
        {
          userId: "u1",
          firstName: "Amy",
          lastName: "Player",
          displayName: "Amy Player",
          playerRankTotal: "220",
          playerRankTotalMinor: 22_000,
          playerRankPosition: 4,
          playerRankWindowLabel: "6-month rolling rank",
          playerRankGamesCount: 5,
          topThreeFinishes: 3,
        },
      ],
      now: new Date("2026-06-18T12:00:00.000Z"),
    });

    expect(rows.map((row) => row.user.id)).toEqual(["me", "u1"]);
    expect(rows[0]?.isCurrentUser).toBe(true);
    expect(rows[1]?.isCurrentUser).toBe(false);
  });

  it("orders ranked friends ahead of unranked friends and assigns friend positions", () => {
    const rows = buildActivityLeaderboard({
      friends: [createFriend("u1", "Amy"), createFriend("u2", "Ben")],
      friendActivity: [],
      standings: [
        {
          userId: "u1",
          firstName: "Amy",
          lastName: "Player",
          displayName: "Amy Player",
          playerRankTotal: "220",
          playerRankTotalMinor: 22_000,
          playerRankPosition: 4,
          playerRankWindowLabel: "6-month rolling rank",
          playerRankGamesCount: 5,
          topThreeFinishes: 3,
        },
      ],
      now: new Date("2026-06-18T12:00:00.000Z"),
    });

    expect(rows.map((row) => row.user.id)).toEqual(["u1", "u2"]);
    expect(rows.map((row) => row.friendPosition)).toEqual([1, 2]);
    expect(rows[1]?.globalPosition).toBeNull();
    expect(rows[1]?.playerRankTotal).toBe("0");
  });

  it("chooses a last-week rank surge over raw volume", () => {
    const rows = buildActivityLeaderboard({
      friends: [createFriend("u1", "Amy")],
      friendActivity: [
        createGame({
          id: "g1",
          completedAt: "2026-06-17T10:00:00.000Z",
          players: ["u1"],
          winners: ["u1"],
        }),
        createGame({
          id: "g2",
          completedAt: "2026-06-16T10:00:00.000Z",
          players: ["u1"],
          winners: ["u1"],
        }),
        createGame({
          id: "g3",
          completedAt: "2026-06-15T10:00:00.000Z",
          players: ["u1"],
          winners: ["u1"],
        }),
      ],
      playerRankDeltasByGameId: {
        g1: [{ gameId: "g1", userId: "u1", deltaMinor: 5_000, deltaFormatted: "+50", completedAt: "2026-06-17T10:00:00.000Z" }],
        g2: [{ gameId: "g2", userId: "u1", deltaMinor: 5_000, deltaFormatted: "+50", completedAt: "2026-06-16T10:00:00.000Z" }],
        g3: [{ gameId: "g3", userId: "u1", deltaMinor: 5_000, deltaFormatted: "+50", completedAt: "2026-06-15T10:00:00.000Z" }],
      },
      standings: [
        {
          userId: "u1",
          firstName: "Amy",
          lastName: "Player",
          displayName: "Amy Player",
          playerRankTotal: "220",
          playerRankTotalMinor: 22_000,
          playerRankPosition: 4,
          playerRankWindowLabel: "6-month rolling rank",
          playerRankGamesCount: 5,
          topThreeFinishes: 3,
        },
      ],
      now: new Date("2026-06-18T12:00:00.000Z"),
    });

    expect(rows[0]?.headlineStat).toEqual({
      kind: "rank",
      label: "+150 in the last week",
    });
    expect(rows[0]?.supportingStats).toContain("+150 rank points in last 14 days");
  });

  it("chooses last-3-day volume when there is no rank movement", () => {
    const rows = buildActivityLeaderboard({
      friends: [createFriend("u1", "Amy")],
      friendActivity: [
        createGame({
          id: "g1",
          completedAt: "2026-06-18T08:00:00.000Z",
          players: ["u1"],
        }),
        createGame({
          id: "g2",
          completedAt: "2026-06-17T10:00:00.000Z",
          players: ["u1"],
        }),
      ],
      standings: [],
      now: new Date("2026-06-18T12:00:00.000Z"),
    });

    expect(rows[0]?.headlineStat).toEqual({
      kind: "volume",
      label: "2 games in the last 3 days",
    });
  });

  it("chooses recent wins when there are enough decisive games", () => {
    const rows = buildActivityLeaderboard({
      friends: [createFriend("u1", "Amy")],
      friendActivity: [
        createGame({
          id: "g1",
          completedAt: "2026-06-17T10:00:00.000Z",
          players: ["u1", "u2"],
          winners: ["u1"],
        }),
        createGame({
          id: "g2",
          completedAt: "2026-06-13T10:00:00.000Z",
          players: ["u1", "u2"],
          winners: ["u1"],
        }),
        createGame({
          id: "g3",
          completedAt: "2026-06-11T10:00:00.000Z",
          players: ["u1", "u2"],
          winners: ["u2"],
        }),
      ],
      standings: [],
      now: new Date("2026-06-18T12:00:00.000Z"),
    });

    expect(rows[0]?.headlineStat).toEqual({
      kind: "wins",
      label: "Won 2 of last 3",
    });
  });

  it("falls back to two-week volume when no stronger stat exists", () => {
    const rows = buildActivityLeaderboard({
      friends: [createFriend("u1", "Amy")],
      friendActivity: [
        createGame({
          id: "g1",
          completedAt: "2026-06-12T10:00:00.000Z",
          players: ["u1"],
        }),
        createGame({
          id: "g2",
          completedAt: "2026-06-07T10:00:00.000Z",
          players: ["u1"],
        }),
      ],
      standings: [],
      now: new Date("2026-06-18T12:00:00.000Z"),
    });

    expect(rows[0]?.headlineStat).toEqual({
      kind: "volume",
      label: "2 games in the last 2 weeks",
    });
  });

  it("hides friends removed from the global leaderboard", () => {
    const rows = buildActivityLeaderboard({
      friends: [
        createFriend("u1", "Amy"),
        createFriend("u2", "Ben", "Player", "#22c55e", true),
      ],
      friendActivity: [
        createGame({
          id: "g1",
          completedAt: "2026-06-17T10:00:00.000Z",
          players: ["u1", "u2"],
          winners: ["u1"],
        }),
      ],
      standings: [
        {
          userId: "u1",
          firstName: "Amy",
          lastName: "Player",
          displayName: "Amy Player",
          playerRankTotal: "220",
          playerRankTotalMinor: 22_000,
          playerRankPosition: 4,
          playerRankWindowLabel: "6-month rolling rank",
          playerRankGamesCount: 5,
          topThreeFinishes: 3,
        },
        {
          userId: "u2",
          firstName: "Ben",
          lastName: "Player",
          displayName: "Ben Player",
          playerRankTotal: "180",
          playerRankTotalMinor: 18_000,
          playerRankPosition: 8,
          playerRankWindowLabel: "6-month rolling rank",
          playerRankGamesCount: 4,
          topThreeFinishes: 2,
        },
      ],
      now: new Date("2026-06-18T12:00:00.000Z"),
    });

    expect(rows.map((row) => row.user.id)).toEqual(["u1"]);
  });

  it("keeps no-activity friends below played but scoreless friends", () => {
    const rows = buildActivityLeaderboard({
      friends: [createFriend("u1", "Paul"), createFriend("u2", "Nora")],
      friendActivity: [
        createGame({
          id: "g1",
          completedAt: "2026-06-17T10:00:00.000Z",
          players: ["u1"],
        }),
      ],
      standings: [
        {
          userId: "u1",
          firstName: "Paul",
          lastName: "Player",
          displayName: "Paul Player",
          playerRankTotal: "0",
          playerRankTotalMinor: 0,
          playerRankPosition: null,
          playerRankWindowLabel: "6-month rolling rank",
          playerRankGamesCount: 2,
          topThreeFinishes: 0,
        },
      ],
      now: new Date("2026-06-18T12:00:00.000Z"),
    });

    expect(rows.map((row) => row.user.id)).toEqual(["u1", "u2"]);
    expect(rows[1]?.headlineStat.kind).toBe("idle");
  });
});
