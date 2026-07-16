import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../../tests/helpers/render";
import PlayedTitlesLibraryPage from "./played-titles-library-page";

function createData(overrides?: {
  gameTitles?: Array<{
    id: string;
    title: string;
    normalizedTitle: string;
    color: string;
    imageUrl: string;
    timesPlayed: number;
    topThreeFinishes: number;
    averageScore: number | null;
  }>;
  query?: string;
}) {
  return {
    user: {
      id: "user-1",
    },
    filters: {
      query: overrides?.query ?? "",
    },
    gameTitles: overrides?.gameTitles ?? [
      {
        id: "title-1",
        title: "Azul",
        normalizedTitle: "azul",
        color: "#2563eb",
        imageUrl: "",
        timesPlayed: 4,
        topThreeFinishes: 3,
        averageScore: 18.5,
        playedWith: [
          {
            id: "friend-1",
            firstName: "Alex",
            lastName: "Stone",
            color: "#ff6600",
            avatarUrl: null,
            isGuest: false,
          },
          {
            id: "guest-1",
            firstName: "Jamie",
            lastName: null,
            color: "#00aa88",
            avatarUrl: null,
            isGuest: true,
          },
        ],
      },
      {
        id: "title-2",
        title: "Skyjo",
        normalizedTitle: "skyjo",
        color: "#0f766e",
        imageUrl: "",
        timesPlayed: 2,
        topThreeFinishes: 1,
        averageScore: null,
        playedWith: [],
      },
    ],
  };
}

describe("PlayedTitlesLibraryPage", () => {
  it("filters titles by search and keeps title stats/play links available", async () => {
    const user = userEvent.setup();

    renderWithProviders(<PlayedTitlesLibraryPage data={createData()} />);

    expect(screen.getByText("My library")).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: /search played titles/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Center Azul" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /play again/i })[0],
    ).toHaveAttribute("href", "/game/create/settings?titleId=title-1");
    expect(screen.getByText("18.5")).toBeInTheDocument();
    expect(screen.getByText("--")).toBeInTheDocument();
    expect(screen.getByText("AS")).toBeInTheDocument();
    expect(screen.getByText("J")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /open search/i }));
    await user.type(
      screen.getByRole("textbox", { name: /search played titles/i }),
      "sky",
    );

    expect(screen.queryByText("Azul")).not.toBeInTheDocument();
    expect(screen.getByText("Skyjo")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /center /i })).toHaveLength(1);
  });

  it("shows an empty state when there are no played titles", () => {
    renderWithProviders(
      <PlayedTitlesLibraryPage
        data={createData({
          gameTitles: [],
        })}
      />,
    );

    expect(
      screen.getByText("You haven't played any titled games yet."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /start a game/i }),
    ).toHaveAttribute("href", "/game/create/settings");
  });

  it("shows a no-results state when search removes all visible titles", async () => {
    const user = userEvent.setup();

    renderWithProviders(<PlayedTitlesLibraryPage data={createData()} />);

    await user.click(screen.getByRole("button", { name: /open search/i }));
    await user.type(
      screen.getByRole("textbox", { name: /search played titles/i }),
      "catan",
    );

    expect(
      screen.getByText("No played titles match this search yet."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /clear search/i }),
    ).toBeInTheDocument();
  });
});
