import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlayGamePage from "./page";

const loadOptionalCurrentUser = vi.fn();
const getGameForPlayPage = vi.fn();
const listAcceptedFriendsForUser = vi.fn();
const listGuestsCreatedByUser = vi.fn();
const getOrCreateGameShareToken = vi.fn();
const listPendingJoinRequestsForGame = vi.fn();
const listPlayerRankGameDeltasForGame = vi.fn();
const notFound = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/components/game/PlayGame", () => ({
  __esModule: true,
  default: () => <div>legacy-play-game</div>,
}));

vi.mock("@/components/game/play-game-v2", () => ({
  __esModule: true,
  default: () => <div>play-game-v2</div>,
}));

vi.mock("@/lib/auth/auth-me", () => ({
  loadOptionalCurrentUser: () => loadOptionalCurrentUser(),
}));

vi.mock("@/lib/db/store/game.store", () => ({
  getGameForPlayPage: (...args: unknown[]) => getGameForPlayPage(...args),
  getOrCreateGameShareToken: (...args: unknown[]) =>
    getOrCreateGameShareToken(...args),
}));

vi.mock("@/lib/db/store/friendship.store", () => ({
  listAcceptedFriendsForUser: (...args: unknown[]) =>
    listAcceptedFriendsForUser(...args),
}));

vi.mock("@/lib/db/store/feature-flags.store", () => ({
  areCardsEnabled: () => Promise.resolve(false),
}));

vi.mock("@/lib/db/store/game-join-request.store", () => ({
  listPendingJoinRequestsForGame: (...args: unknown[]) =>
    listPendingJoinRequestsForGame(...args),
}));

vi.mock("@/lib/db/store/player-rank.store", () => ({
  listPlayerRankGameDeltasForGame: (...args: unknown[]) =>
    listPlayerRankGameDeltasForGame(...args),
}));

vi.mock("@/lib/db/store/user.store", () => ({
  listGuestsCreatedByUser: (...args: unknown[]) => listGuestsCreatedByUser(...args),
}));

vi.mock("next/navigation", () => ({
  notFound: () => notFound(),
}));

function createGame(version: "v1" | "v2", id = "game-1") {
  return {
    id,
    gameTitleId: "title-1",
    version,
    creatorId: "user-1",
    scoringMode: "highest_wins",
    endingMode: "none",
    trackRounds: false,
    targetRounds: null,
    scoreThreshold: null,
    scoreThresholdDirection: null,
    shareToken: null,
    inviteUsersEnabled: false,
    completedRounds: 0,
    pausedAt: null,
    pausedNextUserId: null,
    settingsJson:
      version === "v2"
        ? JSON.stringify({
            version: "v2",
            gameEndTrigger: "manual_finish",
            scoringType: "incremental",
            winMetric: "highest_score",
            initialPlayerScore: 0,
            roundConfig: {
              enabled: true,
              targetRounds: null,
              requiresRoundWinner: false,
            },
            tiePolicy: {
              allowTies: true,
              resolution: "allow",
            },
          })
        : null,
    createdAt: "2025-01-01T00:00:00.000Z",
    completedAt: null,
    creator: {
      id: "user-1",
      firstName: "Mia",
      lastName: null,
      color: "#fff",
      isGuest: false,
    },
    gameTitle: null,
    winners: [],
    resultPlacements: [],
    players: [],
    rounds: [],
    eliminations: [],
    itemizedScoreCategories: [],
    itemizedScoreEntries: [],
  };
}

describe("PlayGamePage", () => {
  it("renders the legacy PlayGame component for v1 games", async () => {
    loadOptionalCurrentUser.mockResolvedValue(null);
    getGameForPlayPage.mockResolvedValue(createGame("v1"));
    listPlayerRankGameDeltasForGame.mockResolvedValue([]);

    render(
      await PlayGamePage({
        params: Promise.resolve({
          gameId: "game-1",
        }),
      }),
    );

    expect(screen.getByText("legacy-play-game")).toBeInTheDocument();
  });

  it("keys legacy play state by game ID", async () => {
    loadOptionalCurrentUser.mockResolvedValue(null);
    listPlayerRankGameDeltasForGame.mockResolvedValue([]);
    getGameForPlayPage
      .mockResolvedValueOnce(createGame("v1", "game-1"))
      .mockResolvedValueOnce(createGame("v1", "game-2"));

    const firstGame = await PlayGamePage({
      params: Promise.resolve({ gameId: "game-1" }),
    });
    const secondGame = await PlayGamePage({
      params: Promise.resolve({ gameId: "game-2" }),
    });

    expect(firstGame.key).toBe("game-1");
    expect(secondGame.key).toBe("game-2");
  });

  it("renders PlayGameV2 for v2 games", async () => {
    loadOptionalCurrentUser.mockResolvedValue(null);
    getGameForPlayPage.mockResolvedValue(createGame("v2"));
    listPlayerRankGameDeltasForGame.mockResolvedValue([]);

    render(
      await PlayGamePage({
        params: Promise.resolve({
          gameId: "game-1",
        }),
      }),
    );

    expect(screen.getByText("play-game-v2")).toBeInTheDocument();
  });

  it("keys v2 play state by game ID", async () => {
    loadOptionalCurrentUser.mockResolvedValue(null);
    listPlayerRankGameDeltasForGame.mockResolvedValue([]);
    getGameForPlayPage
      .mockResolvedValueOnce(createGame("v2", "game-1"))
      .mockResolvedValueOnce(createGame("v2", "game-2"));

    const firstGame = await PlayGamePage({
      params: Promise.resolve({ gameId: "game-1" }),
    });
    const secondGame = await PlayGamePage({
      params: Promise.resolve({ gameId: "game-2" }),
    });

    expect(firstGame.key).toBe("game-1");
    expect(secondGame.key).toBe("game-2");
  });
});
