"use client";

import {
  backfillPlayerRankHistory,
  generatePlayerRankPreview,
  publishPlayerRankSettings,
  setPlayerRankLeaderboardDisabled,
} from "@/app/actions/player-rank";
import type {
  PlayerRankConfig,
  PlayerRankPreviewRow,
} from "@/lib/db/store/player-rank.store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

type EditablePlayerRankConfig = {
  windowMonths: number;
  defaultMaxPrizePoolPoints: number;
  prizePoolPointsByPlayerCount: Record<number, number>;
  smallGameDistributionPercent: Record<number, [number, number, number]>;
  largeGameDistributionPercent: [number, number, number];
};

type PayoutPreview = {
  label: string;
  poolPoints: number;
  payouts: [number, number, number];
};

function toEditableConfig(config: PlayerRankConfig): EditablePlayerRankConfig {
  return {
    windowMonths: config.windowMonths,
    defaultMaxPrizePoolPoints: config.defaultMaxPrizePool / 100,
    prizePoolPointsByPlayerCount: Object.fromEntries(
      Object.entries(config.prizePoolByPlayerCount).map(([key, value]) => [
        Number(key),
        value / 100,
      ]),
    ) as Record<number, number>,
    smallGameDistributionPercent: Object.fromEntries(
      Object.entries(config.smallGameDistribution).map(([key, shares]) => [
        Number(key),
        shares.map((value) => value / 100) as [number, number, number],
      ]),
    ) as Record<number, [number, number, number]>,
    largeGameDistributionPercent: config.largeGameDistribution.map(
      (value) => value / 100,
    ) as [number, number, number],
  };
}

function toPublishInput(config: EditablePlayerRankConfig) {
  return {
    windowMonths: config.windowMonths,
    defaultMaxPrizePool: Math.round(config.defaultMaxPrizePoolPoints * 100),
    prizePoolByPlayerCount: Object.fromEntries(
      Object.entries(config.prizePoolPointsByPlayerCount).map(([key, value]) => [
        Number(key),
        Math.round(value * 100),
      ]),
    ) as Record<number, number>,
    smallGameDistribution: Object.fromEntries(
      Object.entries(config.smallGameDistributionPercent).map(([key, shares]) => [
        Number(key),
        shares.map((value) => Math.round(value * 100)) as [number, number, number],
      ]),
    ) as Record<number, [number, number, number]>,
    largeGameDistribution: config.largeGameDistributionPercent.map((value) =>
      Math.round(value * 100),
    ) as [number, number, number],
  };
}

function formatDelta(minor: number) {
  const sign = minor > 0 ? "+" : "";
  return `${sign}${(minor / 100).toFixed(0)}`;
}

function formatPoints(value: number) {
  return value.toFixed(0);
}

function formatPosition(value: number | null) {
  return value === null ? "Excluded" : `#${value}`;
}

function computeExactPayouts(
  poolPoints: number,
  percents: [number, number, number],
): [number, number, number] {
  return percents.map((percent) => (poolPoints * percent) / 100) as [
    number,
    number,
    number,
  ];
}

export function AdminPlayerRanks(props: {
  activeConfig: PlayerRankConfig;
  standings: PlayerRankPreviewRow[];
}) {
  const router = useRouter();
  const [config, setConfig] = useState(() => toEditableConfig(props.activeConfig));
  const [previewRows, setPreviewRows] = useState<PlayerRankPreviewRow[]>(props.standings);
  const [hasGeneratedPreview, setHasGeneratedPreview] = useState(false);
  const [isPending, startTransition] = useTransition();

  const summaryCards = useMemo(
    () => [
      {
        label: "Window",
        value: `${config.windowMonths} mo`,
      },
      {
        label: "5-player pool",
        value: `${config.prizePoolPointsByPlayerCount[5] ?? 0}`,
      },
      {
        label: "Large-game 1st",
        value: `${config.largeGameDistributionPercent[0]}%`,
      },
    ],
    [config],
  );
  const payoutPreviews = useMemo<PayoutPreview[]>(
    () => [
      {
        label: "2-player",
        poolPoints: config.prizePoolPointsByPlayerCount[2] ?? 0,
        payouts: computeExactPayouts(
          config.prizePoolPointsByPlayerCount[2] ?? 0,
          config.smallGameDistributionPercent[2] ?? [0, 0, 0],
        ),
      },
      {
        label: "3-player",
        poolPoints: config.prizePoolPointsByPlayerCount[3] ?? 0,
        payouts: computeExactPayouts(
          config.prizePoolPointsByPlayerCount[3] ?? 0,
          config.smallGameDistributionPercent[3] ?? [0, 0, 0],
        ),
      },
      {
        label: "4-player",
        poolPoints: config.prizePoolPointsByPlayerCount[4] ?? 0,
        payouts: computeExactPayouts(
          config.prizePoolPointsByPlayerCount[4] ?? 0,
          config.largeGameDistributionPercent,
        ),
      },
      {
        label: "5-player",
        poolPoints: config.prizePoolPointsByPlayerCount[5] ?? 0,
        payouts: computeExactPayouts(
          config.prizePoolPointsByPlayerCount[5] ?? 0,
          config.largeGameDistributionPercent,
        ),
      },
      {
        label: "Default max",
        poolPoints: config.defaultMaxPrizePoolPoints,
        payouts: computeExactPayouts(
          config.defaultMaxPrizePoolPoints,
          config.largeGameDistributionPercent,
        ),
      },
    ],
    [config],
  );

  function updatePrizePool(playerCount: number, value: number) {
    setConfig((current) => ({
      ...current,
      prizePoolPointsByPlayerCount: {
        ...current.prizePoolPointsByPlayerCount,
        [playerCount]: value,
      },
    }));
  }

  function updateSmallDistribution(
    playerCount: number,
    slotIndex: number,
    value: number,
  ) {
    setConfig((current) => {
      const next = [...(current.smallGameDistributionPercent[playerCount] ?? [0, 0, 0])] as [
        number,
        number,
        number,
      ];
      next[slotIndex] = value;
      return {
        ...current,
        smallGameDistributionPercent: {
          ...current.smallGameDistributionPercent,
          [playerCount]: next,
        },
      };
    });
  }

  function updateLargeDistribution(slotIndex: number, value: number) {
    setConfig((current) => {
      const next = [...current.largeGameDistributionPercent] as [number, number, number];
      next[slotIndex] = value;
      return {
        ...current,
        largeGameDistributionPercent: next,
      };
    });
  }

  function handlePreview() {
    startTransition(async () => {
      try {
        const nextRows = await generatePlayerRankPreview(toPublishInput(config));
        setPreviewRows(nextRows);
        setHasGeneratedPreview(true);
        toast.success("Preview updated");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to preview Player Rank");
      }
    });
  }

  function handlePublish() {
    startTransition(async () => {
      try {
        await publishPlayerRankSettings(toPublishInput(config));
        toast.success("Player Rank config published");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to publish Player Rank");
      }
    });
  }

  function handleBackfill() {
    startTransition(async () => {
      try {
        const result = await backfillPlayerRankHistory();
        toast.success(
          result.processedGameCount > 0
            ? `Backfilled Player Rank for ${result.processedGameCount} games`
            : "No missing Player Rank history found",
        );
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to backfill Player Rank history",
        );
      }
    });
  }

  function handleLeaderboardToggle(row: PlayerRankPreviewRow) {
    startTransition(async () => {
      try {
        const disabled = !row.isLeaderboardDisabled;
        await setPlayerRankLeaderboardDisabled({
          userId: row.userId,
          disabled,
        });
        setPreviewRows((current) =>
          current.map((entry) =>
            entry.userId === row.userId
              ? {
                  ...entry,
                  isLeaderboardDisabled: disabled,
                  currentPosition: disabled ? null : entry.currentPosition,
                  previewPosition: disabled ? null : entry.previewPosition,
                }
              : entry,
          ),
        );
        toast.success(
          disabled
            ? "User removed from global leaderboard"
            : "User restored to global leaderboard",
        );
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to update leaderboard status",
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="px-3 pb-1 pt-3">
              <CardTitle className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 text-center text-2xl font-black">
              {card.value}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-black">Algorithm settings</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Edit payout percentages and pool sizes, then generate a preview before publishing.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="window-months">Rolling window</Label>
              <Input
                id="window-months"
                type="number"
                min={1}
                value={config.windowMonths}
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    windowMonths: Number(event.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="default-max">Default max pool</Label>
              <Input
                id="default-max"
                type="number"
                min={0}
                value={config.defaultMaxPrizePoolPoints}
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    defaultMaxPrizePoolPoints: Number(event.target.value),
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Prize pools
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[2, 3, 4, 5].map((playerCount) => (
                <div key={playerCount} className="space-y-1.5">
                  <Label htmlFor={`pool-${playerCount}`}>{playerCount} players</Label>
                  <Input
                    id={`pool-${playerCount}`}
                    type="number"
                    min={0}
                    value={config.prizePoolPointsByPlayerCount[playerCount] ?? 0}
                    onChange={(event) =>
                      updatePrizePool(playerCount, Number(event.target.value))
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Small-game payouts
            </h3>
            {[2, 3].map((playerCount) => (
              <div key={playerCount} className="rounded-2xl border border-border/70 p-3">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{playerCount}-player games</p>
                    <p className="text-xs text-muted-foreground">
                      Pool {config.prizePoolPointsByPlayerCount[playerCount] ?? 0}
                    </p>
                  </div>
                </div>
                <div
                  className={
                    playerCount === 2 ? "grid grid-cols-2 gap-3" : "grid grid-cols-3 gap-3"
                  }
                >
                  {(["1st", "2nd", "3rd"] as const)
                    .slice(0, playerCount)
                    .map((label, index) => (
                      <div key={label} className="space-y-1.5">
                        <Label htmlFor={`small-${playerCount}-${label}`}>{label} %</Label>
                        <Input
                          id={`small-${playerCount}-${label}`}
                          type="number"
                          min={0}
                          step="0.1"
                          value={config.smallGameDistributionPercent[playerCount]?.[index] ?? 0}
                          onChange={(event) =>
                            updateSmallDistribution(
                              playerCount,
                              index,
                              Number(event.target.value),
                            )
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Exact{" "}
                          {formatPoints(
                            ((config.prizePoolPointsByPlayerCount[playerCount] ?? 0) *
                              (config.smallGameDistributionPercent[playerCount]?.[index] ?? 0)) /
                              100,
                          )}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Large-game payouts
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {(["1st", "2nd", "3rd"] as const).map((label, index) => (
                <div key={label} className="space-y-1.5">
                  <Label htmlFor={`large-${label}`}>{label} %</Label>
                  <Input
                    id={`large-${label}`}
                    type="number"
                    min={0}
                    step="0.1"
                    value={config.largeGameDistributionPercent[index]}
                    onChange={(event) =>
                      updateLargeDistribution(index, Number(event.target.value))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    5-player {formatPoints(
                      ((config.prizePoolPointsByPlayerCount[5] ?? 0) *
                        config.largeGameDistributionPercent[index]) /
                        100,
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Exact payout preview
              </h3>
              <Badge variant="outline">Points</Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {payoutPreviews.map((preview) => (
                <div
                  key={preview.label}
                  className="rounded-2xl border border-border/70 bg-muted/35 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{preview.label}</p>
                    <span className="text-xs text-muted-foreground">
                      Pool {formatPoints(preview.poolPoints)}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                    {(["1st", "2nd", "3rd"] as const).map((label, index) => (
                      <div
                        key={label}
                        className="rounded-xl border border-border/60 bg-background/90 px-2 py-2"
                      >
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {label}
                        </p>
                        <p className="mt-1 font-bold">{formatPoints(preview.payouts[index])}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isPending}
              onClick={handleBackfill}
            >
              Recalculate missing history
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={handlePreview}
            >
              Generate preview
            </Button>
            <Button type="button" size="sm" disabled={isPending} onClick={handlePublish}>
              Publish config
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-black">Leaderboard users</CardTitle>
              <p className="text-sm text-muted-foreground">
                Active real users stay visible here even when excluded from global rank numbering.
              </p>
            </div>
            <Badge variant={hasGeneratedPreview ? "default" : "outline"}>
              {hasGeneratedPreview ? "Draft preview" : "Current live standings"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="overflow-x-auto">
            <div className="min-w-[760px] space-y-2">
              <div className="grid grid-cols-[minmax(11rem,1.8fr)_6.5rem_6rem_6.5rem_6rem_7rem] gap-2 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <span>User</span>
                <span>Score</span>
                <span>Rank</span>
                <span>Preview</span>
                <span>Games</span>
                <span>Action</span>
              </div>

              {previewRows.map((row) => (
                <div
                  key={row.userId}
                  className="grid grid-cols-[minmax(11rem,1.8fr)_6.5rem_6rem_6.5rem_6rem_7rem] items-center gap-2 rounded-2xl border border-border/70 bg-card/95 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold">{row.displayName}</p>
                      <Badge variant={row.isLeaderboardDisabled ? "secondary" : "outline"}>
                        {row.isLeaderboardDisabled ? "Excluded" : "Live"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {row.deltaMinor === 0 ? "No change" : `${formatDelta(row.deltaMinor)} draft`}
                    </p>
                  </div>

                  <div className="text-sm font-semibold">{row.currentRankTotal}</div>

                  <div className="text-sm font-semibold">{formatPosition(row.currentPosition)}</div>

                  <div className="text-sm font-semibold">{formatPosition(row.previewPosition)}</div>

                  <div className="text-sm text-muted-foreground">{row.eligibleGamesCount}</div>

                  <Button
                    type="button"
                    size="sm"
                    variant={row.isLeaderboardDisabled ? "default" : "outline"}
                    disabled={isPending}
                    onClick={() => handleLeaderboardToggle(row)}
                  >
                    {row.isLeaderboardDisabled ? "Enable" : "Disable"}
                  </Button>
                </div>
              ))}

              {previewRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                  No Player Rank users found.
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
