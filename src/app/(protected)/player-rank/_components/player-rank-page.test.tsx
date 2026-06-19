import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlayerRankPageView } from "./player-rank-page";

describe("PlayerRankPageView", () => {
  it("renders the read-only standings page for non-admin users", () => {
    const markup = renderToStaticMarkup(
      <PlayerRankPageView
        data={{
          canViewPlayerRank: true,
          currentUserId: "user-1",
          playerRankTotal: "180",
          playerRankPosition: 1,
          playerRankWindowLabel: "6-month rolling rank",
          playerRankGamesCount: 4,
          topThreeFinishes: 2,
          playerRankRecentChangeSummary: {
            recentWindowLabel: "Last 30 days",
            recentGamesCount: 1,
            latestChange: {
              gameId: "game-1",
              userId: "user-1",
              deltaMinor: 4000,
              deltaFormatted: "+40",
              completedAt: "2026-06-18T10:00:00.000Z",
            },
            latestIncrease: {
              gameId: "game-1",
              userId: "user-1",
              deltaMinor: 4000,
              deltaFormatted: "+40",
              completedAt: "2026-06-18T10:00:00.000Z",
            },
            latestDecrease: null,
          },
          twoPlayerPrizePool: "50",
          threePlayerPrizePool: "100",
          sixPlusPlayerPrizePool: "400",
          friendStandings: [
            {
              user: {
                id: "user-1",
                firstName: "Maya",
                lastName: "Viewer",
                color: "#22c55e",
                playerRankLeaderboardDisabled: false,
              },
              isCurrentUser: true,
              friendPosition: 1,
              playerRankTotal: "180",
              playerRankTotalMinor: 18_000,
              globalPosition: 3,
              playerRankWindowLabel: "6-month rolling rank",
              playerRankGamesCount: 4,
              topThreeFinishes: 2,
              recentRankedGameAt: "2026-06-18T10:00:00.000Z",
              recentActivityCount: 1,
              headlineStat: {
                kind: "rank",
                label: "+40 in the last week",
              },
              supportingStats: [],
            },
          ],
        }}
      />,
    );

    expect(markup).toContain("Player Rank");
    expect(markup).toContain("Your Player Rank");
    expect(markup).toContain("Friends standings");
    expect(markup).toContain("Maya Viewer");
    expect(markup).toContain("You");
  });
});
