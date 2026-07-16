import type { PlayGameProps } from "@/components/game/PlayGame";
import type { PlayGameSnapshot } from "@/components/game/play-game-state";
import type { ItemizedScoreEntryValues } from "@/lib/game/itemized-scoring";
import type { GameSettingsItemizedCategory, GameSettingsV2 } from "@/lib/game/v2";
import type { ReactNode } from "react";
import type { GamePlayerRole } from "@/lib/db/schema";

export type PlayGameV2Variant =
  | "incremental"
  | "round-winner"
  | "elimination"
  | "end-game-tally";

export type PlayGameV2BottomBarVariant =
  | "standard"
  | "tally"
  | "completed"
  | "viewer";

export type PlayGameV2Config = {
  settings: GameSettingsV2;
  supportsEliminationFlow: boolean;
  supportsEndGameTally: boolean;
  supportsLiveScoreEntry: boolean;
  supportsRoundWinnerSelection: boolean;
  requiresPlacementTieBreak: boolean;
  showsRounds: boolean;
  canCommitRound: boolean;
  canFinishGame: boolean;
  itemizedCategories: GameSettingsItemizedCategory[];
  variant: PlayGameV2Variant;
};

export type PlayGameV2ViewModel = {
  activeRoundNumber: number;
  isCompleted: boolean;
  isPaused: boolean;
  leaderUserIds: string[];
  remainingPlayerIds: string[];
  sortedPlayers: PlayGameSnapshot["game"]["players"];
  sortedRounds: PlayGameSnapshot["game"]["rounds"];
  tiedLeaderIds: string[];
};

export type PlayGameV2HeaderConfig = {
  headingSuffix?: ReactNode;
  hideRulesSummary?: boolean;
  summary?: string | null;
  title?: string;
};

export type PlayGameV2AdminDrawerConfig = {
  completedAt: string | null;
  createdAt: string | null;
  creatorName: string;
  endingSummary: string;
  gameId: string;
  isCompleted: boolean;
  scoringSummary: string;
};

export type PlayGameV2BottomBarConfig = {
  variant: PlayGameV2BottomBarVariant;
};

export type PlayGameV2SurfaceConfig = {
  adminDrawer?: PlayGameV2AdminDrawerConfig;
  bottomBar?: PlayGameV2BottomBarConfig;
  header: PlayGameV2HeaderConfig;
};

export type PlayGameV2SharedActions = {
  addExistingPlayer: (input: { userId: string }) => void;
  approveJoinRequest: (input: { requestId: string }) => void;
  completeGame: (input?: {
    itemizedScoreEntries?: Array<{
      categoryId: string;
      userId: string;
      values: ItemizedScoreEntryValues;
    }>;
    placementSelections?: Array<{
      placement: 1 | 2 | 3;
      userIds: string[];
    }>;
    winnerUserIds?: string[];
  }) => void;
  commitRound: (input: {
    completeGame: boolean;
    eliminatedUserId?: string | null;
    placementSelections?: Array<{
      placement: 1 | 2 | 3;
      userIds: string[];
    }>;
    winnerUserIds?: string[];
  }) => void;
  pauseGame: () => void;
  reopenGame: () => void;
  refresh: () => Promise<void>;
  removePlayer: (input: { userId: string }) => void;
  resumeGame: () => void;
  saveEndGameItemizedScore: (input: {
    entries: Array<{
      categoryId: string;
      userId: string;
      values: ItemizedScoreEntryValues;
    }>;
    userId: string;
  }) => void;
  saveRoundItemizedScore: (input: {
    entries: Array<{
      categoryId: string;
      userId: string;
      values: ItemizedScoreEntryValues;
    }>;
    userId: string;
  }) => void;
  declineJoinRequest: (input: { requestId: string }) => void;
  setInviteUsersEnabled: (input: { enabled: boolean }) => void;
  setPlayerRole: (input: { role: GamePlayerRole; userId: string }) => void;
  submitScore: (input: { scoreDelta: number; userId: string }) => void;
  uneliminatePlayer: (input: { userId: string }) => void;
};

export type PlayGameV2ScreenProps = {
  actions: PlayGameV2SharedActions;
  config: PlayGameV2Config;
  pendingActionKeys: Set<string>;
  props: PlayGameProps;
  snapshot: PlayGameSnapshot;
  surface?: PlayGameV2SurfaceConfig;
  viewModel: PlayGameV2ViewModel;
};

export type PlayGameV2ScreenComponent = (
  props: PlayGameV2ScreenProps,
) => React.JSX.Element;
