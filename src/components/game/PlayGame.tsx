"use client";

import {
  approveGameJoinRequest,
  addGamePlayer,
  addGuestGamePlayer,
  commitGameRound,
  completeGame,
  declineGameJoinRequest,
  deleteCreatedGame,
  getPlayGameSnapshot,
  pauseGame,
  reopenCompletedGame,
  removeGamePlayer,
  resumeGame,
  setGameInviteUsersEnabled,
  setGamePlayerRole,
  uneliminateGamePlayer,
  updateRecordedRoundItemizedScore,
  updateRecordedRoundScore,
  upsertActiveRoundItemizedScore,
  upsertActiveRoundScore,
} from "@/app/actions/game";
import { updateOwnedGuestColor } from "@/app/actions/user";
import GameTitleImage from "@/components/game/game-title-image";
import { PlayerRankDeltaBadge } from "@/components/player-rank/player-rank-delta-badge";
import { PlayerRankPodium } from "@/components/player-rank/player-rank-podium";
import { getProfileColorSurfaceStyles } from "@/components/profile/profile-color-styles";
import {
  PROFILE_COLORS,
  ProfileColorSelector,
} from "@/components/profile/profile-color-selector";
import { ShareQrPanel } from "@/components/profile/friend-invite-share-card";
import ProfilePicture from "@/components/profile/profile-picture";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardEmpty, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RematchButton } from "@/components/game/rematch-button";
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
import type { GameForPlayPage } from "@/lib/db/store/game.store";
import type { GamePlayerStartingScoreMode } from "@/lib/db/store/game.store";
import type { GameJoinRequestFull } from "@/lib/db/store/game-join-request.store";
import type { PlayerRankGameDelta } from "@/lib/db/store/player-rank.store";
import type { UserBase } from "@/lib/db/store/user.store";
import {
  buildItemizedPlayerBreakdowns,
  evaluateItemizedCategoryFormula,
  parsePersistedItemizedValues,
  type ItemizedCategoryDefinition,
} from "@/lib/game/itemized-scoring";
import {
  hasGameMetScoreThreshold,
  getWinningUserIds,
  willGameOfferRoundPrompt,
} from "@/lib/game/v1";
import {
  isGameSettingsV2EndGameTally,
  parseGameSettingsV2,
  usesGameSettingsV2ItemizedScoring,
} from "@/lib/game/v2";
import {
  applyPlayGameMutation,
  applyPlayGameMutations,
  type PlayGameMutation,
  type PlayGameSnapshot,
} from "@/components/game/play-game-state";
import {
  deriveRemotePlayGameEvents,
  filterLocalRemotePlayGameEvents,
  getRemoteHighlightTarget,
  summarizeRemotePlayGameEvents,
} from "@/components/game/play-game-live-updates";
import {
  ChevronLeft,
  Check,
  Delete,
  DoorOpen,
  FastForward,
  ListChecks,
  LoaderCircle,
  Minus,
  Pause,
  Plus,
  Play,
  Settings2,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  X,
  Send,
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
import Image from "next/image";
import { GameCardRewardCta } from "@/components/card/skyjo-reward-cta";
import type { EffectiveGamePlayerRole } from "@/lib/game/player-roles";
import { getStoredGamePlayerRole } from "@/lib/game/player-roles";
import type { GamePlayerRole } from "@/lib/db/schema";

export type PlayGameProps = {
  cardsEnabled?: boolean;
  canManageLiveGame: boolean;
  canEditOwnScore?: boolean;
  compatibilityConfig?: {
    allowAnyVersion?: boolean;
    liveMode?: "standard" | "round_winner" | "elimination";
    requiresScoredTieBreak?: boolean;
  };
  currentUserId: string;
  gameSharePath: string | null;
  isCreator: boolean;
  isManager: boolean;
  effectiveRole?: EffectiveGamePlayerRole;
  pendingJoinRequests: GameJoinRequestFull[];
  playerOptions: UserBase[];
  playerRankDeltas: PlayerRankGameDelta[];
  game: GameForPlayPage;
};

type ScoreDialogRoundState = {
  kind: "round";
  playerId: string;
  roundNumber: number;
  mode: "active" | "history";
};

type ScoreDialogItemizedState = {
  kind: "itemized";
  mode: "active" | "history" | "end_game";
  playerId: string;
  roundNumber: number | null;
  categoryId: string | null;
  step: "category_list" | "category_detail" | "optional_confirm";
};

type ScoreDialogState = ScoreDialogRoundState | ScoreDialogItemizedState;

type RoundDialogIntent = "round" | "end-game";

type NoScorePlacement = 1 | 2 | 3;

type NoScorePlacementSelection = {
  placement: NoScorePlacement;
  userIds: string[];
};

type PendingMutationEntry = {
  id: string;
  key: string;
  mutation: PlayGameMutation;
};

type ItemizedValueState = Record<string, string>;
type ItemizedUsageState = Record<string, boolean>;

const PAUSE_WITHOUT_NEXT_PLAYER = "__pause-without-next-player__";

type AddPlayerSelection =
  | {
      type: "existing";
      user: UserBase;
    }
  | {
      type: "guest";
      color: string;
      firstName: string;
      lastName?: string;
      rawName: string;
      optimisticUser: UserBase;
    };

type RecentLocalMutationKey = {
  expiresAt: number;
  key: string;
};

type LiveHighlightState = {
  gameStatus: boolean;
  playerIds: string[];
  roster: boolean;
  scoreUserIds: string[];
};

type SpecialLiveMode = "standard" | "round_winner" | "elimination";

const SCORE_DRAWER_KEYBOARD_MAX_HEIGHT_CLASS = "max-h-[360px]";
const SCORE_DRAWER_KEYBOARD_MAX_HEIGHT = "360px";
const SCORE_DRAWER_CLOSE_DURATION_MS = 120;
const ACTIVE_RECONCILE_INTERVAL_MS = 2000;
const REMOTE_HIGHLIGHT_DURATION_MS = 1600;
const RECENT_LOCAL_MUTATION_MS = 5000;

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

function getPlacementLabel(place: number) {
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

function createEmptyNoScorePlacementSelections(): Record<
  NoScorePlacement,
  string[]
> {
  return {
    1: [],
    2: [],
    3: [],
  };
}

function buildNoScorePlacementSelections(
  placements: Record<NoScorePlacement, string[]>,
) {
  return ([1, 2, 3] as const)
    .map((placement) => {
      const userIds = placements[placement];

      return userIds.length > 0
        ? {
            placement,
            userIds,
          }
        : null;
    })
    .filter(
      (selection): selection is NoScorePlacementSelection => selection !== null,
    );
}

function createNoScorePlacementsFromGame(game: GameForPlayPage) {
  const placements = createEmptyNoScorePlacementSelections();

  for (const resultPlacement of game.resultPlacements) {
    if (resultPlacement.placement >= 1 && resultPlacement.placement <= 3) {
      placements[resultPlacement.placement as NoScorePlacement] = [
        ...placements[resultPlacement.placement as NoScorePlacement],
        resultPlacement.userId,
      ];
    }
  }

  if (placements[1].length === 0 && game.winners.length > 0) {
    placements[1] = game.winners.map((winner) => winner.userId);
  }

  return placements;
}

function buildEliminationPlacements(input: {
  game: GameForPlayPage;
  eliminatedUserId: string;
}) {
  const eliminatedOrder = [
    ...input.game.eliminations.map((entry) => ({
      placement: entry.placement,
      userId: entry.eliminatedUserId,
    })),
    {
      placement: input.game.players.length - input.game.eliminations.length,
      userId: input.eliminatedUserId,
    },
  ];

  const remainingUserIds = input.game.players
    .map((player) => player.userId)
    .filter(
      (userId) =>
        userId !== input.eliminatedUserId &&
        !input.game.eliminations.some(
          (entry) => entry.eliminatedUserId === userId,
        ),
    );

  if (remainingUserIds.length === 1) {
    eliminatedOrder.push({
      placement: 1,
      userId: remainingUserIds[0]!,
    });
  }

  return [1, 2, 3]
    .map((placement) => {
      const userIds = eliminatedOrder
        .filter((entry) => entry.placement === placement)
        .map((entry) => entry.userId);

      return userIds.length > 0
        ? {
            placement: placement as 1 | 2 | 3,
            userIds,
          }
        : null;
    })
    .filter(
      (entry): entry is { placement: 1 | 2 | 3; userIds: string[] } =>
        entry !== null,
    );
}

function getStartingScoreAmount(input: {
  mode: GamePlayerStartingScoreMode;
  players: Array<{ score: number | null | undefined }>;
  scoringMode: GameForPlayPage["scoringMode"];
}) {
  const scores = input.players.map((player) => getPlayerTotalScore(player));

  if (input.mode === "none" || scores.length === 0) {
    return 0;
  }

  if (input.mode === "highest") {
    return input.scoringMode === "highest_wins"
      ? Math.min(...scores)
      : Math.max(...scores);
  }

  const total = scores.reduce((sum, score) => sum + score, 0);
  return Math.round(total / scores.length);
}

function getCompletedPlacements(input: {
  players: Array<{ userId: string; score: number | null | undefined }>;
}) {
  const placementByUserId = new Map<string, number>();
  let currentPlace = 0;
  let previousScore: number | null = null;

  input.players.forEach((player) => {
    const score = getPlayerTotalScore(player);

    if (previousScore === null || score !== previousScore) {
      currentPlace += 1;
      previousScore = score;
    }

    placementByUserId.set(player.userId, currentPlace);
  });

  return placementByUserId;
}

function buildInitialSnapshot(props: PlayGameProps): PlayGameSnapshot {
  return {
    canManageLiveGame: props.canManageLiveGame,
    canEditOwnScore: props.canEditOwnScore ?? props.canManageLiveGame,
    currentUserId: props.currentUserId,
    gameSharePath: props.gameSharePath,
    isCreator: props.isCreator,
    isManager: props.isManager,
    effectiveRole:
      props.effectiveRole ??
      (props.isCreator ? "creator" : props.isManager ? "manager" : "player"),
    pendingJoinRequests: props.pendingJoinRequests,
    playerOptions: props.playerOptions,
    playerRankDeltas: props.playerRankDeltas,
    game: props.game,
  };
}

function createTemporaryGuestUser(input: {
  color: string;
  currentUserId: string;
  firstName: string;
  lastName?: string;
}) {
  const timestamp = nowIso();

  return {
    id: `optimistic-guest-${timestamp}`,
    clerkUserId: null,
    friendInviteToken: null,
    profileCardId: null,
    color: input.color,
    role: "user" as const,
    email: null,
    avatarUrl: null,
    firstName: input.firstName,
    lastName: input.lastName ?? null,
    created_by_user_id: input.currentUserId,
    mergedIntoUserId: null,
    mergedAt: null,
    isProfileComplete: true,
    isGuest: true,
    playerRankLeaderboardDisabled: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  } satisfies UserBase;
}

function nowIso() {
  return new Date().toISOString();
}

function getDefaultGuestColor() {
  return PROFILE_COLORS[0] ?? "#2563eb";
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

function appendScoreAmountDigit(currentValue: string, digit: number) {
  const normalizedValue = normalizeScoreAmountInput(currentValue);

  if (normalizedValue === "" || normalizedValue === "0") {
    return String(digit);
  }

  if (normalizedValue === "-0") {
    return `-${digit}`;
  }

  return `${normalizedValue}${digit}`;
}

function removeScoreAmountDigit(currentValue: string) {
  const normalizedValue = normalizeScoreAmountInput(currentValue);

  if (!normalizedValue || normalizedValue === "0") {
    return "0";
  }

  const nextValue = normalizedValue.slice(0, -1);

  if (!nextValue || nextValue === "-") {
    return "0";
  }

  return nextValue;
}

function toggleScoreAmountSign(currentValue: string) {
  const scoreAmount = parseScoreAmountInput(currentValue) ?? 0;

  if (scoreAmount === 0) {
    return "0";
  }

  return String(scoreAmount * -1);
}

function buildItemizedScopeKey(
  input: { kind: "game" } | { kind: "round"; roundNumber: number },
) {
  return input.kind === "game" ? "game" : `round:${input.roundNumber}`;
}

function buildItemizedValueKey(
  scopeKey: string,
  userId: string,
  categoryId: string,
  inputKey: string,
) {
  return `${scopeKey}:${userId}:${categoryId}:${inputKey}`;
}

function createItemizedValueState(input: {
  categories: ItemizedCategoryDefinition[];
  game: GameForPlayPage;
  scope: { kind: "game" } | { kind: "round"; roundNumber: number };
}) {
  const nextState: ItemizedValueState = {};
  const scopeKey = buildItemizedScopeKey(input.scope);
  let targetRoundId: string | null = null;

  if (input.scope.kind === "round") {
    const roundNumber = input.scope.roundNumber;
    targetRoundId =
      input.game.rounds.find((round) => round.roundNumber === roundNumber)
        ?.id ?? null;
  }
  const persistedEntriesByKey = new Map(
    input.game.itemizedScoreEntries
      .filter((entry) =>
        input.scope.kind === "game"
          ? !entry.gameRoundId
          : entry.gameRoundId === targetRoundId,
      )
      .map((entry) => [
        `${entry.userId}:${entry.categoryId}`,
        parsePersistedItemizedValues(entry.valuesJson),
      ]),
  );

  for (const player of input.game.players) {
    for (const category of input.categories) {
      const persistedValues =
        persistedEntriesByKey.get(`${player.userId}:${category.id}`) ?? {};

      for (const categoryInput of category.inputs) {
        const persistedValue =
          persistedValues[categoryInput.key] ?? categoryInput.defaultValue;
        nextState[
          buildItemizedValueKey(
            scopeKey,
            player.userId,
            category.id,
            categoryInput.key,
          )
        ] = String(persistedValue);
      }
    }
  }

  return nextState;
}

function buildItemizedCategoryScoreKey(userId: string, categoryId: string) {
  return `${userId}:${categoryId}`;
}

function buildItemizedUsageKey(
  scopeKey: string,
  userId: string,
  categoryId: string,
) {
  return `${scopeKey}:${userId}:${categoryId}`;
}

export default function PlayGame(props: PlayGameProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isItemizedCompletePending, startItemizedCompleteTransition] =
    useTransition();
  const [isDeleteGamePending, startDeleteGameTransition] = useTransition();
  const [isInviteTogglePending, startInviteToggleTransition] = useTransition();
  const [scoreDialogState, setScoreDialogState] =
    useState<ScoreDialogState | null>(null);
  const [isScoreDrawerOpen, setIsScoreDrawerOpen] = useState(false);
  const [scoreAmountInput, setScoreAmountInput] = useState("0");
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [isAddPlayerMode, setIsAddPlayerMode] = useState(false);
  const [addPlayerSelection, setAddPlayerSelection] =
    useState<AddPlayerSelection | null>(null);
  const [customStartingScoreInput, setCustomStartingScoreInput] = useState("0");
  const [removePlayerUserId, setRemovePlayerUserId] = useState<string | null>(
    null,
  );
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [pausedNextUserIdSelection, setPausedNextUserIdSelection] =
    useState<string>(PAUSE_WITHOUT_NEXT_PLAYER);
  const [isRoundDialogOpen, setIsRoundDialogOpen] = useState(false);
  const [roundDialogIntent, setRoundDialogIntent] =
    useState<RoundDialogIntent>("round");
  const [pendingEliminationUserId, setPendingEliminationUserId] = useState<
    string | null
  >(null);
  const [isRoundHistoryOpen, setIsRoundHistoryOpen] = useState(false);
  const [isHeaderDrawerOpen, setIsHeaderDrawerOpen] = useState(false);
  const [isShareDrawerOpen, setIsShareDrawerOpen] = useState(false);
  const [isDeleteGameDialogOpen, setIsDeleteGameDialogOpen] = useState(false);
  const [isReopenConfirmOpen, setIsReopenConfirmOpen] = useState(false);
  const [restoreEliminationUserId, setRestoreEliminationUserId] = useState<
    string | null
  >(null);
  const [pendingJoinRequestApprovalId, setPendingJoinRequestApprovalId] =
    useState<string | null>(null);
  const [pendingJoinRequestIds, setPendingJoinRequestIds] = useState<string[]>(
    [],
  );
  const [colorDialogPlayerId, setColorDialogPlayerId] = useState<string | null>(
    null,
  );
  const [selectedGuestColor, setSelectedGuestColor] = useState<string | null>(
    null,
  );
  const [selectedNoScorePlacements, setSelectedNoScorePlacements] = useState<
    Record<NoScorePlacement, string[]>
  >(() => createEmptyNoScorePlacementSelections());
  const [activeNoScorePlacement, setActiveNoScorePlacement] =
    useState<NoScorePlacement>(1);
  const [confirmedNoScorePlacements, setConfirmedNoScorePlacements] = useState<
    NoScorePlacement[]
  >([]);
  const [pendingManagerUserIds, setPendingManagerUserIds] = useState<string[]>(
    [],
  );
  const [itemizedValueState, setItemizedValueState] =
    useState<ItemizedValueState>({});
  const [itemizedUsageState, setItemizedUsageState] =
    useState<ItemizedUsageState>({});
  const [liveHighlights, setLiveHighlights] = useState<LiveHighlightState>({
    gameStatus: false,
    playerIds: [],
    roster: false,
    scoreUserIds: [],
  });
  const [playerSearch, setPlayerSearch] = useState("");
  const [baseSnapshot, setBaseSnapshot] = useState<PlayGameSnapshot>(() =>
    buildInitialSnapshot(props),
  );
  const [pendingMutations, setPendingMutations] = useState<
    PendingMutationEntry[]
  >([]);
  const deferredPlayerSearch = useDeferredValue(playerSearch);
  const scoreDrawerCloseTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

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
  const recentLocalMutationKeysRef = useRef<RecentLocalMutationKey[]>([]);
  const clearLiveHighlightsTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  useEffect(() => {
    baseSnapshotRef.current = baseSnapshot;
  }, [baseSnapshot]);

  useEffect(() => {
    pendingMutationsRef.current = pendingMutations;
  }, [pendingMutations]);

  useEffect(() => {
    return () => {
      if (scoreDrawerCloseTimeoutRef.current) {
        clearTimeout(scoreDrawerCloseTimeoutRef.current);
      }

      if (clearLiveHighlightsTimeoutRef.current) {
        clearTimeout(clearLiveHighlightsTimeoutRef.current);
      }
    };
  }, []);

  const snapshot = optimisticSnapshot;
  const canManageLiveGame = snapshot.canManageLiveGame;
  const game = snapshot.game;
  const gameSettingsV2 = useMemo(
    () =>
      game.version === "v2" ? parseGameSettingsV2(game.settingsJson) : null,
    [game.settingsJson, game.version],
  );
  const itemizedCategories = useMemo(
    () =>
      gameSettingsV2 && usesGameSettingsV2ItemizedScoring(gameSettingsV2)
        ? gameSettingsV2.itemizedCategories
        : [],
    [gameSettingsV2],
  );
  const isItemizedGame = itemizedCategories.length > 0;
  const isItemizedEndGameTally = Boolean(
    gameSettingsV2 && isGameSettingsV2EndGameTally(gameSettingsV2),
  );
  const specialLiveMode: SpecialLiveMode =
    props.compatibilityConfig?.liveMode ?? "standard";
  const isRoundWinnerMode = specialLiveMode === "round_winner";
  const isEliminationMode = specialLiveMode === "elimination";
  const requiresScoredTieBreak = Boolean(
    props.compatibilityConfig?.requiresScoredTieBreak,
  );
  const currentUserId = snapshot.currentUserId;
  const canEditPlayerScore = (userId: string) =>
    canManageLiveGame ||
    Boolean(snapshot.canEditOwnScore && currentUserId === userId);
  const gameSharePath = snapshot.gameSharePath;
  const pendingJoinRequests = snapshot.pendingJoinRequests;
  const playerRankDeltasByUserId = useMemo(
    () =>
      new Map(
        snapshot.playerRankDeltas.map(
          (delta) => [delta.userId, delta] as const,
        ),
      ),
    [snapshot.playerRankDeltas],
  );
  const isCreator = snapshot.isCreator;
  const isManager = snapshot.isManager;
  const isCompleted = Boolean(game.completedAt);
  const isPaused = Boolean(game.pausedAt);
  const pendingKeySet = useMemo(
    () => new Set(pendingMutations.map((entry) => entry.key)),
    [pendingMutations],
  );

  useEffect(() => {
    if (!isItemizedGame) {
      return;
    }

    const scope = isItemizedEndGameTally
      ? ({ kind: "game" } as const)
      : ({ kind: "round", roundNumber: game.completedRounds + 1 } as const);
    const scopeKey = buildItemizedScopeKey(scope);

    if (
      Object.keys(itemizedValueState).some((key) =>
        key.startsWith(`${scopeKey}:`),
      )
    ) {
      return;
    }

    setItemizedValueState((current) => ({
      ...current,
      ...createItemizedValueState({
        categories: itemizedCategories,
        game,
        scope,
      }),
    }));
  }, [
    game,
    game.completedRounds,
    isItemizedEndGameTally,
    isItemizedGame,
    itemizedCategories,
    itemizedValueState,
  ]);

  const currentPlayerIds = useMemo(
    () => new Set(game.players.map((player) => player.userId)),
    [game.players],
  );
  const pausedNextPlayer = useMemo(
    () =>
      game.pausedNextUserId
        ? (game.players.find(
            (player) => player.userId === game.pausedNextUserId,
          ) ?? null)
        : null,
    [game.pausedNextUserId, game.players],
  );
  const winnerIds = useMemo(
    () => new Set(game.winners.map((winner) => winner.userId)),
    [game.winners],
  );
  const highlightedPlayerIdSet = useMemo(
    () => new Set(liveHighlights.playerIds),
    [liveHighlights.playerIds],
  );
  const highlightedScoreUserIdSet = useMemo(
    () => new Set(liveHighlights.scoreUserIds),
    [liveHighlights.scoreUserIds],
  );
  const isNoScoreMode = game.scoringMode === "no_score";
  const activeEliminations = useMemo(
    () =>
      gameSettingsV2?.scoringType === "elimination" &&
      gameSettingsV2.roundConfig.enabled
        ? game.eliminations.filter(
            (entry) => entry.roundNumber === game.completedRounds + 1,
          )
        : game.eliminations,
    [game.completedRounds, game.eliminations, gameSettingsV2],
  );
  const eliminatedUserIds = useMemo(
    () => new Set(activeEliminations.map((entry) => entry.eliminatedUserId)),
    [activeEliminations],
  );
  const remainingEliminationUserIds = useMemo(
    () =>
      game.players
        .map((player) => player.userId)
        .filter((userId) => !eliminatedUserIds.has(userId)),
    [eliminatedUserIds, game.players],
  );
  const pendingEliminationPlayer = useMemo(
    () =>
      game.players.find(
        (player) => player.userId === pendingEliminationUserId,
      ) ?? null,
    [game.players, pendingEliminationUserId],
  );
  const pendingEliminationWinner = useMemo(() => {
    if (!pendingEliminationUserId) {
      return null;
    }

    const winnerUserId = remainingEliminationUserIds.find(
      (userId) => userId !== pendingEliminationUserId,
    );

    return (
      game.players.find((player) => player.userId === winnerUserId) ?? null
    );
  }, [game.players, pendingEliminationUserId, remainingEliminationUserIds]);
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
  const gameHasStarted = hasAnyRecordedScores || game.completedRounds > 0;
  const shareJoinOpen = game.inviteUsersEnabled && !gameHasStarted;
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
        [player.firstName, player.lastName].filter(Boolean).join(" "),
      );

      return haystack.includes(query);
    });
  }, [availablePlayers, deferredPlayerSearch]);
  const previousCompletedRoundNumber =
    game.completedRounds > 0 ? game.completedRounds : null;
  const previousCompletedRound = useMemo(
    () =>
      previousCompletedRoundNumber === null
        ? null
        : (game.rounds.find(
            (round) => round.roundNumber === previousCompletedRoundNumber,
          ) ?? null),
    [game.rounds, previousCompletedRoundNumber],
  );
  const hasStartedRoundScoring =
    previousCompletedRound !== null &&
    previousCompletedRound.scores.length > 0 &&
    game.players.some((player) => getPlayerTotalScore(player) !== 0);
  const canOfferStartingScoreOptions =
    !isCompleted &&
    !isPaused &&
    showsRounds &&
    game.players.length > 0 &&
    hasStartedRoundScoring;
  const startingScoreOptions = useMemo(
    () =>
      [
        {
          mode: "average" as const,
          label: "Average score",
          value: getStartingScoreAmount({
            mode: "average",
            players: game.players,
            scoringMode: game.scoringMode,
          }),
        },
        {
          mode: "highest" as const,
          label:
            game.scoringMode === "highest_wins"
              ? "Lowest score"
              : "Highest score",
          value: getStartingScoreAmount({
            mode: "highest",
            players: game.players,
            scoringMode: game.scoringMode,
          }),
        },
        {
          mode: "custom" as const,
          label: "Custom",
          value: null,
        },
      ] satisfies Array<{
        mode: GamePlayerStartingScoreMode;
        label: string;
        value: number | null;
      }>,
    [game.players, game.scoringMode],
  );
  const sortedPlayers = useMemo(() => {
    const players = [...game.players];

    if (game.scoringMode === "no_score") {
      if (isEliminationMode && !game.completedAt) {
        players.sort((left, right) => {
          const leftEliminated = eliminatedUserIds.has(left.userId);
          const rightEliminated = eliminatedUserIds.has(right.userId);

          if (leftEliminated !== rightEliminated) {
            return leftEliminated ? 1 : -1;
          }

          if (leftEliminated && rightEliminated) {
            const leftPlacement =
              game.eliminations.find(
                (entry) => entry.eliminatedUserId === left.userId,
              )?.placement ?? Number.POSITIVE_INFINITY;
            const rightPlacement =
              game.eliminations.find(
                (entry) => entry.eliminatedUserId === right.userId,
              )?.placement ?? Number.POSITIVE_INFINITY;

            return rightPlacement - leftPlacement;
          }

          return getDisplayName(left.user).localeCompare(
            getDisplayName(right.user),
          );
        });

        return players;
      }

      if (game.completedAt) {
        const recordedPlacementByUserId = new Map(
          game.resultPlacements.map((placement) => [
            placement.userId,
            placement.placement,
          ]),
        );
        players.sort((left, right) => {
          const leftPlacement =
            recordedPlacementByUserId.get(left.userId) ??
            (winnerIds.has(left.userId) ? 1 : Number.POSITIVE_INFINITY);
          const rightPlacement =
            recordedPlacementByUserId.get(right.userId) ??
            (winnerIds.has(right.userId) ? 1 : Number.POSITIVE_INFINITY);

          if (leftPlacement === rightPlacement) {
            return 0;
          }

          return leftPlacement - rightPlacement;
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
    game.eliminations,
    game.players,
    game.resultPlacements,
    game.scoringMode,
    isEliminationMode,
    eliminatedUserIds,
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
    scoreDialogState?.kind === "round"
      ? scoreDialogState.roundNumber
      : nextRoundNumber;
  const selectedItemizedCategory = useMemo(
    () =>
      scoreDialogState?.kind === "itemized" && scoreDialogState.categoryId
        ? (itemizedCategories.find(
            (category) => category.id === scoreDialogState.categoryId,
          ) ?? null)
        : null,
    [itemizedCategories, scoreDialogState],
  );
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
  const restoreEliminationPlayer = useMemo(
    () =>
      game.players.find(
        (player) => player.userId === restoreEliminationUserId,
      ) ?? null,
    [game.players, restoreEliminationUserId],
  );
  const scorecardPlayers = useMemo(() => [...sortedPlayers], [sortedPlayers]);
  const completedPlacementByUserId = useMemo(() => {
    if (game.completedAt === null) {
      return new Map<string, number>();
    }

    if (game.scoringMode === "no_score") {
      return new Map(
        game.resultPlacements.map((placement) => [
          placement.userId,
          placement.placement,
        ]),
      );
    }

    return getCompletedPlacements({ players: sortedPlayers });
  }, [
    game.completedAt,
    game.resultPlacements,
    game.scoringMode,
    sortedPlayers,
  ]);
  const completedNoScoreHasPodiumPlacements = useMemo(
    () => game.resultPlacements.some((placement) => placement.placement > 1),
    [game.resultPlacements],
  );
  const completedPodiumEntries = useMemo(() => {
    if (!isCompleted) {
      return [];
    }

    const podiumPlayers = isNoScoreMode
      ? completedNoScoreHasPodiumPlacements
        ? sortedPlayers.filter((player) =>
            completedPlacementByUserId.has(player.userId),
          )
        : sortedPlayers.filter((player) => winnerIds.has(player.userId))
      : sortedPlayers.slice(0, 3);

    return podiumPlayers.slice(0, 3).map((player, index) => {
      const position = isNoScoreMode
        ? (completedPlacementByUserId.get(player.userId) ??
          (winnerIds.has(player.userId) ? 1 : index + 1))
        : (completedPlacementByUserId.get(player.userId) ?? index + 1);

      return {
        id: player.id,
        position,
        displayName: getDisplayName(player.user),
        value: isNoScoreMode
          ? completedNoScoreHasPodiumPlacements
            ? getPlacementLabel(position)
            : winnerIds.has(player.userId)
              ? "Win"
              : "Player"
          : String(getPlayerTotalScore(player)),
        user: player.user,
        linkToProfile: !player.user.isGuest,
      };
    });
  }, [
    completedNoScoreHasPodiumPlacements,
    completedPlacementByUserId,
    isCompleted,
    isNoScoreMode,
    sortedPlayers,
    winnerIds,
  ]);
  const selectedWinnerUserIds = selectedNoScorePlacements[1];
  const requiresPlacementBuilder = isNoScoreMode || requiresScoredTieBreak;
  const selectedNoScorePlacementSelections = useMemo(
    () => buildNoScorePlacementSelections(selectedNoScorePlacements),
    [selectedNoScorePlacements],
  );
  const selectedNoScoreUserIdSet = useMemo(
    () =>
      new Set(
        Object.values(selectedNoScorePlacements).flatMap((userIds) => userIds),
      ),
    [selectedNoScorePlacements],
  );
  const selectedNoScoreUserIdsForActivePlacement = useMemo(
    () => new Set(selectedNoScorePlacements[activeNoScorePlacement]),
    [activeNoScorePlacement, selectedNoScorePlacements],
  );
  const selectableNoScorePlayers = useMemo(
    () =>
      sortedPlayers.filter((player) => {
        if (selectedNoScoreUserIdsForActivePlacement.has(player.userId)) {
          return true;
        }

        return !selectedNoScoreUserIdSet.has(player.userId);
      }),
    [
      selectedNoScoreUserIdSet,
      selectedNoScoreUserIdsForActivePlacement,
      sortedPlayers,
    ],
  );
  const canSelectThirdPlace = selectedNoScorePlacements[2].length > 0;
  const shouldOfferRoundPrompt = useMemo(
    () => willGameOfferRoundPrompt(game),
    [game],
  );
  const hasThresholdMet = useMemo(() => hasGameMetScoreThreshold(game), [game]);
  const projectedWinnerIds = useMemo(() => {
    if (game.scoringMode === "no_score" || requiresScoredTieBreak) {
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
    if (game.scoringMode === "no_score" || requiresScoredTieBreak) {
      const winnerNames = sortedPlayers
        .filter((player) => projectedWinnerIds.has(player.userId))
        .map((player) => getDisplayName(player.user));

      if (winnerNames.length === 0) {
        return "Choose at least one 1st-place winner";
      }

      const secondPlaceCount = selectedNoScorePlacements[2].length;
      const thirdPlaceCount = selectedNoScorePlacements[3].length;

      if (winnerNames.length === 1) {
        const suffix =
          secondPlaceCount > 0 || thirdPlaceCount > 0
            ? ` with ${secondPlaceCount} in 2nd and ${thirdPlaceCount} in 3rd`
            : "";
        return `${winnerNames[0]} is selected to win${suffix}`;
      }

      if (winnerNames.length === 2) {
        const winnersLabel = `${winnerNames[0]} and ${winnerNames[1]} are selected to tie`;
        return secondPlaceCount > 0 || thirdPlaceCount > 0
          ? `${winnersLabel}. ${secondPlaceCount} in 2nd, ${thirdPlaceCount} in 3rd.`
          : winnersLabel;
      }

      const winnersLabel = `${winnerNames.slice(0, -1).join(", ")}, and ${winnerNames.at(-1)} are selected to tie`;
      return secondPlaceCount > 0 || thirdPlaceCount > 0
        ? `${winnersLabel}. ${secondPlaceCount} in 2nd, ${thirdPlaceCount} in 3rd.`
        : winnersLabel;
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
  }, [
    game.scoringMode,
    requiresScoredTieBreak,
    projectedWinnerIds,
    selectedNoScorePlacements,
    sortedPlayers,
  ]);
  const activeItemizedScope = isItemizedEndGameTally
    ? ({ kind: "game" } as const)
    : ({ kind: "round", roundNumber: nextRoundNumber } as const);
  const activeItemizedScopeKey = buildItemizedScopeKey(activeItemizedScope);
  const scoreDialogItemizedScope =
    scoreDialogState?.kind === "itemized"
      ? scoreDialogState.mode === "end_game" ||
        scoreDialogState.roundNumber === null
        ? ({ kind: "game" } as const)
        : ({
            kind: "round",
            roundNumber: scoreDialogState.roundNumber,
          } as const)
      : activeItemizedScope;
  const scoreDialogItemizedScopeKey = buildItemizedScopeKey(
    scoreDialogItemizedScope,
  );
  function getOptionalItemizedUsage(input: {
    category: ItemizedCategoryDefinition;
    playerId: string;
    scopeKey: string;
  }) {
    if (!input.category.optional) {
      return true;
    }

    return (
      itemizedUsageState[
        buildItemizedUsageKey(input.scopeKey, input.playerId, input.category.id)
      ] ?? null
    );
  }

  function setOptionalItemizedUsage(input: {
    categoryId: string;
    playerId: string;
    scopeKey: string;
    used: boolean;
  }) {
    setItemizedUsageState((current) => ({
      ...current,
      [buildItemizedUsageKey(input.scopeKey, input.playerId, input.categoryId)]:
        input.used,
    }));
  }

  function resetItemizedCategoryValues(input: {
    category: ItemizedCategoryDefinition;
    playerId: string;
    scopeKey: string;
  }) {
    setItemizedValueState((current) => {
      const nextState = { ...current };

      for (const categoryInput of input.category.inputs) {
        nextState[
          buildItemizedValueKey(
            input.scopeKey,
            input.playerId,
            input.category.id,
            categoryInput.key,
          )
        ] = String(categoryInput.defaultValue);
      }

      return nextState;
    });
  }
  const completedItemizedBreakdowns = useMemo(
    () =>
      isCompleted && isItemizedEndGameTally
        ? buildItemizedPlayerBreakdowns({
            categories: itemizedCategories,
            players: game.players,
            entries: game.itemizedScoreEntries.filter(
              (entry) => !entry.gameRoundId,
            ),
          })
        : [],
    [
      game.itemizedScoreEntries,
      game.players,
      isCompleted,
      isItemizedEndGameTally,
      itemizedCategories,
    ],
  );
  const itemizedDraftPreview = useMemo(() => {
    if (!isItemizedGame) {
      return {
        error: null as string | null,
        categoryScoresByKey: new Map<string, number>(),
        entries: [] as Array<{
          userId: string;
          categoryId: string;
          values: Record<string, number>;
        }>,
        totalsByUserId: new Map<string, number>(),
        winnerIds: [] as string[],
      };
    }

    try {
      const categoryScoresByKey = new Map<string, number>();
      const entries: Array<{
        userId: string;
        categoryId: string;
        values: Record<string, number>;
      }> = [];
      const totalsByUserId = new Map<string, number>();

      for (const player of game.players) {
        let total = 0;

        for (const category of itemizedCategories) {
          const categoryUsage = getOptionalItemizedUsage({
            category,
            playerId: player.userId,
            scopeKey: activeItemizedScopeKey,
          });
          const values = Object.fromEntries(
            category.inputs.map((categoryInput) => {
              if (categoryUsage === false) {
                return [categoryInput.key, categoryInput.defaultValue];
              }

              const rawValue =
                itemizedValueState[
                  buildItemizedValueKey(
                    activeItemizedScopeKey,
                    player.userId,
                    category.id,
                    categoryInput.key,
                  )
                ];

              return [
                categoryInput.key,
                rawValue?.trim()
                  ? Number(rawValue)
                  : categoryInput.defaultValue,
              ];
            }),
          );
          const preview = evaluateItemizedCategoryFormula({
            category,
            values,
          });
          categoryScoresByKey.set(
            `${player.userId}:${category.id}`,
            preview.normalizedScore,
          );

          entries.push({
            userId: player.userId,
            categoryId: category.id,
            values: Object.fromEntries(
              Object.entries(values).map(([key, value]) => [
                key,
                Math.trunc(value),
              ]),
            ),
          });
          total += preview.normalizedScore;
        }

        totalsByUserId.set(player.userId, total);
      }

      return {
        error: null,
        categoryScoresByKey,
        entries,
        totalsByUserId,
        winnerIds: getWinningUserIds({
          players: game.players.map((player) => ({
            userId: player.userId,
            score: totalsByUserId.get(player.userId) ?? 0,
          })),
          scoringMode: game.scoringMode,
        }),
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Could not evaluate score breakdowns",
        categoryScoresByKey: new Map<string, number>(),
        entries: [],
        totalsByUserId: new Map<string, number>(),
        winnerIds: [],
      };
    }
  }, [
    activeItemizedScopeKey,
    game.players,
    game.scoringMode,
    isItemizedGame,
    itemizedCategories,
    itemizedUsageState,
    itemizedValueState,
  ]);
  const scoreDialogItemizedPreview = useMemo(() => {
    if (scoreDialogItemizedScopeKey === activeItemizedScopeKey) {
      return itemizedDraftPreview;
    }

    if (!isItemizedGame) {
      return itemizedDraftPreview;
    }

    try {
      const categoryScoresByKey = new Map<string, number>();
      const entries: Array<{
        userId: string;
        categoryId: string;
        values: Record<string, number>;
      }> = [];
      const totalsByUserId = new Map<string, number>();

      for (const player of game.players) {
        let total = 0;

        for (const category of itemizedCategories) {
          const categoryUsage = getOptionalItemizedUsage({
            category,
            playerId: player.userId,
            scopeKey: scoreDialogItemizedScopeKey,
          });
          const values = Object.fromEntries(
            category.inputs.map((categoryInput) => {
              if (categoryUsage === false) {
                return [categoryInput.key, categoryInput.defaultValue];
              }

              const rawValue =
                itemizedValueState[
                  buildItemizedValueKey(
                    scoreDialogItemizedScopeKey,
                    player.userId,
                    category.id,
                    categoryInput.key,
                  )
                ];

              return [
                categoryInput.key,
                rawValue?.trim()
                  ? Number(rawValue)
                  : categoryInput.defaultValue,
              ];
            }),
          );
          const preview = evaluateItemizedCategoryFormula({
            category,
            values,
          });
          categoryScoresByKey.set(
            `${player.userId}:${category.id}`,
            preview.normalizedScore,
          );
          entries.push({
            userId: player.userId,
            categoryId: category.id,
            values: Object.fromEntries(
              Object.entries(values).map(([key, value]) => [
                key,
                Math.trunc(value),
              ]),
            ),
          });
          total += preview.normalizedScore;
        }

        totalsByUserId.set(player.userId, total);
      }

      return {
        error: null,
        categoryScoresByKey,
        entries,
        totalsByUserId,
        winnerIds: [],
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Could not evaluate score breakdowns",
        categoryScoresByKey: new Map<string, number>(),
        entries: [],
        totalsByUserId: new Map<string, number>(),
        winnerIds: [],
      };
    }
  }, [
    activeItemizedScopeKey,
    game.players,
    isItemizedGame,
    itemizedCategories,
    itemizedDraftPreview,
    itemizedUsageState,
    itemizedValueState,
    scoreDialogItemizedScopeKey,
  ]);
  const selectedItemizedPlayerTotal =
    scoreDialogPlayer && isItemizedGame
      ? (scoreDialogItemizedPreview.totalsByUserId.get(
          scoreDialogPlayer.userId,
        ) ?? 0)
      : 0;
  const selectedItemizedCategoryScore =
    scoreDialogPlayer && selectedItemizedCategory
      ? (scoreDialogItemizedPreview.categoryScoresByKey.get(
          buildItemizedCategoryScoreKey(
            scoreDialogPlayer.userId,
            selectedItemizedCategory.id,
          ),
        ) ?? 0)
      : 0;
  const unresolvedActiveItemizedCategories = useMemo(
    () =>
      game.players.flatMap((player) =>
        itemizedCategories.filter(
          (category) =>
            category.optional &&
            getOptionalItemizedUsage({
              category,
              playerId: player.userId,
              scopeKey: activeItemizedScopeKey,
            }) === null,
        ),
      ),
    [
      activeItemizedScopeKey,
      game.players,
      itemizedCategories,
      itemizedUsageState,
    ],
  );
  const unresolvedScoreDialogOptionalCategories = useMemo(() => {
    if (!scoreDialogPlayer) {
      return [];
    }

    return itemizedCategories.filter(
      (category) =>
        category.optional &&
        getOptionalItemizedUsage({
          category,
          playerId: scoreDialogPlayer.userId,
          scopeKey: scoreDialogItemizedScopeKey,
        }) === null,
    );
  }, [
    itemizedCategories,
    itemizedUsageState,
    scoreDialogItemizedScopeKey,
    scoreDialogPlayer,
  ]);

  function getItemizedCategoryStatus(input: {
    category: ItemizedCategoryDefinition;
    playerId: string;
    scopeKey: string;
  }) {
    const usage = getOptionalItemizedUsage(input);

    if (usage === null) {
      return "Needs answer";
    }

    if (usage === false) {
      return "Skipped";
    }

    return "Included";
  }

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

  function buildLocalMutationKeySet() {
    pruneRecentLocalMutationKeys();

    return new Set([
      ...pendingMutationsRef.current.map((entry) => entry.key),
      ...recentLocalMutationKeysRef.current.map((entry) => entry.key),
    ]);
  }

  function showRemoteEvents(nextBaseSnapshot: PlayGameSnapshot) {
    const remoteEvents = filterLocalRemotePlayGameEvents({
      events: deriveRemotePlayGameEvents({
        previousSnapshot: baseSnapshotRef.current,
        nextSnapshot: nextBaseSnapshot,
      }),
      localKeys: buildLocalMutationKeySet(),
    });

    if (remoteEvents.length === 0) {
      return;
    }

    const nextHighlightState = getRemoteHighlightTarget(remoteEvents);
    const summaries = summarizeRemotePlayGameEvents(
      isItemizedGame
        ? remoteEvents.filter((event) => event.type !== "score-updated")
        : remoteEvents,
    );

    if (clearLiveHighlightsTimeoutRef.current) {
      clearTimeout(clearLiveHighlightsTimeoutRef.current);
    }

    setLiveHighlights(nextHighlightState);
    clearLiveHighlightsTimeoutRef.current = setTimeout(() => {
      setLiveHighlights({
        gameStatus: false,
        playerIds: [],
        roster: false,
        scoreUserIds: [],
      });
      clearLiveHighlightsTimeoutRef.current = null;
    }, REMOTE_HIGHLIGHT_DURATION_MS);

    for (const summary of summaries) {
      toast.message(summary);
    }
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

      showRemoteEvents(freshSnapshot);
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
    }, ACTIVE_RECONCILE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isCompleted]);

  useEffect(() => {
    if (
      !canManageLiveGame ||
      isPaused ||
      !isRoundScoringReady ||
      isRoundDialogOpen ||
      !activeRound
    ) {
      return;
    }

    if (autoOpenedRoundRef.current === activeRound.roundNumber) {
      return;
    }

    autoOpenedRoundRef.current = activeRound.roundNumber;
    setSelectedNoScorePlacements(createNoScorePlacementsFromGame(game));
    setActiveNoScorePlacement(1);
    setConfirmedNoScorePlacements([]);
    setRoundDialogIntent("round");
    setIsRoundDialogOpen(true);
  }, [
    activeRound,
    canManageLiveGame,
    game,
    game.winners,
    isPaused,
    isRoundDialogOpen,
    isRoundScoringReady,
  ]);

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

  function pruneRecentLocalMutationKeys(now = Date.now()) {
    recentLocalMutationKeysRef.current =
      recentLocalMutationKeysRef.current.filter(
        (entry) => entry.expiresAt > now,
      );
  }

  function rememberLocalMutationKey(key: string) {
    const now = Date.now();
    pruneRecentLocalMutationKeys(now);
    recentLocalMutationKeysRef.current = [
      ...recentLocalMutationKeysRef.current.filter(
        (entry) => entry.key !== key,
      ),
      {
        key,
        expiresAt: now + RECENT_LOCAL_MUTATION_MS,
      },
    ];
  }

  async function finalizeSuccessfulMutation(entry: PendingMutationEntry) {
    const remainingMutations = pendingMutationsRef.current.filter(
      (pendingEntry) => pendingEntry.id !== entry.id,
    );
    rememberLocalMutationKey(entry.key);
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
    if (
      !canEditPlayerScore(player.userId) ||
      isCompleted ||
      isPaused ||
      isNoScoreMode ||
      isRoundWinnerMode ||
      isEliminationMode
    ) {
      return;
    }

    if (scoreDrawerCloseTimeoutRef.current) {
      clearTimeout(scoreDrawerCloseTimeoutRef.current);
      scoreDrawerCloseTimeoutRef.current = null;
    }

    if (isItemizedGame) {
      setScoreDialogState({
        kind: "itemized",
        mode: isItemizedEndGameTally ? "end_game" : "active",
        playerId: player.userId,
        roundNumber: isItemizedEndGameTally ? null : nextRoundNumber,
        categoryId: null,
        step: "category_list",
      });
    } else {
      setScoreDialogState({
        kind: "round",
        playerId: player.userId,
        roundNumber: nextRoundNumber,
        mode: "active",
      });
      setScoreAmountInput(
        String(
          isRoundlessFreePlay
            ? (player.score ?? 0)
            : (activeRoundScoreByUserId.get(player.userId) ?? 0),
        ),
      );
    }

    setIsScoreDrawerOpen(true);
  }

  function openRoundScoreDialog(input: {
    playerId: string;
    roundNumber: number;
  }) {
    if (
      !canEditPlayerScore(input.playerId) ||
      isCompleted ||
      isPaused ||
      isNoScoreMode ||
      isRoundWinnerMode ||
      isEliminationMode
    ) {
      return;
    }

    if (scoreDrawerCloseTimeoutRef.current) {
      clearTimeout(scoreDrawerCloseTimeoutRef.current);
      scoreDrawerCloseTimeoutRef.current = null;
    }

    if (isItemizedGame && !isItemizedEndGameTally) {
      const scope = {
        kind: "round" as const,
        roundNumber: input.roundNumber,
      };

      setItemizedValueState((current) => ({
        ...current,
        ...createItemizedValueState({
          categories: itemizedCategories,
          game,
          scope,
        }),
      }));
      setScoreDialogState({
        kind: "itemized",
        mode: "history",
        playerId: input.playerId,
        roundNumber: input.roundNumber,
        categoryId: null,
        step: "category_list",
      });
      setIsScoreDrawerOpen(true);
      return;
    }

    const round = game.rounds.find(
      (entry) => entry.roundNumber === input.roundNumber,
    );
    const roundScore =
      round?.scores.find((score) => score.userId === input.playerId)
        ?.scoreDelta ?? 0;

    setScoreDialogState({
      kind: "round",
      playerId: input.playerId,
      roundNumber: input.roundNumber,
      mode: "history",
    });
    setScoreAmountInput(String(roundScore));
    setIsScoreDrawerOpen(true);
  }

  function openColorDialog(player: GameForPlayPage["players"][number]) {
    if (!canEditGuestOrSelfColor(player)) {
      return;
    }

    setColorDialogPlayerId(player.userId);
    setSelectedGuestColor(player.user.color);
  }

  function resetAddPlayerFlow() {
    setAddPlayerSelection(null);
    setIsAddPlayerMode(false);
    setPendingJoinRequestApprovalId(null);
    setPlayerSearch("");
    setCustomStartingScoreInput("0");
  }

  function handleAddExistingPlayer(userId: string) {
    const player = snapshot.playerOptions.find((entry) => entry.id === userId);

    if (!player) {
      toast.error("That player is no longer available");
      return;
    }

    if (canOfferStartingScoreOptions) {
      setCustomStartingScoreInput("0");
      setAddPlayerSelection({
        type: "existing",
        user: player,
      });
      return;
    }

    runMutation({
      key: `add-player:${userId}`,
      mutation: {
        type: "add-player",
        user: player,
        gamePlayerId: `optimistic-game-player-${userId}`,
        startingScore: 0,
        previousRoundNumber: null,
      },
      action: () => addGamePlayer({ gameId: game.id, userId }),
      onOptimistic: () => {
        resetAddPlayerFlow();
      },
    });
  }

  function handleGuestSetup() {
    const rawName = playerSearch.trim();

    if (!rawName) {
      toast.error("Enter a guest name first");
      return;
    }

    const [firstName, ...rest] = rawName.split(/\s+/);
    const lastName = rest.join(" ").trim() || undefined;
    const color = getDefaultGuestColor();
    const optimisticGuest = createTemporaryGuestUser({
      color,
      currentUserId,
      firstName,
      lastName,
    });

    setCustomStartingScoreInput("0");
    setAddPlayerSelection({
      type: "guest",
      color,
      firstName,
      lastName,
      rawName,
      optimisticUser: optimisticGuest,
    });
  }

  function handlePendingGuestColorSelect(nextColor: string) {
    setAddPlayerSelection((currentSelection) => {
      if (!currentSelection || currentSelection.type !== "guest") {
        return currentSelection;
      }

      return {
        ...currentSelection,
        color: nextColor,
        optimisticUser: {
          ...currentSelection.optimisticUser,
          color: nextColor,
        },
      };
    });
  }

  function handleAddGuestPlayer() {
    if (!addPlayerSelection || addPlayerSelection.type !== "guest") {
      return;
    }

    runMutation({
      key: `add-guest:${normalizeValue(addPlayerSelection.rawName)}`,
      mutation: {
        type: "add-guest",
        user: addPlayerSelection.optimisticUser,
        gamePlayerId: `optimistic-game-player-${addPlayerSelection.optimisticUser.id}`,
        startingScore: 0,
        previousRoundNumber: null,
      },
      action: () =>
        addGuestGamePlayer({
          color: addPlayerSelection.color,
          gameId: game.id,
          firstName: addPlayerSelection.firstName,
          lastName: addPlayerSelection.lastName,
        }),
      onOptimistic: () => {
        resetAddPlayerFlow();
      },
    });
  }

  function handleAddPlayerWithStartingScore(mode: GamePlayerStartingScoreMode) {
    if (!addPlayerSelection) {
      return;
    }

    const customStartingScore = parseScoreAmountInput(customStartingScoreInput);

    if (mode === "custom" && customStartingScore === null) {
      toast.error("Enter a valid custom starting score");
      return;
    }

    const startingScore =
      mode === "custom"
        ? (customStartingScore ?? 0)
        : getStartingScoreAmount({
            mode,
            players: game.players,
            scoringMode: game.scoringMode,
          });
    const previousRoundNumber = previousCompletedRoundNumber;

    if (addPlayerSelection.type === "existing") {
      const userId = addPlayerSelection.user.id;

      if (pendingJoinRequestApprovalId) {
        setPendingJoinRequestIds((current) => [
          ...current,
          pendingJoinRequestApprovalId,
        ]);

        startTransition(async () => {
          try {
            await approveGameJoinRequest({
              requestId: pendingJoinRequestApprovalId,
              startingScoreMode: mode,
              startingScoreValue:
                mode === "custom" ? customStartingScore : undefined,
            });
            await reconcileSnapshotNow();
            resetAddPlayerFlow();
            setIsAddPlayerOpen(false);
            toast.success("Player added to the game");
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Could not approve the join request",
            );
          } finally {
            setPendingJoinRequestIds((current) =>
              current.filter((entry) => entry !== pendingJoinRequestApprovalId),
            );
          }
        });

        return;
      }

      runMutation({
        key: `add-player:${userId}:${mode}`,
        mutation: {
          type: "add-player",
          user: addPlayerSelection.user,
          gamePlayerId: `optimistic-game-player-${userId}`,
          startingScore,
          previousRoundNumber,
        },
        action: () =>
          addGamePlayer({
            gameId: game.id,
            userId,
            startingScoreMode: mode,
            startingScoreValue:
              mode === "custom" ? customStartingScore : undefined,
          }),
        onOptimistic: () => {
          resetAddPlayerFlow();
        },
      });

      return;
    }

    runMutation({
      key: `add-guest:${normalizeValue(addPlayerSelection.rawName)}:${mode}`,
      mutation: {
        type: "add-guest",
        user: addPlayerSelection.optimisticUser,
        gamePlayerId: `optimistic-game-player-${addPlayerSelection.optimisticUser.id}`,
        startingScore,
        previousRoundNumber,
      },
      action: () =>
        addGuestGamePlayer({
          color: addPlayerSelection.color,
          gameId: game.id,
          firstName: addPlayerSelection.firstName,
          lastName: addPlayerSelection.lastName,
          startingScoreMode: mode,
          startingScoreValue:
            mode === "custom" ? customStartingScore : undefined,
        }),
      onOptimistic: () => {
        resetAddPlayerFlow();
      },
    });
  }

  function handleInviteUsersToggle(nextEnabled: boolean) {
    startInviteToggleTransition(async () => {
      try {
        await setGameInviteUsersEnabled({
          gameId: game.id,
          enabled: nextEnabled,
        });
        await reconcileSnapshotNow();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not update link joining",
        );
      }
    });
  }

  function openJoinRequestApproval(request: GameJoinRequestFull) {
    if (!canOfferStartingScoreOptions) {
      setPendingJoinRequestIds((current) => [...current, request.id]);

      startTransition(async () => {
        try {
          await approveGameJoinRequest({
            requestId: request.id,
          });
          await reconcileSnapshotNow();
          toast.success("Player added to the game");
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not approve the join request",
          );
        } finally {
          setPendingJoinRequestIds((current) =>
            current.filter((entry) => entry !== request.id),
          );
        }
      });

      return;
    }

    setPendingJoinRequestApprovalId(request.id);
    setCustomStartingScoreInput("0");
    setAddPlayerSelection({
      type: "existing",
      user: request.requester,
    });
    setIsAddPlayerMode(true);
    setIsAddPlayerOpen(true);
    setIsShareDrawerOpen(false);
  }

  function handleDeclineJoinRequest(requestId: string) {
    setPendingJoinRequestIds((current) => [...current, requestId]);

    startTransition(async () => {
      try {
        await declineGameJoinRequest({ requestId });
        await reconcileSnapshotNow();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not decline the join request",
        );
      } finally {
        setPendingJoinRequestIds((current) =>
          current.filter((entry) => entry !== requestId),
        );
      }
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

  function handlePlayerRoleChange(
    player: GameForPlayPage["players"][number],
    role: GamePlayerRole,
  ) {
    if (!isCreator || isCompleted || player.userId === game.creatorId) {
      return;
    }

    setPendingManagerUserIds((current) => [...current, player.userId]);

    startTransition(async () => {
      try {
        await setGamePlayerRole({
          gameId: game.id,
          userId: player.userId,
          role,
        });
        rememberLocalMutationKey(`set-role:${player.userId}`);
        await reconcileSnapshotNow();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not update player role",
        );
      } finally {
        setPendingManagerUserIds((current) =>
          current.filter((entry) => entry !== player.userId),
        );
      }
    });
  }

  function finalizeScoreDrawerClose() {
    setScoreDialogState(null);
    setScoreAmountInput("0");
    scoreDrawerCloseTimeoutRef.current = null;
  }

  function closeScoreDrawer() {
    setIsScoreDrawerOpen(false);

    if (scoreDrawerCloseTimeoutRef.current) {
      clearTimeout(scoreDrawerCloseTimeoutRef.current);
    }

    scoreDrawerCloseTimeoutRef.current = setTimeout(() => {
      finalizeScoreDrawerClose();
    }, SCORE_DRAWER_CLOSE_DURATION_MS);
  }

  function updateItemizedInputValue(input: {
    categoryId: string;
    inputKey: string;
    playerId: string;
    scopeKey: string;
    value: string;
  }) {
    setItemizedValueState((current) => ({
      ...current,
      [buildItemizedValueKey(
        input.scopeKey,
        input.playerId,
        input.categoryId,
        input.inputKey,
      )]: input.value,
    }));
  }

  function updateSelectedSingleItemizedValue(value: string) {
    if (
      scoreDialogState?.kind !== "itemized" ||
      !scoreDialogPlayer ||
      !selectedItemizedCategory
    ) {
      return;
    }

    const selectedInput = selectedItemizedCategory.inputs[0];

    if (!selectedInput) {
      return;
    }

    setScoreAmountInput(value);
    updateItemizedInputValue({
      categoryId: selectedItemizedCategory.id,
      inputKey: selectedInput.key,
      playerId: scoreDialogPlayer.userId,
      scopeKey: scoreDialogItemizedScopeKey,
      value,
    });
  }

  function openItemizedCategoryDetail(categoryId: string) {
    if (
      scoreDialogState?.kind !== "itemized" ||
      !scoreDialogPlayer ||
      !itemizedCategories.some((category) => category.id === categoryId)
    ) {
      return;
    }

    const category = itemizedCategories.find(
      (entry) => entry.id === categoryId,
    );

    if (!category) {
      return;
    }

    if (
      category.optional &&
      getOptionalItemizedUsage({
        category,
        playerId: scoreDialogPlayer.userId,
        scopeKey: scoreDialogItemizedScopeKey,
      }) !== true
    ) {
      setScoreDialogState({
        kind: "itemized",
        mode: scoreDialogState.mode,
        playerId: scoreDialogPlayer.userId,
        roundNumber: scoreDialogState.roundNumber,
        categoryId,
        step: "optional_confirm",
      });
      return;
    }

    setScoreDialogState({
      kind: "itemized",
      mode: scoreDialogState.mode,
      playerId: scoreDialogPlayer.userId,
      roundNumber: scoreDialogState.roundNumber,
      categoryId,
      step: "category_detail",
    });

    if (category.inputMode === "single") {
      const categoryInput = category.inputs[0];

      if (categoryInput) {
        setScoreAmountInput(
          itemizedValueState[
            buildItemizedValueKey(
              scoreDialogItemizedScopeKey,
              scoreDialogPlayer.userId,
              category.id,
              categoryInput.key,
            )
          ] ?? String(categoryInput.defaultValue),
        );
      }
    }
  }

  function returnToItemizedCategoryList() {
    if (scoreDialogState?.kind !== "itemized") {
      return;
    }

    setScoreDialogState({
      kind: "itemized",
      mode: scoreDialogState.mode,
      playerId: scoreDialogState.playerId,
      roundNumber: scoreDialogState.roundNumber,
      categoryId: null,
      step: "category_list",
    });
  }

  function handleOptionalItemizedChoice(used: boolean) {
    if (
      scoreDialogState?.kind !== "itemized" ||
      scoreDialogState.step !== "optional_confirm" ||
      !scoreDialogPlayer ||
      !selectedItemizedCategory
    ) {
      return;
    }

    setOptionalItemizedUsage({
      categoryId: selectedItemizedCategory.id,
      playerId: scoreDialogPlayer.userId,
      scopeKey: scoreDialogItemizedScopeKey,
      used,
    });

    if (!used) {
      resetItemizedCategoryValues({
        category: selectedItemizedCategory,
        playerId: scoreDialogPlayer.userId,
        scopeKey: scoreDialogItemizedScopeKey,
      });
      returnToItemizedCategoryList();
      return;
    }

    setScoreDialogState({
      kind: "itemized",
      mode: scoreDialogState.mode,
      playerId: scoreDialogPlayer.userId,
      roundNumber: scoreDialogState.roundNumber,
      categoryId: selectedItemizedCategory.id,
      step: "category_detail",
    });

    if (selectedItemizedCategory.inputMode === "single") {
      const categoryInput = selectedItemizedCategory.inputs[0];

      if (categoryInput) {
        setScoreAmountInput(
          itemizedValueState[
            buildItemizedValueKey(
              scoreDialogItemizedScopeKey,
              scoreDialogPlayer.userId,
              selectedItemizedCategory.id,
              categoryInput.key,
            )
          ] ?? String(categoryInput.defaultValue),
        );
      }
    }
  }

  function handleScoreSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!scoreDialogPlayer || isPaused || scoreDialogState?.kind !== "round") {
      return;
    }

    const scoreAmount = parseScoreAmountInput(scoreAmountInput);

    if (scoreAmount === null) {
      toast.error("Enter a valid round score");
      return;
    }

    runMutation({
      key:
        scoreDialogState.mode === "history"
          ? `round-score:${scoreDialogState.roundNumber}:${scoreDialogPlayer.userId}`
          : `score:${scoreDialogPlayer.userId}`,
      mutation:
        isRoundlessFreePlay && scoreDialogState.mode !== "history"
          ? {
              type: "set-player-score",
              userId: scoreDialogPlayer.userId,
              score: scoreAmount,
            }
          : {
              type: "upsert-score",
              roundNumber: scoreDialogState.roundNumber,
              userId: scoreDialogPlayer.userId,
              scoreDelta: scoreAmount,
            },
      action: () => {
        if (scoreDialogState.mode === "history") {
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
        closeScoreDrawer();
      },
    });
  }

  function handleItemizedScoreSave() {
    if (
      !scoreDialogPlayer ||
      isPaused ||
      scoreDialogState?.kind !== "itemized" ||
      scoreDialogState.mode === "end_game"
    ) {
      return;
    }

    if (scoreDialogItemizedPreview.error) {
      toast.error(scoreDialogItemizedPreview.error);
      return;
    }

    if (unresolvedScoreDialogOptionalCategories.length > 0) {
      toast.error("Answer the optional scoring items before saving");
      return;
    }

    const entries = scoreDialogItemizedPreview.entries.filter(
      (entry) => entry.userId === scoreDialogPlayer.userId,
    );
    const scoreAmount =
      scoreDialogItemizedPreview.totalsByUserId.get(scoreDialogPlayer.userId) ??
      0;

    runMutation({
      key:
        scoreDialogState.mode === "history"
          ? `itemized-round-score:${scoreDialogState.roundNumber}:${scoreDialogPlayer.userId}`
          : `itemized-score:${scoreDialogPlayer.userId}`,
      mutation: {
        type: "upsert-score",
        roundNumber: scoreDialogState.roundNumber ?? nextRoundNumber,
        userId: scoreDialogPlayer.userId,
        scoreDelta: scoreAmount,
      },
      action: () => {
        if (
          scoreDialogState.mode === "history" &&
          scoreDialogState.roundNumber
        ) {
          return updateRecordedRoundItemizedScore({
            gameId: game.id,
            roundNumber: scoreDialogState.roundNumber,
            userId: scoreDialogPlayer.userId,
            entries,
          });
        }

        return upsertActiveRoundItemizedScore({
          gameId: game.id,
          userId: scoreDialogPlayer.userId,
          entries,
        });
      },
      onOptimistic: () => {
        closeScoreDrawer();
      },
    });
  }

  function handleScoreDrawerOpenChange(open: boolean) {
    if (open) {
      if (isPaused) {
        return;
      }

      setIsScoreDrawerOpen(true);
      return;
    }

    if (isScoreDrawerOpen) {
      closeScoreDrawer();
    }
  }

  function handleCommitRound(completeGame: boolean) {
    if (!canManageLiveGame || isCompleted || isPaused) {
      return;
    }

    const finishedAt = nowIso();
    const placementSelections =
      completeGame && requiresPlacementBuilder
        ? selectedNoScorePlacementSelections
        : undefined;
    const winnerUserIds =
      completeGame && requiresPlacementBuilder
        ? selectedWinnerUserIds
        : undefined;

    runMutation({
      key: "commit-round",
      mutation: {
        type: "commit-round",
        completeGame,
        finishedAt,
        winnerUserIds,
        placementSelections,
      },
      action: () =>
        commitGameRound({
          gameId: game.id,
          completeGame,
          winnerUserIds,
          placementSelections,
        }),
      onOptimistic: () => {
        setIsRoundDialogOpen(false);
        setRoundDialogIntent("round");
        if (completeGame && isNoScoreMode) {
          setSelectedNoScorePlacements(createEmptyNoScorePlacementSelections());
          setActiveNoScorePlacement(1);
          setConfirmedNoScorePlacements([]);
        }
      },
    });
  }

  function handleCompleteItemizedGame() {
    if (
      !canManageLiveGame ||
      isCompleted ||
      isPaused ||
      !isItemizedEndGameTally
    ) {
      return;
    }

    if (itemizedDraftPreview.error) {
      toast.error(itemizedDraftPreview.error);
      return;
    }

    if (unresolvedActiveItemizedCategories.length > 0) {
      toast.error(
        "Answer the optional scoring items before finishing the game",
      );
      return;
    }

    startItemizedCompleteTransition(async () => {
      try {
        await completeGame({
          gameId: game.id,
          itemizedScoreEntries: itemizedDraftPreview.entries,
        });
        setIsRoundDialogOpen(false);
        await reconcileSnapshotNow();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not complete the game",
        );
      }
    });
  }

  function toggleNoScorePlacementSelection(userId: string) {
    setSelectedNoScorePlacements((current) => {
      const currentPlacementUserIds = current[activeNoScorePlacement];
      const isSelected = currentPlacementUserIds.includes(userId);

      return {
        ...current,
        [activeNoScorePlacement]: isSelected
          ? currentPlacementUserIds.filter((entry) => entry !== userId)
          : [...currentPlacementUserIds, userId],
      };
    });
  }

  function advanceNoScorePlacement(currentPlacement: NoScorePlacement) {
    if (currentPlacement === 1) {
      setActiveNoScorePlacement(2);
      return;
    }

    if (currentPlacement === 2) {
      setActiveNoScorePlacement(3);
    }
  }

  function confirmNoScorePlacement(placement: NoScorePlacement) {
    setConfirmedNoScorePlacements((current) =>
      current.includes(placement) ? current : [...current, placement],
    );
    advanceNoScorePlacement(placement);
  }

  function skipNoScorePlacement(placement: Exclude<NoScorePlacement, 1>) {
    setSelectedNoScorePlacements((current) => ({
      ...current,
      [placement]: [],
      ...(placement === 2 ? { 3: [] } : {}),
    }));
    setConfirmedNoScorePlacements((current) =>
      current.includes(placement) ? current : [...current, placement],
    );
    if (placement === 2) {
      setActiveNoScorePlacement(2);
    }
  }

  function openRoundDialog(intent: RoundDialogIntent = "round") {
    if (!canManageLiveGame || isCompleted || isPaused) {
      return;
    }

    setSelectedNoScorePlacements(createNoScorePlacementsFromGame(game));
    setActiveNoScorePlacement(1);
    setConfirmedNoScorePlacements([]);
    if (isItemizedGame && !isItemizedEndGameTally) {
      setItemizedValueState((current) => ({
        ...current,
        ...createItemizedValueState({
          categories: itemizedCategories,
          game,
          scope: { kind: "round", roundNumber: nextRoundNumber },
        }),
      }));
    }
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

  function openPauseDialog() {
    setPausedNextUserIdSelection(
      game.pausedNextUserId ?? PAUSE_WITHOUT_NEXT_PLAYER,
    );
    setIsPauseDialogOpen(true);
  }

  function handlePauseGame() {
    if (!canManageLiveGame || isCompleted) {
      return;
    }

    const pausedAt = nowIso();
    const pausedNextUserId =
      pausedNextUserIdSelection === PAUSE_WITHOUT_NEXT_PLAYER
        ? null
        : pausedNextUserIdSelection;

    runMutation({
      key: "pause-game",
      mutation: {
        type: "pause-game",
        pausedAt,
        pausedNextUserId,
      },
      action: () =>
        pauseGame({
          gameId: game.id,
          nextUserId: pausedNextUserId,
        }),
      fallbackError: "Could not pause game",
      onOptimistic: () => {
        setIsPauseDialogOpen(false);
      },
    });
  }

  function handleResumeGame() {
    if (!canManageLiveGame || isCompleted || !isPaused) {
      return;
    }

    runMutation({
      key: "resume-game",
      mutation: {
        type: "resume-game",
      },
      action: () =>
        resumeGame({
          gameId: game.id,
        }),
      fallbackError: "Could not resume game",
    });
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

  function handleReopenGame() {
    runMutation({
      key: "reopen-game",
      mutation: {
        type: "reopen-game",
      },
      action: () =>
        reopenCompletedGame({
          gameId: game.id,
        }),
      fallbackError: "Could not reopen game",
      onOptimistic: () => {
        setIsReopenConfirmOpen(false);
      },
    });
  }

  function handleUneliminatePlayer(userId: string) {
    runMutation({
      key: `uneliminate:${userId}`,
      mutation: {
        type: "rollback-elimination",
        restoredUserId: userId,
      },
      action: () =>
        uneliminateGamePlayer({
          eliminatedUserId: userId,
          gameId: game.id,
        }),
      fallbackError: "Could not restore player",
      onOptimistic: () => {
        setRestoreEliminationUserId(null);
      },
    });
  }

  const commitRoundPending = pendingKeySet.has("commit-round");
  const pauseMutationPending = pendingKeySet.has("pause-game");
  const resumeMutationPending = pendingKeySet.has("resume-game");
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
  const uneliminateMutationPending = restoreEliminationUserId
    ? pendingKeySet.has(`uneliminate:${restoreEliminationUserId}`)
    : false;
  const addGuestPending = pendingKeySet.has(
    `add-guest:${normalizeValue(playerSearch)}`,
  );
  const addPlayerSelectionPending = addPlayerSelection
    ? addPlayerSelection.type === "existing"
      ? Boolean(
          (pendingJoinRequestApprovalId &&
            pendingJoinRequestIds.includes(pendingJoinRequestApprovalId)) ||
          startingScoreOptions.some((option) =>
            pendingKeySet.has(
              `add-player:${addPlayerSelection.user.id}:${option.mode}`,
            ),
          ),
        )
      : Boolean(
          pendingKeySet.has(
            `add-guest:${normalizeValue(addPlayerSelection.rawName)}`,
          ) ||
          startingScoreOptions.some((option) =>
            pendingKeySet.has(
              `add-guest:${normalizeValue(addPlayerSelection.rawName)}:${option.mode}`,
            ),
          ),
        )
    : false;
  const removePlayerPending = removePlayerUserId
    ? pendingKeySet.has(`remove-player:${removePlayerUserId}`)
    : false;
  const canOpenScoreFromCard =
    canManageLiveGame &&
    !isCompleted &&
    !isNoScoreMode &&
    !isRoundWinnerMode &&
    !isEliminationMode;

  function canOpenProfileFromCard(user: Pick<UserBase, "id" | "isGuest">) {
    return isCompleted && !user.isGuest;
  }

  function handleEliminatePlayer(
    player: GameForPlayPage["players"][number],
    confirmRoundTransition = false,
    forceCompleteGame = false,
  ) {
    const completesEliminationRound = remainingEliminationUserIds.length <= 2;
    const roundWinnerUserId = completesEliminationRound
      ? remainingEliminationUserIds.find((userId) => userId !== player.userId)
      : null;
    const nextWinnerScore = roundWinnerUserId
      ? (game.players.find((entry) => entry.userId === roundWinnerUserId)
          ?.score ?? 0) + 1
      : 0;
    const completeGame =
      forceCompleteGame ||
      (gameSettingsV2?.roundConfig.enabled
        ? completesEliminationRound &&
          (gameSettingsV2.gameEndTrigger === "rounds_exhausted"
            ? nextRoundNumber >=
              (gameSettingsV2.roundConfig.targetRounds ??
                Number.POSITIVE_INFINITY)
            : gameSettingsV2.gameEndTrigger === "points_threshold_reached"
              ? nextWinnerScore >=
                (gameSettingsV2.thresholdConfig.value ??
                  Number.POSITIVE_INFINITY)
              : false)
        : completesEliminationRound);
    const finishedAt = nowIso();
    const placementSelections = buildEliminationPlacements({
      game,
      eliminatedUserId: player.userId,
    });

    if (
      gameSettingsV2?.roundConfig.enabled &&
      completesEliminationRound &&
      !completeGame &&
      !confirmRoundTransition
    ) {
      setPendingEliminationUserId(player.userId);
      setRoundDialogIntent("round");
      setIsRoundDialogOpen(true);
      return;
    }

    runMutation({
      key: "commit-round",
      mutation:
        gameSettingsV2?.roundConfig.enabled && !completesEliminationRound
          ? {
              type: "eliminate-player",
              eliminatedUserId: player.userId,
              roundNumber: nextRoundNumber,
              placement: remainingEliminationUserIds.length,
              createdAt: finishedAt,
            }
          : {
              type: "commit-round",
              completeGame,
              eliminatedUserId: player.userId,
              finishedAt,
              placementSelections,
              winnerUserIds:
                gameSettingsV2?.roundConfig.enabled && roundWinnerUserId
                  ? [roundWinnerUserId]
                  : undefined,
            },
      action: () =>
        commitGameRound({
          gameId: game.id,
          completeGame,
          eliminatedUserId: player.userId,
          placementSelections,
        }),
      onOptimistic: () => {
        setPendingEliminationUserId(null);
        setIsRoundDialogOpen(false);
        setRoundDialogIntent("round");
      },
    });
  }

  function handlePlayerCardActivate(
    player: GameForPlayPage["players"][number],
  ) {
    if (isEliminationMode && canManageLiveGame && !isCompleted && !isPaused) {
      if (eliminatedUserIds.has(player.userId)) {
        setRestoreEliminationUserId(player.userId);
        return;
      }

      handleEliminatePlayer(player);
      return;
    }

    if (isRoundWinnerMode && canManageLiveGame && !isCompleted && !isPaused) {
      const nextWinnerScore = (player.score ?? 0) + 1;
      const completeGame = gameSettingsV2
        ? !gameSettingsV2.roundConfig.enabled ||
          (gameSettingsV2.gameEndTrigger === "rounds_exhausted" &&
            nextRoundNumber >=
              (gameSettingsV2.roundConfig.targetRounds ??
                Number.POSITIVE_INFINITY)) ||
          (gameSettingsV2.gameEndTrigger === "points_threshold_reached" &&
            nextWinnerScore >=
              (gameSettingsV2.thresholdConfig.value ??
                Number.POSITIVE_INFINITY))
        : false;
      const finishedAt = nowIso();

      runMutation({
        key: "commit-round",
        mutation: {
          type: "commit-round",
          completeGame,
          finishedAt,
          winnerUserIds: [player.userId],
        },
        action: () =>
          commitGameRound({
            gameId: game.id,
            completeGame,
            winnerUserIds: [player.userId],
          }),
      });
      return;
    }

    if (canOpenScoreFromCard) {
      openScoreDialog(player);
      return;
    }

    if (canOpenProfileFromCard(player.user)) {
      router.push(`/profile/${encodeURIComponent(player.user.id)}`);
    }
  }

  function getItemizedCategoryScore(playerId: string, categoryId: string) {
    return (
      scoreDialogItemizedPreview.categoryScoresByKey.get(
        buildItemizedCategoryScoreKey(playerId, categoryId),
      ) ?? 0
    );
  }

  return (
    <div
      className="min-h-screen overflow-y-auto px-3 pb-40 sm:px-6"
      data-testid="play-game-shell"
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <div
          className="rounded-3xl shadow-sm"
          style={{
            ["--game-header-accent" as string]:
              game.gameTitle?.color ?? "#64748b",
          }}
        >
          <GameTitleImage
            className="w-full rounded-3xl"
            color={game.gameTitle?.color}
            contentClassName="px-4 py-3.5"
            imageUrl={game.gameTitle?.imageUrl}
            size="lg"
            verticalFocus={game.gameTitle?.imageVerticalFocus}
            variant="card"
          >
            <div className="relative flex h-full items-center justify-between">
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-black tracking-tight text-white">
                  {game.gameTitle?.title ?? "Untitled game"}
                </h1>
                {showsRounds ? (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/72">
                    Round {currentRoundLabel}
                  </p>
                ) : null}
              </div>
              {canManageLiveGame ? (
                <div className="absolute right-0 top-1/2 -translate-y-1/2">
                  <Drawer
                    onOpenChange={setIsHeaderDrawerOpen}
                    open={isHeaderDrawerOpen}
                  >
                    <DrawerTrigger
                      render={
                        <Button
                          aria-label="Game options"
                          className="shrink-0 rounded-full border-white/20 bg-white/15 text-white shadow-none backdrop-blur-sm hover:bg-white/22 hover:text-white dark:border-white/15 dark:bg-black/15 dark:hover:bg-black/25"
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
                          Manage the game settings and players.
                        </DrawerDescription>
                      </DrawerHeader>
                      <div className="flex flex-col gap-4 px-4">
                        <div className="rounded-xl border border-border bg-muted/40 p-4">
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
                            {isCompleted ? (
                              <Badge className="winner-badge" variant="outline">
                                Complete
                              </Badge>
                            ) : null}
                          </div>
                          <div className="mt-3 flex flex-col gap-1 text-sm text-muted-foreground">
                            {game.completedAt ? (
                              <p>
                                Completed {formatGameMetaDate(game.completedAt)}
                              </p>
                            ) : null}
                            <p>Created by {getDisplayName(game.creator)}</p>
                            <p>Started {formatGameMetaDate(game.createdAt)}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {isCreator ? (
                            <Link
                              className="block aspect-square"
                              href={`/game/${game.id}/settings`}
                              onClick={() => setIsHeaderDrawerOpen(false)}
                            >
                              <Button
                                aria-label="Change game settings"
                                className="h-full w-full flex-col justify-center gap-2 rounded-xl px-3 py-4 text-center text-[0.68rem] font-semibold uppercase tracking-[0.12em]"
                                type="button"
                                variant="outline"
                              >
                                <Settings2 className="size-7" />
                                Settings
                              </Button>
                            </Link>
                          ) : null}
                          <Button
                            aria-label="Manage players"
                            className="aspect-square h-auto w-full flex-col justify-center gap-2 rounded-xl px-3 py-4 text-center text-[0.68rem] font-semibold uppercase tracking-[0.12em]"
                            disabled={isCompleted}
                            onClick={() => {
                              setIsHeaderDrawerOpen(false);
                              setPlayerSearch("");
                              setIsAddPlayerOpen(true);
                            }}
                            type="button"
                            variant="outline"
                          >
                            <Users className="size-7" />
                            Players
                          </Button>
                          <Button
                            aria-label="Share invite link"
                            className="aspect-square h-auto w-full flex-col justify-center gap-2 rounded-xl px-3 py-4 text-center text-[0.68rem] font-semibold uppercase tracking-[0.12em]"
                            onClick={() => {
                              setIsHeaderDrawerOpen(false);
                              setIsShareDrawerOpen(true);
                            }}
                            type="button"
                            variant="outline"
                          >
                            <Send className="size-7" />
                            Share
                          </Button>
                          {!isCompleted || isCreator ? (
                            <Button
                              aria-label={
                                isCompleted ? "Reopen game" : "End game"
                              }
                              className="aspect-square h-auto w-full flex-col justify-center gap-2 rounded-xl px-3 py-4 text-center text-[0.68rem] font-semibold uppercase tracking-[0.12em]"
                              onClick={() => {
                                setIsHeaderDrawerOpen(false);
                                if (isCompleted) {
                                  setIsReopenConfirmOpen(true);
                                  return;
                                }

                                openRoundDialog("end-game");
                              }}
                              type="button"
                              variant="outline"
                            >
                              <Trophy className="size-7" />
                              {isCompleted ? "Reopen" : "End game"}
                            </Button>
                          ) : null}
                        </div>
                        {isCreator ? (
                          <div className="flex flex-col gap-2">
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
                        ) : null}
                      </div>
                    </DrawerContent>
                  </Drawer>
                </div>
              ) : null}
            </div>
          </GameTitleImage>
        </div>

        {isCompleted ? (
          <div className="flex flex-col gap-3">
            <div
              className={cn(
                liveHighlights.gameStatus && "live-update-surface rounded-xl",
              )}
              data-live-highlighted={liveHighlights.gameStatus || undefined}
            >
              <PlayerRankPodium
                ariaLabel="Completed game podium"
                entries={completedPodiumEntries}
              />
            </div>

            {props.cardsEnabled !== false ? (
              <GameCardRewardCta currentUserId={currentUserId} game={game} />
            ) : null}

            <div className="flex justify-center">
              <RematchButton
                className="w-full rounded-xl border border-[var(--winner-border)] bg-white/40 text-[color:var(--winner-text)] shadow-sm backdrop-blur-sm hover:bg-white/55 dark:bg-black/10 dark:hover:bg-black/20"
                confirmButtonClassName="border border-[var(--winner-border)] bg-[color:var(--winner-text)] text-[color:var(--winner-surface-soft)] hover:bg-[color:var(--winner-text)]/90"
                gameId={game.id}
                gameTitle={game.gameTitle?.title ?? "Untitled game"}
                playerCount={game.players.length}
                variant="ghost"
              />
            </div>
            {completedItemizedBreakdowns.length > 0 ? (
              <Card className="rounded-xl border-border/70">
                <CardHeader>
                  <h2 className="text-lg font-black">Score breakdown</h2>
                  <p className="text-sm text-muted-foreground">
                    End-of-game categories used to total each player&apos;s
                    score.
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {completedItemizedBreakdowns.map((breakdown) => {
                    const player = game.players.find(
                      (entry) => entry.userId === breakdown.userId,
                    );

                    if (!player) {
                      return null;
                    }

                    return (
                      <div
                        className="rounded-xl border border-border/70 bg-muted/40 p-4"
                        key={breakdown.userId}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-black">
                            {getDisplayName(player.user)}
                          </p>
                          <Badge variant="outline">
                            {breakdown.totalScore}
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-col gap-2 text-sm">
                          {breakdown.lines.map((line) => (
                            <div
                              className="flex items-start justify-between gap-3"
                              key={`${breakdown.userId}:${line.categoryId}`}
                            >
                              <div>
                                <p className="font-medium">
                                  {line.categoryName}
                                </p>
                                <p className="text-muted-foreground">
                                  {Object.entries(line.values)
                                    .map(([key, value]) => `${key}: ${value}`)
                                    .join(" · ")}
                                </p>
                              </div>
                              <span className="font-black">{line.score}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}

        <div
          className={cn(
            "flex flex-col gap-3",
            liveHighlights.roster && "live-update-section",
          )}
          data-live-highlighted={liveHighlights.roster || undefined}
        >
          {sortedPlayers.map((player, index) => {
            const isWinner = winnerIds.has(player.userId);
            const isEliminatedPlayer = eliminatedUserIds.has(player.userId);
            const canEditColor = canEditGuestOrSelfColor(player);
            const canOpenProfileCard = canOpenProfileFromCard(player.user);
            const isPlayerCardInteractive =
              canOpenScoreFromCard ||
              canOpenProfileCard ||
              (canManageLiveGame &&
                !isCompleted &&
                !isPaused &&
                (isEliminationMode || isRoundWinnerMode));
            const playerSurfaceStyles = getProfileColorSurfaceStyles(
              player.user.color,
            );
            const activeRoundDelta = activeRoundScoreByUserId.get(
              player.userId,
            );
            const playerRankDelta =
              playerRankDeltasByUserId.get(player.userId) ?? null;
            const playerCardHighlighted = highlightedPlayerIdSet.has(
              player.userId,
            );
            const playerScoreHighlighted = highlightedScoreUserIdSet.has(
              player.userId,
            );

            return (
              <Card
                key={player.id}
                className={cn(
                  "overflow-hidden rounded-3xl border-none bg-transparent p-0 shadow-none",
                  playerCardHighlighted && "live-update-card",
                  isEliminationMode && isEliminatedPlayer && "opacity-55",
                )}
                data-live-highlighted={playerCardHighlighted || undefined}
                data-testid={`player-card-${player.userId}`}
              >
                <CardContent
                  className={cn(
                    "relative flex items-center gap-3 px-3 py-1",
                    isPlayerCardInteractive && "cursor-pointer",
                    playerCardHighlighted && "animate-live-update-pulse",
                  )}
                  data-testid={`player-card-content-${player.userId}`}
                  onClick={() => {
                    if (isPlayerCardInteractive) {
                      handlePlayerCardActivate(player);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (!isPlayerCardInteractive) {
                      return;
                    }

                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handlePlayerCardActivate(player);
                    }
                  }}
                  role={isPlayerCardInteractive ? "button" : undefined}
                  tabIndex={isPlayerCardInteractive ? 0 : undefined}
                  style={playerSurfaceStyles}
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,var(--profile-surface-highlight)_0%,transparent_52%)] dark:bg-[radial-gradient(circle_at_18%_18%,rgba(15,23,42,0.18)_0%,transparent_52%)]" />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_42%,var(--profile-surface-shade)_100%)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.06)_0%,rgba(15,23,42,0.22)_100%)]" />

                  <div className="relative z-10 flex shrink-0 items-center justify-center rounded-full">
                    {canEditColor ? (
                      <button
                        type="button"
                        className="flex items-center justify-center rounded-full transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15 dark:focus-visible:ring-black/15"
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
                      <ProfilePicture
                        user={player.user}
                        className={cn(
                          "border-none",
                          isWinner && "winner-avatar-ring",
                        )}
                      />
                    )}
                    {isCompleted &&
                    playerRankDelta &&
                    playerRankDelta.deltaMinor !== 0 ? (
                      <PlayerRankDeltaBadge
                        delta={playerRankDelta}
                        className="absolute -bottom-2 left-0 z-20 w-max max-w-[11rem] translate-y-full border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] text-[color:var(--profile-surface-text)] shadow-md"
                        tone="neutral"
                      />
                    ) : null}
                  </div>
                  <div className="relative z-10 min-w-0 flex-1">
                    <div className="flex flex-col justify-center gap-1">
                      {isCompleted ? (
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[color:var(--profile-surface-muted-text)]">
                          {isNoScoreMode
                            ? completedNoScoreHasPodiumPlacements
                              ? completedPlacementByUserId.get(player.userId)
                                ? `${getPlacementLabel(
                                    completedPlacementByUserId.get(
                                      player.userId,
                                    ) ?? 1,
                                  )} place`
                                : "Player"
                              : isWinner
                                ? "Winner"
                                : "Player"
                            : `${getPlacementLabel(
                                completedPlacementByUserId.get(player.userId) ??
                                  index + 1,
                              )} place`}
                        </p>
                      ) : isEliminationMode ? (
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[color:var(--profile-surface-muted-text)]">
                          {isEliminatedPlayer
                            ? `${getPlacementLabel(
                                game.eliminations.find(
                                  (entry) =>
                                    entry.eliminatedUserId === player.userId,
                                )?.placement ?? 1,
                              )} place`
                            : "Tap to eliminate"}
                        </p>
                      ) : isRoundWinnerMode ? (
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[color:var(--profile-surface-muted-text)]">
                          {sortedPlayers[0]?.userId === player.userId
                            ? "Current leader"
                            : "Tap to award round"}
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
                  {isEliminationMode ? (
                    <div
                      className="relative z-10 w-[5.5rem] overflow-visible rounded-[1.4rem] border border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] px-0 py-3 text-[color:var(--profile-surface-text)] shadow-sm backdrop-blur-[2px]"
                      data-testid={`player-score-display-${player.userId}`}
                    >
                      <div className="flex w-full items-center justify-center text-center">
                        <span className="text-3xl font-black">
                          {isEliminatedPlayer
                            ? "X"
                            : getPlayerTotalScore(player)}
                        </span>
                      </div>
                    </div>
                  ) : !isNoScoreMode && isCompleted ? (
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
                  ) : isRoundWinnerMode ||
                    (!isNoScoreMode && canEditPlayerScore(player.userId)) ? (
                    <Button
                      className={cn(
                        "relative z-10 w-[5.5rem] overflow-visible rounded-[1.4rem] border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] px-0 py-3 text-[color:var(--profile-surface-text)] shadow-sm backdrop-blur-[2px]",
                        playerScoreHighlighted && "animate-live-update-flash",
                      )}
                      data-live-highlighted={
                        playerScoreHighlighted || undefined
                      }
                      data-testid={
                        isRoundWinnerMode
                          ? `player-score-display-${player.userId}`
                          : `player-score-button-${player.userId}`
                      }
                      disabled={isCompleted || isRoundWinnerMode}
                      onClick={() => {
                        if (!isRoundWinnerMode) {
                          openScoreDialog(player);
                        }
                      }}
                      variant="outline"
                    >
                      {showsRounds &&
                      activeRoundDelta !== undefined &&
                      !isRoundWinnerMode ? (
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
                      className={cn(
                        "relative z-10 w-[5.5rem] overflow-visible rounded-[1.4rem] border border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] px-0 py-3 text-[color:var(--profile-surface-text)] shadow-sm backdrop-blur-[2px]",
                        playerScoreHighlighted && "animate-live-update-flash",
                      )}
                      data-live-highlighted={
                        playerScoreHighlighted || undefined
                      }
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
          {game.players.length === 1 &&
          canManageLiveGame &&
          !hasAnyRecordedScores ? (
            <Button
              className="h-16 w-full rounded-xl"
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

        {!canManageLiveGame && !snapshot.canEditOwnScore ? (
          <Card className="border-dashed bg-card/70 p-0">
            <CardContent className="px-4 py-4 text-sm text-slate-500">
              View Mode. Your current role does not allow score changes or game
              management.
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-3 sm:px-6">
        <div
          className={cn(
            "mx-auto w-full max-w-md p-3 text-card-foreground",
            liveHighlights.gameStatus && "live-update-section",
          )}
          data-live-highlighted={liveHighlights.gameStatus || undefined}
        >
          <div className="flex justify-between gap-2">
            {showsRounds && !isNoScoreMode ? (
              <Button
                className="h-16 w-fit backdrop-blur-xs min-w-20 flex-col gap-1 rounded-xl text-[0.68rem] font-semibold tracking-[0.08em] uppercase"
                disabled={isPaused}
                onClick={() => setIsRoundHistoryOpen(true)}
                variant="outline"
              >
                <ListChecks className="size-5" />
                Scores
              </Button>
            ) : null}

            {!isCompleted && canManageLiveGame && (
              <Button
                className="h-16 w-fit backdrop-blur-xs min-w-20 flex-col gap-1 rounded-xl text-[0.68rem] font-semibold tracking-[0.08em] uppercase"
                disabled={pauseMutationPending || resumeMutationPending}
                onClick={openPauseDialog}
                variant="outline"
              >
                {pauseMutationPending ? (
                  <LoaderCircle className="size-5 animate-spin" />
                ) : (
                  <Pause className="size-5" />
                )}
                Pause
              </Button>
            )}

            {isCompleted && (
              <Link className="w-fit" href="/dashboard">
                <Button
                  className="h-16 w-fit backdrop-blur-xs min-w-20 flex-col gap-1 rounded-xl text-[0.68rem] font-semibold tracking-[0.08em] uppercase"
                  variant="outline"
                >
                  <DoorOpen className="size-5" />
                  Return
                </Button>
              </Link>
            )}

            {!isCompleted && !canManageLiveGame ? (
              <div className="h-16 min-w-20" aria-hidden />
            ) : null}

            {canManageLiveGame ? (
              <Button
                className={cn(
                  "h-16 w-fit min-w-20 backdrop-blur-xs flex-col gap-1 rounded-xl text-[0.68rem] font-semibold tracking-[0.08em] uppercase",
                  isRoundScoringReady && "bg-primary text-primary-foreground",
                )}
                disabled={isCompleted || isPaused || commitRoundPending}
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
                  : isItemizedGame
                    ? "Score"
                    : isEliminationMode || isRoundWinnerMode
                      ? "Round"
                      : isNoScoreMode
                        ? "Finish"
                        : showsRounds
                          ? "Round"
                          : isFreePlay
                            ? "Score"
                            : "Round"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog
        onOpenChange={setIsDeleteGameDialogOpen}
        open={isDeleteGameDialogOpen}
      >
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-xl p-5">
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

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setRestoreEliminationUserId(null);
          }
        }}
        open={restoreEliminationPlayer !== null}
      >
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-xl p-5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              Undo elimination?
            </DialogTitle>
            <DialogDescription className="text-base">
              {restoreEliminationPlayer
                ? `${getDisplayName(restoreEliminationPlayer.user)} and anyone eliminated after them will be restored to active play.`
                : "Restore this player to active play."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-transparent p-0 pt-2">
            <Button
              disabled={uneliminateMutationPending}
              onClick={() => setRestoreEliminationUserId(null)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={uneliminateMutationPending || !restoreEliminationPlayer}
              onClick={() => {
                if (!restoreEliminationPlayer) {
                  return;
                }

                handleUneliminatePlayer(restoreEliminationPlayer.userId);
              }}
            >
              {uneliminateMutationPending ? (
                <LoaderCircle className="animate-spin" />
              ) : null}
              Restore player
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={setIsPauseDialogOpen}
        open={isPauseDialogOpen && !isPaused}
      >
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-xl p-5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              Need to pause?
            </DialogTitle>
            <DialogDescription className="text-base">
              Select the player who's turn is next so that you remember when you
              pick it up again.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {game.players.map((player) => (
              <Button
                className="justify-between rounded-xl px-4 py-6"
                key={player.userId}
                onClick={() => setPausedNextUserIdSelection(player.userId)}
                type="button"
                variant={
                  pausedNextUserIdSelection === player.userId
                    ? "default"
                    : "outline"
                }
              >
                <span>{getDisplayName(player.user)}</span>
                {pausedNextUserIdSelection === player.userId ? (
                  <Check className="size-4" />
                ) : null}
              </Button>
            ))}
          </div>
          <DialogFooter className="bg-transparent p-0 pt-2">
            <Button
              disabled={pauseMutationPending}
              onClick={() => setIsPauseDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={pauseMutationPending} onClick={handlePauseGame}>
              {pauseMutationPending ? (
                <LoaderCircle className="animate-spin" />
              ) : null}
              Pause game
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setIsReopenConfirmOpen} open={isReopenConfirmOpen}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-xl p-5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              Re-open this game?
            </DialogTitle>
            <DialogDescription className="text-base">
              This will mark the game as active again, clear its winner, and let
              you keep playing from the next round.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-transparent p-0 pt-2">
            <Button
              disabled={commitRoundPending}
              onClick={() => setIsReopenConfirmOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={commitRoundPending} onClick={handleReopenGame}>
              {commitRoundPending ? (
                <LoaderCircle className="animate-spin" />
              ) : null}
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaused}>
        <DialogContent
          className="max-w-[calc(100%-1.5rem)] rounded-xl p-5"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              Game paused
            </DialogTitle>
            <DialogDescription className="text-base">
              {pausedNextPlayer
                ? `${getDisplayName(pausedNextPlayer.user)}'s turn is next.`
                : "Tap continue when you are ready"}
            </DialogDescription>
          </DialogHeader>
          {canManageLiveGame ? (
            <DialogFooter className="bg-transparent p-0 pt-2">
              <Button
                disabled={resumeMutationPending}
                onClick={handleResumeGame}
              >
                {resumeMutationPending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Play className="size-4" />
                )}
                Continue
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      <Drawer
        onOpenChange={handleScoreDrawerOpenChange}
        open={isScoreDrawerOpen && !isPaused}
      >
        <DrawerContent
          className="max-h-[92vh] gap-0 overflow-hidden rounded-t-[2rem] p-0 text-[color:var(--profile-surface-text)] duration-150 data-open:slide-in-from-bottom-3 data-closed:slide-out-to-bottom-3"
          style={
            scoreDialogPlayer
              ? getProfileColorSurfaceStyles(scoreDialogPlayer.user.color)
              : undefined
          }
        >
          <div className="pointer-events-none absolute inset-[1px] rounded-t-[calc(2rem-1px)] border border-[var(--profile-surface-ring)]" />
          <div className="pointer-events-none absolute inset-0 rounded-t-[2rem] bg-[radial-gradient(circle_at_24%_18%,var(--profile-surface-highlight)_0%,transparent_52%)] dark:bg-[radial-gradient(circle_at_24%_18%,rgba(15,23,42,0.18)_0%,transparent_52%)]" />
          <div className="pointer-events-none absolute inset-0 rounded-t-[2rem] bg-[linear-gradient(180deg,transparent_42%,var(--profile-surface-shade)_100%)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.06)_0%,rgba(15,23,42,0.22)_100%)]" />
          {scoreDialogState?.kind === "itemized" ? (
            <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col">
              <DrawerHeader className="px-5 pt-5 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    {scoreDialogState.step === "category_detail" ? (
                      <Button
                        aria-label="Back to categories"
                        className="size-11 rounded-[1.1rem] border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] text-[color:var(--profile-surface-text)] shadow-sm"
                        onClick={returnToItemizedCategoryList}
                        size="icon-lg"
                        type="button"
                        variant="outline"
                      >
                        <ChevronLeft className="size-5" />
                      </Button>
                    ) : null}
                    <div className="min-w-0">
                      <DrawerTitle className="text-[clamp(1.5rem,6vw,2rem)] font-black">
                        {scoreDialogState.step === "category_detail" &&
                        selectedItemizedCategory
                          ? selectedItemizedCategory.name
                          : scoreDialogPlayer
                            ? getDisplayName(scoreDialogPlayer.user)
                            : ""}
                      </DrawerTitle>
                      <DrawerDescription className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--profile-surface-muted-text)]">
                        {scoreDialogState.step === "category_detail" &&
                        scoreDialogPlayer
                          ? `${getDisplayName(scoreDialogPlayer.user)} · ${selectedItemizedCategoryScore} pts`
                          : `Total ${selectedItemizedPlayerTotal} pts`}
                      </DrawerDescription>
                    </div>
                  </div>
                  <Button
                    aria-label="Close score drawer"
                    className="size-11 rounded-[1.1rem] border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] text-[color:var(--profile-surface-text)] shadow-sm"
                    onClick={closeScoreDrawer}
                    size="icon-lg"
                    type="button"
                    variant="outline"
                  >
                    <X className="size-5" />
                  </Button>
                </div>
              </DrawerHeader>

              {scoreDialogItemizedPreview.error ? (
                <div className="px-5 pb-3">
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive">
                    {scoreDialogItemizedPreview.error}
                  </div>
                </div>
              ) : null}

              {scoreDialogState.step === "category_list" ? (
                <div className="flex min-h-0 flex-1 flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
                  <div className="rounded-xl border border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--profile-surface-muted-text)]">
                      Score summary
                    </p>
                    <p
                      className="mt-2 text-4xl font-black leading-none"
                      data-testid="itemized-player-total"
                    >
                      {selectedItemizedPlayerTotal}
                    </p>
                    <p className="mt-2 text-sm text-[color:var(--profile-surface-muted-text)]">
                      Choose a configured scoring item to review or update.
                    </p>
                  </div>

                  <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
                    {itemizedCategories.map((category) => (
                      <button
                        key={category.id}
                        className="rounded-xl border border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] p-4 text-left shadow-sm transition hover:scale-[1.01]"
                        data-testid={`itemized-category-row-${category.id}`}
                        onClick={() => openItemizedCategoryDetail(category.id)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-black">{category.name}</p>
                            {category.optional ? (
                              <p className="mt-1 text-sm text-[color:var(--profile-surface-muted-text)]">
                                {getItemizedCategoryStatus({
                                  category,
                                  playerId: scoreDialogPlayer?.userId ?? "",
                                  scopeKey: scoreDialogItemizedScopeKey,
                                })}
                              </p>
                            ) : null}
                          </div>
                          <div className="rounded-full border border-[var(--profile-surface-panel-border)] px-3 py-1 text-sm font-black">
                            {category.optional &&
                            getOptionalItemizedUsage({
                              category,
                              playerId: scoreDialogPlayer?.userId ?? "",
                              scopeKey: scoreDialogItemizedScopeKey,
                            }) === false
                              ? "Skipped"
                              : getItemizedCategoryScore(
                                  scoreDialogPlayer?.userId ?? "",
                                  category.id,
                                )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {scoreDialogState.mode !== "end_game" ? (
                    <Button
                      className="mt-4 h-12 rounded-xl"
                      disabled={
                        Boolean(scoreDialogItemizedPreview.error) ||
                        unresolvedScoreDialogOptionalCategories.length > 0
                      }
                      onClick={handleItemizedScoreSave}
                      type="button"
                    >
                      Save round score
                    </Button>
                  ) : null}
                </div>
              ) : scoreDialogState.step === "optional_confirm" &&
                selectedItemizedCategory &&
                scoreDialogPlayer ? (
                <div className="flex min-h-0 flex-1 flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
                  <div className="rounded-xl border border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] p-5 shadow-sm">
                    <p className="text-lg font-black text-[color:var(--profile-surface-text)]">
                      Use {selectedItemizedCategory.name} for{" "}
                      {getDisplayName(scoreDialogPlayer.user)}?
                    </p>
                    <p className="mt-2 text-sm text-[color:var(--profile-surface-muted-text)]">
                      Choose whether this configured scoring item applies before
                      entering values.
                    </p>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <Button
                      className="h-12 rounded-xl"
                      onClick={() => handleOptionalItemizedChoice(true)}
                      type="button"
                    >
                      Yes, use it
                    </Button>
                    <Button
                      className="h-12 rounded-xl"
                      onClick={() => handleOptionalItemizedChoice(false)}
                      type="button"
                      variant="outline"
                    >
                      No, skip it
                    </Button>
                  </div>
                </div>
              ) : selectedItemizedCategory ? (
                selectedItemizedCategory.inputMode === "single" ? (
                  <>
                    <div className="px-5 pb-4">
                      <div className="rounded-[1.75rem] border border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <Button
                            aria-label="Decrease score by 1"
                            className="h-14 w-14 shrink-0 rounded-[1.25rem] border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] text-[color:var(--profile-surface-text)] shadow-sm"
                            disabled={isCompleted}
                            onClick={() => {
                              const scoreAmount =
                                parseScoreAmountInput(scoreAmountInput) ?? 0;
                              updateSelectedSingleItemizedValue(
                                String(scoreAmount - 1),
                              );
                            }}
                            type="button"
                            variant="outline"
                          >
                            <Minus className="size-5" />
                          </Button>
                          <div className="flex-1 text-center">
                            <p
                              className="text-[clamp(2.5rem,12vw,3.5rem)] font-black leading-none text-[color:var(--profile-surface-text)]"
                              data-testid="score-drawer-entry"
                            >
                              {scoreAmountInput}
                            </p>
                            <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--profile-surface-muted-text)]">
                              Category total {selectedItemizedCategoryScore}
                            </p>
                          </div>
                          <Button
                            aria-label="Increase score by 1"
                            className="h-14 w-14 shrink-0 rounded-[1.25rem] border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] text-[color:var(--profile-surface-text)] shadow-sm"
                            disabled={isCompleted}
                            onClick={() => {
                              const scoreAmount =
                                parseScoreAmountInput(scoreAmountInput) ?? 0;
                              updateSelectedSingleItemizedValue(
                                String(scoreAmount + 1),
                              );
                            }}
                            type="button"
                            variant="outline"
                          >
                            <Plus className="size-5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto bg-transparent px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
                      <div
                        className={cn(
                          "mx-auto flex w-full flex-col justify-start",
                          SCORE_DRAWER_KEYBOARD_MAX_HEIGHT_CLASS,
                        )}
                        style={{
                          ["--key-height" as string]: `min(4.25rem, max(2.5rem, calc((min(50dvh, ${SCORE_DRAWER_KEYBOARD_MAX_HEIGHT}) - 6.5rem) / 5)))`,
                        }}
                      >
                        <div className="grid grid-cols-3 gap-3">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                            <Button
                              key={digit}
                              aria-label={`Enter ${digit}`}
                              className="h-[var(--key-height)] min-h-0 w-full rounded-[1.5rem] border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] text-[clamp(0.95rem,4vw,1.5rem)] font-black text-[color:var(--profile-surface-text)] shadow-sm"
                              disabled={isCompleted || isPaused}
                              onClick={() =>
                                updateSelectedSingleItemizedValue(
                                  appendScoreAmountDigit(
                                    scoreAmountInput,
                                    digit,
                                  ),
                                )
                              }
                              type="button"
                              variant="outline"
                            >
                              {digit}
                            </Button>
                          ))}
                          <Button
                            aria-label="Toggle positive or negative"
                            className="h-[var(--key-height)] min-h-0 w-full rounded-[1.5rem] border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] text-[clamp(0.85rem,3.6vw,1.25rem)] font-black text-[color:var(--profile-surface-text)] shadow-sm"
                            disabled={isPaused}
                            onClick={() =>
                              updateSelectedSingleItemizedValue(
                                toggleScoreAmountSign(scoreAmountInput),
                              )
                            }
                            type="button"
                            variant="outline"
                          >
                            +/-
                          </Button>
                          <Button
                            aria-label="Enter 0"
                            className="h-[var(--key-height)] min-h-0 w-full rounded-[1.5rem] border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] text-[clamp(0.95rem,4vw,1.5rem)] font-black text-[color:var(--profile-surface-text)] shadow-sm"
                            disabled={isCompleted || isPaused}
                            onClick={() =>
                              updateSelectedSingleItemizedValue(
                                appendScoreAmountDigit(scoreAmountInput, 0),
                              )
                            }
                            type="button"
                            variant="outline"
                          >
                            0
                          </Button>
                          <Button
                            aria-label="Delete digit"
                            className="h-[var(--key-height)] min-h-0 w-full rounded-[1.5rem] border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] text-[clamp(0.85rem,3.6vw,1.25rem)] font-black text-[color:var(--profile-surface-text)] shadow-sm"
                            disabled={isCompleted || isPaused}
                            onClick={() =>
                              updateSelectedSingleItemizedValue(
                                removeScoreAmountDigit(scoreAmountInput),
                              )
                            }
                            type="button"
                            variant="outline"
                          >
                            <Delete className="size-[clamp(0.95rem,4vw,1.25rem)]" />
                          </Button>
                        </div>
                        <Button
                          className="mt-3 h-[var(--key-height)] min-h-0 w-full rounded-[1.5rem] border-[var(--profile-surface-panel-border)] !bg-[var(--profile-surface-panel)] text-[clamp(1rem,4vw,1.25rem)] font-black !text-[color:var(--profile-surface-text)] shadow-sm hover:!bg-[var(--profile-surface-panel)] active:!bg-[var(--profile-surface-panel)]"
                          onClick={returnToItemizedCategoryList}
                          type="button"
                          variant="outline"
                        >
                          <Check className="size-[clamp(1rem,4vw,1.25rem)]" />
                          Done
                        </Button>
                        <div className="min-h-0 flex-1" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
                    <div className="rounded-xl border border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] p-4 shadow-sm">
                      <p
                        className="text-4xl font-black leading-none"
                        data-testid="itemized-category-total"
                      >
                        {selectedItemizedCategoryScore}
                      </p>
                    </div>

                    <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
                      {selectedItemizedCategory.inputs.map((categoryInput) => (
                        <label
                          className="rounded-xl border border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] p-4 shadow-sm"
                          key={`${selectedItemizedCategory.id}:${categoryInput.key}`}
                        >
                          <span className="text-sm font-bold">
                            {categoryInput.label}
                          </span>
                          <Input
                            className="mt-3 h-12 rounded-[1rem] border-[var(--profile-surface-panel-border)] bg-background/70"
                            data-testid={`itemized-input-${selectedItemizedCategory.id}-${categoryInput.key}`}
                            inputMode="numeric"
                            onChange={(event) =>
                              updateItemizedInputValue({
                                categoryId: selectedItemizedCategory.id,
                                inputKey: categoryInput.key,
                                playerId: scoreDialogPlayer?.userId ?? "",
                                scopeKey: scoreDialogItemizedScopeKey,
                                value: event.target.value,
                              })
                            }
                            type="number"
                            value={
                              itemizedValueState[
                                buildItemizedValueKey(
                                  scoreDialogItemizedScopeKey,
                                  scoreDialogPlayer?.userId ?? "",
                                  selectedItemizedCategory.id,
                                  categoryInput.key,
                                )
                              ] ?? String(categoryInput.defaultValue)
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )
              ) : null}
            </div>
          ) : (
            <form
              className="relative z-10 flex min-h-0 w-full flex-1 flex-col"
              onSubmit={handleScoreSubmit}
            >
              <DrawerHeader className="px-5 pt-5 pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DrawerTitle className="text-[clamp(1.5rem,6vw,2rem)] font-black">
                      {scoreDialogPlayer
                        ? getDisplayName(scoreDialogPlayer.user)
                        : ""}
                    </DrawerTitle>
                    <DrawerDescription className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--profile-surface-muted-text)]">
                      Round {scoreDialogRoundNumber}
                    </DrawerDescription>
                  </div>
                  <Button
                    aria-label="Close score drawer"
                    className="size-11 rounded-[1.1rem] border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] text-[color:var(--profile-surface-text)] shadow-sm"
                    onClick={closeScoreDrawer}
                    size="icon-lg"
                    type="button"
                    variant="outline"
                  >
                    <X className="size-5" />
                  </Button>
                </div>
              </DrawerHeader>

              <div className="px-5 pb-4">
                <div className="rounded-[1.75rem] border border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <Button
                      aria-label="Decrease score by 1"
                      className="h-14 w-14 shrink-0 rounded-[1.25rem] border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] text-[color:var(--profile-surface-text)] shadow-sm"
                      disabled={isCompleted || scoreMutationPending}
                      onClick={() => {
                        const scoreAmount =
                          parseScoreAmountInput(scoreAmountInput) ?? 0;
                        setScoreAmountInput(String(scoreAmount - 1));
                      }}
                      type="button"
                      variant="outline"
                    >
                      <Minus className="size-5" />
                    </Button>
                    <p
                      className="flex-1 text-center text-[clamp(2.5rem,12vw,3.5rem)] font-black leading-none text-[color:var(--profile-surface-text)]"
                      data-testid="score-drawer-entry"
                    >
                      {scoreAmountInput}
                    </p>
                    <Button
                      aria-label="Increase score by 1"
                      className="h-14 w-14 shrink-0 rounded-[1.25rem] border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] text-[color:var(--profile-surface-text)] shadow-sm"
                      disabled={isCompleted || scoreMutationPending}
                      onClick={() => {
                        const scoreAmount =
                          parseScoreAmountInput(scoreAmountInput) ?? 0;
                        setScoreAmountInput(String(scoreAmount + 1));
                      }}
                      type="button"
                      variant="outline"
                    >
                      <Plus className="size-5" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-auto bg-transparent px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
                <div
                  className={cn(
                    "mx-auto flex w-full flex-col justify-start",
                    SCORE_DRAWER_KEYBOARD_MAX_HEIGHT_CLASS,
                  )}
                  style={{
                    ["--key-height" as string]: `min(4.25rem, max(2.5rem, calc((min(50dvh, ${SCORE_DRAWER_KEYBOARD_MAX_HEIGHT}) - 6.5rem) / 5)))`,
                  }}
                >
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                      <Button
                        key={digit}
                        aria-label={`Enter ${digit}`}
                        className="h-[var(--key-height)] min-h-0 w-full rounded-[1.5rem] border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] text-[clamp(0.95rem,4vw,1.5rem)] font-black text-[color:var(--profile-surface-text)] shadow-sm"
                        disabled={
                          isCompleted || isPaused || scoreMutationPending
                        }
                        onClick={() =>
                          setScoreAmountInput(
                            appendScoreAmountDigit(scoreAmountInput, digit),
                          )
                        }
                        type="button"
                        variant="outline"
                      >
                        {digit}
                      </Button>
                    ))}
                    <Button
                      aria-label="Toggle positive or negative"
                      className="h-[var(--key-height)] min-h-0 w-full rounded-[1.5rem] border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] text-[clamp(0.85rem,3.6vw,1.25rem)] font-black text-[color:var(--profile-surface-text)] shadow-sm"
                      disabled={isPaused || scoreMutationPending}
                      onClick={() =>
                        setScoreAmountInput(
                          toggleScoreAmountSign(scoreAmountInput),
                        )
                      }
                      type="button"
                      variant="outline"
                    >
                      +/-
                    </Button>
                    <Button
                      aria-label="Enter 0"
                      className="h-[var(--key-height)] min-h-0 w-full rounded-[1.5rem] border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] text-[clamp(0.95rem,4vw,1.5rem)] font-black text-[color:var(--profile-surface-text)] shadow-sm"
                      disabled={isCompleted || isPaused || scoreMutationPending}
                      onClick={() =>
                        setScoreAmountInput(
                          appendScoreAmountDigit(scoreAmountInput, 0),
                        )
                      }
                      type="button"
                      variant="outline"
                    >
                      0
                    </Button>
                    <Button
                      aria-label="Delete digit"
                      className="h-[var(--key-height)] min-h-0 w-full rounded-[1.5rem] border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] text-[clamp(0.85rem,3.6vw,1.25rem)] font-black text-[color:var(--profile-surface-text)] shadow-sm"
                      disabled={isCompleted || isPaused || scoreMutationPending}
                      onClick={() =>
                        setScoreAmountInput(
                          removeScoreAmountDigit(scoreAmountInput),
                        )
                      }
                      type="button"
                      variant="outline"
                    >
                      <Delete className="size-[clamp(0.95rem,4vw,1.25rem)]" />
                    </Button>
                  </div>
                  <Button
                    aria-label="Confirm"
                    className="mt-3 h-[var(--key-height)] min-h-0 w-full rounded-[1.5rem] border-[var(--profile-surface-panel-border)] !bg-[var(--profile-surface-panel)] text-[clamp(1rem,4vw,1.25rem)] font-black !text-[color:var(--profile-surface-text)] shadow-sm hover:!bg-[var(--profile-surface-panel)] active:!bg-[var(--profile-surface-panel)]"
                    disabled={isPaused || scoreMutationPending}
                    type="submit"
                    variant="outline"
                  >
                    {scoreMutationPending ? (
                      <LoaderCircle className="size-[clamp(1rem,4vw,1.25rem)] animate-spin" />
                    ) : (
                      <Check className="size-[clamp(1rem,4vw,1.25rem)]" />
                    )}
                    Confirm
                  </Button>
                  <div className="min-h-0 flex-1" />
                </div>
              </div>
            </form>
          )}
        </DrawerContent>
      </Drawer>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setColorDialogPlayerId(null);
            setSelectedGuestColor(null);
          }
        }}
        open={Boolean(colorDialogPlayer)}
      >
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-xl p-5">
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

      <Drawer onOpenChange={setIsShareDrawerOpen} open={isShareDrawerOpen}>
        <DrawerContent className="gap-4 pb-28">
          <DrawerHeader>
            <DrawerTitle className="text-xl font-black">
              Share this game
            </DrawerTitle>
            <DrawerDescription>
              {shareJoinOpen
                ? "Players who open this link before the game starts can join right away."
                : "Link joins currently require manager approval."}
            </DrawerDescription>
          </DrawerHeader>
          <Card className="rounded-xl border-border/70">
            <CardContent className="flex items-center gap-3 p-4">
              <Checkbox
                className="size-8 rounded-xl"
                checked={game.inviteUsersEnabled}
                disabled={isInviteTogglePending || isCompleted}
                onCheckedChange={(checked) => {
                  handleInviteUsersToggle(Boolean(checked));
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">
                  {game.inviteUsersEnabled
                    ? "Join link enabled"
                    : "Join link disabled"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {gameHasStarted
                    ? "This game has started, so new joiners need approval even when the link is enabled."
                    : "Before the game starts, enabled links let players join immediately."}
                </p>
              </div>
            </CardContent>
          </Card>
          {gameSharePath ? (
            <div className="rounded-xl border border-border/70 bg-card p-4">
              <ShareQrPanel
                blurQrCode={!game.inviteUsersEnabled}
                initialPath={gameSharePath}
                qrTitle="Game share QR code"
                qrBlurLabel="Enable join link to reveal QR code"
                shareButtonLabel="Share game"
                shareErrorMessage="Unable to share the game link"
                sharePayload={{
                  title: `${game.gameTitle?.title ?? "Game"} invite`,
                  text: `Join my game on ${game.gameTitle?.title ?? "Score Loser"}.`,
                }}
              />
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>

      <Dialog
        onOpenChange={(open) => {
          setIsAddPlayerOpen(open);
          if (!open) {
            resetAddPlayerFlow();
          }
        }}
        open={isAddPlayerOpen}
      >
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-xl p-0">
          <DialogHeader className="p-5 pb-0">
            <DialogTitle className="text-2xl font-black">
              {isAddPlayerMode ? "Add user" : "Manage users"}
            </DialogTitle>
          </DialogHeader>
          {isAddPlayerMode ? (
            <>
              <Command className="border-0 bg-transparent px-4">
                {addPlayerSelection ? null : (
                  <CommandInput
                    className="text-lg"
                    onValueChange={setPlayerSearch}
                    placeholder="Search friends or guests"
                    value={playerSearch}
                  />
                )}
                <CommandList className="max-h-[50vh]">
                  {addPlayerSelection ? (
                    <div className="space-y-4 px-1 py-3">
                      <div className="rounded-xl border border-border/70 bg-muted/40 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Selected user
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                          <ProfilePicture
                            className="border-none"
                            size="sm"
                            user={
                              addPlayerSelection.type === "existing"
                                ? addPlayerSelection.user
                                : addPlayerSelection.optimisticUser
                            }
                          />
                          <div className="min-w-0">
                            <p className="truncate text-base font-bold text-foreground">
                              {getDisplayName(
                                addPlayerSelection.type === "existing"
                                  ? addPlayerSelection.user
                                  : addPlayerSelection.optimisticUser,
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Choose how this player should join the scoreboard.
                            </p>
                          </div>
                        </div>
                      </div>
                      {addPlayerSelection.type === "guest" ? (
                        <div className="rounded-xl border border-border/70 bg-background px-4 py-4">
                          <ProfileColorSelector
                            color={addPlayerSelection.color}
                            description="Pick a badge color before adding this guest"
                            disabled={addPlayerSelectionPending}
                            onSelect={handlePendingGuestColorSelect}
                            title="Guest color"
                          />
                        </div>
                      ) : null}
                      {!canOfferStartingScoreOptions &&
                      addPlayerSelection.type === "guest" ? (
                        <Button
                          className="h-12 w-full rounded-xl"
                          disabled={addPlayerSelectionPending}
                          onClick={handleAddGuestPlayer}
                          type="button"
                        >
                          {addPlayerSelectionPending ? (
                            <LoaderCircle className="animate-spin" />
                          ) : (
                            <Plus className="size-5" />
                          )}
                          Add guest
                        </Button>
                      ) : null}
                      {canOfferStartingScoreOptions ? (
                        <div className="grid grid-cols-2 gap-3">
                          {startingScoreOptions.map((option) =>
                            option.mode === "custom" ? (
                              <div
                                key={option.mode}
                                className="col-span-2 rounded-xl border border-border/70 bg-background px-4 py-4"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span className="font-semibold">Custom</span>
                                  <span className="text-sm text-muted-foreground">
                                    Enter an amount
                                  </span>
                                </div>
                                <div className="mt-3 flex items-center gap-3">
                                  <Input
                                    inputMode="numeric"
                                    onChange={(event) =>
                                      setCustomStartingScoreInput(
                                        normalizeScoreAmountInput(
                                          event.target.value,
                                        ),
                                      )
                                    }
                                    placeholder="0"
                                    value={customStartingScoreInput}
                                  />
                                  <Button
                                    disabled={
                                      addPlayerSelectionPending ||
                                      parseScoreAmountInput(
                                        customStartingScoreInput,
                                      ) === null
                                    }
                                    onClick={() =>
                                      handleAddPlayerWithStartingScore("custom")
                                    }
                                    type="button"
                                  >
                                    Apply
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                key={option.mode}
                                className="h-32 flex-col items-center justify-center rounded-xl px-4 py-3 text-center"
                                disabled={addPlayerSelectionPending}
                                onClick={() =>
                                  handleAddPlayerWithStartingScore(option.mode)
                                }
                                type="button"
                                variant="outline"
                              >
                                <span className="text-4xl font-black leading-none">
                                  {option.value}
                                </span>
                                <span className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                  {option.label}
                                </span>
                              </Button>
                            ),
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <>
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
                            className="h-14 w-full rounded-xl"
                            disabled={!playerSearch.trim() || addGuestPending}
                            onClick={handleGuestSetup}
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
                    </>
                  )}
                </CommandList>
              </Command>
              <DialogFooter>
                <Button
                  className="w-full"
                  onClick={() => {
                    if (addPlayerSelection) {
                      setAddPlayerSelection(null);
                      setCustomStartingScoreInput("0");
                      return;
                    }

                    resetAddPlayerFlow();
                  }}
                  type="button"
                  variant="outline"
                >
                  {addPlayerSelection ? "Choose another user" : "Back to users"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div
                className={cn(
                  "px-5 pb-4",
                  liveHighlights.roster && "live-update-section",
                )}
                data-live-highlighted={liveHighlights.roster || undefined}
              >
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Players
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {game.players.map((player) => {
                    const playerPending = pendingKeySet.has(
                      `remove-player:${player.userId}`,
                    );
                    const canRemoveSelf = player.userId !== currentUserId;
                    const disableRemoval =
                      game.players.length <= 1 || playerPending;
                    const managerPending = pendingManagerUserIds.includes(
                      player.userId,
                    );
                    const playerRowHighlighted = highlightedPlayerIdSet.has(
                      player.userId,
                    );

                    return (
                      <Card
                        key={player.id}
                        className={cn(
                          "gap-0 rounded-xl border-border/70 p-0",
                          playerRowHighlighted && "live-update-card",
                        )}
                        data-live-highlighted={
                          playerRowHighlighted || undefined
                        }
                      >
                        <CardContent className="p-0 flex items-center justify-between gap-3 px-3 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <ProfilePicture
                              className="border-none"
                              size="xs"
                              user={player.user}
                            />
                            <div className="min-w-0 self-center">
                              <p className="truncate text-sm font-bold text-foreground">
                                {getDisplayName(player.user)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {player.userId === game.creatorId
                                  ? "Creator"
                                  : getStoredGamePlayerRole(player) ===
                                      "manager"
                                    ? "Manager"
                                    : getStoredGamePlayerRole(player) ===
                                        "self_scorer"
                                      ? "Edits own scores"
                                      : player.user.isGuest
                                        ? "Guest"
                                        : "Player"}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 self-center">
                            {player.userId === game.creatorId ? (
                              <Badge variant="outline">Creator</Badge>
                            ) : (
                              <Select
                                disabled={
                                  !isCreator || isCompleted || managerPending
                                }
                                onValueChange={(role) =>
                                  handlePlayerRoleChange(
                                    player,
                                    role === "manager" || role === "self_scorer"
                                      ? role
                                      : "player",
                                  )
                                }
                                value={getStoredGamePlayerRole(player)}
                              >
                                <SelectTrigger
                                  className={cn(
                                    "h-9 w-36",
                                    playerRowHighlighted &&
                                      "animate-live-update-flash",
                                  )}
                                  data-testid={`player-role-select-${player.userId}`}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="player">
                                    View only
                                  </SelectItem>
                                  <SelectItem value="self_scorer">
                                    Own scores
                                  </SelectItem>
                                  <SelectItem value="manager">
                                    Manager
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            {canRemoveSelf ? (
                              <Button
                                aria-label={`Remove ${getDisplayName(player.user)}`}
                                className="rounded-xl"
                                data-testid={`remove-player-button-${player.userId}`}
                                disabled={
                                  disableRemoval ||
                                  player.userId === game.creatorId
                                }
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
                              </Button>
                            ) : (
                              <Badge variant="outline">
                                {isCreator
                                  ? "You"
                                  : isManager
                                    ? "Manager"
                                    : "You"}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {pendingJoinRequests.map((request) => {
                    const requestPending = pendingJoinRequestIds.includes(
                      request.id,
                    );

                    return (
                      <Card
                        key={request.id}
                        className="rounded-xl border-border/50 bg-muted/20 p-0 text-muted-foreground"
                      >
                        <CardContent className="flex items-center justify-between gap-3 p-0 px-3 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <ProfilePicture
                              className="border-none opacity-75"
                              size="xs"
                              user={request.requester}
                            />
                            <div className="min-w-0 self-center">
                              <p className="truncate text-sm font-bold text-foreground/75">
                                {getDisplayName(request.requester)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Join request
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 self-center">
                            <Button
                              aria-label={`Approve ${getDisplayName(request.requester)}`}
                              className="rounded-xl"
                              disabled={requestPending}
                              onClick={() => openJoinRequestApproval(request)}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              {requestPending ? (
                                <LoaderCircle className="animate-spin" />
                              ) : (
                                <Check className="size-4" />
                              )}
                            </Button>
                            <Button
                              aria-label={`Decline ${getDisplayName(request.requester)}`}
                              className="rounded-xl"
                              disabled={requestPending}
                              onClick={() =>
                                handleDeclineJoinRequest(request.id)
                              }
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button
                  className="w-full"
                  onClick={() => setIsAddPlayerOpen(false)}
                  type="button"
                  variant="outline"
                >
                  Back to game
                </Button>
                <Button
                  className="w-full"
                  onClick={() => {
                    setIsAddPlayerOpen(false);
                    setIsShareDrawerOpen(true);
                  }}
                  type="button"
                  variant="outline"
                >
                  Share invite link
                </Button>
                <Button
                  className="w-full"
                  onClick={() => setIsAddPlayerMode(true)}
                  type="button"
                >
                  <Plus className="size-4" />
                  Player
                </Button>
              </DialogFooter>
            </>
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
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-xl p-5">
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
            setPendingEliminationUserId(null);
            setRoundDialogIntent("round");
            setActiveNoScorePlacement(1);
            setConfirmedNoScorePlacements([]);
          }
        }}
        open={isRoundDialogOpen && !isPaused}
      >
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-xl p-5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              {isItemizedGame
                ? "Enter final scoring"
                : pendingEliminationPlayer
                  ? `End of round ${nextRoundNumber}`
                  : isEliminationMode && roundDialogIntent !== "end-game"
                    ? gameSettingsV2?.roundConfig.enabled
                      ? `Round ${nextRoundNumber}`
                      : "Elimination"
                    : isRoundWinnerMode && roundDialogIntent !== "end-game"
                      ? gameSettingsV2?.roundConfig.enabled
                        ? `Round ${nextRoundNumber}`
                        : "Choose the winner"
                      : roundDialogIntent === "end-game"
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

          {pendingEliminationPlayer && pendingEliminationWinner ? (
            <div className="rounded-xl border border-border bg-muted/50 p-4">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Round winner
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="font-black">
                  {getDisplayName(pendingEliminationWinner.user)}
                </span>
                <Badge variant="outline">+1 point</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {getDisplayName(pendingEliminationPlayer.user)} was the last
                player eliminated this round.
              </p>
            </div>
          ) : isRoundWinnerMode && roundDialogIntent !== "end-game" ? (
            <div className="rounded-xl border border-border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                {gameSettingsV2?.roundConfig.enabled
                  ? "Tap a player card to award this round winner. The score pill on each card shows that player’s current round-win total."
                  : "Tap a player card to choose the winner and finish the game."}
              </p>
            </div>
          ) : isItemizedGame ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  Enter each player&apos;s itemized scoring from their player
                  card. Totals here update from the configured scoring items.
                </p>
                {itemizedDraftPreview.error ? (
                  <p className="mt-3 text-sm font-medium text-destructive">
                    {itemizedDraftPreview.error}
                  </p>
                ) : null}
              </div>
              <div className="max-h-[52vh] space-y-4 overflow-y-auto pr-1">
                {sortedPlayers.map((player) => (
                  <div
                    className="rounded-xl border border-border bg-background p-4"
                    key={player.userId}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-lg font-black">
                        {getDisplayName(player.user)}
                      </p>
                      <Badge variant="outline">
                        {itemizedDraftPreview.totalsByUserId.get(
                          player.userId,
                        ) ?? 0}
                      </Badge>
                    </div>
                    <div className="mt-4 flex flex-col gap-3">
                      {itemizedCategories.map((category) => (
                        <div
                          className="rounded-xl border border-border/70 bg-muted/40 p-3"
                          key={`${player.userId}:${category.id}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold">{category.name}</p>
                              {category.optional ? (
                                <p className="text-sm text-muted-foreground">
                                  {getItemizedCategoryStatus({
                                    category,
                                    playerId: player.userId,
                                    scopeKey: activeItemizedScopeKey,
                                  })}
                                </p>
                              ) : null}
                            </div>
                            <Badge variant="secondary">
                              {category.optional &&
                              getOptionalItemizedUsage({
                                category,
                                playerId: player.userId,
                                scopeKey: activeItemizedScopeKey,
                              }) === false
                                ? "Skipped"
                                : getItemizedCategoryScore(
                                    player.userId,
                                    category.id,
                                  )}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      Use the player&apos;s score card to adjust these itemized
                      entries before finishing the game.
                    </p>
                  </div>
                ))}
              </div>
              {!itemizedDraftPreview.error ? (
                <div className="rounded-xl border border-border bg-muted/50 p-4">
                  <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    Projected standings
                  </p>
                  <div className="flex flex-col gap-2">
                    {sortedPlayers.map((player) => (
                      <div
                        className="flex items-center justify-between gap-3 text-sm"
                        key={`preview-${player.userId}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground/80">
                            {getDisplayName(player.user)}
                          </span>
                          {itemizedDraftPreview.winnerIds.includes(
                            player.userId,
                          ) ? (
                            <Badge variant="outline">Winning</Badge>
                          ) : null}
                        </div>
                        <span className="font-black text-foreground">
                          {itemizedDraftPreview.totalsByUserId.get(
                            player.userId,
                          ) ?? 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {unresolvedActiveItemizedCategories.length > 0 ? (
                <div className="rounded-xl border border-border bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">
                    Answer the optional scoring items for each player before
                    finishing the game.
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            requiresPlacementBuilder && (
              <div className="rounded-xl border border-border bg-muted/50 p-4">
                <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {isNoScoreMode ? "Build the podium" : "Break the tie"}
                </p>
                <p className="mb-4 text-sm text-muted-foreground">
                  {isNoScoreMode
                    ? "Pick 1st place first, then optionally add 2nd and 3rd. Ties are allowed in any selected place."
                    : "Choose 1st place first, then optionally record 2nd and 3rd to resolve the final standings."}
                </p>
                <div className="mb-4 grid grid-cols-3 gap-2">
                  {([1, 2, 3] as const).map((placement) => {
                    const userIds = selectedNoScorePlacements[placement];
                    const isActive = activeNoScorePlacement === placement;
                    const isConfirmed =
                      confirmedNoScorePlacements.includes(placement);
                    const isDisabled =
                      placement === 3 &&
                      !canSelectThirdPlace &&
                      userIds.length === 0;

                    return (
                      <button
                        key={placement}
                        className={cn(
                          "rounded-xl border px-3 py-3 text-left transition",
                          isActive
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-background text-foreground hover:bg-muted",
                          isDisabled && "cursor-not-allowed opacity-50",
                        )}
                        disabled={isDisabled}
                        onClick={() => setActiveNoScorePlacement(placement)}
                        type="button"
                      >
                        <p className="text-sm font-black">
                          {getPlacementLabel(placement)}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] opacity-75">
                          {userIds.length > 0
                            ? `${userIds.length} selected`
                            : placement === 1
                              ? "Required"
                              : "Optional"}
                        </p>
                        {isConfirmed ? (
                          <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] opacity-75">
                            Confirmed
                          </p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-col gap-2">
                  {selectableNoScorePlayers.map((player) => {
                    const isSelected = selectedNoScorePlacements[
                      activeNoScorePlacement
                    ].includes(player.userId);

                    return (
                      <button
                        key={player.userId}
                        className={cn(
                          "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition",
                          isSelected
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-background text-foreground hover:bg-muted",
                        )}
                        onClick={() =>
                          toggleNoScorePlacementSelection(player.userId)
                        }
                        type="button"
                      >
                        <span className="font-bold">
                          {getDisplayName(player.user)}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">
                          {isSelected
                            ? getPlacementLabel(activeNoScorePlacement)
                            : "Select"}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    onClick={() =>
                      confirmNoScorePlacement(activeNoScorePlacement)
                    }
                    type="button"
                    variant="outline"
                  >
                    Confirm {getPlacementLabel(activeNoScorePlacement)}
                  </Button>
                  {activeNoScorePlacement !== 1 ? (
                    <Button
                      onClick={() =>
                        skipNoScorePlacement(
                          activeNoScorePlacement as Exclude<
                            NoScorePlacement,
                            1
                          >,
                        )
                      }
                      type="button"
                      variant="ghost"
                    >
                      Skip {getPlacementLabel(activeNoScorePlacement)}
                    </Button>
                  ) : null}
                </div>
                <p className="mt-4 text-sm font-medium text-foreground/80">
                  {projectedWinnersLabel}
                </p>
              </div>
            )
          )}

          {!isItemizedEndGameTally &&
            !requiresPlacementBuilder &&
            (roundDialogIntent === "end-game" ||
              isRoundlessFreePlay ||
              hasThresholdMet) && (
              <div className="rounded-xl border border-border bg-muted/50 p-4">
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
                        {getPlayerTotalScore(player) +
                          (pendingEliminationWinner?.userId === player.userId
                            ? 1
                            : 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {!isItemizedEndGameTally &&
            !requiresPlacementBuilder &&
            roundDialogIntent !== "end-game" &&
            !(isRoundlessFreePlay || hasThresholdMet) && (
              <div className="rounded-xl border border-border bg-muted/50 p-4">
                <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Total scores
                </p>
                <div className="flex flex-col gap-2">
                  {sortedPlayers.map((player) => (
                    <div
                      key={player.userId}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="font-medium text-foreground/80">
                        {getDisplayName(player.user)}
                      </span>
                      <span className="font-black text-foreground">
                        {getPlayerTotalScore(player) +
                          (pendingEliminationWinner?.userId === player.userId
                            ? 1
                            : 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          <DialogFooter
            className="bg-transparent p-0 pt-2"
            showCloseButton={
              roundDialogIntent === "end-game" || isItemizedEndGameTally
            }
          >
            {pendingEliminationPlayer ? (
              <>
                <Button
                  disabled={isPaused || commitRoundPending}
                  onClick={() =>
                    handleEliminatePlayer(pendingEliminationPlayer, true)
                  }
                  variant={isFreePlay ? "outline" : "default"}
                >
                  {commitRoundPending ? (
                    <LoaderCircle className="animate-spin" />
                  ) : null}
                  Start next round
                </Button>
                {isFreePlay ? (
                  <Button
                    disabled={isPaused || commitRoundPending}
                    onClick={() =>
                      handleEliminatePlayer(
                        pendingEliminationPlayer,
                        true,
                        true,
                      )
                    }
                  >
                    {commitRoundPending ? (
                      <LoaderCircle className="animate-spin" />
                    ) : null}
                    End game
                  </Button>
                ) : null}
              </>
            ) : (isEliminationMode || isRoundWinnerMode) &&
              roundDialogIntent !== "end-game" ? (
              <Button
                onClick={() => setIsRoundDialogOpen(false)}
                variant="outline"
              >
                Keep playing
              </Button>
            ) : isItemizedEndGameTally ? (
              <Button
                disabled={
                  isPaused ||
                  isItemizedCompletePending ||
                  Boolean(itemizedDraftPreview.error) ||
                  unresolvedActiveItemizedCategories.length > 0
                }
                onClick={handleCompleteItemizedGame}
              >
                {isItemizedCompletePending ? (
                  <LoaderCircle className="animate-spin" />
                ) : null}
                End game
              </Button>
            ) : roundDialogIntent === "end-game" ? (
              <Button
                disabled={
                  isPaused ||
                  commitRoundPending ||
                  (requiresPlacementBuilder &&
                    selectedWinnerUserIds.length === 0)
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
                    disabled={isPaused || commitRoundPending}
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
                    isPaused ||
                    commitRoundPending ||
                    (requiresPlacementBuilder &&
                      selectedWinnerUserIds.length === 0)
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
                className="h-14 w-full rounded-xl"
                disabled={isPaused || commitRoundPending}
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
        open={showsRounds && isRoundHistoryOpen && !isPaused}
      >
        <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-xl p-5">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              Score breakdown
            </DialogTitle>
            <DialogDescription>
              {isRoundWinnerMode || isEliminationMode
                ? "Round history for this game"
                : "Tap to edit any round scores"}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto pr-1">
            {scorecardRounds.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-border bg-muted/50">
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
                      <span>R{round.roundNumber}</span>
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
                              canEditPlayerScore(player.userId) &&
                                !isCompleted &&
                                !isRoundWinnerMode &&
                                !isEliminationMode &&
                                "cursor-pointer hover:bg-background/70",
                            )}
                            disabled={
                              !canEditPlayerScore(player.userId) ||
                              isCompleted ||
                              isNoScoreMode ||
                              isRoundWinnerMode ||
                              isEliminationMode
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
              <CardEmpty className="rounded-xl border border-dashed border-border bg-muted/30 py-10 text-center">
                Nothing here yet. Scores will show up after the first round.
              </CardEmpty>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
