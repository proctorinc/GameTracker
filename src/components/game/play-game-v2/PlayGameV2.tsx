"use client";

import {
  addGamePlayer,
  approveGameJoinRequest,
  commitGameRound,
  completeGame,
  declineGameJoinRequest,
  getPlayGameSnapshot,
  pauseGame,
  removeGamePlayer,
  reopenCompletedGame,
  resumeGame,
  setGameInviteUsersEnabled,
  setGamePlayerRole,
  uneliminateGamePlayer,
  upsertActiveRoundItemizedScore,
  upsertEndGameTallyItemizedScore,
  upsertActiveRoundScore,
} from "@/app/actions/game";
import type { PlayGameProps } from "@/components/game/PlayGame";
import {
  applyPlayGameMutation,
  type PlayGameMutation,
  type PlayGameSnapshot,
} from "@/components/game/play-game-state";
import {
  deriveRemotePlayGameEvents,
  filterLocalRemotePlayGameEvents,
  summarizeRemotePlayGameEvents,
} from "@/components/game/play-game-live-updates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { buildPlayGameV2Config } from "./config";
import { PlayGameV2ResolvedScreen } from "./registry";
import {
  formatPlayGameV2EndingSummary,
  formatPlayGameV2RulesSummary,
  formatPlayGameV2ScoringSummary,
  getPlayGameV2DisplayName,
} from "./shared";
import { buildPlayGameV2ViewModel } from "./view-model";
import type { PlayGameV2Config, PlayGameV2SurfaceConfig } from "./types";

const ACTIVE_RECONCILE_INTERVAL_MS = 2000;

function buildInitialSnapshot(props: PlayGameProps): PlayGameSnapshot {
  return {
    canManageLiveGame: props.canManageLiveGame,
    canEditOwnScore: props.canEditOwnScore ?? props.canManageLiveGame,
    currentUserId: props.currentUserId,
    gameSharePath: props.gameSharePath,
    isCreator: props.isCreator,
    isManager: props.isManager,
    effectiveRole:
      props.effectiveRole ?? (props.isCreator ? "creator" : props.isManager ? "manager" : "player"),
    pendingJoinRequests: props.pendingJoinRequests,
    playerOptions: props.playerOptions,
    playerRankDeltas: props.playerRankDeltas,
    game: props.game,
  };
}

function nowIso() {
  return new Date().toISOString();
}

function buildEliminationPlacements(input: {
  game: PlayGameSnapshot["game"];
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

export default function PlayGameV2(props: PlayGameProps) {
  const [, startTransition] = useTransition();
  const [baseSnapshot, setBaseSnapshot] = useState<PlayGameSnapshot>(() =>
    buildInitialSnapshot(props),
  );
  const [pendingActionKeys, setPendingActionKeys] = useState<string[]>([]);
  const baseSnapshotRef = useRef(baseSnapshot);
  const pendingActionKeysRef = useRef(pendingActionKeys);
  const reconcileInFlightRef = useRef(false);
  const config = useMemo<PlayGameV2Config | null>(() => {
    try {
      return buildPlayGameV2Config(baseSnapshot.game);
    } catch {
      return null;
    }
  }, [baseSnapshot.game]);

  useEffect(() => {
    baseSnapshotRef.current = baseSnapshot;
  }, [baseSnapshot]);

  useEffect(() => {
    pendingActionKeysRef.current = pendingActionKeys;
  }, [pendingActionKeys]);

  async function reconcileSnapshotNow() {
    if (reconcileInFlightRef.current) {
      return;
    }

    reconcileInFlightRef.current = true;

    try {
      const freshSnapshot = await getPlayGameSnapshot(
        baseSnapshotRef.current.game.id,
      );
      const remoteEvents = filterLocalRemotePlayGameEvents({
        events: deriveRemotePlayGameEvents({
          previousSnapshot: baseSnapshotRef.current,
          nextSnapshot: freshSnapshot,
        }),
        localKeys: new Set(pendingActionKeysRef.current),
      });
      const notificationEvents =
        (config?.itemizedCategories.length ?? 0) > 0
          ? remoteEvents.filter((event) => event.type !== "score-updated")
          : remoteEvents;

      setBaseSnapshot(freshSnapshot);

      for (const summary of summarizeRemotePlayGameEvents(notificationEvents)) {
        toast.message(summary);
      }
    } catch {
      // Keep current state when refresh fails.
    } finally {
      reconcileInFlightRef.current = false;
    }
  }

  const reconcileSnapshot = useEffectEvent(async () => {
    await reconcileSnapshotNow();
  });

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        void reconcileSnapshot();
      }
    }

    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [reconcileSnapshot]);

  useEffect(() => {
    if (baseSnapshot.game.completedAt) {
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
  }, [baseSnapshot.game.completedAt, reconcileSnapshot]);

  function withPendingKey(key: string, callback: () => Promise<void>) {
    if (pendingActionKeysRef.current.includes(key)) {
      return;
    }

    setPendingActionKeys((current) => [...current, key]);

    startTransition(async () => {
      try {
        await callback();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not update game",
        );
      } finally {
        setPendingActionKeys((current) =>
          current.filter((entry) => entry !== key),
        );
      }
    });
  }

  function runOptimisticMutation(input: {
    action: () => Promise<void>;
    key: string;
    mutation: PlayGameMutation;
  }) {
    if (pendingActionKeysRef.current.includes(input.key)) {
      return;
    }

    const previousSnapshot = baseSnapshotRef.current;
    const nextSnapshot = applyPlayGameMutation(previousSnapshot, input.mutation);

    setPendingActionKeys((current) => [...current, input.key]);
    setBaseSnapshot(nextSnapshot);

    startTransition(async () => {
      try {
        await input.action();
        await reconcileSnapshotNow();
      } catch (error) {
        setBaseSnapshot(previousSnapshot);
        toast.error(
          error instanceof Error ? error.message : "Could not update game",
        );
      } finally {
        setPendingActionKeys((current) =>
          current.filter((entry) => entry !== input.key),
        );
      }
    });
  }

  const viewModel = useMemo(
    () =>
      config
        ? buildPlayGameV2ViewModel({
            config,
            snapshot: baseSnapshot,
          })
        : null,
    [baseSnapshot, config],
  );

  if (!config || !viewModel) {
    return (
      <div className="min-h-screen overflow-y-auto px-3 pb-40 sm:px-6">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-black">
                Unsupported v2 setup
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              This game uses a v2 settings combination that does not have a play
              screen yet.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const surface: PlayGameV2SurfaceConfig = {
    adminDrawer: {
      completedAt: baseSnapshot.game.completedAt,
      createdAt: baseSnapshot.game.createdAt,
      creatorName: getPlayGameV2DisplayName(baseSnapshot.game.creator),
      endingSummary: formatPlayGameV2EndingSummary(config),
      gameId: baseSnapshot.game.id,
      isCompleted: viewModel.isCompleted,
      scoringSummary: formatPlayGameV2ScoringSummary(config),
    },
    bottomBar: {
      variant: viewModel.isCompleted
        ? "completed"
        : baseSnapshot.canManageLiveGame
          ? config.variant === "end-game-tally"
            ? "tally"
            : "standard"
          : "viewer",
    },
    header: {
      summary: formatPlayGameV2RulesSummary(config),
      title: baseSnapshot.game.gameTitle?.title ?? "Untitled game",
    },
  };

  return (
    <PlayGameV2ResolvedScreen
      actions={{
        addExistingPlayer: ({ userId }) =>
          withPendingKey(`add-player:${userId}`, async () => {
            await addGamePlayer({
              gameId: baseSnapshotRef.current.game.id,
              userId,
            });
            await reconcileSnapshotNow();
          }),
        approveJoinRequest: ({ requestId }) =>
          withPendingKey(`approve-join:${requestId}`, async () => {
            await approveGameJoinRequest({ requestId });
            await reconcileSnapshotNow();
          }),
        completeGame: (input) => {
          withPendingKey("complete-game", async () => {
            await completeGame({
              gameId: baseSnapshotRef.current.game.id,
              itemizedScoreEntries: input?.itemizedScoreEntries,
              placementSelections: input?.placementSelections,
              winnerUserIds: input?.winnerUserIds,
            });
            await reconcileSnapshotNow();
          });
        },
        commitRound: (input) => {
          const placementSelections =
            config.supportsEliminationFlow && input.eliminatedUserId
              ? buildEliminationPlacements({
                  game: baseSnapshotRef.current.game,
                  eliminatedUserId: input.eliminatedUserId,
                })
              : input.placementSelections;

          runOptimisticMutation({
            key: "commit-round",
            mutation: {
              type: "commit-round",
              completeGame: input.completeGame,
              eliminatedUserId: input.eliminatedUserId ?? undefined,
              finishedAt: nowIso(),
              placementSelections,
              winnerUserIds: input.winnerUserIds,
            },
            action: async () => {
              await commitGameRound({
                completeGame: input.completeGame,
                eliminatedUserId: input.eliminatedUserId,
                gameId: baseSnapshotRef.current.game.id,
                placementSelections,
                winnerUserIds: input.winnerUserIds,
              });
            },
          });
        },
        declineJoinRequest: ({ requestId }) =>
          withPendingKey(`decline-join:${requestId}`, async () => {
            await declineGameJoinRequest({ requestId });
            await reconcileSnapshotNow();
          }),
        pauseGame: () =>
          runOptimisticMutation({
            key: "pause-game",
            mutation: {
              type: "pause-game",
              pausedAt: nowIso(),
              pausedNextUserId: null,
            },
            action: async () => {
              await pauseGame({
                gameId: baseSnapshotRef.current.game.id,
              });
            },
          }),
        reopenGame: () =>
          runOptimisticMutation({
            key: "reopen-game",
            mutation: {
              type: "reopen-game",
            },
            action: async () => {
              await reopenCompletedGame({
                gameId: baseSnapshotRef.current.game.id,
              });
            },
          }),
        refresh: reconcileSnapshotNow,
        removePlayer: ({ userId }) =>
          withPendingKey(`remove-player:${userId}`, async () => {
            await removeGamePlayer({
              gameId: baseSnapshotRef.current.game.id,
              userId,
            });
            await reconcileSnapshotNow();
          }),
        resumeGame: () =>
          runOptimisticMutation({
            key: "resume-game",
            mutation: {
              type: "resume-game",
            },
            action: async () => {
              await resumeGame({
                gameId: baseSnapshotRef.current.game.id,
              });
            },
          }),
        saveEndGameItemizedScore: ({ entries, userId }) => {
          withPendingKey(`end-game-itemized:${userId}`, async () => {
            await upsertEndGameTallyItemizedScore({
              entries,
              gameId: baseSnapshotRef.current.game.id,
              userId,
            });
            await reconcileSnapshotNow();
          });
        },
        saveRoundItemizedScore: ({ entries, userId }) => {
          withPendingKey(
            `round-itemized:${viewModel.activeRoundNumber}:${userId}`,
            async () => {
              await upsertActiveRoundItemizedScore({
                entries,
                gameId: baseSnapshotRef.current.game.id,
                userId,
              });
              await reconcileSnapshotNow();
            },
          );
        },
        setInviteUsersEnabled: ({ enabled }) =>
          withPendingKey("invite-users-enabled", async () => {
            await setGameInviteUsersEnabled({
              gameId: baseSnapshotRef.current.game.id,
              enabled,
            });
            await reconcileSnapshotNow();
          }),
        setPlayerRole: ({ role, userId }) =>
          withPendingKey(`set-role:${userId}`, async () => {
            await setGamePlayerRole({
              gameId: baseSnapshotRef.current.game.id,
              role,
              userId,
            });
            await reconcileSnapshotNow();
          }),
        submitScore: ({ scoreDelta, userId }) => {
          runOptimisticMutation({
            key: `score:${userId}`,
            mutation: {
              type: "upsert-score",
              roundNumber: viewModel.activeRoundNumber,
              scoreDelta,
              userId,
            },
            action: async () => {
              await upsertActiveRoundScore({
                gameId: baseSnapshotRef.current.game.id,
                scoreDelta,
                userId,
              });
            },
          });
        },
        uneliminatePlayer: ({ userId }) => {
          runOptimisticMutation({
            key: `uneliminate:${userId}`,
            mutation: {
              type: "rollback-elimination",
              restoredUserId: userId,
            },
            action: async () => {
              await uneliminateGamePlayer({
                eliminatedUserId: userId,
                gameId: baseSnapshotRef.current.game.id,
              });
            },
          });
        },
      }}
      config={config}
      pendingActionKeys={new Set(pendingActionKeys)}
      props={props}
      snapshot={baseSnapshot}
      surface={surface}
      viewModel={viewModel}
    />
  );
}
