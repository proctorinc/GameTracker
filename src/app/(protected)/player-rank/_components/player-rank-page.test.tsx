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
          playerRankPosition: 3,
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
          standings: [
            {
              userId: "user-1",
              firstName: "Maya",
              lastName: "Viewer",
              displayName: "Maya Viewer",
              isLeaderboardDisabled: false,
              playerRankTotal: "180",
              playerRankTotalMinor: 18_000,
              playerRankPosition: 3,
              playerRankWindowLabel: "6-month rolling rank",
              playerRankGamesCount: 4,
              topThreeFinishes: 2,
            },
          ],
        }}
      />,
    );

    expect(markup).toContain("Player Rank");
    expect(markup).toContain("Your Player Rank");
    expect(markup).toContain("Global standings");
    expect(markup).toContain("Maya Viewer");
    expect(markup).toContain("You");
  });
});
