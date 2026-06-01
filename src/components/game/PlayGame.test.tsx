import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameForPlayPage } from "@/lib/db/store/game.store";
import type { UserBase } from "@/lib/db/store/user.store";
import { renderWithProviders } from "../../../tests/helpers/render";
import PlayGame from "./PlayGame";

const routerPush = vi.fn();
const toastLoading = vi.fn(() => "toast-loading");
const toastDismiss = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

const addGamePlayer = vi.fn();
const addGuestGamePlayer = vi.fn();
const commitGameRound = vi.fn();
const getPlayGameSnapshot = vi.fn();
const removeGamePlayer = vi.fn();
const upsertActiveRoundScore = vi.fn();
const updateOwnedGuestColor = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    loading: (...args: unknown[]) => toastLoading(...args),
    dismiss: (...args: unknown[]) => toastDismiss(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock("@/app/actions/game", () => ({
  addGamePlayer: (...args: unknown[]) => addGamePlayer(...args),
  addGuestGamePlayer: (...args: unknown[]) => addGuestGamePlayer(...args),
  commitGameRound: (...args: unknown[]) => commitGameRound(...args),
  getPlayGameSnapshot: (...args: unknown[]) => getPlayGameSnapshot(...args),
  removeGamePlayer: (...args: unknown[]) => removeGamePlayer(...args),
  upsertActiveRoundScore: (...args: unknown[]) => upsertActiveRoundScore(...args),
}));

vi.mock("@/app/actions/user", () => ({
  updateOwnedGuestColor: (...args: unknown[]) => updateOwnedGuestColor(...args),
}));

function createUser(input: {
  id: string;
  firstName: string;
  lastName?: string;
  color?: string;
}): UserBase {
  return {
    id: input.id,
    profileCardId: null,
    color: input.color ?? "#ffffff",
    role: "user",
    phoneNumber: null,
    firstName: input.firstName,
    lastName: input.lastName ?? null,
    phone_verified_at: null,
    created_by_user_id: null,
    mergedIntoUserId: null,
    mergedAt: null,
    isProfileComplete: true,
    isGuest: false,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  };
}

function createGameSnapshot(score = 0): GameForPlayPage {
  const creator = createUser({ id: "user-1", firstName: "Mia", color: "#aaaaaa" });
  const opponent = createUser({ id: "user-2", firstName: "Kai", color: "#bbbbbb" });

  return {
    id: "game-1",
    gameTitleId: "title-1",
    version: "v1",
    creatorId: creator.id,
    scoringMode: "lowest_wins",
    endingMode: "none",
    trackRounds: false,
    targetRounds: null,
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
        score: 0,
        user: creator,
      },
      {
        id: "game-player-2",
        gameId: "game-1",
        userId: opponent.id,
        score,
        user: opponent,
      },
    ],
    rounds: [],
  };
}

function createCompletedGameSnapshot(): GameForPlayPage {
  const game = createGameSnapshot(18);

  return {
    ...game,
    endingMode: "round_count",
    targetRounds: 4,
    completedRounds: 4,
    completedAt: "2025-01-05T00:00:00.000Z",
    winners: [
      {
        id: "winner-1",
        gameId: game.id,
        userId: "user-1",
        user: game.players[0]!.user,
      },
    ],
    players: [
      {
        ...game.players[0]!,
        score: 12,
      },
      {
        ...game.players[1]!,
        score: 18,
      },
    ],
  };
}

function createCompletedAfterTwoRoundsSnapshot(): GameForPlayPage {
  return {
    ...createCompletedGameSnapshot(),
    completedRounds: 2,
    targetRounds: 2,
  };
}

function createRoundTrackedGameSnapshot(): GameForPlayPage {
  return {
    ...createGameSnapshot(),
    endingMode: "round_count",
    trackRounds: true,
    targetRounds: 5,
  };
}

function createNoScoreGameSnapshot(): GameForPlayPage {
  return {
    ...createGameSnapshot(),
    scoringMode: "no_score",
    endingMode: "round_count",
    trackRounds: true,
    targetRounds: 3,
  };
}

function createFreePlayWithRoundsSnapshot(): GameForPlayPage {
  return {
    ...createGameSnapshot(),
    endingMode: "none",
    trackRounds: true,
    completedRounds: 1,
  };
}

function createNoScoreFinalPromptSnapshot(): GameForPlayPage {
  return {
    ...createNoScoreGameSnapshot(),
    completedRounds: 2,
  };
}

function renderComponent(input?: {
  isCreator?: boolean;
  game?: GameForPlayPage;
  playerOptions?: UserBase[];
}) {
  const game = input?.game ?? createGameSnapshot();
  const creator = game.creator;
  const opponent = game.players[1]!.user;

  return renderWithProviders(
    <PlayGame
      currentUserId={creator.id}
      game={game}
      isCreator={input?.isCreator ?? true}
      playerOptions={input?.playerOptions ?? [creator, opponent]}
    />,
  );
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

describe("PlayGame", () => {
  beforeEach(() => {
    routerPush.mockReset();
    toastLoading.mockReset();
    toastDismiss.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    addGamePlayer.mockReset();
    addGuestGamePlayer.mockReset();
    commitGameRound.mockReset();
    getPlayGameSnapshot.mockReset();
    removeGamePlayer.mockReset();
    upsertActiveRoundScore.mockReset();
    updateOwnedGuestColor.mockReset();
    vi.useRealTimers();
  });

  it("updates the board score immediately before the server action resolves", async () => {
    const deferred = createDeferred<void>();
    upsertActiveRoundScore.mockReturnValue(deferred.promise);

    renderComponent();

    fireEvent.click(screen.getByTestId("player-score-button-user-2"));
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    expect(screen.getByTestId("player-score-button-user-2")).toHaveTextContent("5");

    getPlayGameSnapshot.mockResolvedValue({
      currentUserId: "user-1",
      isCreator: true,
      playerOptions: [
        createUser({ id: "user-1", firstName: "Mia", color: "#aaaaaa" }),
        createUser({ id: "user-2", firstName: "Kai", color: "#bbbbbb" }),
      ],
      game: createGameSnapshot(5),
    });
    deferred.resolve();

    await waitFor(() => {
      expect(upsertActiveRoundScore).toHaveBeenCalledWith({
        gameId: "game-1",
        userId: "user-2",
        scoreDelta: 5,
      });
    });
    expect(toastLoading).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastDismiss).not.toHaveBeenCalled();
  });

  it("closes the score dialog as soon as the optimistic update is queued", () => {
    const deferred = createDeferred<void>();
    upsertActiveRoundScore.mockReturnValue(deferred.promise);

    renderComponent();

    fireEvent.click(screen.getByTestId("player-score-button-user-2"));
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.getByTestId("player-score-button-user-2")).toHaveTextContent("5");
  });

  it("opens scoring when the player card is clicked", () => {
    renderComponent();

    fireEvent.click(screen.getByTestId("player-card-content-user-2"));

    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
  });

  it("keeps avatar clicks on color editing when the profile picture is editable", () => {
    renderComponent();

    fireEvent.click(screen.getByTestId("player-color-button-user-1"));

    expect(
      screen.getByRole("heading", { name: "Edit Mia" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  it("does not wait for reconciliation before finishing a successful mutation", async () => {
    const reconcileDeferred = createDeferred<{
      currentUserId: string;
      isCreator: boolean;
      playerOptions: UserBase[];
      game: GameForPlayPage;
    }>();

    upsertActiveRoundScore.mockResolvedValue(undefined);
    getPlayGameSnapshot.mockReturnValue(reconcileDeferred.promise);

    renderComponent();

    fireEvent.click(screen.getByTestId("player-score-button-user-2"));
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(upsertActiveRoundScore).toHaveBeenCalled();
    });
    expect(toastLoading).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastDismiss).not.toHaveBeenCalled();
  });

  it("rolls back optimistic scores if the server action fails", async () => {
    const deferred = createDeferred<void>();
    upsertActiveRoundScore.mockReturnValue(deferred.promise);

    renderComponent();

    fireEvent.click(screen.getByTestId("player-score-button-user-2"));
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    expect(screen.getByTestId("player-score-button-user-2")).toHaveTextContent("5");

    deferred.reject(new Error("Score save failed"));

    await waitFor(() => {
      expect(screen.getByTestId("player-score-button-user-2")).toHaveTextContent("0");
    });
    expect(toastError).toHaveBeenCalledWith("Score save failed");
  });

  it("replaces a visible zero when typing a new score after clearing the field", () => {
    renderComponent();

    fireEvent.click(screen.getByTestId("player-score-button-user-2"));

    const input = screen.getByRole("spinbutton") as HTMLInputElement;

    fireEvent.change(input, {
      target: { value: "" },
    });
    expect(input.value).toBe("");

    fireEvent.change(input, {
      target: { value: "05" },
    });
    expect(input.value).toBe("5");
  });

  it("reconciles on focus without a full page refresh", async () => {
    getPlayGameSnapshot.mockResolvedValue({
      currentUserId: "user-1",
      isCreator: false,
      playerOptions: [
        createUser({ id: "user-1", firstName: "Mia", color: "#aaaaaa" }),
        createUser({ id: "user-2", firstName: "Kai", color: "#bbbbbb" }),
      ],
      game: createGameSnapshot(7),
    });

    renderComponent({
      isCreator: false,
    });

    expect(screen.getByTestId("player-score-display-user-2")).toHaveTextContent("0");

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("player-score-display-user-2")).toHaveTextContent("7");
    });
  });

  it("shows a finalized leaderboard instead of score actions when the game is complete", () => {
    renderComponent({
      game: createCompletedGameSnapshot(),
    });

    expect(screen.getByText("Mia won!")).toBeInTheDocument();
    expect(screen.getByText("1st place")).toBeInTheDocument();
    expect(screen.getByText("2nd place")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Score" })).toBeInTheDocument();
    expect(screen.queryByTestId("player-score-button-user-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("player-score-button-user-2")).not.toBeInTheDocument();
  });

  it("formats player names with a last initial on the play page", () => {
    const creator = createUser({
      id: "user-1",
      firstName: "Stephanie",
      lastName: "Baxter",
      color: "#aaaaaa",
    });
    const opponent = createUser({
      id: "user-2",
      firstName: "Jordan",
      lastName: "Cole",
      color: "#bbbbbb",
    });

    renderComponent({
      game: {
        ...createGameSnapshot(),
        creator,
        players: [
          {
            id: "game-player-1",
            gameId: "game-1",
            userId: creator.id,
            score: 0,
            user: creator,
          },
          {
            id: "game-player-2",
            gameId: "game-1",
            userId: opponent.id,
            score: 0,
            user: opponent,
          },
        ],
      },
      playerOptions: [creator, opponent],
    });

    expect(screen.getByText("Stephanie B.")).toBeInTheDocument();
    expect(screen.getByText("Jordan C.")).toBeInTheDocument();
    expect(screen.queryByText("Stephanie Baxter")).not.toBeInTheDocument();
    expect(screen.queryByText("Jordan Cole")).not.toBeInTheDocument();
  });

  it("shows the completed round number in the header after the game ends", () => {
    renderComponent({
      game: createCompletedAfterTwoRoundsSnapshot(),
    });

    expect(screen.getByText("Round 2")).toBeInTheDocument();
    expect(screen.queryByText("Round 3")).not.toBeInTheDocument();
  });

  it("lets participants open score breakdown after the game is complete", () => {
    renderComponent({
      game: createCompletedGameSnapshot(),
      isCreator: false,
    });

    fireEvent.click(screen.getByRole("button", { name: "Score" }));

    expect(screen.getByRole("heading", { name: "Score breakdown" })).toBeInTheDocument();
  });

  it("shows an empty state in the score breakdown modal before any rounds are recorded", () => {
    renderComponent({
      game: createRoundTrackedGameSnapshot(),
    });

    fireEvent.click(screen.getByRole("button", { name: "Score" }));

    expect(
      screen.getByText("Nothing here yet. Scores will show up after the first round."),
    ).toBeInTheDocument();
  });

  it("shows round UI for free play when rounds are enabled", () => {
    renderComponent({
      game: createFreePlayWithRoundsSnapshot(),
    });

    expect(screen.getByText("Round 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Round" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Score" })).toBeInTheDocument();
  });

  it("hides score controls entirely for no-score games", () => {
    renderComponent({
      game: createNoScoreGameSnapshot(),
      isCreator: false,
    });

    expect(screen.getByText("No score")).toBeInTheDocument();
    expect(screen.queryByTestId("player-score-display-user-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("player-score-display-user-2")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Score" })).not.toBeInTheDocument();
  });

  it("lets the creator choose winners manually for no-score games", async () => {
    commitGameRound.mockResolvedValue(undefined);

    renderComponent({
      game: createNoScoreFinalPromptSnapshot(),
    });

    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    fireEvent.click(screen.getByRole("button", { name: /Kai/i }));
    fireEvent.click(screen.getByRole("button", { name: "End game" }));

    await waitFor(() => {
      expect(commitGameRound).toHaveBeenCalledWith({
        gameId: "game-1",
        completeGame: true,
        winnerUserIds: ["user-2"],
      });
    });
  });

  it("opens a manage users dialog with the current players listed", () => {
    renderComponent();

    fireEvent.click(screen.getByRole("button", { name: "Users" }));

    expect(screen.getByRole("heading", { name: "Manage users" })).toBeInTheDocument();
    expect(screen.getByTestId("remove-player-button-user-2")).toBeInTheDocument();
    expect(screen.queryByTestId("remove-player-button-user-1")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add user" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to game" })).toBeInTheDocument();
  });

  it("shows add user UI only after tapping add user", () => {
    renderComponent();

    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    fireEvent.click(screen.getByRole("button", { name: "Add user" }));

    expect(screen.getByRole("heading", { name: "Add user" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to users" })).toBeInTheDocument();
    expect(screen.queryByTestId("remove-player-button-user-2")).not.toBeInTheDocument();
  });

  it("removes a player optimistically after confirmation", async () => {
    const deferred = createDeferred<void>();
    removeGamePlayer.mockReturnValue(deferred.promise);

    renderComponent();

    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    fireEvent.click(screen.getByTestId("remove-player-button-user-2"));

    expect(screen.getByRole("heading", { name: "Remove this user?" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove user" }));

    expect(screen.queryByTestId("player-card-user-2")).not.toBeInTheDocument();

    deferred.resolve();

    await waitFor(() => {
      expect(removeGamePlayer).toHaveBeenCalledWith({
        gameId: "game-1",
        userId: "user-2",
      });
    });
  });

  it("rolls back an optimistic removal if the server action fails", async () => {
    const deferred = createDeferred<void>();
    removeGamePlayer.mockReturnValue(deferred.promise);

    renderComponent();

    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    fireEvent.click(screen.getByTestId("remove-player-button-user-2"));
    fireEvent.click(screen.getByRole("button", { name: "Remove user" }));

    expect(screen.queryByTestId("player-card-user-2")).not.toBeInTheDocument();

    deferred.reject(new Error("Remove failed"));

    await waitFor(() => {
      expect(screen.getByTestId("player-card-user-2")).toBeInTheDocument();
    });
    expect(toastError).toHaveBeenCalledWith("Remove failed");
  });

  it("returns to the player list after adding a user", async () => {
    const deferred = createDeferred<void>();
    addGamePlayer.mockReturnValue(deferred.promise);

    const friend = createUser({
      id: "user-3",
      firstName: "June",
      color: "#cccccc",
    });

    renderComponent({
      playerOptions: [createUser({ id: "user-1", firstName: "Mia" }), createUser({ id: "user-2", firstName: "Kai" }), friend],
    });

    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    fireEvent.click(screen.getByRole("button", { name: "Add user" }));
    fireEvent.click(screen.getByText("June"));

    expect(screen.getByRole("heading", { name: "Manage users" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to game" })).toBeInTheDocument();

    deferred.resolve();

    await waitFor(() => {
      expect(addGamePlayer).toHaveBeenCalledWith({
        gameId: "game-1",
        userId: "user-3",
      });
    });
  });
});
