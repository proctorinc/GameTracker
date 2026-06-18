"use client";

import {
  backfillPlayerRankHistory,
  generatePlayerRankPreview,
  publishPlayerRankSettings,
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
  return `${sign}${minor / 100}`;
}

function formatPoints(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
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
        value: `${config.windowMonths} months`,
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
        label: "2-player exact payout preview",
        poolPoints: config.prizePoolPointsByPlayerCount[2] ?? 0,
        payouts: computeExactPayouts(
          config.prizePoolPointsByPlayerCount[2] ?? 0,
          config.smallGameDistributionPercent[2] ?? [0, 0, 0],
        ),
      },
      {
        label: "3-player exact payout preview",
        poolPoints: config.prizePoolPointsByPlayerCount[3] ?? 0,
        payouts: computeExactPayouts(
          config.prizePoolPointsByPlayerCount[3] ?? 0,
          config.smallGameDistributionPercent[3] ?? [0, 0, 0],
        ),
      },
      {
        label: "4-player exact payout preview",
        poolPoints: config.prizePoolPointsByPlayerCount[4] ?? 0,
        payouts: computeExactPayouts(
          config.prizePoolPointsByPlayerCount[4] ?? 0,
          config.largeGameDistributionPercent,
        ),
      },
      {
        label: "5-player exact payout preview",
        poolPoints: config.prizePoolPointsByPlayerCount[5] ?? 0,
        payouts: computeExactPayouts(
          config.prizePoolPointsByPlayerCount[5] ?? 0,
          config.largeGameDistributionPercent,
        ),
      },
      {
        label: "Default max exact payout preview",
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

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-3xl font-black">
              {card.value}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-black">Algorithm settings</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <p className="text-sm text-muted-foreground">
            Distribution inputs below are percentages of the prize pool. As you
            edit them, the exact payout preview updates to show the real point
            values each place would earn.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="window-months">Rolling window (months)</Label>
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
            <div className="space-y-2">
              <Label htmlFor="default-max">Default max prize pool</Label>
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

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Prize pools
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[2, 3, 4, 5].map((playerCount) => (
                <div key={playerCount} className="space-y-2">
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

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Small-game payouts
            </h3>
            {[2, 3].map((playerCount) => (
              <div key={playerCount} className="space-y-3 rounded-2xl border border-border/70 p-4">
                <div className="space-y-1">
                  <p className="font-semibold">{playerCount}-player games</p>
                  <p className="text-sm text-muted-foreground">
                    Enter percent of the {config.prizePoolPointsByPlayerCount[playerCount] ?? 0}
                    -point pool for each placement.
                  </p>
                </div>
                <div
                  className={
                    playerCount === 2 ? "grid grid-cols-2 gap-3" : "grid grid-cols-3 gap-3"
                  }
                >
                  {(["1st", "2nd", "3rd"] as const)
                    .slice(0, playerCount)
                    .map((label, index) => (
                    <div key={label} className="space-y-2">
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
                        Exact:{" "}
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

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Large-game payouts
            </h3>
            <p className="text-sm text-muted-foreground">
              These percentages apply to every 4+ player game, so the exact values
              vary with the pool size.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {(["1st", "2nd", "3rd"] as const).map((label, index) => (
                <div key={label} className="space-y-2">
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
                    5-player exact:{" "}
                    {formatPoints(
                      ((config.prizePoolPointsByPlayerCount[5] ?? 0) *
                        config.largeGameDistributionPercent[index]) /
                        100,
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Exact payout preview
            </h3>
            <div className="flex flex-col gap-3">
              {payoutPreviews.map((preview) => (
                <div
                  key={preview.label}
                  className="rounded-2xl border border-border/70 bg-muted/40 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{preview.label}</p>
                    <Badge variant="outline">Pool {formatPoints(preview.poolPoints)}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                    {(["1st", "2nd", "3rd"] as const).map((label, index) => (
                      <div
                        key={label}
                        className="rounded-xl border border-border/60 bg-background/80 p-3"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {label}
                        </p>
                        <p className="mt-2 font-bold">
                          {formatPoints(preview.payouts[index])}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={handleBackfill}
            >
              Recalculate missing history
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={handlePreview}
            >
              Generate preview
            </Button>
            <Button type="button" disabled={isPending} onClick={handlePublish}>
              Publish config
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg font-black">Platform preview</CardTitle>
            <Badge variant={hasGeneratedPreview ? "default" : "outline"}>
              {hasGeneratedPreview ? "Draft preview" : "Current live standings"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {previewRows.map((row) => (
            <div
              key={row.userId}
              className="rounded-[1.4rem] border border-border/70 bg-card/95 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black">{row.displayName}</p>
                  <p className="text-sm text-muted-foreground">
                    {row.eligibleGamesCount} eligible games
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Delta
                  </p>
                  <p className="text-lg font-black">{formatDelta(row.deltaMinor)}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-border/60 bg-muted/50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Current
                  </p>
                  <p className="mt-2 font-bold">
                    #{row.currentPosition} • {row.currentRankTotal}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Preview
                  </p>
                  <p className="mt-2 font-bold">
                    #{row.previewPosition} • {row.previewRankTotal}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
