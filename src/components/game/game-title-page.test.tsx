import { vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../../tests/helpers/render";
import GameTitlePage from "./game-title-page";

vi.mock("./game-title-defaults-editor", () => ({
  default: () => <div>defaults editor</div>,
}));

vi.mock("./game-title-image-editor", () => ({
  default: () => <div>image editor</div>,
}));

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
          currentUserAvatarUrl: "/images/profiles/sea.png",
          defaultComparisonUserId: "user-2",
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
              label: "You",
              color: "#0f766e",
              isCurrentUser: true,
              points: [
                {
                  gameId: "game-1",
                  completedAt: "2026-06-15T10:00:00.000Z",
                  deltaMinor: 4500,
                  deltaFormatted: "+45",
                },
              ],
            },
            {
              userId: "user-2",
              label: "Alex Rival",
              color: "#f97316",
              isCurrentUser: false,
              points: [
                {
                  gameId: "game-1",
                  completedAt: "2026-06-15T10:00:00.000Z",
                  deltaMinor: 1500,
                  deltaFormatted: "+15",
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
              stats: {
                rankWindowLabel: "6-month rank gain",
                totalGames: 3,
                completedGames: 3,
                activeGames: 0,
                wins: 1,
                winRate: 0.33,
                averageScore: 41,
                bestScore: 20,
                lastPlayedAt: "2026-06-15T10:00:00.000Z",
                totalRounds: 9,
                placements: { first: 1, second: 1, third: 1 },
                rankGainInWindow: { minor: 1500, formatted: "15" },
                rankGainAllTime: { minor: 5200, formatted: "52" },
                bestRankGain: { minor: 2000, formatted: "20" },
                averageRankGain: { minor: 1733, formatted: "17" },
                currentGlobalRankTotal: null,
                currentGlobalRankPosition: null,
              },
            },
          },
          history: [
            {
              id: "game-1",
              status: "completed",
              createdAt: "2026-06-15T09:00:00.000Z",
              completedAt: "2026-06-15T10:00:00.000Z",
              scoringMode: "lowest_wins",
              completedRounds: 3,
              playerCount: 3,
              players: [
                { id: "user-1", firstName: "You", lastName: null, color: "#0f766e" },
                { id: "user-2", firstName: "Alex", lastName: "Rival", color: "#f97316" },
                { id: "user-3", firstName: "Sam", lastName: "Stone", color: "#2563eb" },
              ],
              currentUser: {
                userId: "user-1",
                displayName: "You",
                firstName: "You",
                lastName: null,
                color: "#0f766e",
                isGuest: false,
                score: 12,
                placement: 1,
                won: true,
                rankDelta: { minor: 4500, formatted: "+45" },
              },
              comparisonsByUserId: {
                "user-2": {
                  userId: "user-2",
                  displayName: "Alex Rival",
                  firstName: "Alex",
                  lastName: "Rival",
                  color: "#f97316",
                  isGuest: false,
                  score: 20,
                  placement: 2,
                  won: false,
                  rankDelta: { minor: 1500, formatted: "+15" },
                },
              },
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByRole("img", {
        name: /player rank earned from this title over the last 30 days/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("6-month rank gain").length).toBeGreaterThan(0);
    expect(screen.queryByText("All-time rank gain")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show all/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /show all/i }));
    expect(screen.getAllByText("All-time rank gain").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1st places").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Alex Rival").length).toBeGreaterThan(0);
    expect(screen.getByText("Completed game")).toBeInTheDocument();
    expect(screen.getAllByText("+45").length).toBeGreaterThan(0);
    expect(screen.getAllByText("+15").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Skyjo")).toHaveLength(1);
  });

  it("shows only the defaults editor for non-admin title owners", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <GameTitlePage
        canManageDefaults={true}
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
            isUniversal: false,
            createdByUserId: "user-1",
            mergedIntoGameTitleId: null,
            createdAt: "2026-06-01T00:00:00.000Z",
          },
          currentUserId: "user-1",
          currentUserAvatarUrl: null,
          defaultComparisonUserId: null,
          comparisonOptions: [],
          chartSeries: [],
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
          history: [],
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /admin/i }));

    expect(screen.getByText("defaults editor")).toBeInTheDocument();
    expect(screen.queryByText("image editor")).not.toBeInTheDocument();
  });
});
