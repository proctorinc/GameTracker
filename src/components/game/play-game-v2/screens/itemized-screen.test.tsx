import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../../tests/helpers/render";
import { buildLostCitiesGameSettingsTemplate } from "@/lib/game/lost-cities";
import { describe, expect, it, vi } from "vitest";
import { ItemizedPlayGameV2Screen } from "./itemized-screen";
import { LostCitiesPlayGameV2Screen } from "./lost-cities-screen";

const categories = [
  {
    id: "coins",
    name: "Coins",
    optional: false,
    sortOrder: 0,
    inputMode: "single" as const,
    inputs: [{ key: "count", label: "Coin count", defaultValue: 0 }],
    formula: "count * 2",
    helpText: "Two points per coin",
  },
  {
    id: "relics",
    name: "Relics",
    optional: true,
    sortOrder: 1,
    inputMode: "multi" as const,
    inputs: [
      { key: "base", label: "Base", defaultValue: 0 },
      { key: "bonus", label: "Bonus", defaultValue: 0 },
    ],
    formula: "base + bonus",
    helpText: null,
  },
];

function createProps(input?: {
  completed?: boolean;
  gameId?: string;
  roundBased?: boolean;
  selfScorer?: boolean;
}) {
  const roundBased = input?.roundBased ?? false;
  const saveEndGameItemizedScore = vi.fn();
  const saveRoundItemizedScore = vi.fn();
  const completeGame = vi.fn();
  const commitRound = vi.fn();
  const noop = vi.fn();
  const players = [
    {
      id: "player-1",
      userId: "user-1",
      score: roundBased ? 12 : 0,
      isManager: true,
      user: {
        id: "user-1",
        firstName: "Mia",
        lastName: null,
        color: "#7c3aed",
        avatarUrl: null,
        isGuest: false,
      },
    },
    {
      id: "player-2",
      userId: "user-2",
      score: 0,
      isManager: false,
      user: {
        id: "user-2",
        firstName: "Noah",
        lastName: null,
        color: "#0f766e",
        avatarUrl: null,
        isGuest: false,
      },
    },
  ];
  const game = {
    id: input?.gameId ?? "game-1",
    version: "v2",
    creatorId: "user-1",
    createdAt: "2026-07-14T00:00:00.000Z",
    completedAt: input?.completed ? "2026-07-14T01:00:00.000Z" : null,
    pausedAt: null,
    completedRounds: 0,
    inviteUsersEnabled: false,
    creator: players[0]!.user,
    gameTitle: {
      id: "title-1",
      title: "Any Itemized Game",
      normalizedTitle: "any itemized game",
      color: "#334155",
      imageUrl: null,
      imageVerticalFocus: 50,
      customPlayScreenEnabled: false,
    },
    players,
    rounds: roundBased
      ? [{ id: "round-1", roundNumber: 1, scores: [{ userId: "user-1", scoreDelta: 4 }] }]
      : [],
    itemizedScoreEntries: roundBased
      ? [
          {
            id: "entry-1",
            userId: "user-1",
            categoryId: "coins",
            gameRoundId: "round-1",
            valuesJson: JSON.stringify({ count: 2 }),
          },
        ]
      : [],
  };

  return {
    props: {
      actions: {
        addExistingPlayer: noop,
        approveJoinRequest: noop,
        commitRound,
        completeGame,
        declineJoinRequest: noop,
        pauseGame: noop,
        refresh: vi.fn(),
        removePlayer: noop,
        reopenGame: noop,
        resumeGame: noop,
        saveEndGameItemizedScore,
        saveRoundItemizedScore,
        setInviteUsersEnabled: noop,
        setPlayerRole: noop,
        submitScore: noop,
        uneliminatePlayer: noop,
      },
      config: {
        itemizedCategories: categories,
        settings: {
          scoringType: "points",
          winMetric: "highest_score",
          gameEndTrigger: "manual_finish",
          roundConfig: { enabled: roundBased, targetRounds: roundBased ? 3 : null },
          playerConfig: { minPlayers: 2, maxPlayers: null, allPlayersAreManagers: false },
        },
        variant: roundBased ? "incremental" : "end-game-tally",
      },
      pendingActionKeys: new Set<string>(),
      snapshot: {
        canManageLiveGame: !input?.selfScorer,
        canEditOwnScore: Boolean(input?.selfScorer),
        currentUserId: input?.selfScorer ? "user-2" : "user-1",
        game,
        gameSharePath: null,
        isCreator: !input?.selfScorer,
        isManager: false,
        effectiveRole: input?.selfScorer ? "self_scorer" : "creator",
        pendingJoinRequests: [],
        playerOptions: [],
        playerRankDeltas: [],
      },
      viewModel: {
        activeRoundNumber: 1,
        isCompleted: Boolean(input?.completed),
        isPaused: false,
      },
    } as never,
    commitRound,
    completeGame,
    saveEndGameItemizedScore,
    saveRoundItemizedScore,
  };
}

describe("ItemizedPlayGameV2Screen", () => {
  it("lets self scorers edit only their own itemized entries", async () => {
    const user = userEvent.setup();
    const { props, saveEndGameItemizedScore } = createProps({ selfScorer: true });
    renderWithProviders(<ItemizedPlayGameV2Screen {...props} />);

    await user.click(screen.getByTestId("itemized-category-user-1-coins"));
    expect(
      screen.getByRole("button", { name: "Increase value by 1" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Close" }));

    await user.click(screen.getByTestId("itemized-category-user-2-coins"));
    await user.click(screen.getByRole("button", { name: "Increase value by 1" }));
    await user.click(screen.getByRole("button", { name: "Done" }));

    await waitFor(() =>
      expect(saveEndGameItemizedScore).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-2" }),
      ),
    );
  });

  it("shows configured names in player tiles and saves a formula total on Done", async () => {
    const user = userEvent.setup();
    const { props, saveEndGameItemizedScore } = createProps();
    renderWithProviders(<ItemizedPlayGameV2Screen {...props} />);

    expect(screen.getByTestId("itemized-player-list").tagName).toBe("DIV");
    expect(screen.getByTestId("itemized-player-list")).not.toHaveAttribute(
      "data-slot",
      "card",
    );
    expect(screen.getAllByText("Coins")).toHaveLength(2);
    expect(screen.getByTestId("itemized-player-total-user-1")).toHaveTextContent("0");
    const playerSurface = screen
      .getByTestId("itemized-category-user-1-coins")
      .closest("section");
    expect(playerSurface).toHaveClass("bg-card", "text-card-foreground");
    expect(playerSurface).not.toHaveStyle({ color: "var(--profile-surface-text)" });

    await user.click(screen.getByTestId("itemized-category-user-1-coins"));
    await user.click(screen.getByRole("button", { name: "Increase value by 1" }));
    expect(screen.getByTestId("itemized-editor-total")).toHaveTextContent("2");
    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(screen.getByTestId("itemized-player-total-user-1")).toHaveTextContent("2");
    expect(saveEndGameItemizedScore).toHaveBeenCalledTimes(1);
    expect(saveEndGameItemizedScore).toHaveBeenCalledWith({
      userId: "user-1",
      entries: expect.arrayContaining([
        { userId: "user-1", categoryId: "coins", values: { count: 1 } },
      ]),
    });
  });

  it("discards itemized drafts when the keyed game ID changes", async () => {
    const user = userEvent.setup();
    const firstGame = createProps({ gameId: "game-1" });
    const secondGame = createProps({ gameId: "game-2" });
    const { rerender } = renderWithProviders(
      <ItemizedPlayGameV2Screen
        key={firstGame.props.snapshot.game.id}
        {...firstGame.props}
      />,
    );

    await user.click(screen.getByTestId("itemized-category-user-1-coins"));
    await user.click(screen.getByRole("button", { name: "Increase value by 1" }));
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByTestId("itemized-player-total-user-1")).toHaveTextContent("2");

    rerender(
      <ItemizedPlayGameV2Screen
        key={secondGame.props.snapshot.game.id}
        {...secondGame.props}
      />,
    );

    expect(screen.getByTestId("itemized-player-total-user-1")).toHaveTextContent("0");
  });

  it("supports optional multi-input categories and saves round-scoped totals", async () => {
    const user = userEvent.setup();
    const { props, saveRoundItemizedScore } = createProps({ roundBased: true });
    renderWithProviders(<ItemizedPlayGameV2Screen {...props} />);

    expect(screen.getByTestId("itemized-player-total-user-1")).toHaveTextContent("12");
    await user.click(screen.getByTestId("itemized-category-user-1-relics"));
    await user.click(screen.getByRole("button", { name: "Include" }));
    fireEvent.change(screen.getByTestId("itemized-input-relics-base"), { target: { value: "5" } });
    fireEvent.change(screen.getByTestId("itemized-input-relics-bonus"), { target: { value: "3" } });
    expect(screen.getByTestId("itemized-editor-total")).toHaveTextContent("8");
    await user.click(screen.getByRole("button", { name: "Done" }));

    await waitFor(() => expect(saveRoundItemizedScore).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("itemized-player-total-user-1")).toHaveTextContent("20");
  });

  it("keeps completed games inspectable but read-only", async () => {
    const user = userEvent.setup();
    const { props, saveEndGameItemizedScore } = createProps({ completed: true });
    renderWithProviders(<ItemizedPlayGameV2Screen {...props} />);

    await user.click(screen.getByTestId("itemized-category-user-1-coins"));
    expect(screen.getByRole("button", { name: "Increase value by 1" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(saveEndGameItemizedScore).not.toHaveBeenCalled();
  });

  it("reviews final itemized scores before ending a roundless game", async () => {
    const user = userEvent.setup();
    const { props, completeGame } = createProps();
    renderWithProviders(<ItemizedPlayGameV2Screen {...props} />);

    await user.click(screen.getByRole("button", { name: "Score" }));

    expect(completeGame).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "End game" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("play-game-outcome-summary")).toHaveTextContent(
      "Coins",
    );
    expect(
      screen.getByTestId("outcome-summary-player-user-1"),
    ).toHaveTextContent("Final total");

    await user.click(screen.getByRole("button", { name: "End game" }));
    expect(completeGame).toHaveBeenCalledWith({
      itemizedScoreEntries: expect.arrayContaining([
        expect.objectContaining({ categoryId: "coins", userId: "user-1" }),
      ]),
    });
  });

  it("routes the game-options end action through the same review", async () => {
    const user = userEvent.setup();
    const { props, completeGame } = createProps();
    renderWithProviders(<ItemizedPlayGameV2Screen {...props} />);

    await user.click(screen.getByRole("button", { name: "Game options" }));
    await user.click(screen.getByRole("button", { name: "End game" }));

    expect(completeGame).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "End game" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Keep playing" }));
    expect(completeGame).not.toHaveBeenCalled();
  });

  it("reviews a round summary before committing the next round", async () => {
    const user = userEvent.setup();
    const { props, commitRound } = createProps({ roundBased: true });
    renderWithProviders(<ItemizedPlayGameV2Screen {...props} />);

    await user.click(screen.getByRole("button", { name: "Next round" }));

    expect(commitRound).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "Round 1 summary" }),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("outcome-summary-player-user-1"),
    ).toHaveTextContent("Round score");

    await user.click(
      screen.getByRole("button", { name: "Start next round" }),
    );
    expect(commitRound).toHaveBeenCalledWith({ completeGame: false });
  });

  it("shows the standard round toolbar on the Lost Cities screen", async () => {
    const user = userEvent.setup();
    const { props, commitRound } = createProps({ roundBased: true });
    const lostCities = buildLostCitiesGameSettingsTemplate();
    const compatibleProps = props as unknown as {
      config: { itemizedCategories: typeof lostCities.itemizedCategories };
      snapshot: {
        game: { gameTitle: { title: string; normalizedTitle: string } };
      };
    };
    compatibleProps.config.itemizedCategories = lostCities.itemizedCategories;
    compatibleProps.snapshot.game.gameTitle.title = "Lost Cities";
    compatibleProps.snapshot.game.gameTitle.normalizedTitle = "lost cities";

    renderWithProviders(
      <LostCitiesPlayGameV2Screen {...(compatibleProps as never)} />,
    );

    expect(screen.getByRole("button", { name: "Scores" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Round" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Round" }));
    expect(commitRound).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "Round 1 summary" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Start next round" }),
    );
    expect(commitRound).toHaveBeenCalledWith({ completeGame: false });

    await user.click(screen.getByRole("button", { name: "Scores" }));
    expect(
      screen.getByRole("heading", { name: "Round scores" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Round 1")).toBeInTheDocument();
  });

  it("renders the Lost Cities expedition UI instead of generic item tiles", async () => {
    const user = userEvent.setup();
    const { props } = createProps();
    const lostCities = buildLostCitiesGameSettingsTemplate();
    lostCities.itemizedCategories[0]!.name = "Ocean Route";
    lostCities.itemizedCategories[0]!.inputs.find(
      (input) => input.key === "wagers",
    )!.label = "Investment cards";
    lostCities.itemizedCategories[0]!.inputs.find(
      (input) => input.key === "card_sum",
    )!.label = "Numbered cards";
    lostCities.itemizedCategories[0]!.helpText = "Configured scoring help";
    lostCities.itemizedCategories[0]!.formula = "card_sum * (wagers + 1)";
    const compatibleProps = props as unknown as {
      config: { itemizedCategories: typeof lostCities.itemizedCategories };
      snapshot: {
        game: { gameTitle: { title: string; normalizedTitle: string } };
      };
    };
    compatibleProps.config.itemizedCategories = lostCities.itemizedCategories;
    compatibleProps.snapshot.game.gameTitle.title = "Lost Cities";
    compatibleProps.snapshot.game.gameTitle.normalizedTitle = "lost cities";

    renderWithProviders(
      <LostCitiesPlayGameV2Screen {...(compatibleProps as never)} />,
    );

    expect(screen.getByTestId("lost-cities-play-game")).toBeInTheDocument();
    expect(screen.getByTestId("lost-cities-player-list").tagName).toBe("DIV");
    expect(screen.getAllByText("Ocean Route")).toHaveLength(2);
    expect(screen.queryByText("Yellow Expedition")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("lost-cities-expedition-user-1-yellow_expedition"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("itemized-category-user-1-yellow_expedition"),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByTestId("lost-cities-expedition-user-1-yellow_expedition"),
    );
    expect(
      screen.getByTestId("lost-cities-expedition-user-1-yellow_expedition"),
    ).toHaveStyle({ color: "var(--profile-surface-text)" });
    expect(screen.getByText("Investment cards")).toBeInTheDocument();
    expect(screen.getByText("Numbered cards")).toBeInTheDocument();
    expect(screen.getByText("Configured scoring help")).toBeInTheDocument();
    await user.click(screen.getByTestId("lost-cities-wager-1"));
    await user.click(screen.getByTestId("lost-cities-card-10"));
    expect(screen.getByTestId("lost-cities-editor-total")).toHaveTextContent(
      "20",
    );
  });
});
