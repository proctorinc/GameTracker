import { vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../../tests/helpers/render";
import GameTitlePage from "./game-title-page";
import type { GameTitleStatsSummary } from "@/lib/db/store/game.store";

vi.mock("./game-title-defaults-editor", () => ({
  default: () => <div>defaults editor</div>,
}));

vi.mock("./game-title-image-editor", () => ({
  default: () => <div>image editor</div>,
}));

function createTitleStats(
  overrides: Partial<GameTitleStatsSummary> = {},
): GameTitleStatsSummary {
  return {
    rankWindowLabel: "6-month rank gain",
    totalGames: 0,
    completedGames: 0,
    activeGames: 0,
    wins: 0,
    winRate: 0,
    averageScore: null,
    bestScore: null,
    lastPlayedAt: null,
    totalRounds: 0,
    placements: { first: 0, second: 0, third: 0 },
    rankGainInWindow: { minor: 0, formatted: "0" },
    rankGainAllTime: { minor: 0, formatted: "0" },
    bestRankGain: null,
    averageRankGain: null,
    currentGlobalRankTotal: null,
    currentGlobalRankPosition: null,
    ...overrides,
  };
}

describe("GameTitlePage", () => {
  it("renders title rank stats, comparison metrics, and compact history", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <GameTitlePage
        canManageDefaults={false}
        canManageTitleArtwork={false}
        data={{
          title: {
            id: "title-1",
            title: "Skyjo",
            normalizedTitle: "skyjo",
            color: "#0f766e",
            imageUrl: "",
            imageVerticalFocus: 50,
            defaultScoringMode: "lowest_wins",
            defaultEndingMode: "none",
            defaultTrackRounds: false,
            defaultTargetRounds: null,
            defaultScoreThreshold: null,
            defaultScoreThresholdDirection: null,
            defaultSettingsVersion: null,
            defaultSettingsJson: null,
            isUniversal: true,
            createdByUserId: null,
            mergedIntoGameTitleId: null,
            createdAt: "2026-06-01T00:00:00.000Z",
          },
          currentUserId: "user-1",
          currentUserFirstName: "Maya",
          currentUserLastName: "Player",
          currentUserAvatarUrl: "/images/profiles/sea.png",
          defaultComparisonUserId: "user-2",
          defaultChartSelectedUserIds: ["user-1", "user-2"],
          comparisonOptions: [
            {
              id: "user-2",
              firstName: "Alex",
              lastName: "Rival",
              color: "#f97316",
              avatarUrl: "/images/profiles/rocks.png",
              displayName: "Alex Rival",
              isGuest: false,
            },
          ],
          chartSeries: [
            {
              userId: "user-1",
              firstName: "You",
              lastName: null,
              label: "You",
              color: "#0f766e",
              avatarUrl: "/images/profiles/sea.png",
              isCurrentUser: true,
              currentTitleRankTotal: "45",
              currentTitleRankTotalMinor: 4500,
              hasHistory: true,
              points: [
                {
                  historyDate: "2026-06-15",
                  hasSnapshot: true,
                  playerRankPosition: null,
                  playerRankTotal: "45",
                  playerRankTotalMinor: 4500,
                  playerRankGamesCount: null,
                  topThreeFinishes: null,
                },
              ],
            },
            {
              userId: "user-2",
              firstName: "Alex",
              lastName: "Rival",
              label: "Alex Rival",
              color: "#f97316",
              avatarUrl: "/images/profiles/rocks.png",
              isCurrentUser: false,
              currentTitleRankTotal: "15",
              currentTitleRankTotalMinor: 1500,
              hasHistory: true,
              points: [
                {
                  historyDate: "2026-06-15",
                  hasSnapshot: true,
                  playerRankPosition: null,
                  playerRankTotal: "15",
                  playerRankTotalMinor: 1500,
                  playerRankGamesCount: null,
                  topThreeFinishes: null,
                },
              ],
            },
          ],
          stats: {
            rankWindowLabel: "6-month rank gain",
            totalGames: 4,
            completedGames: 3,
            activeGames: 1,
            wins: 2,
            winRate: 0.67,
            averageScore: 27,
            bestScore: 12,
            lastPlayedAt: "2026-06-15T10:00:00.000Z",
            totalRounds: 9,
            placements: { first: 2, second: 1, third: 0 },
            rankGainInWindow: { minor: 6000, formatted: "60" },
            rankGainAllTime: { minor: 9500, formatted: "95" },
            bestRankGain: { minor: 4500, formatted: "45" },
            averageRankGain: { minor: 3167, formatted: "32" },
            currentGlobalRankTotal: "240",
            currentGlobalRankPosition: 3,
          },
          comparisonSummariesByUserId: {
            "user-2": {
              user: {
                id: "user-2",
                firstName: "Alex",
                lastName: "Rival",
                color: "#f97316",
                avatarUrl: "/images/profiles/rocks.png",
                displayName: "Alex Rival",
                isGuest: false,
              },
              headToHeadStats: {
                current: createTitleStats({
                  totalGames: 2,
                  completedGames: 2,
                  wins: 1,
                  winRate: 0.5,
                  rankGainInWindow: { minor: 3000, formatted: "30" },
                }),
                comparison: createTitleStats({
                  totalGames: 2,
                  completedGames: 2,
                  wins: 1,
                  winRate: 0.5,
                  rankGainInWindow: { minor: 1500, formatted: "15" },
                }),
              },
              allTimeStats: createTitleStats({
                totalGames: 7,
                completedGames: 6,
                activeGames: 1,
                wins: 4,
                winRate: 0.67,
                averageScore: 31,
                bestScore: 10,
                lastPlayedAt: "2026-06-15T10:00:00.000Z",
                totalRounds: 18,
                placements: { first: 4, second: 1, third: 1 },
                rankGainInWindow: { minor: 11500, formatted: "115" },
                rankGainAllTime: { minor: 15200, formatted: "152" },
                bestRankGain: { minor: 4000, formatted: "40" },
                averageRankGain: { minor: 2533, formatted: "25" },
              }),
            },
          },
        }}
      />,
    );

    expect(
      screen.getByRole("img", {
        name: /90-day title rank history in player rank points/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("90-day title rank history")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Player Rank points earned from this title."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Universal title")).not.toBeInTheDocument();
    expect(screen.queryByText("Personal title")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^highlight$/i }));
    await user.click(
      screen.getByRole("button", { name: /alex rival 15 points/i }),
    );
    expect(
      screen.getByRole("button", { name: /highlight alex rival/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /filter/i }));
    expect(
      screen.getByRole("checkbox", { name: /you 45 points/i }),
    ).toBeChecked();
    const alexChartCheckbox = screen.getByRole("checkbox", {
      name: /alex rival 15 points/i,
    });
    expect(alexChartCheckbox).toBeChecked();
    await user.click(alexChartCheckbox);
    expect(screen.queryByTestId("player-rank-avatar-user-2")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /close filter drawer/i }),
    );
    expect(screen.getByRole("tab", { name: "Head to head" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "All games" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getAllByText("6-month rank gain").length).toBeGreaterThan(0);
    expect(screen.getAllByText("MP").length).toBeGreaterThan(0);
    expect(screen.queryByText("All-time rank gain")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show all/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /show all/i }));
    expect(screen.getAllByText("All-time rank gain").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1st places").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("tab", { name: "All games" }));
    expect(screen.getByRole("tab", { name: "All games" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.queryByText("All-time rank gain")).not.toBeInTheDocument();
    expect(screen.getAllByText("115").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Alex Rival").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: /view game history/i }),
    ).toHaveAttribute("href", "/game/history?titleId=title-1");
  });

  it("opens a deep-linked admin tab for title owners", () => {
    window.localStorage.setItem("page-tab:/titles/title-1", "stats");
    window.history.replaceState({}, "", "/titles/title-1?tab=admin");

    renderWithProviders(
      <GameTitlePage
        canManageDefaults={true}
        canManageTitleArtwork={false}
        initialTab="admin"
        data={{
          title: {
            id: "title-1",
            title: "Skyjo",
            normalizedTitle: "skyjo",
            color: "#0f766e",
            imageUrl: "",
            imageVerticalFocus: 50,
            defaultScoringMode: "lowest_wins",
            defaultEndingMode: "none",
            defaultTrackRounds: false,
            defaultTargetRounds: null,
            defaultScoreThreshold: null,
            defaultScoreThresholdDirection: null,
            defaultSettingsVersion: null,
            defaultSettingsJson: null,
            isUniversal: false,
            createdByUserId: "user-1",
            mergedIntoGameTitleId: null,
            createdAt: "2026-06-01T00:00:00.000Z",
          },
          currentUserId: "user-1",
          currentUserFirstName: "Maya",
          currentUserLastName: "Player",
          currentUserAvatarUrl: null,
          defaultComparisonUserId: null,
          defaultChartSelectedUserIds: ["user-1"],
          comparisonOptions: [],
          chartSeries: [
            {
              userId: "user-1",
              firstName: "You",
              lastName: null,
              label: "You",
              color: "#0f766e",
              avatarUrl: null,
              isCurrentUser: true,
              currentTitleRankTotal: "0",
              currentTitleRankTotalMinor: 0,
              hasHistory: false,
              points: [],
            },
          ],
          stats: {
            rankWindowLabel: null,
            totalGames: 0,
            completedGames: 0,
            activeGames: 0,
            wins: 0,
            winRate: 0,
            averageScore: null,
            bestScore: null,
            lastPlayedAt: null,
            totalRounds: 0,
            placements: { first: 0, second: 0, third: 0 },
            rankGainInWindow: { minor: 0, formatted: "0" },
            rankGainAllTime: { minor: 0, formatted: "0" },
            bestRankGain: null,
            averageRankGain: null,
            currentGlobalRankTotal: null,
            currentGlobalRankPosition: null,
          },
          comparisonSummariesByUserId: {},
        }}
      />,
    );

    expect(screen.getByText("defaults editor")).toBeInTheDocument();
    expect(screen.queryByText("image editor")).not.toBeInTheDocument();
  });
});
