"use client";

import {
  addGamePlayer,
  addGuestGamePlayer,
  commitGameRound,
  upsertActiveRoundScore,
} from "@/app/actions/game";
import { updateOwnedGuestColor } from "@/app/actions/user";
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
import {
  hasGameMetScoreThreshold,
  willGameOfferRoundPrompt,
} from "@/lib/game/v1";
import type { GameForPlayPage } from "@/lib/db/store/game.store";
import type { UserBase } from "@/lib/db/store/user.store";
import {
  House,
  Crown,
  Gamepad2,
  LoaderCircle,
  Plus,
  Trophy,
  UserPlus,
  ListChecks,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Fragment,
  type FormEvent,
  useDeferredValue,
  useMemo,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";

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

export default function PlayGame({
  currentUserId,
  isCreator,
  playerOptions,
  game,
}: {
  currentUserId: string;
  isCreator: boolean;
  playerOptions: UserBase[];
  game: GameForPlayPage;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [scoreDialogPlayerId, setScoreDialogPlayerId] = useState<string | null>(
    null,
  );
  const [scoreAmount, setScoreAmount] = useState(0);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [isRoundDialogOpen, setIsRoundDialogOpen] = useState(false);
  const [isRoundHistoryOpen, setIsRoundHistoryOpen] = useState(false);
  const [colorDialogPlayerId, setColorDialogPlayerId] = useState<string | null>(
    null,
  );
  const [selectedGuestColor, setSelectedGuestColor] = useState<string | null>(
    null,
  );
  const [playerSearch, setPlayerSearch] = useState("");
  const deferredPlayerSearch = useDeferredValue(playerSearch);

  const isCompleted = Boolean(game.completedAt);
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
      playerOptions.filter(
        (player) =>
          player.id !== currentUserId && !currentPlayerIds.has(player.id),
      ),
    [currentPlayerIds, currentUserId, playerOptions],
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

  const canEditGuestOrSelfColor = (
    player: GameForPlayPage["players"][number],
  ) =>
    player.user.id === currentUserId ||
    (player.user.isGuest && player.user.created_by_user_id === currentUserId);

  function refreshPage() {
    router.refresh();
  }

  function runAction(
    action: () => Promise<void>,
    messages?: {
      loading?: string;
      success?: string;
      fallbackError?: string;
      onSuccess?: () => void;
    },
  ) {
    startTransition(async () => {
      const loadingId = messages?.loading
        ? toast.loading(messages.loading)
        : null;

      try {
        await action();
        if (loadingId) {
          toast.dismiss(loadingId);
        }
        if (messages?.success) {
          toast.success(messages.success);
        }
        messages?.onSuccess?.();
        refreshPage();
      } catch (error) {
        if (loadingId) {
          toast.dismiss(loadingId);
        }
        toast.error(
          error instanceof Error
            ? error.message
            : (messages?.fallbackError ?? "Something went wrong"),
        );
      }
    });
  }

  function handleAddExistingPlayer(userId: string) {
    runAction(
      async () => {
        await addGamePlayer({ gameId: game.id, userId });
      },
      {
        loading: "Adding player...",
        success: "Player added",
        onSuccess: () => {
          setIsAddPlayerOpen(false);
          setPlayerSearch("");
        },
      },
    );
  }

  function handleAddGuest() {
    const rawName = playerSearch.trim();

    if (!rawName) {
      toast.error("Enter a guest name first");
      return;
    }

    const [firstName, ...rest] = rawName.split(/\s+/);
    const lastName = rest.join(" ").trim() || undefined;

    runAction(
      async () => {
        await addGuestGamePlayer({
          gameId: game.id,
          firstName,
          lastName,
        });
      },
      {
        loading: "Adding guest...",
        success: "Guest added",
        onSuccess: () => {
          setIsAddPlayerOpen(false);
          setPlayerSearch("");
        },
      },
    );
  }

  function openScoreDialog(player: GameForPlayPage["players"][number]) {
    if (!isCreator || isCompleted) {
      return;
    }

    setScoreDialogPlayerId(player.userId);
    setScoreAmount(0);
  }

  function openColorDialog(player: GameForPlayPage["players"][number]) {
    if (!canEditGuestOrSelfColor(player)) {
      return;
    }

    setColorDialogPlayerId(player.userId);
    setSelectedGuestColor(player.user.color);
  }

  function handleScoreSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!scoreDialogPlayer) {
      return;
    }

    if (!Number.isFinite(scoreAmount)) {
      toast.error("Enter a valid round score");
      return;
    }

    runAction(
      async () => {
        await upsertActiveRoundScore({
          gameId: game.id,
          userId: scoreDialogPlayer.userId,
          scoreDelta: scoreAmount,
        });
      },
      {
        loading: "Saving score...",
        success: "Score updated",
        onSuccess: () => {
          setScoreDialogPlayerId(null);
          setScoreAmount(0);
        },
      },
    );
  }

  function handleCommitRound(completeGame: boolean) {
    runAction(
      async () => {
        await commitGameRound({
          gameId: game.id,
          completeGame,
        });
      },
      {
        loading: completeGame
          ? "Finishing game..."
          : isFreePlay
            ? "Saving scores..."
            : "Ending round...",
        success: completeGame
          ? "Game completed"
          : isFreePlay
            ? "Scores updated"
            : `Round ${nextRoundNumber} complete`,
        onSuccess: () => {
          setIsRoundDialogOpen(false);
        },
      },
    );
  }

  function handleGuestColorSelect(nextColor: string) {
    if (!colorDialogPlayer || nextColor === selectedGuestColor || isPending) {
      return;
    }

    setSelectedGuestColor(nextColor);

    runAction(
      async () => {
        await updateOwnedGuestColor({
          guestUserId: colorDialogPlayer.userId,
          color: nextColor,
          gameId: game.id,
        });
      },
      {
        loading: "Updating player color...",
        success: "Player color updated",
        fallbackError: "Failed to update player color",
        onSuccess: () => {
          setColorDialogPlayerId(null);
        },
      },
    );
  }

  if (game.version !== "v1") {
    return (
      <div className="min-h-screen overflow-y-auto px-3 py-4 pb-24 sm:px-6">
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

  return (
    <div className="min-h-screen overflow-y-auto px-3 py-4 pb-24 sm:px-6">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <Card className="overflow-hidden p-0">
          <CardHeader className="gap-3 p-0">
            <div
              className="relative overflow-hidden px-4 py-3 text-white"
              style={{
                backgroundColor: game.gameTitle?.color ?? "#0f172a",
              }}
            >
              {game.gameTitle?.imageUrl ? (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-35"
                  style={{
                    backgroundImage: `url("${game.gameTitle.imageUrl}")`,
                  }}
                />
              ) : null}
              <div className="absolute inset-0 bg-linear-to-tr from-black/80 via-black/35 to-transparent" />
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <div className="min-w-0">
                    <h1 className="truncate text-2xl font-black tracking-tight text-white">
                      {game.gameTitle?.title ?? "Untitled game"}
                    </h1>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      className="border-white/25 bg-white/15 text-white backdrop-blur-sm"
                      variant="outline"
                    >
                      {formatScoringSummary(game)}
                    </Badge>
                    <Badge
                      className="border-white/25 bg-white/15 text-white backdrop-blur-sm"
                      variant="outline"
                    >
                      {formatEndingSummary(game)}
                    </Badge>
                    {!isFreePlay ? (
                      <Badge
                        className="border-white/25 bg-white/15 text-white backdrop-blur-sm"
                        variant="outline"
                      >
                        {isCompleted
                          ? `${game.completedRounds} rounds`
                          : `Round ${nextRoundNumber}`}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {isCreator ? (
              <div
                className={`grid gap-2 px-4 pb-4 ${isFreePlay ? "grid-cols-2" : "grid-cols-3"}`}
              >
                <Button
                  className="rounded-[1.4rem]"
                  disabled={isCompleted}
                  onClick={() => {
                    setPlayerSearch("");
                    setIsAddPlayerOpen(true);
                  }}
                >
                  <UserPlus className="size-5" />
                  Add player
                </Button>
                <Button
                  className="rounded-[1.4rem]"
                  disabled={isCompleted}
                  onClick={() => setIsRoundDialogOpen(true)}
                >
                  <Trophy className="size-5" />
                  {isFreePlay ? "Update score" : "End round"}
                </Button>
                {!isFreePlay ? (
                  <Button
                    className="rounded-[1.4rem]"
                    onClick={() => setIsRoundHistoryOpen(true)}
                    variant="outline"
                  >
                    <ListChecks className="size-5" />
                  </Button>
                ) : null}
                {/* <Button
                  className="rounded-[1.4rem]"
                  disabled={isCompleted}
                  onClick={handleDelete}
                  variant="destructive"
                >
                  <Trash className="size-5" />
                  Delete
                </Button> */}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 px-4 pb-4">
                <p className="text-sm text-slate-500">
                  {isFreePlay
                    ? "Only the creator can update scores or edit the game state."
                    : "Only the creator can update round scores, manage rounds, or edit the game state."}
                </p>
                {!isFreePlay ? (
                  <Button
                    className="rounded-[1.4rem]"
                    onClick={() => setIsRoundHistoryOpen(true)}
                    variant="outline"
                  >
                    Rounds
                  </Button>
                ) : null}
              </div>
            )}
          </CardHeader>
        </Card>

        {isCompleted ? (
          <Card className="bg-amber-500 text-amber-200">
            <CardHeader className="flex items-center justify-center gap-2 text-2xl font-bold">
              <Crown className="size-6" /> {formatWinners(game)}
            </CardHeader>
          </Card>
        ) : null}

        <div className="flex flex-col gap-4">
          {sortedPlayers.map((player) => {
            const isWinner = winnerIds.has(player.userId);
            const canEditColor = canEditGuestOrSelfColor(player);

            return (
              <Card key={player.id} className="rounded-3xl p-0">
                <CardContent
                  className="flex items-center gap-3 px-2 py-2"
                  style={{ backgroundColor: player.user.color }}
                >
                  {canEditColor ? (
                    <button
                      type="button"
                      className="flex size-14 shrink-0 items-center justify-center rounded-[1.2rem] bg-slate-900 text-xl font-black text-white transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30"
                      onClick={() => openColorDialog(player)}
                    >
                      <ProfilePicture
                        user={player.user}
                        className="border-none"
                      />
                    </button>
                  ) : (
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-[1.2rem] bg-slate-900 text-xl font-black text-white">
                      <ProfilePicture
                        user={player.user}
                        className="border-none"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xl font-black text-slate-950">
                        {getDisplayName(player.user)}
                      </p>
                      {isWinner ? (
                        <span className="inline-flex items-center justify-center rounded-full bg-amber-500 p-1 text-amber-200">
                          <Crown className="size-5" />
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {isCreator ? (
                    <Button
                      className="min-w-14 rounded-[1.4rem] bg-white/50 px-4 py-3 text-center text-3xl font-black text-slate-950 shadow-lg"
                      disabled={isCompleted}
                      onClick={() => openScoreDialog(player)}
                      variant="outline"
                    >
                      {getPlayerTotalScore(player)}
                    </Button>
                  ) : (
                    <div className="min-w-14 rounded-[1.4rem] bg-white/50 px-4 py-3 text-center text-3xl font-black text-slate-950 shadow-lg">
                      {getPlayerTotalScore(player)}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {isCompleted ? (
          <div className="sticky bottom-4 z-20 pt-2">
            <Button
              className="h-14 w-full rounded-[1.4rem] shadow-lg"
              onClick={() => router.push("/dashboard")}
            >
              <House className="size-5" />
              Back home
            </Button>
          </div>
        ) : null}
      </div>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setScoreDialogPlayerId(null);
            setScoreAmount(0);
          }
        }}
        open={Boolean(scoreDialogPlayer)}
      >
        <DialogContent
          className="max-w-[calc(100%-1.5rem)] rounded-[2rem] p-5"
          style={{ backgroundColor: scoreDialogPlayer?.user.color }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              {scoreDialogPlayer ? getDisplayName(scoreDialogPlayer.user) : ""}
            </DialogTitle>
            <DialogDescription className="text-slate-800">
              {isFreePlay
                ? "Set this player's latest score change."
                : `Set this player's score for round ${nextRoundNumber}.`}
            </DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={handleScoreSubmit}>
            <div className="space-y-3">
              <p className="text-center text-sm font-bold uppercase tracking-[0.18em] text-slate-800">
                Total score
              </p>
              <p className="text-center text-6xl font-black text-slate-950">
                {scoreDialogPlayer ? getPlayerTotalScore(scoreDialogPlayer) : 0}
              </p>
              <p className="text-center text-sm font-bold uppercase tracking-[0.18em] text-slate-800">
                {isFreePlay
                  ? "Score change"
                  : `Round ${nextRoundNumber} change`}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  className="h-16 rounded-[1.4rem] bg-white/50 text-slate-950"
                  disabled={isCompleted || isPending}
                  onClick={() => setScoreAmount((prev) => prev - 1)}
                  type="button"
                  variant="outline"
                >
                  -
                </Button>
                <Input
                  autoFocus
                  className="h-18 rounded-[1.5rem] border-0 bg-white/50 text-center text-4xl font-black shadow-inner ring-0"
                  inputMode="numeric"
                  onChange={(event) =>
                    setScoreAmount(Number(event.target.value))
                  }
                  type="number"
                  value={scoreAmount}
                />
                <Button
                  className="h-16 rounded-[1.4rem] bg-white/50 text-slate-950"
                  disabled={isCompleted || isPending}
                  onClick={() => setScoreAmount((prev) => prev + 1)}
                  type="button"
                  variant="outline"
                >
                  +
                </Button>
              </div>
              <p className="text-center text-sm text-slate-800">
                Board total right now:{" "}
                <span className="font-black">
                  {scoreDialogPlayer
                    ? getPlayerTotalScore(scoreDialogPlayer) + scoreAmount
                    : scoreAmount}
                </span>
              </p>
            </div>
            <DialogFooter className="bg-transparent p-0 pt-2">
              <Button
                className="h-16 w-full rounded-[1.5rem]"
                disabled={isPending}
                type="submit"
              >
                {isFreePlay ? "Save score change" : "Save round score"}
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
              disabled={isPending}
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
              Pick an existing friend or guest, or create a new guest if needed.
            </DialogDescription>
          </DialogHeader>
          <Command className="rounded-none border-0 bg-transparent">
            <CommandInput
              className="h-16 text-lg"
              onValueChange={setPlayerSearch}
              placeholder="Search friends or guests"
              value={playerSearch}
            />
            <CommandList className="max-h-[50vh]">
              <CommandGroup
                heading={playerSearch.trim() ? "Matches" : "People"}
              >
                {filteredPlayers.map((player) => (
                  <CommandItem
                    key={player.id}
                    onSelect={() => handleAddExistingPlayer(player.id)}
                    value={`${player.firstName ?? ""} ${player.lastName ?? ""} ${player.phoneNumber ?? ""}`}
                  >
                    <div className="flex w-full items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-base font-bold text-slate-950">
                          {getDisplayName(player)}
                        </p>
                        {player.phoneNumber ? (
                          <p className="text-sm text-slate-500">
                            {player.phoneNumber}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {player.isGuest ? "Guest" : "Friend"}
                        </Badge>
                        <UserPlus className="size-5 text-slate-400" />
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              {filteredPlayers.length === 0 ? (
                <CommandEmpty>
                  <div className="flex flex-col items-center gap-4 px-4 py-6">
                    <Gamepad2 className="size-8 text-slate-300" />
                    <p className="text-center text-sm text-slate-500">
                      No saved player matched. Add this as a new guest instead.
                    </p>
                    <Button
                      className="h-14 w-full rounded-[1.4rem]"
                      disabled={!playerSearch.trim() || isPending}
                      onClick={handleAddGuest}
                    >
                      {isPending ? (
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
              {isFreePlay ? "Update scores" : `End round ${nextRoundNumber}`}
            </DialogTitle>
            <DialogDescription className="text-base">
              {isFreePlay
                ? "Save these score changes or finish the game."
                : shouldOfferRoundPrompt
                  ? "This round can either start another round or finish the game."
                  : "This will record the round and move the game forward."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{formatScoringSummary(game)}</Badge>
            <Badge variant="outline">{formatEndingSummary(game)}</Badge>
            {hasThresholdMet ? (
              <Badge variant="outline">Threshold reached</Badge>
            ) : null}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
              {isFreePlay ? "Score changes" : "Round summary"}
            </p>
            <div className="flex flex-col gap-2">
              {roundSummaryScores.map((score) => (
                <div
                  key={score.userId}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="font-medium text-slate-700">
                    {getDisplayName(score.player.user)}
                  </span>
                  <span className="font-black text-slate-950">
                    {score.scoreDelta > 0 ? "+" : ""}
                    {score.scoreDelta}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="bg-transparent p-0 pt-2">
            {shouldOfferRoundPrompt ? (
              <>
                <Button
                  className="h-14 flex-1 rounded-[1.4rem]"
                  disabled={isPending}
                  onClick={() => handleCommitRound(false)}
                  variant="outline"
                >
                  {isPending ? <LoaderCircle className="animate-spin" /> : null}
                  {isFreePlay ? "Save scores" : "Another round"}
                </Button>
                <Button
                  className="h-14 flex-1 rounded-[1.4rem]"
                  disabled={isPending}
                  onClick={() => handleCommitRound(true)}
                >
                  {isPending ? <LoaderCircle className="animate-spin" /> : null}
                  End game
                </Button>
              </>
            ) : (
              <Button
                className="h-14 w-full rounded-[1.4rem]"
                disabled={isPending}
                onClick={() => handleCommitRound(false)}
              >
                {isPending ? <LoaderCircle className="animate-spin" /> : null}
                {isFreePlay ? "Save scores" : "End round"}
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
              Round breakdown
            </DialogTitle>
            <DialogDescription className="text-base">
              Each round is recorded separately while totals stay cumulative.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            {sortedRounds.length > 0 && (
              <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50/70">
                <div
                  className="grid min-w-max"
                  style={{
                    gridTemplateColumns: `minmax(5.5rem, 1.1fr) repeat(${scorecardPlayers.length}, minmax(4.25rem, 1fr))`,
                  }}
                >
                  <div className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-100 px-3 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    Round
                  </div>
                  {scorecardPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="border-b border-r border-slate-200 bg-slate-100 px-2 py-2"
                      title={getDisplayName(player.user)}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className="flex size-9 items-center justify-center rounded-xl text-sm font-black text-slate-950 shadow-sm ring-1 ring-white/80"
                          style={{ backgroundColor: player.user.color }}
                        >
                          {getPlayerInitial(player.user)}
                        </div>
                        <p className="max-w-12 truncate text-[0.65rem] font-bold text-slate-600">
                          {player.user.id === currentUserId
                            ? "Me"
                            : (player.user.firstName ??
                              getPlayerInitial(player.user))}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="sticky left-0 z-10 border-r border-slate-200 bg-slate-100 px-3 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    Total
                  </div>
                  {scorecardPlayers.map((player) => (
                    <div
                      key={`total-${player.id}`}
                      className="border-r border-b border-slate-200 bg-slate-100 px-2 py-3 text-center text-sm font-black text-slate-950"
                    >
                      {getPlayerTotalScore(player)}
                    </div>
                  ))}

                  {scorecardRounds.map((round) => (
                    <Fragment key={round.id}>
                      <div className="sticky left-0 z-10 border-r border-slate-200 bg-slate-50 px-3 py-3 text-sm font-black text-slate-950">
                        <div className="flex flex-col">
                          <span>R{round.roundNumber}</span>
                          <span className="text-[0.65rem] font-medium text-slate-500">
                            {new Date(round.completedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {scorecardPlayers.map((player) => {
                        const roundScore =
                          (round.scores ?? []).find(
                            (score) => score.userId === player.userId,
                          )?.scoreDelta ?? 0;

                        return (
                          <div
                            key={`${round.id}-${player.userId}`}
                            className="border-r border-b border-slate-200 px-2 py-3 text-center text-sm font-medium text-slate-700"
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
