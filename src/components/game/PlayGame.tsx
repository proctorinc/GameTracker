"use client";

import {
  addGamePlayer,
  addGuestGamePlayer,
  commitGameRound,
  getPlayGameSnapshot,
  upsertActiveRoundScore,
} from "@/app/actions/game";
import { updateOwnedGuestColor } from "@/app/actions/user";
import { getProfileColorSurfaceStyles } from "@/components/profile/profile-color-styles";
import { ProfileColorSelector } from "@/components/profile/profile-color-selector";
import ProfilePicture from "@/components/profile/profile-picture";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { GameForPlayPage } from "@/lib/db/store/game.store";
import type { UserBase } from "@/lib/db/store/user.store";
import {
  hasGameMetScoreThreshold,
  getWinningUserIds,
  willGameOfferRoundPrompt,
} from "@/lib/game/v1";
import {
  applyPlayGameMutation,
  applyPlayGameMutations,
  type PlayGameMutation,
  type PlayGameSnapshot,
} from "@/components/game/play-game-state";
import {
  Crown,
  Gamepad2,
  House,
  ListChecks,
  LoaderCircle,
  Plus,
  Redo,
  Redo2,
  Trophy,
  Undo2,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Fragment,
  type FormEvent,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";

type PlayGameProps = {
  currentUserId: string;
  isCreator: boolean;
  playerOptions: UserBase[];
  game: GameForPlayPage;
};

type PendingMutationEntry = {
  id: string;
  key: string;
  mutation: PlayGameMutation;
};

function getDisplayName(
  user: Pick<UserBase, "firstName" | "lastName" | "isGuest">,
) {
  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fullName) {
    return fullName;
  }

  return user.isGuest ? "Guest player" : "Unnamed player";
}

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

function formatEndingSummary(game: GameForPlayPage) {
  switch (game.endingMode) {
    case "round_count":
      return `${game.targetRounds ?? 1} round${game.targetRounds === 1 ? "" : "s"}`;
    case "score_threshold":
      if (game.scoreThreshold === null) {
        return "Score threshold";
      }

      return game.scoreThresholdDirection === "at_most"
        ? `End when a score is at most ${game.scoreThreshold}`
        : `End when a score is at least ${game.scoreThreshold}`;
    default:
      return "No rounds, free play";
  }
}

function formatScoringSummary(game: GameForPlayPage) {
  return game.scoringMode === "highest_wins"
    ? "Highest score wins"
    : "Lowest score wins";
}

function formatWinners(game: GameForPlayPage) {
  const names = game.winners.map((winner) => getDisplayName(winner.user));

  if (names.length === 0) {
    return "Game complete";
  }

  if (names.length === 1) {
    return `${names[0]} won!`;
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]} tied!`;
  }

  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)} tied!`;
}

function getPlayerTotalScore(player: { score: number | null | undefined }) {
  return player.score ?? 0;
}

function getPlayerInitial(user: Pick<UserBase, "firstName" | "lastName">) {
  const first = user.firstName?.trim().charAt(0) ?? "";
  const last = user.lastName?.trim().charAt(0) ?? "";
  return (first + last || first || last || "?").toUpperCase();
}

function buildInitialSnapshot(props: PlayGameProps): PlayGameSnapshot {
  return {
    currentUserId: props.currentUserId,
    isCreator: props.isCreator,
    playerOptions: props.playerOptions,
    game: props.game,
  };
}

function createTemporaryGuestUser(input: {
  currentUserId: string;
  firstName: string;
  lastName?: string;
}) {
  const timestamp = nowIso();

  return {
    id: `optimistic-guest-${timestamp}`,
    profileCardId: null,
    color: "#FFFFFF",
    role: "user" as const,
    phoneNumber: null,
    firstName: input.firstName,
    lastName: input.lastName ?? null,
    phone_verified_at: null,
    created_by_user_id: input.currentUserId,
    mergedIntoUserId: null,
    mergedAt: null,
    isProfileComplete: true,
    isGuest: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  } satisfies UserBase;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeScoreAmountInput(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  if (trimmedValue === "-") {
    return "-";
  }

  if (/^-?0\d+/.test(trimmedValue)) {
    return trimmedValue.replace(/^(-?)0+(\d)/, "$1$2");
  }

  return trimmedValue;
}

function parseScoreAmountInput(value: string) {
  if (!value.trim() || value.trim() === "-") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export default function PlayGame(props: PlayGameProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [scoreDialogPlayerId, setScoreDialogPlayerId] = useState<string | null>(
    null,
  );
  const [scoreAmountInput, setScoreAmountInput] = useState("0");
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [isRoundDialogOpen, setIsRoundDialogOpen] = useState(false);
  const [isRoundHistoryOpen, setIsRoundHistoryOpen] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [colorDialogPlayerId, setColorDialogPlayerId] = useState<string | null>(
    null,
  );
  const [selectedGuestColor, setSelectedGuestColor] = useState<string | null>(
    null,
  );
  const [playerSearch, setPlayerSearch] = useState("");
  const [baseSnapshot, setBaseSnapshot] = useState<PlayGameSnapshot>(() =>
    buildInitialSnapshot(props),
  );
  const [pendingMutations, setPendingMutations] = useState<
    PendingMutationEntry[]
  >([]);
  const deferredPlayerSearch = useDeferredValue(playerSearch);

  const projectedSnapshot = useMemo(
    () =>
      applyPlayGameMutations(
        baseSnapshot,
        pendingMutations.map((entry) => entry.mutation),
      ),
    [baseSnapshot, pendingMutations],
  );
  const [optimisticSnapshot, applyOptimisticSnapshot] = useOptimistic(
    projectedSnapshot,
    (_current, nextSnapshot: PlayGameSnapshot) => nextSnapshot,
  );
  const baseSnapshotRef = useRef(baseSnapshot);
  const pendingMutationsRef = useRef(pendingMutations);
  const reconcileInFlightRef = useRef(false);

  useEffect(() => {
    baseSnapshotRef.current = baseSnapshot;
  }, [baseSnapshot]);

  useEffect(() => {
    pendingMutationsRef.current = pendingMutations;
  }, [pendingMutations]);

  const snapshot = optimisticSnapshot;
  const game = snapshot.game;
  const currentUserId = snapshot.currentUserId;
  const isCreator = snapshot.isCreator;
  const isCompleted = Boolean(game.completedAt);
  const pendingKeySet = useMemo(
    () => new Set(pendingMutations.map((entry) => entry.key)),
    [pendingMutations],
  );

  const currentPlayerIds = useMemo(
    () => new Set(game.players.map((player) => player.userId)),
    [game.players],
  );
  const winnerIds = useMemo(
    () => new Set(game.winners.map((winner) => winner.userId)),
    [game.winners],
  );
  const isFreePlay = game.endingMode === "none";
  const nextRoundNumber = game.completedRounds + 1;
  const activeRound = useMemo(
    () =>
      game.completedAt
        ? null
        : (game.rounds.find((round) => round.roundNumber === nextRoundNumber) ??
          null),
    [game.completedAt, game.rounds, nextRoundNumber],
  );
  const activeRoundScoreByUserId = useMemo(
    () =>
      new Map(
        (activeRound?.scores ?? []).map((score) => [
          score.userId,
          score.scoreDelta,
        ]),
      ),
    [activeRound],
  );
  const availablePlayers = useMemo(
    () =>
      snapshot.playerOptions.filter(
        (player) =>
          player.id !== currentUserId && !currentPlayerIds.has(player.id),
      ),
    [currentPlayerIds, currentUserId, snapshot.playerOptions],
  );
  const filteredPlayers = useMemo(() => {
    const query = normalizeValue(deferredPlayerSearch);

    return availablePlayers.filter((player) => {
      const haystack = normalizeValue(
        [player.firstName, player.lastName, player.phoneNumber]
          .filter(Boolean)
          .join(" "),
      );

      return haystack.includes(query);
    });
  }, [availablePlayers, deferredPlayerSearch]);
  const sortedPlayers = useMemo(() => {
    const players = [...game.players];

    players.sort((left, right) =>
      game.scoringMode === "highest_wins"
        ? getPlayerTotalScore(right) - getPlayerTotalScore(left)
        : getPlayerTotalScore(left) - getPlayerTotalScore(right),
    );

    return players;
  }, [game.players, game.scoringMode]);
  const sortedRounds = useMemo(() => {
    const gameRounds = (game.rounds ?? []).filter(
      (round) => round.roundNumber <= game.completedRounds,
    );
    const rounds = [...gameRounds];

    rounds.sort((left, right) => right.roundNumber - left.roundNumber);

    return rounds;
  }, [game.completedRounds, game.rounds]);
  const scorecardRounds = useMemo(
    () => [...sortedRounds].reverse(),
    [sortedRounds],
  );
  const scoreDialogPlayer = useMemo(
    () =>
      game.players.find((player) => player.userId === scoreDialogPlayerId) ??
      null,
    [game.players, scoreDialogPlayerId],
  );
  const colorDialogPlayer = useMemo(
    () =>
      game.players.find((player) => player.userId === colorDialogPlayerId) ??
      null,
    [colorDialogPlayerId, game.players],
  );
  const scorecardPlayers = useMemo(() => [...sortedPlayers], [sortedPlayers]);
  const shouldOfferRoundPrompt = useMemo(
    () => willGameOfferRoundPrompt(game),
    [game],
  );
  const hasThresholdMet = useMemo(() => hasGameMetScoreThreshold(game), [game]);
  const roundSummaryScores = useMemo(
    () =>
      game.players.map((player) => ({
        userId: player.userId,
        scoreDelta: activeRoundScoreByUserId.get(player.userId) ?? 0,
        player,
      })),
    [activeRoundScoreByUserId, game.players],
  );
  const projectedWinnerIds = useMemo(
    () =>
      new Set(
        getWinningUserIds({
          players: game.players.map((player) => ({
            userId: player.userId,
            score: getPlayerTotalScore(player),
          })),
          scoringMode: game.scoringMode,
        }),
      ),
    [game.players, game.scoringMode],
  );
  const projectedWinnersLabel = useMemo(() => {
    const winnerNames = sortedPlayers
      .filter((player) => projectedWinnerIds.has(player.userId))
      .map((player) => getDisplayName(player.user));

    if (winnerNames.length === 0) {
      return "No leader yet";
    }

    if (winnerNames.length === 1) {
      return `${winnerNames[0]} would win right now`;
    }

    if (winnerNames.length === 2) {
      return `${winnerNames[0]} and ${winnerNames[1]} are tied for the lead`;
    }

    return `${winnerNames.slice(0, -1).join(", ")}, and ${winnerNames.at(-1)} are tied for the lead`;
  }, [projectedWinnerIds, sortedPlayers]);

  function previewSnapshot(
    nextBaseSnapshot: PlayGameSnapshot,
    nextPendingMutations: PendingMutationEntry[],
  ) {
    const nextSnapshot = applyPlayGameMutations(
      nextBaseSnapshot,
      nextPendingMutations.map((entry) => entry.mutation),
    );

    applyOptimisticSnapshot(nextSnapshot);
    return nextSnapshot;
  }

  function setLocalState(
    nextBaseSnapshot: PlayGameSnapshot,
    nextPendingMutations: PendingMutationEntry[],
  ) {
    baseSnapshotRef.current = nextBaseSnapshot;
    pendingMutationsRef.current = nextPendingMutations;

    const update = () => {
      setBaseSnapshot(nextBaseSnapshot);
      setPendingMutations(nextPendingMutations);
      previewSnapshot(nextBaseSnapshot, nextPendingMutations);
    };

    startTransition(update);
  }

  const reconcileSnapshot = useEffectEvent(async () => {
    if (reconcileInFlightRef.current) {
      return;
    }

    reconcileInFlightRef.current = true;

    try {
      const freshSnapshot = await getPlayGameSnapshot(
        baseSnapshotRef.current.game.id,
      );
      const currentPendingMutations = pendingMutationsRef.current;

      setLocalState(freshSnapshot, currentPendingMutations);
    } catch {
      // Keep local optimistic state if background reconciliation fails.
    } finally {
      reconcileInFlightRef.current = false;
    }
  });

  useEffect(() => {
    function handleFocus() {
      if (document.visibilityState === "visible") {
        void reconcileSnapshot();
      }
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [reconcileSnapshot]);

  useEffect(() => {
    if (isCompleted) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void reconcileSnapshot();
      }
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isCompleted, reconcileSnapshot]);

  function canEditGuestOrSelfColor(player: GameForPlayPage["players"][number]) {
    return (
      player.user.id === currentUserId ||
      (player.user.isGuest && player.user.created_by_user_id === currentUserId)
    );
  }

  function buildMutationId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  async function finalizeSuccessfulMutation(entry: PendingMutationEntry) {
    const remainingMutations = pendingMutationsRef.current.filter(
      (pendingEntry) => pendingEntry.id !== entry.id,
    );
    let nextBaseSnapshot = applyPlayGameMutation(
      baseSnapshotRef.current,
      entry.mutation,
    );

    if (remainingMutations.length === 0) {
      try {
        nextBaseSnapshot = await getPlayGameSnapshot(
          baseSnapshotRef.current.game.id,
        );
      } catch {
        // Keep the locally confirmed snapshot if fetch reconciliation fails.
      }
    }

    setLocalState(nextBaseSnapshot, remainingMutations);
  }

  function rollbackFailedMutation(entry: PendingMutationEntry) {
    const remainingMutations = pendingMutationsRef.current.filter(
      (pendingEntry) => pendingEntry.id !== entry.id,
    );

    setLocalState(baseSnapshotRef.current, remainingMutations);
  }

  function runMutation(input: {
    key: string;
    mutation: PlayGameMutation;
    action: () => Promise<unknown>;
    loadingMessage?: string;
    successMessage?: string;
    fallbackError?: string;
    onSuccess?: () => void;
  }) {
    if (pendingMutationsRef.current.some((entry) => entry.key === input.key)) {
      return;
    }

    const entry: PendingMutationEntry = {
      id: buildMutationId(),
      key: input.key,
      mutation: input.mutation,
    };
    const nextPendingMutations = [...pendingMutationsRef.current, entry];
    const loadingId = input.loadingMessage
      ? toast.loading(input.loadingMessage)
      : null;

    setLocalState(baseSnapshotRef.current, nextPendingMutations);

    startTransition(async () => {
      try {
        await input.action();
        await finalizeSuccessfulMutation(entry);

        if (loadingId) {
          toast.dismiss(loadingId);
        }
        if (input.successMessage) {
          toast.success(input.successMessage);
        }

        input.onSuccess?.();
      } catch (error) {
        rollbackFailedMutation(entry);

        if (loadingId) {
          toast.dismiss(loadingId);
        }
        toast.error(
          error instanceof Error
            ? error.message
            : (input.fallbackError ?? "Something went wrong"),
        );
      }
    });
  }

  function openScoreDialog(player: GameForPlayPage["players"][number]) {
    if (!isCreator || isCompleted) {
      return;
    }

    setScoreDialogPlayerId(player.userId);
    setScoreAmountInput("0");
  }

  function openColorDialog(player: GameForPlayPage["players"][number]) {
    if (!canEditGuestOrSelfColor(player)) {
      return;
    }

    setColorDialogPlayerId(player.userId);
    setSelectedGuestColor(player.user.color);
  }

  function handleAddExistingPlayer(userId: string) {
    const player = snapshot.playerOptions.find((entry) => entry.id === userId);

    if (!player) {
      toast.error("That player is no longer available");
      return;
    }

    runMutation({
      key: `add-player:${userId}`,
      mutation: {
        type: "add-player",
        user: player,
        gamePlayerId: `optimistic-game-player-${userId}`,
      },
      action: () => addGamePlayer({ gameId: game.id, userId }),
      loadingMessage: "Adding player...",
      successMessage: "Player added",
      onSuccess: () => {
        setIsAddPlayerOpen(false);
        setPlayerSearch("");
      },
    });
  }

  function handleAddGuest() {
    const rawName = playerSearch.trim();

    if (!rawName) {
      toast.error("Enter a guest name first");
      return;
    }

    const [firstName, ...rest] = rawName.split(/\s+/);
    const lastName = rest.join(" ").trim() || undefined;
    const optimisticGuest = createTemporaryGuestUser({
      currentUserId,
      firstName,
      lastName,
    });

    runMutation({
      key: `add-guest:${normalizeValue(rawName)}`,
      mutation: {
        type: "add-guest",
        user: optimisticGuest,
        gamePlayerId: `optimistic-game-player-${optimisticGuest.id}`,
      },
      action: () =>
        addGuestGamePlayer({
          gameId: game.id,
          firstName,
          lastName,
        }),
      loadingMessage: "Adding guest...",
      successMessage: "Guest added",
      onSuccess: () => {
        setIsAddPlayerOpen(false);
        setPlayerSearch("");
      },
    });
  }

  function handleScoreSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!scoreDialogPlayer) {
      return;
    }

    const scoreAmount = parseScoreAmountInput(scoreAmountInput);

    if (scoreAmount === null) {
      toast.error("Enter a valid round score");
      return;
    }

    runMutation({
      key: `score:${scoreDialogPlayer.userId}`,
      mutation: {
        type: "upsert-score",
        userId: scoreDialogPlayer.userId,
        scoreDelta: scoreAmount,
      },
      action: () =>
        upsertActiveRoundScore({
          gameId: game.id,
          userId: scoreDialogPlayer.userId,
          scoreDelta: scoreAmount,
        }),
      successMessage: "Score updated",
      onSuccess: () => {
        setScoreDialogPlayerId(null);
        setScoreAmountInput("0");
      },
    });
  }

  function handleCommitRound(completeGame: boolean) {
    const finishedAt = nowIso();

    runMutation({
      key: "commit-round",
      mutation: {
        type: "commit-round",
        completeGame,
        finishedAt,
      },
      action: () =>
        commitGameRound({
          gameId: game.id,
          completeGame,
        }),
      loadingMessage: completeGame
        ? "Finishing game..."
        : isFreePlay
          ? "Saving scores..."
          : "Ending round...",
      successMessage: completeGame
        ? "Game completed"
        : isFreePlay
          ? "Scores updated"
          : `Round ${nextRoundNumber} complete`,
      onSuccess: () => {
        setIsRoundDialogOpen(false);
      },
    });
  }

  function handleGuestColorSelect(nextColor: string) {
    if (!colorDialogPlayer || nextColor === selectedGuestColor) {
      return;
    }

    setSelectedGuestColor(nextColor);

    runMutation({
      key: `color:${colorDialogPlayer.userId}`,
      mutation: {
        type: "update-color",
        userId: colorDialogPlayer.userId,
        color: nextColor,
      },
      action: () =>
        updateOwnedGuestColor({
          guestUserId: colorDialogPlayer.userId,
          color: nextColor,
          gameId: game.id,
        }),
      successMessage: "Player color updated",
      fallbackError: "Failed to update player color",
      onSuccess: () => {
        setColorDialogPlayerId(null);
      },
    });
  }

  function openExitConfirmation() {
    setIsExitConfirmOpen(true);
  }

  function closeExitConfirmation() {
    setIsExitConfirmOpen(false);
  }

  function handleExitHome() {
    closeExitConfirmation();
    router.push("/dashboard");
  }

  if (game.version !== "v1") {
    return (
      <div className="min-h-screen overflow-y-auto px-3 pb-24 sm:px-6">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          <Card>
            <CardHeader>
              <h1 className="text-3xl font-black">Unsupported game version</h1>
              <p className="text-sm text-slate-500">
                This game uses a newer flow that does not have a matching UI in
                this client yet.
              </p>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const commitRoundPending = pendingKeySet.has("commit-round");
  const scoreMutationPending = scoreDialogPlayerId
    ? pendingKeySet.has(`score:${scoreDialogPlayerId}`)
    : false;
  const colorMutationPending = colorDialogPlayerId
    ? pendingKeySet.has(`color:${colorDialogPlayerId}`)
    : false;
  const addGuestPending = pendingKeySet.has(
    `add-guest:${normalizeValue(playerSearch)}`,
  );

  return (
    <div
      className="min-h-screen overflow-y-auto px-3 pb-40 sm:px-6"
      data-testid="play-game-shell"
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <Card className="overflow-hidden border-border/70 p-0 shadow-sm">
          <CardHeader className="gap-3 p-0">
            <div
              className="relative overflow-hidden px-4 py-3"
              style={{
                ["--game-header-accent" as string]:
                  game.gameTitle?.color ?? "#64748b",
              }}
            >
              {game.gameTitle?.imageUrl ? (
                <div
                  className="absolute inset-0 scale-110 bg-cover bg-center opacity-85 blur-[1.5px] dark:opacity-70"
                  style={{
                    backgroundImage: `url("${game.gameTitle.imageUrl}")`,
                  }}
                />
              ) : null}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.82)_0%,rgba(255,255,255,0.58)_42%,rgba(255,255,255,0.78)_100%)] dark:bg-[linear-gradient(90deg,rgba(2,6,23,0.82)_0%,rgba(2,6,23,0.5)_42%,rgba(2,6,23,0.76)_100%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--game-header-accent)_28%,transparent)_0%,transparent_58%,color-mix(in_srgb,var(--game-header-accent)_18%,transparent)_100%)] dark:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--game-header-accent)_30%,transparent)_0%,transparent_58%,color-mix(in_srgb,var(--game-header-accent)_22%,transparent)_100%)]" />
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-foreground/60">
                    Game
                  </p>
                  <h1 className="truncate text-lg font-black tracking-tight text-foreground">
                    {game.gameTitle?.title ?? "Untitled game"}
                  </h1>
                </div>
                <div className="flex flex-col shrink-0 flex-wrap justify-end gap-2">
                  <Badge
                    className="border-white/45 bg-white/55 text-foreground backdrop-blur-md dark:border-white/12 dark:bg-black/20 dark:text-white"
                    variant="outline"
                  >
                    {formatScoringSummary(game)}
                  </Badge>
                  <Badge
                    className="border-white/45 bg-white/55 text-foreground backdrop-blur-md dark:border-white/12 dark:bg-black/20 dark:text-white"
                    variant="outline"
                  >
                    {formatEndingSummary(game)}
                  </Badge>
                  {isCompleted ? (
                    <Badge
                      className="border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-300"
                      variant="outline"
                    >
                      Complete
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {isCompleted ? (
          <Card className="bg-amber-500 text-amber-200">
            <CardHeader className="flex items-center justify-center gap-2 text-2xl font-bold">
              <Crown className="size-6" /> {formatWinners(game)}
            </CardHeader>
          </Card>
        ) : null}

        <div className="flex flex-col gap-3">
          {!isFreePlay ? (
            <Card className="overflow-hidden rounded-3xl border-border/70 p-0 shadow-sm">
              <CardContent className="px-4 py-3">
                <p className="text-center text-lg font-black text-foreground">
                  {isCompleted
                    ? `Round ${game.completedRounds}`
                    : `Round ${nextRoundNumber}`}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {sortedPlayers.map((player) => {
            const isWinner = winnerIds.has(player.userId);
            const canEditColor = canEditGuestOrSelfColor(player);
            const playerSurfaceStyles = getProfileColorSurfaceStyles(
              player.user.color,
            );

            return (
              <Card
                key={player.id}
                className="overflow-hidden rounded-3xl border-none bg-transparent p-0 shadow-none"
                data-testid={`player-card-${player.userId}`}
              >
                <CardContent
                  className="relative flex items-center gap-3 overflow-hidden px-3 py-1"
                  data-testid={`player-card-content-${player.userId}`}
                  style={playerSurfaceStyles}
                >
                  <div className="pointer-events-none absolute inset-[1px] rounded-[calc(1.5rem-1px)] border border-[var(--profile-surface-ring)]" />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,var(--profile-surface-highlight)_0%,transparent_52%)] dark:bg-[radial-gradient(circle_at_18%_18%,rgba(15,23,42,0.18)_0%,transparent_52%)]" />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_42%,var(--profile-surface-shade)_100%)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.06)_0%,rgba(15,23,42,0.22)_100%)]" />
                  {canEditColor ? (
                    <button
                      type="button"
                      className="relative z-10 flex shrink-0 items-center justify-center rounded-full transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15"
                      onClick={() => openColorDialog(player)}
                    >
                      <ProfilePicture
                        user={player.user}
                        className="border-none"
                      />
                    </button>
                  ) : (
                    <div className="relative z-10 flex shrink-0 items-center justify-center rounded-full">
                      <ProfilePicture
                        user={player.user}
                        className="border-none"
                      />
                    </div>
                  )}
                  <div className="relative z-10 min-w-0 flex-1">
                    <div className="flex flex-col justify-center gap-1">
                      <p className="truncate text-xl font-black text-[color:var(--profile-surface-text)]">
                        {getDisplayName(player.user)}
                      </p>
                      {player.user.isGuest ? (
                        <Badge
                          className="border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[color:var(--profile-surface-text)]"
                          variant="outline"
                        >
                          Guest
                        </Badge>
                      ) : null}
                      {isWinner ? (
                        <span className="inline-flex items-center justify-center rounded-full border border-amber-100/50 bg-amber-500/90 p-1 text-amber-100 shadow-sm w-fit">
                          <Crown className="size-5" />
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {isCreator ? (
                    <Button
                      className="relative z-10 min-w-14 rounded-[1.4rem] border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] px-4 py-3 text-center text-3xl font-black text-[color:var(--profile-surface-text)] shadow-sm backdrop-blur-[2px]"
                      data-testid={`player-score-button-${player.userId}`}
                      disabled={isCompleted}
                      onClick={() => openScoreDialog(player)}
                      variant="outline"
                    >
                      {getPlayerTotalScore(player)}
                    </Button>
                  ) : (
                    <div
                      className="relative z-10 min-w-14 rounded-[1.4rem] border border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] px-4 py-3 text-center text-3xl font-black text-[color:var(--profile-surface-text)] shadow-sm backdrop-blur-[2px]"
                      data-testid={`player-score-display-${player.userId}`}
                    >
                      {getPlayerTotalScore(player)}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!isCreator ? (
          <Card className="border-dashed border-slate-200 bg-white/70 p-0">
            <CardContent className="px-4 py-4 text-sm text-slate-500">
              Only the creator can update scores and manage the game.
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-3 sm:px-6">
        <div className="mx-auto w-full max-w-md rounded-[2rem] border border-border/80 bg-card/95 p-3 text-card-foreground shadow-[0_-14px_45px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:shadow-[0_-18px_50px_rgba(2,6,23,0.45)]">
          <div
            className={`grid gap-2 ${
              isCreator
                ? !isFreePlay
                  ? "grid-cols-4"
                  : "grid-cols-3"
                : !isFreePlay
                  ? "grid-cols-2"
                  : "grid-cols-1"
            }`}
          >
            <Button
              className="h-16 flex-col gap-1 rounded-[1.4rem] text-[0.68rem] font-semibold tracking-[0.08em] uppercase"
              onClick={openExitConfirmation}
              variant="outline"
            >
              <Undo2 className="size-5" />
              Exit
            </Button>

            {isCreator ? (
              <Button
                className="h-16 flex-col gap-1 rounded-[1.4rem] text-[0.68rem] font-semibold tracking-[0.08em] uppercase"
                disabled={isCompleted}
                onClick={() => {
                  setPlayerSearch("");
                  setIsAddPlayerOpen(true);
                }}
                variant="outline"
              >
                <UserPlus className="size-5" />
                Add
              </Button>
            ) : null}

            {isCreator ? (
              <Button
                className="h-16 flex-col gap-1 rounded-[1.4rem] text-[0.68rem] font-semibold tracking-[0.08em] uppercase"
                disabled={isCompleted}
                onClick={() => setIsRoundDialogOpen(true)}
              >
                <Trophy className="size-5" />
                {isCompleted ? "Finished" : isFreePlay ? "Score" : "Round"}
              </Button>
            ) : null}

            {!isFreePlay ? (
              <Button
                className="h-16 flex-col gap-1 rounded-[1.4rem] text-[0.68rem] font-semibold tracking-[0.08em] uppercase"
                onClick={() => setIsRoundHistoryOpen(true)}
                variant="outline"
              >
                <ListChecks className="size-5" />
                Score
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog onOpenChange={setIsExitConfirmOpen} open={isExitConfirmOpen}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-[2rem] p-5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              Exit this game?
            </DialogTitle>
            <DialogDescription className="text-base">
              {isCompleted
                ? "You&apos;re just leaving the play screen. This game will still be here later if you want to review it again."
                : "You&apos;re just leaving the play screen. Nothing will be deleted, and you can always resume the game later."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-transparent p-0 pt-2">
            <Button
              onClick={() => setIsExitConfirmOpen(false)}
              variant="outline"
            >
              Stay here
            </Button>
            <Button onClick={handleExitHome}>Leave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setScoreDialogPlayerId(null);
            setScoreAmountInput("0");
          }
        }}
        open={Boolean(scoreDialogPlayer)}
      >
        <DialogContent
          className="max-w-[calc(100%-1.5rem)] rounded-[2rem] p-5"
          style={
            scoreDialogPlayer
              ? getProfileColorSurfaceStyles(scoreDialogPlayer.user.color)
              : undefined
          }
        >
          <div className="pointer-events-none absolute inset-[1px] rounded-[calc(2rem-1px)] border border-[var(--profile-surface-ring)]" />
          <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_24%_18%,var(--profile-surface-highlight)_0%,transparent_52%)] dark:bg-[radial-gradient(circle_at_24%_18%,rgba(15,23,42,0.18)_0%,transparent_52%)]" />
          <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[linear-gradient(180deg,transparent_42%,var(--profile-surface-shade)_100%)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.06)_0%,rgba(15,23,42,0.22)_100%)]" />
          <DialogHeader>
            <DialogTitle className="relative z-10 text-2xl font-black">
              {scoreDialogPlayer ? getDisplayName(scoreDialogPlayer.user) : ""}
            </DialogTitle>
            {!isFreePlay && (
              <DialogDescription className="relative z-10 text-[color:var(--profile-surface-muted-text)]">
                Round {nextRoundNumber}
              </DialogDescription>
            )}
          </DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={handleScoreSubmit}>
            <div className="relative z-10 space-y-3">
              <p className="text-center text-6xl font-black">
                {scoreDialogPlayer ? getPlayerTotalScore(scoreDialogPlayer) : 0}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  className="h-16 rounded-[1.4rem] border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] shadow-sm"
                  disabled={isCompleted || scoreMutationPending}
                  onClick={() => {
                    const scoreAmount =
                      parseScoreAmountInput(scoreAmountInput) ?? 0;
                    setScoreAmountInput(String(scoreAmount - 1));
                  }}
                  type="button"
                  variant="outline"
                >
                  -
                </Button>
                <Input
                  autoFocus
                  className="h-18 rounded-[1.5rem] border border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] text-center text-4xl font-black shadow-inner ring-0 placeholder:text-[color:var(--profile-surface-muted-text)]"
                  inputMode="numeric"
                  onFocus={(event) => {
                    if ((parseScoreAmountInput(scoreAmountInput) ?? 0) === 0) {
                      event.target.select();
                    }
                  }}
                  onChange={(event) =>
                    setScoreAmountInput(
                      normalizeScoreAmountInput(event.target.value),
                    )
                  }
                  type="number"
                  value={scoreAmountInput}
                />
                <Button
                  className="h-16 rounded-[1.4rem] border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] shadow-sm"
                  disabled={isCompleted || scoreMutationPending}
                  onClick={() => {
                    const scoreAmount =
                      parseScoreAmountInput(scoreAmountInput) ?? 0;
                    setScoreAmountInput(String(scoreAmount + 1));
                  }}
                  type="button"
                  variant="outline"
                >
                  +
                </Button>
              </div>
            </div>
            <DialogFooter className="bg-transparent p-0 pt-2">
              <Button disabled={scoreMutationPending} type="submit">
                {scoreMutationPending ? (
                  <LoaderCircle className="animate-spin" />
                ) : null}
                Update
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setColorDialogPlayerId(null);
            setSelectedGuestColor(null);
          }
        }}
        open={Boolean(colorDialogPlayer)}
      >
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-[2rem] p-5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              {colorDialogPlayer
                ? `Edit ${getDisplayName(colorDialogPlayer.user)}`
                : "Edit guest"}
            </DialogTitle>
            <DialogDescription className="text-base">
              Pick a new badge color for this guest profile.
            </DialogDescription>
          </DialogHeader>
          {colorDialogPlayer && selectedGuestColor ? (
            <ProfileColorSelector
              color={selectedGuestColor}
              description="Click a swatch to update this guest's color"
              disabled={colorMutationPending}
              onSelect={handleGuestColorSelect}
              title="Guest color"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          setIsAddPlayerOpen(open);
          if (!open) {
            setPlayerSearch("");
          }
        }}
        open={isAddPlayerOpen}
      >
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-[2rem] p-0">
          <DialogHeader className="p-5 pb-0">
            <DialogTitle className="text-2xl font-black">
              Add player
            </DialogTitle>
            <DialogDescription className="text-base">
              Search for a friend or add a new guest
            </DialogDescription>
          </DialogHeader>
          <Command className="border-0 bg-transparent">
            <CommandInput
              className="text-lg"
              onValueChange={setPlayerSearch}
              placeholder="Search friends or guests"
              value={playerSearch}
            />
            <CommandList className="max-h-[50vh]">
              <CommandGroup
                heading={playerSearch.trim() ? "Matches" : "People"}
              >
                {filteredPlayers.map((player) => {
                  const playerPending = pendingKeySet.has(
                    `add-player:${player.id}`,
                  );

                  return (
                    <CommandItem
                      key={player.id}
                      onSelect={() => {
                        if (!playerPending) {
                          handleAddExistingPlayer(player.id);
                        }
                      }}
                      value={`${player.firstName ?? ""} ${player.lastName ?? ""}`}
                    >
                      <div
                        className={`flex w-full items-center justify-between gap-3 py-2 ${playerPending ? "opacity-60" : ""}`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <ProfilePicture
                            className="border-none"
                            size="xs"
                            user={player}
                          />
                          <p className="truncate text-base font-bold text-foreground">
                            {getDisplayName(player)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {player.isGuest ? "Guest" : "Friend"}
                          </Badge>
                          {playerPending ? (
                            <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
                          ) : (
                            <UserPlus className="size-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              {filteredPlayers.length === 0 ? (
                <CommandEmpty>
                  <div className="flex flex-col items-center gap-4 px-4 py-6">
                    <p className="text-center text-sm text-muted-foreground">
                      No match. Add this user as a guest instead.
                    </p>
                    <Button
                      className="h-14 w-full rounded-[1.4rem]"
                      disabled={!playerSearch.trim() || addGuestPending}
                      onClick={handleAddGuest}
                    >
                      {addGuestPending ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <Plus className="size-5" />
                      )}
                      Add guest
                    </Button>
                  </div>
                </CommandEmpty>
              ) : null}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setIsRoundDialogOpen} open={isRoundDialogOpen}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-[2rem] p-5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              {isFreePlay || hasThresholdMet
                ? "End of game"
                : `End of round ${nextRoundNumber}`}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{formatScoringSummary(game)}</Badge>
            <Badge variant="outline">{formatEndingSummary(game)}</Badge>
          </div>

          {(isFreePlay || hasThresholdMet) && (
            <div className="rounded-3xl border border-border bg-muted/50 p-4">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Standings
              </p>
              <div className="flex flex-col gap-2">
                {sortedPlayers.map((player) => (
                  <div
                    key={player.userId}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium text-foreground/80">
                        {getDisplayName(player.user)}
                      </span>
                      {projectedWinnerIds.has(player.userId) ? (
                        <Badge variant="outline">Winning</Badge>
                      ) : null}
                    </div>
                    <span className="font-black text-foreground">
                      {getPlayerTotalScore(player)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!(isFreePlay || hasThresholdMet) && (
            <div className="rounded-3xl border border-border bg-muted/50 p-4">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Round summary
              </p>
              <div className="flex flex-col gap-2">
                {roundSummaryScores.map((score) => (
                  <div
                    key={score.userId}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="font-medium text-foreground/80">
                      {getDisplayName(score.player.user)}
                    </span>
                    <span className="font-black text-foreground">
                      {score.scoreDelta > 0 ? "+" : ""}
                      {score.scoreDelta}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="bg-transparent p-0 pt-2">
            {shouldOfferRoundPrompt ? (
              <>
                <Button
                  disabled={commitRoundPending}
                  onClick={() => handleCommitRound(false)}
                  variant="outline"
                >
                  {commitRoundPending ? (
                    <LoaderCircle className="animate-spin" />
                  ) : null}
                  {isFreePlay ? "Save scores" : "Play another round"}
                </Button>
                <Button
                  disabled={commitRoundPending}
                  onClick={() => handleCommitRound(true)}
                >
                  {commitRoundPending ? (
                    <LoaderCircle className="animate-spin" />
                  ) : null}
                  End game
                </Button>
              </>
            ) : (
              <Button
                className="h-14 w-full rounded-[1.4rem]"
                disabled={commitRoundPending}
                onClick={() => handleCommitRound(false)}
              >
                {commitRoundPending ? (
                  <LoaderCircle className="animate-spin" />
                ) : null}
                {isFreePlay ? "End game" : "Start next round"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={setIsRoundHistoryOpen}
        open={!isFreePlay && isRoundHistoryOpen}
      >
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-[2rem] p-5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              Score breakdown
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto pr-1">
            {sortedRounds.length > 0 && (
              <div className="overflow-x-auto rounded-3xl border border-border bg-muted/50">
                <div
                  className="grid min-w-max w-fit"
                  style={{
                    gridTemplateColumns: `minmax(5.5rem, 1.1fr) repeat(${scorecardPlayers.length}, minmax(4.25rem, 1fr))`,
                  }}
                >
                  <div className="sticky left-0 z-10 flex items-center border-b border-r border-border bg-muted px-3 py-3 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                    Round
                  </div>
                  {scorecardPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="border-b border-r border-border bg-muted px-2 py-2"
                      title={getDisplayName(player.user)}
                    >
                      <div className="flex justify-center">
                        <ProfilePicture size="xs" user={player.user} />
                      </div>
                    </div>
                  ))}
                  <div className="sticky left-0 z-10 flex items-center border-r border-border bg-muted px-3 py-3 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                    Total
                  </div>
                  {scorecardPlayers.map((player) => (
                    <div
                      key={`total-${player.id}`}
                      className="flex items-center justify-center border-r border-b border-border bg-muted px-2 py-3 text-center text-sm font-black text-foreground"
                    >
                      {getPlayerTotalScore(player)}
                    </div>
                  ))}

                  {scorecardRounds.map((round) => (
                    <Fragment key={round.id}>
                      <div className="sticky left-0 z-10 flex items-center border-r border-border bg-muted/60 px-3 py-3 text-sm font-black text-foreground">
                        <span>R{round.roundNumber}</span>
                      </div>
                      {scorecardPlayers.map((player) => {
                        const roundScore =
                          (round.scores ?? []).find(
                            (score) => score.userId === player.userId,
                          )?.scoreDelta ?? 0;

                        return (
                          <div
                            key={`${round.id}-${player.userId}`}
                            className="flex items-center justify-center border-r border-b border-border px-2 py-3 text-center text-sm font-medium text-foreground/80"
                          >
                            {roundScore > 0 ? "+" : ""}
                            {roundScore}
                          </div>
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
