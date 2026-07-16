import {
  buildComparisonOptions,
  buildProfileStats,
  type ProfileStatsCompletedGame,
  type ProfileStatsUser,
} from "./profile-stats";

function createUser(overrides: Partial<ProfileStatsUser> = {}): ProfileStatsUser {
  return {
    id: "user-1",
    firstName: "Alex",
    lastName: "Player",
    color: "#111111",
    avatarUrl: null,
    isGuest: false,
    mergedIntoUserId: null,
    ...overrides,
  };
}

function createGame(
  overrides: Partial<ProfileStatsCompletedGame> = {},
): ProfileStatsCompletedGame {
  return {
    id: "game-1",
    createdAt: "2025-01-01T00:00:00.000Z",
    completedAt: "2025-01-01T01:00:00.000Z",
    title: {
      id: "title-1",
      title: "Skyjo",
      color: "#0f766e",
      imageUrl: "/images/skyjo.png",
    },
    scoringMode: "lowest_wins",
    participants: [
      { userId: "user-1", score: 10 },
      { userId: "user-2", score: 20 },
    ],
    participantUserIds: ["user-1", "user-2"],
    winnerUserIds: ["user-1"],
    placementByUserId: { "user-1": 1, "user-2": 2 },
    ...overrides,
  };
}

describe("buildComparisonOptions", () => {
  it("includes friends and standalone guests on the owner's profile", () => {
    const options = buildComparisonOptions({
      profileUserId: "user-1",
      friends: [
        createUser({
          id: "user-2",
          firstName: "Ben",
          avatarUrl: "/images/profiles/sea.png",
        }),
      ],
      guests: [createUser({ id: "guest-1", firstName: "Taylor", isGuest: true })],
      includeGuests: true,
    });

    expect(options.map((option) => option.id)).toEqual(["user-2", "guest-1"]);
    expect(options.find((option) => option.id === "guest-1")?.isGuest).toBe(true);
    expect(options.find((option) => option.id === "user-2")?.avatarUrl).toBe(
      "/images/profiles/sea.png",
    );
  });

  it("excludes guests from public-profile comparison options", () => {
    const options = buildComparisonOptions({
      profileUserId: "user-1",
      friends: [createUser({ id: "user-2", firstName: "Ben" })],
      guests: [createUser({ id: "guest-1", firstName: "Taylor", isGuest: true })],
      includeGuests: false,
    });

    expect(options.map((option) => option.id)).toEqual(["user-2"]);
  });

  it("includes recently played users and guests in addition to friends", () => {
    const options = buildComparisonOptions({
      profileUserId: "user-1",
      friends: [createUser({ id: "user-2", firstName: "Ben" })],
      guests: [createUser({ id: "guest-1", firstName: "Taylor", isGuest: true })],
      recentlyPlayedWith: [
        createUser({ id: "user-3", firstName: "Casey" }),
        createUser({ id: "guest-2", firstName: "Jordan", isGuest: true }),
      ],
      includeGuests: false,
    });

    expect(options.map((option) => option.id)).toEqual([
      "user-2",
      "user-3",
      "guest-2",
    ]);
    expect(options.find((option) => option.id === "guest-2")?.isGuest).toBe(true);
  });

  it("filters merged guests out of the owner selector", () => {
    const options = buildComparisonOptions({
      profileUserId: "user-1",
      friends: [],
      guests: [
        createUser({
          id: "guest-1",
          firstName: "Taylor",
          isGuest: true,
          mergedIntoUserId: "user-9",
        }),
      ],
      includeGuests: true,
    });

    expect(options).toEqual([]);
  });
});

describe("buildProfileStats", () => {
  it("defaults best friend by completed shared games and ignores active games by construction", () => {
    const options = buildComparisonOptions({
      profileUserId: "user-1",
      friends: [
        createUser({ id: "user-2", firstName: "Ben" }),
        createUser({ id: "user-3", firstName: "Casey" }),
      ],
      includeGuests: false,
    });

    const result = buildProfileStats({
      profileUserId: "user-1",
      comparisonOptions: options,
      friendCount: 2,
      completedGames: [
        createGame({
          id: "game-1",
          completedAt: "2025-01-03T00:00:00.000Z",
          participantUserIds: ["user-1", "user-2"],
        }),
        createGame({
          id: "game-2",
          completedAt: "2025-01-02T00:00:00.000Z",
          participantUserIds: ["user-1", "user-2"],
          winnerUserIds: ["user-2"],
        }),
        createGame({
          id: "game-3",
          completedAt: "2025-01-01T00:00:00.000Z",
          participantUserIds: ["user-1", "user-3"],
          winnerUserIds: ["user-3"],
        }),
      ],
    });

    expect(result.defaultBestFriend?.id).toBe("user-2");
    expect(result.defaultBestFriend?.completedGamesTogether).toBe(2);
    expect(result.stats.completedGames).toBe(3);
  });

  it("builds comparison summaries for selector changes", () => {
    const options = buildComparisonOptions({
      profileUserId: "user-1",
      friends: [createUser({ id: "user-2", firstName: "Ben" })],
      includeGuests: false,
    });

    const result = buildProfileStats({
      profileUserId: "user-1",
      comparisonOptions: options,
      friendCount: 1,
      completedGames: [
        createGame({
          id: "game-1",
          completedAt: "2025-01-03T00:00:00.000Z",
          winnerUserIds: ["user-1"],
        }),
        createGame({
          id: "game-2",
          completedAt: "2025-01-02T00:00:00.000Z",
          winnerUserIds: ["user-2"],
        }),
        createGame({
          id: "game-3",
          completedAt: "2025-01-01T00:00:00.000Z",
          winnerUserIds: ["user-1"],
        }),
      ],
    });

    expect(result.comparisonSummariesByUserId["user-2"]).toMatchObject({
      completedGamesTogether: 3,
      wins: 2,
      losses: 1,
      winRate: 67,
      recentWins: 2,
      recentGamesCount: 3,
    });
  });

  it("builds overall comparison stats from the compared player's full history", () => {
    const options = buildComparisonOptions({
      profileUserId: "user-1",
      friends: [createUser({ id: "user-2", firstName: "Ben" })],
      includeGuests: false,
    });

    const result = buildProfileStats({
      profileUserId: "user-1",
      comparisonOptions: options,
      friendCount: 1,
      completedGames: [
        createGame({
          id: "shared-1",
          completedAt: "2025-01-03T00:00:00.000Z",
          winnerUserIds: ["user-1"],
        }),
      ],
      comparisonCompletedGamesByUserId: {
        "user-2": [
          createGame({
            id: "user-2-game-1",
            completedAt: "2025-01-05T00:00:00.000Z",
            winnerUserIds: ["user-2"],
          }),
          createGame({
            id: "user-2-game-2",
            completedAt: "2025-01-04T00:00:00.000Z",
            winnerUserIds: ["user-1"],
          }),
          createGame({
            id: "user-2-game-3",
            completedAt: "2025-01-02T00:00:00.000Z",
            winnerUserIds: ["user-2"],
          }),
        ],
      },
    });

    expect(result.comparisonSummariesByUserId["user-2"]).toMatchObject({
      overallStats: {
        completedGames: 3,
        wins: 2,
        winRate: 67,
        bestWinStreak: 1,
        currentStreak: { type: "win", count: 1 },
        signatureTitle: {
          id: "title-1",
          title: "Skyjo",
          completedCount: 3,
          winRate: 67,
        },
      },
    });
  });

  it("falls back cleanly when no comparison target has completed games", () => {
    const options = buildComparisonOptions({
      profileUserId: "user-1",
      friends: [createUser({ id: "user-2", firstName: "Ben" })],
      includeGuests: false,
    });

    const result = buildProfileStats({
      profileUserId: "user-1",
      comparisonOptions: options,
      friendCount: 1,
      completedGames: [],
    });

    expect(result.defaultBestFriend).toBeNull();
    expect(result.defaultComparisonUserId).toBe("user-2");
    expect(result.comparisonSummariesByUserId["user-2"]).toMatchObject({
      completedGamesTogether: 0,
      wins: 0,
      losses: 0,
      winRate: null,
    });
  });

  it("counts only explicitly recorded no-score placements beyond 1st", () => {
    const result = buildProfileStats({
      profileUserId: "user-1",
      comparisonOptions: [],
      friendCount: 0,
      completedGames: [
        createGame({
          id: "winner-only",
          scoringMode: "no_score",
          participants: [
            { userId: "user-1", score: null },
            { userId: "user-2", score: null },
          ],
          winnerUserIds: ["user-1"],
          placementByUserId: { "user-1": 1 },
        }),
        createGame({
          id: "full-podium",
          scoringMode: "no_score",
          participants: [
            { userId: "user-1", score: null },
            { userId: "user-2", score: null },
            { userId: "user-3", score: null },
          ],
          winnerUserIds: ["user-2"],
          placementByUserId: { "user-2": 1, "user-1": 2, "user-3": 3 },
        }),
      ],
    });

    expect(result.stats.placements).toEqual({
      first: 1,
      second: 1,
      third: 0,
    });
  });
});
