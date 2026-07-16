"use client";

import GameTitleImage from "@/components/game/game-title-image";
import { ShareQrPanel } from "@/components/profile/friend-invite-share-card";
import { getProfileColorSurfaceStyles } from "@/components/profile/profile-color-styles";
import ProfilePicture from "@/components/profile/profile-picture";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DialogContent,
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
import { cn } from "@/lib/utils";
import { parseGameSettingsV2 } from "@/lib/game/v2";
import { getStoredGamePlayerRole } from "@/lib/game/player-roles";
import Link from "next/link";
import type { PlayGameSnapshot } from "@/components/game/play-game-state";
import type { ReactNode } from "react";
import {
  Check,
  LoaderCircle,
  Plus,
  Send,
  Settings2,
  Trophy,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import type {
  PlayGameV2AdminDrawerConfig,
  PlayGameV2BottomBarVariant,
  PlayGameV2Config,
  PlayGameV2HeaderConfig,
  PlayGameV2SharedActions,
  PlayGameV2ViewModel,
} from "./types";

export function getPlayGameV2DisplayName(
  user: Pick<
    PlayGameSnapshot["game"]["players"][number]["user"],
    "firstName" | "isGuest" | "lastName"
  >,
) {
  const firstName = user.firstName?.trim() ?? "";
  const lastInitial = user.lastName?.trim().charAt(0).toUpperCase() ?? "";

  if (firstName && lastInitial) {
    return `${firstName} ${lastInitial}.`;
  }

  if (firstName) {
    return firstName;
  }

  return user.isGuest ? "Guest player" : "Unnamed player";
}

export function formatPlayGameV2RulesSummary(config: PlayGameV2Config) {
  const scoring =
    config.settings.scoringType === "elimination"
      ? config.settings.roundConfig.enabled
        ? "Elimination round wins"
        : "Elimination"
      : config.settings.scoringType === "winner_selection"
        ? config.settings.roundConfig.enabled
          ? "Round wins"
          : "Choose one winner"
        : config.settings.winMetric === "lowest_score"
          ? "Lowest score wins"
          : "Highest score wins";

  const ending =
    config.settings.gameEndTrigger === "rounds_exhausted"
      ? `Ends after ${config.settings.roundConfig.targetRounds ?? "?"} rounds`
      : config.settings.gameEndTrigger === "points_threshold_reached"
        ? `Ends at ${config.settings.thresholdConfig.value ?? "?"} ${config.settings.scoringType === "points" ? "points" : "wins"}`
        : config.settings.gameEndTrigger === "player_eliminated"
          ? "Last player standing"
          : config.settings.scoringType === "winner_selection" &&
              !config.settings.roundConfig.enabled
            ? "Ends when winner is chosen"
            : "Free play";

  return `${scoring} · ${ending}`;
}

export function formatPlayGameV2ScoringSummary(config: PlayGameV2Config) {
  return config.settings.scoringType === "elimination"
    ? config.settings.roundConfig.enabled
      ? "Elimination round wins"
      : "Elimination"
    : config.settings.scoringType === "winner_selection"
      ? config.settings.roundConfig.enabled
        ? "Round wins"
        : "Choose one winner"
      : config.settings.winMetric === "lowest_score"
        ? "Lowest score wins"
        : "Highest score wins";
}

export function formatPlayGameV2EndingSummary(config: PlayGameV2Config) {
  return config.settings.gameEndTrigger === "rounds_exhausted"
    ? `Ends after ${config.settings.roundConfig.targetRounds ?? "?"} rounds`
    : config.settings.gameEndTrigger === "points_threshold_reached"
      ? `Ends at ${config.settings.thresholdConfig.value ?? "?"} ${config.settings.scoringType === "points" ? "points" : "wins"}`
      : config.settings.gameEndTrigger === "player_eliminated"
        ? "Last player standing"
        : config.settings.scoringType === "winner_selection" &&
            !config.settings.roundConfig.enabled
          ? "Ends when winner is chosen"
          : "Free play";
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

type PlayGameV2DrawerActions = {
  canEndGame?: boolean;
  canManagePlayers?: boolean;
  canReopenGame?: boolean;
  canShare?: boolean;
  canUpdateSettings?: boolean;
  disableEndGame?: boolean;
  disableManagePlayers?: boolean;
  disableReopenGame?: boolean;
  endGameLabel?: string;
  onEndGame?: () => void;
  onOpenManagePlayers?: () => void;
  onOpenShare?: () => void;
  onReopenGame?: () => void;
};

type PlayGameV2BottomBarAction = {
  ariaLabel?: string;
  disabled?: boolean;
  hidden?: boolean;
  href?: string;
  icon?: LucideIcon;
  label: string;
  onClick?: () => void;
  pending?: boolean;
  testId?: string;
  variant?: "default" | "outline";
};

export function GameTitleHeader(input: {
  adminDrawer?: ReactNode;
  game: PlayGameSnapshot["game"];
  header: PlayGameV2HeaderConfig;
}) {
  return (
    <div className="rounded-3xl shadow-sm">
      <GameTitleImage
        className="w-full rounded-3xl"
        color={input.game.gameTitle?.color}
        contentClassName="px-4 py-4"
        imageUrl={input.game.gameTitle?.imageUrl}
        size="lg"
        verticalFocus={input.game.gameTitle?.imageVerticalFocus}
        variant="card"
      >
        <div className="flex h-full items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black tracking-tight text-white">
              {input.header.title ??
                input.game.gameTitle?.title ??
                "Untitled game"}
            </h1>
            {input.header.hideRulesSummary || !input.header.summary ? null : (
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/72">
                {input.header.summary}
              </p>
            )}
            {input.header.headingSuffix}
          </div>
          {input.adminDrawer}
        </div>
      </GameTitleImage>
    </div>
  );
}

export function PlayGameV2AdminSettingsDrawer(input: {
  actions: PlayGameV2DrawerActions;
  config: PlayGameV2AdminDrawerConfig;
}) {
  const {
    canEndGame,
    canManagePlayers,
    canReopenGame,
    canShare,
    canUpdateSettings,
    disableEndGame,
    disableManagePlayers,
    disableReopenGame,
    endGameLabel,
    onEndGame,
    onOpenManagePlayers,
    onOpenShare,
    onReopenGame,
  } = input.actions;

  return (
    <Drawer>
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
          <DrawerTitle className="text-xl font-black">Game options</DrawerTitle>
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
                {input.config.scoringSummary}
              </Badge>
              <Badge
                className="border-border/70 bg-background/75 text-foreground backdrop-blur-md dark:bg-background/60"
                variant="outline"
              >
                {input.config.endingSummary}
              </Badge>
              {input.config.isCompleted ? (
                <Badge className="winner-badge" variant="outline">
                  Complete
                </Badge>
              ) : null}
            </div>
            <div className="mt-3 flex flex-col gap-1 text-sm text-muted-foreground">
              {input.config.completedAt ? (
                <p>Completed {formatGameMetaDate(input.config.completedAt)}</p>
              ) : null}
              <p>Created by {input.config.creatorName}</p>
              <p>Started {formatGameMetaDate(input.config.createdAt)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {canUpdateSettings ? (
              <Link
                className="block aspect-square"
                href={`/game/${input.config.gameId}/settings`}
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
            {canManagePlayers ? (
              <Button
                aria-label="Manage players"
                className="aspect-square h-auto w-full flex-col justify-center gap-2 rounded-xl px-3 py-4 text-center text-[0.68rem] font-semibold uppercase tracking-[0.12em]"
                disabled={disableManagePlayers}
                onClick={onOpenManagePlayers}
                type="button"
                variant="outline"
              >
                <Users className="size-7" />
                Players
              </Button>
            ) : null}
            {canShare ? (
              <Button
                aria-label="Share invite link"
                className="aspect-square h-auto w-full flex-col justify-center gap-2 rounded-xl px-3 py-4 text-center text-[0.68rem] font-semibold uppercase tracking-[0.12em]"
                onClick={onOpenShare}
                type="button"
                variant="outline"
              >
                <Send className="size-7" />
                Share
              </Button>
            ) : null}
            {canEndGame || canReopenGame ? (
              <Button
                aria-label={
                  input.config.isCompleted ? "Reopen game" : "End game"
                }
                className="aspect-square h-auto w-full flex-col justify-center gap-2 rounded-xl px-3 py-4 text-center text-[0.68rem] font-semibold uppercase tracking-[0.12em]"
                disabled={
                  input.config.isCompleted ? disableReopenGame : disableEndGame
                }
                onClick={input.config.isCompleted ? onReopenGame : onEndGame}
                type="button"
                variant="outline"
              >
                <Trophy className="size-7" />
                {input.config.isCompleted
                  ? "Reopen"
                  : (endGameLabel ?? "End game")}
              </Button>
            ) : null}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function renderBottomBarButton(
  action: PlayGameV2BottomBarAction | undefined,
  fallback: ReactNode,
) {
  if (!action || action.hidden) {
    return fallback;
  }

  const Icon = action.pending ? LoaderCircle : action.icon;
  const button = (
    <Button
      aria-label={action.ariaLabel}
      className="h-16 w-fit min-w-20 flex-col gap-1 rounded-xl text-[0.68rem] font-semibold uppercase tracking-[0.08em] backdrop-blur-xs"
      data-testid={action.testId}
      disabled={action.disabled || action.pending}
      onClick={action.href ? undefined : action.onClick}
      type="button"
      variant={action.variant ?? "outline"}
    >
      {Icon ? (
        <Icon className={cn("size-5", action.pending && "animate-spin")} />
      ) : null}
      {action.label}
    </Button>
  );

  if (action.href) {
    return (
      <Link className="w-fit" href={action.href}>
        {button}
      </Link>
    );
  }

  return button;
}

export function PlayGameV2BottomBar(input: {
  leadingAction?: PlayGameV2BottomBarAction;
  primaryAction?: PlayGameV2BottomBarAction;
  secondaryAction?: PlayGameV2BottomBarAction;
  variant: PlayGameV2BottomBarVariant;
}) {
  const emptySlot = <div aria-hidden className="h-16 min-w-20" />;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-3 sm:px-6">
      <div className="mx-auto w-full max-w-md p-3 text-card-foreground">
        <div className="flex justify-between gap-2">
          {renderBottomBarButton(input.leadingAction, emptySlot)}
          {input.variant === "standard"
            ? renderBottomBarButton(input.secondaryAction, emptySlot)
            : null}
          {input.variant === "viewer"
            ? emptySlot
            : renderBottomBarButton(input.primaryAction, emptySlot)}
        </div>
      </div>
    </div>
  );
}

export function PlayGameV2ShareDrawerBody(input: {
  game: PlayGameSnapshot["game"];
  gameSharePath: string | null;
  isCompleted?: boolean;
  onToggleInviteUsers: (enabled: boolean) => void;
}) {
  return (
    <>
      <DrawerHeader>
        <DrawerTitle className="text-xl font-black">
          Share this game
        </DrawerTitle>
        <DrawerDescription>
          {input.game.inviteUsersEnabled
            ? "Players who open this link before the game starts can join right away."
            : "Link joins currently require manager approval."}
        </DrawerDescription>
      </DrawerHeader>
      <Card className="rounded-xl border-border/70">
        <CardContent className="flex items-center gap-3 p-4">
          <Checkbox
            checked={input.game.inviteUsersEnabled}
            className="size-8 rounded-xl"
            disabled={input.isCompleted}
            onCheckedChange={(checked) =>
              input.onToggleInviteUsers(Boolean(checked))
            }
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">
              {input.game.inviteUsersEnabled
                ? "Join link enabled"
                : "Join link disabled"}
            </p>
          </div>
        </CardContent>
      </Card>
      {input.gameSharePath ? (
        <div className="rounded-xl border border-border/70 bg-card p-4">
          <ShareQrPanel
            blurQrCode={!input.game.inviteUsersEnabled}
            initialPath={input.gameSharePath}
            qrTitle="Game share QR code"
            qrBlurLabel="Enable join link to reveal QR code"
            shareButtonLabel="Share game"
            shareErrorMessage="Unable to share the game link"
            sharePayload={{
              title: `${input.game.gameTitle?.title ?? "Game"} invite`,
              text: `Join my game on ${input.game.gameTitle?.title ?? "Score Loser"}.`,
            }}
          />
        </div>
      ) : null}
    </>
  );
}

export function PlayGameV2ManagePlayersDialogBody(input: {
  actions: Pick<
    PlayGameV2SharedActions,
    | "addExistingPlayer"
    | "approveJoinRequest"
    | "declineJoinRequest"
    | "removePlayer"
    | "setPlayerRole"
  >;
  onClose: () => void;
  snapshot: PlayGameSnapshot;
  viewModel: Pick<PlayGameV2ViewModel, "isCompleted">;
}) {
  const gameSettingsV2 =
    input.snapshot.game.version === "v2"
      ? parseGameSettingsV2(input.snapshot.game.settingsJson)
      : null;
  const maxPlayers = gameSettingsV2?.playerConfig?.maxPlayers ?? null;
  const hasPlayerCapacity =
    maxPlayers === null || input.snapshot.game.players.length < maxPlayers;

  return (
    <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-xl p-0">
      <DialogHeader className="p-5 pb-0">
        <DialogTitle className="text-2xl font-black">
          Manage players
        </DialogTitle>
      </DialogHeader>
      <div className="px-5 pb-4">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Players
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {input.snapshot.game.players.map((player) => (
            <Card
              key={player.id}
              className="gap-0 rounded-xl border-border/70 p-0"
            >
              <CardContent className="flex items-center justify-between gap-3 p-0 px-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <ProfilePicture
                    className="border-none"
                    size="xs"
                    user={player.user}
                  />
                  <div className="min-w-0 self-center">
                    <p className="truncate text-sm font-bold text-foreground">
                      {getPlayGameV2DisplayName(player.user)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {player.userId === input.snapshot.game.creatorId
                        ? "Creator"
                        : getStoredGamePlayerRole(player) === "manager"
                          ? "Manager"
                          : getStoredGamePlayerRole(player) === "self_scorer"
                            ? "Edits own scores"
                            : "Player"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 self-center">
                  {player.userId === input.snapshot.game.creatorId ? (
                    <Badge variant="outline">Creator</Badge>
                  ) : (
                    <Select
                      disabled={
                        !input.snapshot.isCreator || input.viewModel.isCompleted
                      }
                      onValueChange={(role) =>
                        input.actions.setPlayerRole({
                          role:
                            role === "manager" || role === "self_scorer"
                              ? role
                              : "player",
                          userId: player.userId,
                        })
                      }
                      value={getStoredGamePlayerRole(player)}
                    >
                      <SelectTrigger className="h-9 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="player">None</SelectItem>
                        <SelectItem value="self_scorer">Own scores</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {player.userId !== input.snapshot.currentUserId &&
                  player.userId !== input.snapshot.game.creatorId ? (
                    <Button
                      className="rounded-xl"
                      disabled={input.snapshot.game.players.length <= 1}
                      onClick={() =>
                        input.actions.removePlayer({ userId: player.userId })
                      }
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <X className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
          {input.snapshot.pendingJoinRequests.map((request) => (
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
                      {getPlayGameV2DisplayName(request.requester)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Join request
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 self-center">
                  <Button
                    className="rounded-xl"
                    disabled={!hasPlayerCapacity}
                    onClick={() =>
                      input.actions.approveJoinRequest({
                        requestId: request.id,
                      })
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Check className="size-4" />
                  </Button>
                  <Button
                    className="rounded-xl"
                    onClick={() =>
                      input.actions.declineJoinRequest({
                        requestId: request.id,
                      })
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
          ))}
        </div>
        <p className="mt-5 text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Add players
        </p>
        {hasPlayerCapacity ? (
          <div className="mt-3 flex flex-col gap-2">
            {input.snapshot.playerOptions
              .filter(
                (option) =>
                  !input.snapshot.game.players.some(
                    (player) => player.userId === option.id,
                  ),
              )
              .slice(0, 8)
              .map((player) => (
                <Button
                  key={player.id}
                  className="justify-between rounded-xl px-4 py-6"
                  onClick={() =>
                    input.actions.addExistingPlayer({ userId: player.id })
                  }
                  type="button"
                  variant="outline"
                >
                  <span>{getPlayGameV2DisplayName(player)}</span>
                  <Plus className="size-4" />
                </Button>
              ))}
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-border/70 bg-muted/25 px-4 py-3 text-sm text-muted-foreground">
            Player limit reached.
          </div>
        )}
      </div>
      <DialogFooter className="pt-4">
        <Button
          className="w-full"
          onClick={input.onClose}
          type="button"
          variant="outline"
        >
          Back to game
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function PlayGameV2Shell(input: {
  adminDrawer?: PlayGameV2AdminDrawerConfig & {
    actions: PlayGameV2DrawerActions;
  };
  body: ReactNode;
  config: PlayGameV2Config;
  footer?: ReactNode;
  game: PlayGameSnapshot["game"];
  header?: PlayGameV2HeaderConfig;
}) {
  const header = input.header ?? {
    summary: formatPlayGameV2RulesSummary(input.config),
  };

  return (
    <div className="min-h-screen overflow-y-auto px-3 pb-40 sm:px-6">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <GameTitleHeader
          adminDrawer={
            input.adminDrawer ? (
              <PlayGameV2AdminSettingsDrawer
                actions={input.adminDrawer.actions}
                config={input.adminDrawer}
              />
            ) : undefined
          }
          game={input.game}
          header={header}
        />
        {input.body}
        {input.footer}
      </div>
    </div>
  );
}

export function PlayGameV2StatusCard(input: {
  config: PlayGameV2Config;
  viewModel: PlayGameV2ViewModel;
}) {
  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle className="text-lg font-black">Live status</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {input.viewModel.isCompleted ? "Completed" : "Active"}
          </Badge>
          {input.viewModel.isPaused ? (
            <Badge variant="outline">Paused</Badge>
          ) : null}
          <Badge variant="outline">
            Round {input.viewModel.activeRoundNumber}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {input.config.variant === "round-winner"
          ? "Choose one winner each round."
          : input.config.variant === "elimination"
            ? "Eliminate one player per round until one remains."
            : input.config.variant === "end-game-tally"
              ? "Track final itemized scores, then finish the game."
              : "Use the standard live scoring flow for this title."}
      </CardContent>
    </Card>
  );
}

export function PlayGameV2Scoreboard(input: {
  highlightedUserIds?: string[];
  isDimmed?: (player: PlayGameSnapshot["game"]["players"][number]) => boolean;
  isInteractive?: (
    player: PlayGameSnapshot["game"]["players"][number],
  ) => boolean;
  onSelectPlayer?: (userId: string) => void;
  rightLabel?: (player: PlayGameSnapshot["game"]["players"][number]) => string;
  scoreSlot?: (
    player: PlayGameSnapshot["game"]["players"][number],
  ) => ReactNode;
  selectedUserIds?: string[];
  snapshot: PlayGameSnapshot;
  subtitle?: (
    player: PlayGameSnapshot["game"]["players"][number],
  ) => string | null;
  viewModel: PlayGameV2ViewModel;
}) {
  const highlightedSet = new Set(input.highlightedUserIds ?? []);
  const selectedSet = new Set(input.selectedUserIds ?? []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-black">Players</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {input.viewModel.sortedPlayers.map((player) => {
          const isHighlighted = highlightedSet.has(player.userId);
          const isSelected = selectedSet.has(player.userId);
          const subtitle = input.subtitle?.(player);
          const isDimmed = input.isDimmed?.(player) ?? false;
          const isInteractive =
            input.isInteractive?.(player) ?? Boolean(input.onSelectPlayer);
          const playerSurfaceStyles = getProfileColorSurfaceStyles(
            player.user.color,
          );
          const scoreSlot = input.scoreSlot?.(player) ?? (
            <span className="text-3xl font-black">
              {input.rightLabel?.(player) ?? String(player.score ?? 0)}
            </span>
          );

          return (
            <button
              key={player.userId}
              className={cn(
                "relative overflow-hidden rounded-3xl border-none bg-transparent p-0 text-left shadow-none transition",
                isInteractive &&
                  "hover:scale-[1.01] focus-visible:outline-none",
                isInteractive && isHighlighted && "animate-live-update-pulse",
                isSelected &&
                  "ring-2 ring-primary/55 ring-offset-2 ring-offset-background",
                isDimmed && "opacity-55 saturate-[0.8]",
              )}
              disabled={!isInteractive}
              onClick={() => input.onSelectPlayer?.(player.userId)}
              style={playerSurfaceStyles}
              type="button"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,var(--profile-surface-highlight)_0%,transparent_52%)] dark:bg-[radial-gradient(circle_at_18%_18%,rgba(15,23,42,0.18)_0%,transparent_52%)]" />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_42%,var(--profile-surface-shade)_100%)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.06)_0%,rgba(15,23,42,0.22)_100%)]" />

              <div className="relative z-10 flex items-center gap-3 px-3 py-2">
                <div className="shrink-0 rounded-full">
                  <ProfilePicture
                    className={cn(isHighlighted && "winner-avatar-ring")}
                    user={player.user}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xl font-black text-[color:var(--profile-surface-text)]">
                    {getPlayGameV2DisplayName(player.user)}
                  </p>
                  {subtitle ? (
                    <p className="mt-1 text-xs font-semibold text-[color:var(--profile-surface-muted-text)]">
                      {subtitle}
                    </p>
                  ) : null}
                </div>
                <div className="relative z-10 ml-auto">
                  <div className="w-[5.5rem] rounded-[1.4rem] border border-[var(--profile-surface-panel-border)] bg-[var(--profile-surface-panel)] px-0 py-3 text-[color:var(--profile-surface-text)] shadow-sm backdrop-blur-[2px]">
                    <div className="flex w-full items-center justify-center text-center leading-none">
                      {scoreSlot}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function PlayGameV2RoundHistory(input: {
  snapshot: PlayGameSnapshot;
  viewModel: PlayGameV2ViewModel;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-black">Round history</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {input.viewModel.sortedRounds.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing here yet. Rounds will appear as play progresses.
          </p>
        ) : (
          input.viewModel.sortedRounds.map((round) => (
            <div
              key={round.id}
              className="rounded-xl border border-border bg-muted/40 p-3"
            >
              <p className="text-sm font-black">Round {round.roundNumber}</p>
              <div className="mt-2 flex flex-col gap-1 text-sm">
                {round.scores.length === 0 ? (
                  <p className="text-muted-foreground">No recorded scores.</p>
                ) : (
                  round.scores.map((score) => (
                    <div
                      key={score.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <span>{getPlayGameV2DisplayName(score.user)}</span>
                      <span className="font-black">{score.scoreDelta}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function PlayGameV2ActionBar(input: {
  completeLabel?: string;
  disabled?: boolean;
  onComplete?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onReopen?: () => void;
  paused: boolean;
  pending?: boolean;
  showComplete?: boolean;
  showPauseResume?: boolean;
  showReopen?: boolean;
}) {
  return (
    <PlayGameV2BottomBar
      leadingAction={
        input.showPauseResume
          ? {
              label: input.paused ? "Resume" : "Pause",
              onClick: input.paused ? input.onResume : input.onPause,
              pending: input.pending,
            }
          : undefined
      }
      primaryAction={
        input.showReopen
          ? {
              label: "Reopen",
              onClick: input.onReopen,
              pending: input.pending,
            }
          : input.showComplete
            ? {
                label: input.completeLabel ?? "Complete game",
                onClick: input.onComplete,
                pending: input.pending,
                variant: "default",
              }
            : undefined
      }
      variant={input.showComplete ? "tally" : "completed"}
    />
  );
}
