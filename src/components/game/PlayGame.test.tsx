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
  upsertActiveRoundScore: (...args: unknown[]) => upsertActiveRoundScore(...args),
}));

vi.mock("@/app/actions/user", () => ({
  updateOwnedGuestColor: (...args: unknown[]) => updateOwnedGuestColor(...args),
}));

function createUser(input: {
  id: string;
  firstName: string;
  color?: string;
}): UserBase {
  return {
    id: input.id,
    profileCardId: null,
    color: input.color ?? "#ffffff",
    role: "user",
    phoneNumber: null,
    firstName: input.firstName,
    lastName: null,
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
      expect(toastSuccess).toHaveBeenCalledWith("Score updated");
    });
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
      expect(toastSuccess).toHaveBeenCalledWith("Score updated");
    });
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
});
