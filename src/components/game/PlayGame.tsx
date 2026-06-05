"use client";

import {
  addGamePlayer,
  addGuestGamePlayer,
  commitGameRound,
  deleteCreatedGame,
  getPlayGameSnapshot,
  removeGamePlayer,
  updateRecordedRoundScore,
  upsertActiveRoundScore,
} from "@/app/actions/game";
import { updateOwnedGuestColor } from "@/app/actions/user";
import { getProfileColorSurfaceStyles } from "@/components/profile/profile-color-styles";
import { ProfileColorSelector } from "@/components/profile/profile-color-selector";
import ProfilePicture from "@/components/profile/profile-picture";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardEmpty, CardHeader } from "@/components/ui/card";
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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
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
  ChevronDown,
  Diff,
  DoorOpen,
  FastForward,
  ListChecks,
  LoaderCircle,
  Minus,
  Plus,
  Settings2,
  Trash2,
  Trophy,
  Undo2,
  UserPlus,
  Users,
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
import Link from "next/link";
import { cn } from "@/lib/utils";

type PlayGameProps = {
  currentUserId: string;
  isCreator: boolean;
  playerOptions: UserBase[];
  game: GameForPlayPage;
};

type ScoreDialogState = {
  playerId: string;
  roundNumber: number;
  mode: "active" | "history";
};

type RoundDialogIntent = "round" | "end-game";

type PendingMutationEntry = {
  id: string;
  key: string;
  mutation: PlayGameMutation;
};

function getDisplayName(
  user: Pick<UserBase, "firstName" | "lastName" | "isGuest">,
) {
  const firstName = user.firstName?.trim() ?? "";
  const lastInitial = user.lastName?.trim().charAt(0).toUpperCase() ?? "";

  if (firstName && lastInitial) {
    return `${firstName} ${lastInitial}.`;
  }

  if (firstName) {
    return firstName;
  }

  const lastName = user.lastName?.trim() ?? "";

  if (lastName) {
    return `${lastName.charAt(0).toUpperCase()}.`;
  }

  return user.isGuest ? "Guest player" : "Unnamed player";
}

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

function formatEndingSummary(game: GameForPlayPage) {
  switch (game.endingMode) {
    case "round_count":
      return `End after ${game.targetRounds ?? 1} round${
        game.targetRounds === 1 ? "" : "s"
      }`;
    case "score_threshold":
      if (game.scoreThreshold === null) {
        return "Score threshold";
      }

      return game.scoreThresholdDirection === "at_most"
        ? `End when a score drops to ${game.scoreThreshold}`
        : `End when a score reaches ${game.scoreThreshold}`;
    default:
      return game.trackRounds
        ? "Free play with rounds"
        : "Free play without rounds";
  }
}

function formatScoringSummary(game: GameForPlayPage) {
  if (game.scoringMode === "no_score") {
    return "No score";
  }

  return game.scoringMode === "highest_wins"
    ? "Highest score wins"
    : "Lowest score wins";
}

function formatGameMetaDate(value: string | null | undefined) {
  if (!value) {
    return "Unknown date";
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

function getCommittedPlayerScore(input: {
  player: { score: number | null | undefined; userId: string };
  activeRoundScoreByUserId: Map<string, number>;
  includeActiveRound: boolean;
}) {
  const totalScore = getPlayerTotalScore(input.player);

  if (!input.includeActiveRound) {
    return totalScore;
  }

  return (
    totalScore - (input.activeRoundScoreByUserId.get(input.player.userId) ?? 0)
  );
}

function getPlacementLabel(index: number) {
  const place = index + 1;

  if (place === 1) {
    return "1st";
  }

  if (place === 2) {
    return "2nd";
  }

  if (place === 3) {
    return "3rd";
  }

  return `${place}th`;
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
    clerkUserId: null,
    profileCardId: null,
    color: "#FFFFFF",
    role: "user" as const,
    phoneNumber: null,
    email: null,
    avatarUrl: null,
    firstName: input.firstName,
    lastName: input.lastName ?? null,
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
  const [isDeleteGamePending, startDeleteGameTransition] = useTransition();
  const [scoreDialogState, setScoreDialogState] =
    useState<ScoreDialogState | null>(null);
  const [scoreAmountInput, setScoreAmountInput] = useState("0");
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [isAddPlayerMode, setIsAddPlayerMode] = useState(false);
  const [removePlayerUserId, setRemovePlayerUserId] = useState<string | null>(
    null,
  );
  const [isRoundDialogOpen, setIsRoundDialogOpen] = useState(false);
  const [roundDialogIntent, setRoundDialogIntent] =
    useState<RoundDialogIntent>("round");
  const [isRoundHistoryOpen, setIsRoundHistoryOpen] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [isHeaderDrawerOpen, setIsHeaderDrawerOpen] = useState(false);
  const [isDeleteGameDialogOpen, setIsDeleteGameDialogOpen] = useState(false);
  const [colorDialogPlayerId, setColorDialogPlayerId] = useState<string | null>(
    null,
  );
  const [selectedGuestColor, setSelectedGuestColor] = useState<string | null>(
    null,
  );
  const [selectedWinnerUserIds, setSelectedWinnerUserIds] = useState<string[]>(
    [],
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
  const autoOpenedRoundRef = useRef<number | null>(null);
  const mutationIdRef = useRef(0);

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
  const isNoScoreMode = game.scoringMode === "no_score";
  const isFreePlay = game.endingMode === "none";
  const showsRounds = game.endingMode !== "none" || game.trackRounds;
  const isRoundlessFreePlay = isFreePlay && !game.trackRounds;
  const nextRoundNumber = game.completedRounds + 1;
  const currentRoundLabel = isCompleted
    ? game.completedRounds
    : nextRoundNumber;
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
  const isRoundScoringReady = useMemo(
    () =>
      showsRounds &&
      !isCompleted &&
      game.players.length > 0 &&
      game.players.every((player) =>
        activeRoundScoreByUserId.has(player.userId),
      ),
    [activeRoundScoreByUserId, game.players, isCompleted, showsRounds],
  );
  const hasAnyRecordedScores = useMemo(
    () =>
      game.players.some((player) => getPlayerTotalScore(player) !== 0) ||
      game.rounds.some((round) => round.scores.length > 0),
    [game.players, game.rounds],
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

    if (game.scoringMode === "no_score") {
      if (game.completedAt) {
        players.sort((left, right) => {
          const leftIsWinner = winnerIds.has(left.userId);
          const rightIsWinner = winnerIds.has(right.userId);

          if (leftIsWinner === rightIsWinner) {
            return 0;
          }

          return leftIsWinner ? -1 : 1;
        });
      }

      return players;
    }

    players.sort((left, right) =>
      game.scoringMode === "highest_wins"
        ? getCommittedPlayerScore({
            player: right,
            activeRoundScoreByUserId,
            includeActiveRound: showsRounds && !game.completedAt,
          }) -
          getCommittedPlayerScore({
            player: left,
            activeRoundScoreByUserId,
            includeActiveRound: showsRounds && !game.completedAt,
          })
        : getCommittedPlayerScore({
            player: left,
            activeRoundScoreByUserId,
            includeActiveRound: showsRounds && !game.completedAt,
          }) -
          getCommittedPlayerScore({
            player: right,
            activeRoundScoreByUserId,
            includeActiveRound: showsRounds && !game.completedAt,
          }),
    );

    return players;
  }, [
    activeRoundScoreByUserId,
    game.completedAt,
    game.players,
    game.scoringMode,
    showsRounds,
    winnerIds,
  ]);
  const sortedRounds = useMemo(() => {
    const rounds = [...(game.rounds ?? [])];

    rounds.sort((left, right) => right.roundNumber - left.roundNumber);

    return rounds;
  }, [game.rounds]);
  const scorecardRounds = useMemo(
    () => [...sortedRounds].reverse(),
    [sortedRounds],
  );
  const scoreDialogPlayer = useMemo(
    () =>
      game.players.find(
        (player) => player.userId === scoreDialogState?.playerId,
      ) ?? null,
    [game.players, scoreDialogState?.playerId],
  );
  const scoreDialogRoundNumber =
    scoreDialogState?.roundNumber ?? nextRoundNumber;
  const scoreDialogRound = useMemo(
    () =>
      game.rounds.find(
        (round) => round.roundNumber === scoreDialogRoundNumber,
      ) ?? null,
    [game.rounds, scoreDialogRoundNumber],
  );
  const scoreDialogExistingRoundScore = useMemo(() => {
    if (!scoreDialogPlayer) {
      return null;
    }

    return (
      scoreDialogRound?.scores.find(
        (score) => score.userId === scoreDialogPlayer.userId,
      )?.scoreDelta ?? 0
    );
  }, [scoreDialogPlayer, scoreDialogRound]);
  const scoreDialogCommittedTotal = useMemo(() => {
    if (!scoreDialogPlayer) {
      return 0;
    }

    return (
      getPlayerTotalScore(scoreDialogPlayer) -
      (scoreDialogExistingRoundScore ?? 0)
    );
  }, [scoreDialogExistingRoundScore, scoreDialogPlayer]);
  const scoreDialogProjectedTotal =
    scoreDialogCommittedTotal + (parseScoreAmountInput(scoreAmountInput) ?? 0);
  const colorDialogPlayer = useMemo(
    () =>
      game.players.find((player) => player.userId === colorDialogPlayerId) ??
      null,
    [colorDialogPlayerId, game.players],
  );
  const removePlayerDialogPlayer = useMemo(
    () =>
      game.players.find((player) => player.userId === removePlayerUserId) ??
      null,
    [game.players, removePlayerUserId],
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
        scoreDelta: activeRoundScoreByUserId.get(player.userId) ?? null,
        player,
      })),
    [activeRoundScoreByUserId, game.players],
  );
  const projectedWinnerIds = useMemo(() => {
    if (game.scoringMode === "no_score") {
      return new Set(selectedWinnerUserIds);
    }

    return new Set(
      getWinningUserIds({
        players: game.players.map((player) => ({
          userId: player.userId,
          score: getPlayerTotalScore(player),
        })),
        scoringMode: game.scoringMode,
      }),
    );
  }, [game.players, game.scoringMode, selectedWinnerUserIds]);
  const projectedWinnersLabel = useMemo(() => {
    if (game.scoringMode === "no_score") {
      const winnerNames = sortedPlayers
        .filter((player) => projectedWinnerIds.has(player.userId))
        .map((player) => getDisplayName(player.user));

      if (winnerNames.length === 0) {
        return "Choose the winner";
      }

      if (winnerNames.length === 1) {
        return `${winnerNames[0]} is selected to win`;
      }

      if (winnerNames.length === 2) {
        return `${winnerNames[0]} and ${winnerNames[1]} are selected to tie`;
      }

      return `${winnerNames.slice(0, -1).join(", ")}, and ${winnerNames.at(-1)} are selected to tie`;
    }

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
  }, [game.scoringMode, projectedWinnerIds, sortedPlayers]);

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

  async function reconcileSnapshotNow() {
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
  }

  const reconcileSnapshot = useEffectEvent(async () => {
    await reconcileSnapshotNow();
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
  }, []);

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
  }, [isCompleted]);

  useEffect(() => {
    if (!isRoundScoringReady || isRoundDialogOpen || !activeRound) {
      return;
    }

    if (autoOpenedRoundRef.current === activeRound.roundNumber) {
      return;
    }

    autoOpenedRoundRef.current = activeRound.roundNumber;
    setSelectedWinnerUserIds(game.winners.map((winner) => winner.userId));
    setRoundDialogIntent("round");
    setIsRoundDialogOpen(true);
  }, [activeRound, game.winners, isRoundDialogOpen, isRoundScoringReady]);

  function canEditGuestOrSelfColor(player: GameForPlayPage["players"][number]) {
    return (
      player.user.id === currentUserId ||
      (player.user.isGuest && player.user.created_by_user_id === currentUserId)
    );
  }

  function buildMutationId() {
    mutationIdRef.current += 1;
    return `mutation-${mutationIdRef.current}`;
  }

  async function finalizeSuccessfulMutation(entry: PendingMutationEntry) {
    const remainingMutations = pendingMutationsRef.current.filter(
      (pendingEntry) => pendingEntry.id !== entry.id,
    );
    const nextBaseSnapshot = applyPlayGameMutation(
      baseSnapshotRef.current,
      entry.mutation,
    );

    setLocalState(nextBaseSnapshot, remainingMutations);

    if (remainingMutations.length === 0) {
      void reconcileSnapshotNow();
    }
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
    fallbackError?: string;
    onOptimistic?: () => void;
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

    setLocalState(baseSnapshotRef.current, nextPendingMutations);
    input.onOptimistic?.();

    startTransition(async () => {
      try {
        await input.action();
        await finalizeSuccessfulMutation(entry);

        input.onSuccess?.();
      } catch (error) {
        rollbackFailedMutation(entry);
        toast.error(
          error instanceof Error
            ? error.message
            : (input.fallbackError ?? "Something went wrong"),
        );
      }
    });
  }

  function openScoreDialog(player: GameForPlayPage["players"][number]) {
    if (!isCreator || isCompleted || isNoScoreMode) {
      return;
    }

    setScoreDialogState({
      playerId: player.userId,
      roundNumber: nextRoundNumber,
      mode: "active",
    });
    setScoreAmountInput(
      String(activeRoundScoreByUserId.get(player.userId) ?? 0),
    );
  }

  function openRoundScoreDialog(input: {
    playerId: string;
    roundNumber: number;
  }) {
    if (!isCreator || isCompleted || isNoScoreMode) {
      return;
    }

    const round = game.rounds.find(
      (entry) => entry.roundNumber === input.roundNumber,
    );
    const roundScore =
      round?.scores.find((score) => score.userId === input.playerId)
        ?.scoreDelta ?? 0;

    setScoreDialogState({
      playerId: input.playerId,
      roundNumber: input.roundNumber,
      mode: "history",
    });
    setScoreAmountInput(String(roundScore));
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
      onOptimistic: () => {
        setIsAddPlayerMode(false);
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
      onOptimistic: () => {
        setIsAddPlayerMode(false);
        setPlayerSearch("");
      },
    });
  }

  function openRemovePlayerDialog(userId: string) {
    if (isCompleted) {
      return;
    }

    setRemovePlayerUserId(userId);
  }

  function handleRemovePlayer() {
    if (!removePlayerDialogPlayer) {
      return;
    }

    if (game.players.length <= 1) {
      toast.error("A game needs at least one player");
      return;
    }

    runMutation({
      key: `remove-player:${removePlayerDialogPlayer.userId}`,
      mutation: {
        type: "remove-player",
        userId: removePlayerDialogPlayer.userId,
      },
      action: () =>
        removeGamePlayer({
          gameId: game.id,
          userId: removePlayerDialogPlayer.userId,
        }),
      onOptimistic: () => {
        setRemovePlayerUserId(null);
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
      key:
        scoreDialogState?.mode === "history"
          ? `round-score:${scoreDialogState.roundNumber}:${scoreDialogPlayer.userId}`
          : `score:${scoreDialogPlayer.userId}`,
      mutation: {
        type: "upsert-score",
        roundNumber: scoreDialogState?.roundNumber ?? nextRoundNumber,
        userId: scoreDialogPlayer.userId,
        scoreDelta: scoreAmount,
      },
      action: () => {
        if (scoreDialogState?.mode === "history") {
          return updateRecordedRoundScore({
            gameId: game.id,
            roundNumber: scoreDialogState.roundNumber,
            userId: scoreDialogPlayer.userId,
            scoreDelta: scoreAmount,
          });
        }

        return upsertActiveRoundScore({
          gameId: game.id,
          userId: scoreDialogPlayer.userId,
          scoreDelta: scoreAmount,
        });
      },
      onOptimistic: () => {
        setScoreDialogState(null);
        setScoreAmountInput("0");
      },
    });
  }

  function handleCommitRound(completeGame: boolean) {
    const finishedAt = nowIso();
    const winnerUserIds =
      completeGame && isNoScoreMode ? selectedWinnerUserIds : undefined;

    runMutation({
      key: "commit-round",
      mutation: {
        type: "commit-round",
        completeGame,
        finishedAt,
        winnerUserIds,
      },
      action: () =>
        commitGameRound({
          gameId: game.id,
          completeGame,
          winnerUserIds,
        }),
      onOptimistic: () => {
        setIsRoundDialogOpen(false);
        setRoundDialogIntent("round");
        if (completeGame && isNoScoreMode) {
          setSelectedWinnerUserIds([]);
        }
      },
    });
  }

  function toggleWinnerSelection(userId: string) {
    setSelectedWinnerUserIds((current) =>
      current.includes(userId)
        ? current.filter((entry) => entry !== userId)
        : [...current, userId],
    );
  }

  function openRoundDialog(intent: RoundDialogIntent = "round") {
    setSelectedWinnerUserIds(game.winners.map((winner) => winner.userId));
    setRoundDialogIntent(intent);
    setIsRoundDialogOpen(true);
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
      fallbackError: "Failed to update player color",
      onOptimistic: () => {
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

  function handleDeleteGame() {
    startDeleteGameTransition(async () => {
      try {
        await deleteCreatedGame({ gameId: game.id });
        setIsDeleteGameDialogOpen(false);
        setIsHeaderDrawerOpen(false);
        toast.success("Game deleted");
        router.push("/dashboard");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not delete game",
        );
      }
    });
  }

  if (game.version !== "v1") {
    return (
      <div className="min-h-screen overflow-y-auto px-3 pb-40 sm:px-6">
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
  const scoreMutationPending = scoreDialogState
    ? pendingKeySet.has(
        scoreDialogState.mode === "history"
          ? `round-score:${scoreDialogState.roundNumber}:${scoreDialogState.playerId}`
          : `score:${scoreDialogState.playerId}`,
      )
    : false;
  const colorMutationPending = colorDialogPlayerId
    ? pendingKeySet.has(`color:${colorDialogPlayerId}`)
    : false;
  const addGuestPending = pendingKeySet.has(
    `add-guest:${normalizeValue(playerSearch)}`,
  );
  const removePlayerPending = removePlayerUserId
    ? pendingKeySet.has(`remove-player:${removePlayerUserId}`)
    : false;
  const canOpenScoreFromCard = isCreator && !isCompleted && !isNoScoreMode;

  return (
    <div
      className="min-h-screen overflow-y-auto px-3 pb-40 sm:px-6"
      data-testid="play-game-shell"
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <Card
          className="overflow-hidden p-0 shadow-sm"
          style={{
            ["--game-header-accent" as string]:
              game.gameTitle?.color ?? "#64748b",
          }}
        >
          <details className="group">
            <summary className="flex cursor-pointer list-none items-stretch pr-4">
              <div
                className="relative w-20 shrink-0 overflow-hidden border-border/70"
                style={{
                  backgroundColor: game.gameTitle?.color ?? undefined,
                }}
              >
                {game.gameTitle?.imageUrl ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-60"
                    style={{
                      backgroundImage: `url("${game.gameTitle.imageUrl}")`,
                    }}
                  />
                ) : null}
                <div className="absolute inset-0 bg-linear-to-t from-white/45 via-white/20 dark:from-black/80 dark:via-black/30 to-transparent" />
                <div className="absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--game-header-accent)_28%,transparent)_0%,transparent_58%,color-mix(in_srgb,var(--game-header-accent)_18%,transparent)_100%)] dark:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--game-header-accent)_30%,transparent)_0%,transparent_58%,color-mix(in_srgb,var(--game-header-accent)_22%,transparent)_100%)]" />
              </div>
              <div className="flex min-w-0 min-h-18 flex-1 items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <h1 className="truncate text-lg font-black tracking-tight text-foreground">
                    {game.gameTitle?.title ?? "Untitled game"}
                  </h1>
                  {showsRounds && (
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-foreground/60">
                      Round {currentRoundLabel}
                    </p>
                  )}
                </div>
                <ChevronDown className="mt-1 size-4 shrink-0 self-center text-muted-foreground transition-transform group-open:rotate-180" />
              </div>
            </summary>
            <div className="flex flex-col border-t border-border px-4 py-4 gap-3">
              <div className="flex flex-wrap gap-2">
                <Badge
                  className="border-border/70 bg-background/75 text-foreground backdrop-blur-md dark:bg-background/60"
                  variant="outline"
                >
                  {formatScoringSummary(game)}
                </Badge>
                <Badge
                  className="border-border/70 bg-background/75 text-foreground backdrop-blur-md dark:bg-background/60"
                  variant="outline"
                >
                  {formatEndingSummary(game)}
                </Badge>
                {isCompleted && (
                  <Badge className="winner-badge" variant="outline">
                    Complete
                  </Badge>
                )}
              </div>
              <div className="flex w-full justify-between items-end">
                <div className="flex flex-col text-xs text-muted-foreground">
                  <div className="flex flex-col gap-1">
                    {game.completedAt ? (
                      <p>Completed {formatGameMetaDate(game.completedAt)}</p>
                    ) : null}
                    <p>Created by {getDisplayName(game.creator)}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <p>Started {formatGameMetaDate(game.createdAt)}</p>
                  </div>
                </div>
                {isCreator ? (
                  <div className="flex items-center gap-2">
                    <Drawer
                      onOpenChange={setIsHeaderDrawerOpen}
                      open={isHeaderDrawerOpen}
                    >
                      <DrawerTrigger
                        render={
                          <Button
                            aria-label="Game options"
                            className="cursor-pointer"
                            type="button"
                            variant="outline"
                          />
                        }
                      >
                        <Settings2 className="size-5" />
                      </DrawerTrigger>
                      <DrawerContent className="gap-4 pb-28">
                        <DrawerHeader>
                          <DrawerTitle className="text-xl font-black">
                            Game options
                          </DrawerTitle>
                          <DrawerDescription>
                            Quick actions for this game.
                          </DrawerDescription>
                        </DrawerHeader>
                        <div className="flex flex-col gap-2">
                          <Link
                            href={`/game/${game.id}/settings`}
                            onClick={() => setIsHeaderDrawerOpen(false)}
                          >
                            <Button
                              className="w-full justify-start"
                              type="button"
                              variant="outline"
                            >
                              <Settings2 className="size-4" />
                              Change game settings
                            </Button>
                          </Link>
                          <Button
                            className="w-full justify-start"
                            disabled={isCompleted}
                            onClick={() => {
                              setIsHeaderDrawerOpen(false);
                              setPlayerSearch("");
                              setIsAddPlayerOpen(true);
                            }}
                            type="button"
                            variant="outline"
                          >
                            <Users className="size-4" />
                            Manage players
                          </Button>
                          <Button
                            className="w-full justify-start"
                            disabled={isCompleted}
                            onClick={() => {
                              setIsHeaderDrawerOpen(false);
                              openRoundDialog("end-game");
                            }}
                            type="button"
                            variant="outline"
                          >
                            <Trophy className="size-4" />
                            End game
                          </Button>
                          <Button
                            className="w-full justify-start"
                            disabled={isCompleted || isDeleteGamePending}
                            onClick={() => {
                              setIsHeaderDrawerOpen(false);
                              setIsDeleteGameDialogOpen(true);
                            }}
                            type="button"
                            variant="destructive"
                          >
                            <Trash2 className="size-4" />
                            Delete game
                          </Button>
                        </div>
                      </DrawerContent>
                    </Drawer>
                  </div>
                ) : null}
              </div>
            </div>
          </details>
        </Card>

        {isCompleted ? (
          <Card className="winner-surface overflow-hidden rounded-3xl border">
            <CardHeader className="gap-3 text-center text-[color:var(--winner-text)]">
              <div className="flex items-center justify-center gap-3 text-2xl font-bold">
                <span>{formatWinners(game)}</span>
              </div>
            </CardHeader>
          </Card>
        ) : null}

        <div className="flex flex-col gap-3">
          {sortedPlayers.map((player, index) => {
            const isWinner = winnerIds.has(player.userId);
            const canEditColor = canEditGuestOrSelfColor(player);
            const playerSurfaceStyles = getProfileColorSurfaceStyles(
              player.user.color,
            );
            const activeRoundDelta = activeRoundScoreByUserId.get(
              player.userId,
            );

            return (
              <Card
                key={player.id}
                className="overflow-hidden rounded-3xl border-none bg-transparent p-0 shadow-none"
                data-testid={`player-card-${player.userId}`}
              >
                <CardContent
                  className={cn(
                    "relative flex items-center gap-3 overflow-hidden px-3 py-1",
                    canOpenScoreFromCard && "cursor-pointer",
                  )}
                  data-testid={`player-card-content-${player.userId}`}
                  onClick={() => {
                    if (canOpenScoreFromCard) {
                      openScoreDialog(player);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (!canOpenScoreFromCard) {
                      return;
                    }

                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openScoreDialog(player);
                    }
                  }}
                  role={canOpenScoreFromCard ? "button" : undefined}
                  tabIndex={canOpenScoreFromCard ? 0 : undefined}
                  style={playerSurfaceStyles}
                >
                  <div className="pointer-events-none absolute inset-[1px] rounded-[calc(1.5rem-1px)] border border-[var(--profile-surface-ring)]" />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,var(--profile-surface-highlight)_0%,transparent_52%)] dark:bg-[radial-gradient(circle_at_18%_18%,rgba(15,23,42,0.18)_0%,transparent_52%)]" />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_42%,var(--profile-surface-shade)_100%)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.06)_0%,rgba(15,23,42,0.22)_100%)]" />
                  {canEditColor ? (
                    <button
                      type="button"
                      className="relative z-10 flex shrink-0 items-center justify-center rounded-full transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15"
                      data-testid={`player-color-button-${player.userId}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        openColorDialog(player);
                      }}
                      onKeyDown={(event) => {
                        event.stopPropagation();
                      }}
                    >
                      <ProfilePicture
                        user={player.user}
                        className={cn(
                          "border-none",
                          isWinner && "winner-avatar-ring",
                        )}
                      />
                    </button>
                  ) : (
                    <div className="relative z-10 flex shrink-0 items-center justify-center rounded-full">
                      <ProfilePicture
                        user={player.user}
                        className={cn(
                          "border-none",
                          isWinner && "winner-avatar-ring",
                        )}
                      />
                    </div>
                  )}
                  <div className="relative z-10 min-w-0 flex-1">
                    <div className="flex flex-col justify-center gap-1">
                      {isCompleted ? (
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[color:var(--profile-surface-muted-text)]">
                          {isNoScoreMode
                            ? isWinner
                              ? "Winner"
                              : "Player"
                            : `${getPlacementLabel(index)} place`}
                        </p>
                      ) : null}
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
                    </div>
                  </div>
                  {!isNoScoreMode && isCompleted ? (
                    <div className="relative z-10">
                      {showsRounds && activeRoundDelta !== undefined ? (
                        <div className="absolute top-1/2 -left-3 -translate-x-full -translate-y-1/2 shrink-0 rounded-full border border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel-border)] px-2 py-1 text-[0.65rem] font-black leading-none text-[color:var(--profile-surface-text)] shadow-sm">
                          {activeRoundDelta >= 0 ? "+" : ""}
                          {activeRoundDelta}
                        </div>
                      ) : null}
                      <div className="w-[5.5rem] rounded-[1.4rem] border border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] px-0 py-3 shadow-sm backdrop-blur-[2px]">
                        <div className="flex w-full items-center justify-center text-center">
                          <p className="text-3xl font-black text-[color:var(--profile-surface-text)]">
                            {getPlayerTotalScore(player)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : !isNoScoreMode && isCreator ? (
                    <Button
                      className="relative z-10 w-[5.5rem] overflow-visible rounded-[1.4rem] border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] px-0 py-3 text-[color:var(--profile-surface-text)] shadow-sm backdrop-blur-[2px]"
                      data-testid={`player-score-button-${player.userId}`}
                      disabled={isCompleted}
                      onClick={() => openScoreDialog(player)}
                      variant="outline"
                    >
                      {showsRounds && activeRoundDelta !== undefined ? (
                        <div className="absolute top-1/2 -left-3 -translate-x-full -translate-y-1/2 rounded-full border border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel-border)] px-2 py-1 text-[0.65rem] font-black leading-none text-[color:var(--profile-surface-text)] shadow-sm">
                          {activeRoundDelta >= 0 ? "+" : ""}
                          {activeRoundDelta}
                        </div>
                      ) : null}
                      <div className="flex w-full items-center justify-center text-center">
                        <span className="text-3xl font-black">
                          {getPlayerTotalScore(player)}
                        </span>
                      </div>
                    </Button>
                  ) : !isNoScoreMode ? (
                    <div
                      className="relative z-10 w-[5.5rem] overflow-visible rounded-[1.4rem] border border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] px-0 py-3 text-[color:var(--profile-surface-text)] shadow-sm backdrop-blur-[2px]"
                      data-testid={`player-score-display-${player.userId}`}
                    >
                      {showsRounds && activeRoundDelta !== undefined ? (
                        <div className="absolute top-1/2 -left-3 -translate-x-full -translate-y-1/2 rounded-full border border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel-border)] px-2 py-1 text-[0.65rem] font-black leading-none text-[color:var(--profile-surface-text)] shadow-sm">
                          {activeRoundDelta >= 0 ? "+" : ""}
                          {activeRoundDelta}
                        </div>
                      ) : null}
                      <div className="flex w-full items-center justify-center text-center">
                        <span className="text-3xl font-black">
                          {getPlayerTotalScore(player)}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
          {isCreator && !hasAnyRecordedScores ? (
            <Button
              className="h-16 w-full rounded-[1.7rem] border-dashed"
              onClick={() => {
                setPlayerSearch("");
                setIsAddPlayerOpen(true);
              }}
              type="button"
            >
              <UserPlus className="size-5" />
              Add players
            </Button>
          ) : null}
        </div>

        {!isCreator ? (
          <Card className="border-dashed bg-card/70 p-0">
            <CardContent className="px-4 py-4 text-sm text-slate-500">
              View Mode. Only the creator can update scores and manage the game.
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-3 sm:px-6">
        <div className="mx-auto w-full max-w-md rounded-[2rem] border border-border/80 bg-card/20 p-3 text-card-foreground shadow-[0_-14px_45px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:shadow-[0_-18px_50px_rgba(2,6,23,0.45)]">
          <div className="flex justify-between gap-2">
            {!isCompleted && (
              <Button
                className="h-16 w-fit min-w-20 flex-col gap-1 rounded-[1.4rem] text-[0.68rem] font-semibold tracking-[0.08em] uppercase"
                onClick={openExitConfirmation}
                variant="outline"
              >
                <Undo2 className="size-5" />
                Exit
              </Button>
            )}

            {isCompleted && (
              <Link className="w-fit" href="/dashboard">
                <Button
                  className="h-16 w-fit min-w-20 flex-col gap-1 rounded-[1.4rem] text-[0.68rem] font-semibold tracking-[0.08em] uppercase"
                  variant="outline"
                >
                  <DoorOpen className="size-5" />
                  Return
                </Button>
              </Link>
            )}
            {isCreator ? (
              <Button
                className={cn(
                  "h-16 w-fit min-w-20 flex-col gap-1 rounded-[1.4rem] text-[0.68rem] font-semibold tracking-[0.08em] uppercase",
                  isRoundScoringReady && "bg-primary text-primary-foreground",
                )}
                disabled={isCompleted}
                onClick={() => openRoundDialog()}
                variant={isRoundScoringReady ? "default" : "outline"}
              >
                {isCompleted || hasThresholdMet ? (
                  <Trophy className="size-5" />
                ) : (
                  <FastForward className="size-5" />
                )}
                {isCompleted
                  ? "Finished"
                  : isNoScoreMode
                    ? "Finish"
                    : showsRounds
                      ? "Round"
                      : isFreePlay
                        ? "Score"
                        : "Round"}
              </Button>
            ) : null}

            {showsRounds && !isNoScoreMode ? (
              <Button
                className="h-16 w-fit min-w-20 flex-col gap-1 rounded-[1.4rem] text-[0.68rem] font-semibold tracking-[0.08em] uppercase"
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

      <Dialog
        onOpenChange={setIsDeleteGameDialogOpen}
        open={isDeleteGameDialogOpen}
      >
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-[2rem] p-5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              Delete this game?
            </DialogTitle>
            <DialogDescription className="text-base">
              This permanently removes the game and all recorded progress. This
              can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-transparent p-0 pt-2" showCloseButton>
            <Button
              disabled={isDeleteGamePending}
              onClick={handleDeleteGame}
              type="button"
              variant="destructive"
            >
              {isDeleteGamePending ? (
                <LoaderCircle className="animate-spin" />
              ) : null}
              Delete game
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setIsExitConfirmOpen} open={isExitConfirmOpen}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-[2rem] p-5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              Exit this game?
            </DialogTitle>
            <DialogDescription className="text-base">
              {isCompleted
                ? "You're just leaving the play screen. This game will still be here later if you want to review it again."
                : "You're just leaving the play screen. You can always resume the game later."}
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
            setScoreDialogState(null);
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
          </DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={handleScoreSubmit}>
            <div className="relative z-10 space-y-3">
              <div>
                <div className="rounded-[1.5rem] border border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] px-4 py-4 text-center shadow-sm">
                  <p className="text-6xl font-black">
                    {scoreDialogProjectedTotal}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--profile-surface-muted-text)]">
                    Total
                  </p>
                </div>
              </div>
              <div className="flex flex-col w-full items-center gap-1">
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
                    <Minus className="size-4" />
                  </Button>
                  <Input
                    autoFocus
                    className="h-18 rounded-[1.5rem] border border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] text-center text-4xl font-black shadow-inner ring-0 placeholder:text-[color:var(--profile-surface-muted-text)]"
                    inputMode="numeric"
                    onFocus={(event) => {
                      if (
                        (parseScoreAmountInput(scoreAmountInput) ?? 0) === 0
                      ) {
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
                    <Plus className="size-4" />
                  </Button>
                </div>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--profile-surface-muted-text)]">
                  Round {scoreDialogRoundNumber}
                </p>
              </div>
            </div>

            <DialogFooter className="flex-row items-stretch gap-3 bg-transparent pl-2 pt-2 sm:flex-row sm:justify-stretch">
              <Button
                className="min-w-0 basis-1/4"
                disabled={scoreMutationPending}
                onClick={() => {
                  const scoreAmount =
                    parseScoreAmountInput(scoreAmountInput) ?? 0;
                  setScoreAmountInput(String(scoreAmount * -1));
                }}
                type="button"
                variant="outline"
              >
                <Diff className="size-4" />
              </Button>
              <Button
                className="min-w-0 basis-3/4"
                disabled={scoreMutationPending}
                variant="outline"
                type="submit"
              >
                {scoreMutationPending ? (
                  <LoaderCircle className="animate-spin" />
                ) : null}
                Confirm
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
            setIsAddPlayerMode(false);
            setPlayerSearch("");
          }
        }}
        open={isAddPlayerOpen}
      >
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-[2rem] p-0">
          <DialogHeader className="p-5 pb-0">
            <DialogTitle className="text-2xl font-black">
              {isAddPlayerMode ? "Add user" : "Manage users"}
            </DialogTitle>
          </DialogHeader>
          {isAddPlayerMode ? (
            <>
              <div className="px-5">
                <Button
                  className="w-full"
                  onClick={() => {
                    setIsAddPlayerMode(false);
                    setPlayerSearch("");
                  }}
                  type="button"
                  variant="outline"
                >
                  Back to users
                </Button>
              </div>
              <Command className="border-0 bg-transparent px-4">
                <CommandInput
                  className="text-lg"
                  onValueChange={setPlayerSearch}
                  placeholder="Search friends or guests"
                  value={playerSearch}
                />
                <CommandList className="max-h-[50vh]">
                  <CommandGroup
                    heading={
                      playerSearch.trim() ? "Matches" : "Suggested players"
                    }
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
                                <Users className="size-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                  {filteredPlayers.length === 0 ? (
                    <CommandEmpty>
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
                        Add {playerSearch} as guest
                      </Button>
                    </CommandEmpty>
                  ) : null}
                </CommandList>
              </Command>
            </>
          ) : (
            <div className="px-5 pb-4">
              <div className="rounded-3xl border border-border bg-muted/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Players
                  </p>
                  <Button
                    className="rounded-xl"
                    onClick={() => setIsAddPlayerMode(true)}
                    size="sm"
                    type="button"
                  >
                    <Plus className="size-4" />
                    Player
                  </Button>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {game.players.map((player) => {
                    const playerPending = pendingKeySet.has(
                      `remove-player:${player.userId}`,
                    );
                    const canRemoveSelf = player.userId !== currentUserId;
                    const disableRemoval =
                      game.players.length <= 1 || playerPending;

                    return (
                      <div
                        key={player.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-3 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <ProfilePicture
                            className="border-none"
                            size="xs"
                            user={player.user}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-foreground">
                              {getDisplayName(player.user)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {player.user.isGuest ? "Guest" : "Player"}
                            </p>
                          </div>
                        </div>
                        {canRemoveSelf ? (
                          <Button
                            className="rounded-xl"
                            data-testid={`remove-player-button-${player.userId}`}
                            disabled={disableRemoval}
                            onClick={() =>
                              openRemovePlayerDialog(player.userId)
                            }
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            {playerPending ? (
                              <LoaderCircle className="animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                            Remove
                          </Button>
                        ) : (
                          <Badge variant="outline">You</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="pt-4">
                <Button
                  className="w-full"
                  onClick={() => setIsAddPlayerOpen(false)}
                  type="button"
                  variant="outline"
                >
                  Back to game
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setRemovePlayerUserId(null);
          }
        }}
        open={Boolean(removePlayerDialogPlayer)}
      >
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-[2rem] p-5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              Remove this user?
            </DialogTitle>
            <DialogDescription className="text-base">
              {removePlayerDialogPlayer
                ? `${getDisplayName(removePlayerDialogPlayer.user)} will be removed from this game. Their recorded scores in this game will be removed too.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-transparent p-0 pt-2">
            <Button
              disabled={removePlayerPending}
              onClick={() => setRemovePlayerUserId(null)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={removePlayerPending}
              onClick={handleRemovePlayer}
              type="button"
              variant="destructive"
            >
              {removePlayerPending ? (
                <LoaderCircle className="animate-spin" />
              ) : null}
              Remove user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          setIsRoundDialogOpen(open);
          if (!open) {
            setRoundDialogIntent("round");
          }
        }}
        open={isRoundDialogOpen}
      >
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-[2rem] p-5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              {roundDialogIntent === "end-game"
                ? "End game"
                : isNoScoreMode && !showsRounds
                  ? "Finish game"
                  : hasThresholdMet || isRoundlessFreePlay
                    ? "End of game"
                    : `End of round ${nextRoundNumber}`}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{formatScoringSummary(game)}</Badge>
            <Badge variant="outline">{formatEndingSummary(game)}</Badge>
          </div>

          {isNoScoreMode && (
            <div className="rounded-3xl border border-border bg-muted/50 p-4">
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Pick the winner
              </p>
              <p className="mb-4 text-sm text-muted-foreground">
                Select one or more players. Multiple selections will be saved as
                a tie.
              </p>
              <div className="flex flex-col gap-2">
                {sortedPlayers.map((player) => {
                  const isSelected = selectedWinnerUserIds.includes(
                    player.userId,
                  );

                  return (
                    <button
                      key={player.userId}
                      className={cn(
                        "flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                        isSelected
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background text-foreground hover:bg-muted",
                      )}
                      onClick={() => toggleWinnerSelection(player.userId)}
                      type="button"
                    >
                      <span className="font-bold">
                        {getDisplayName(player.user)}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">
                        {isSelected ? "Winner" : "Select"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-sm font-medium text-foreground/80">
                {projectedWinnersLabel}
              </p>
            </div>
          )}

          {!isNoScoreMode &&
            (roundDialogIntent === "end-game" ||
              isRoundlessFreePlay ||
              hasThresholdMet) && (
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

          {!isNoScoreMode &&
            roundDialogIntent !== "end-game" &&
            !(isRoundlessFreePlay || hasThresholdMet) && (
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
                        {score.scoreDelta === null
                          ? 0
                          : `${score.scoreDelta > 0 ? "+" : ""}${score.scoreDelta}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          <DialogFooter
            className="bg-transparent p-0 pt-2"
            showCloseButton={roundDialogIntent === "end-game"}
          >
            {roundDialogIntent === "end-game" ? (
              <Button
                disabled={
                  commitRoundPending ||
                  (isNoScoreMode && selectedWinnerUserIds.length === 0)
                }
                onClick={() => handleCommitRound(true)}
              >
                {commitRoundPending ? (
                  <LoaderCircle className="animate-spin" />
                ) : null}
                End game
              </Button>
            ) : shouldOfferRoundPrompt ? (
              <>
                {!isNoScoreMode || showsRounds ? (
                  <Button
                    disabled={commitRoundPending}
                    onClick={() => handleCommitRound(false)}
                    variant="outline"
                  >
                    {commitRoundPending ? (
                      <LoaderCircle className="animate-spin" />
                    ) : null}
                    {showsRounds ? "Play another round" : "Save scores"}
                  </Button>
                ) : null}
                <Button
                  disabled={
                    commitRoundPending ||
                    (isNoScoreMode && selectedWinnerUserIds.length === 0)
                  }
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
                {isNoScoreMode
                  ? "Start next round"
                  : isRoundlessFreePlay
                    ? "End game"
                    : "Start next round"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={setIsRoundHistoryOpen}
        open={showsRounds && isRoundHistoryOpen}
      >
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-[2rem] p-5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              Score breakdown
            </DialogTitle>
            <DialogDescription>Tap to edit any round scores</DialogDescription>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto pr-1">
            {scorecardRounds.length > 0 ? (
              <div className="overflow-x-auto rounded-3xl border border-border bg-muted/50">
                <div
                  className="grid w-full min-w-max"
                  style={{
                    gridTemplateColumns: `3.5rem minmax(4.75rem, 0.9fr) repeat(${scorecardRounds.length}, minmax(4.25rem, 1fr))`,
                  }}
                >
                  <div className="sticky left-0 z-10 border-b border-r border-border bg-card px-3 py-3" />
                  <div className="border-b border-r border-border bg-muted px-3 py-3 text-center text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                    Total
                  </div>
                  {scorecardRounds.map((round) => (
                    <div
                      key={round.id}
                      className="border-b border-r border-border bg-muted px-3 py-3 text-center text-xs font-black uppercase tracking-[0.18em] text-muted-foreground"
                    >
                      <span>
                        R{round.roundNumber}
                        {round.roundNumber === nextRoundNumber && !isCompleted
                          ? " (current)"
                          : ""}
                      </span>
                    </div>
                  ))}

                  {scorecardPlayers.map((player) => (
                    <Fragment key={player.id}>
                      <div
                        className="sticky left-0 z-10 flex items-center justify-center overflow-hidden border-r border-b border-border bg-card px-2 py-3"
                        title={getDisplayName(player.user)}
                      >
                        <ProfilePicture size="xs" user={player.user} />
                      </div>
                      <div className="flex items-center justify-center border-r border-b border-border bg-muted/60 px-2 py-3 text-center text-sm font-black text-foreground">
                        {getPlayerTotalScore(player)}
                      </div>
                      {scorecardRounds.map((round) => {
                        const roundScore = (round.scores ?? []).find(
                          (score) => score.userId === player.userId,
                        )?.scoreDelta;

                        return (
                          <button
                            key={`${round.id}-${player.userId}`}
                            className={cn(
                              "flex min-h-12 items-center justify-center border-r border-b border-border px-2 py-3 text-center text-sm font-medium text-foreground/80",
                              isCreator &&
                                !isCompleted &&
                                "cursor-pointer hover:bg-background/70",
                            )}
                            disabled={
                              !isCreator || isCompleted || isNoScoreMode
                            }
                            onClick={() =>
                              openRoundScoreDialog({
                                playerId: player.userId,
                                roundNumber: round.roundNumber,
                              })
                            }
                            type="button"
                          >
                            {roundScore === undefined
                              ? "-"
                              : `${roundScore > 0 ? "+" : ""}${roundScore}`}
                          </button>
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>
            ) : (
              <CardEmpty className="rounded-3xl border border-dashed border-border bg-muted/30 py-10 text-center">
                Nothing here yet. Scores will show up after the first round.
              </CardEmpty>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
