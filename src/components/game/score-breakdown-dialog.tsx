"use client";

import { Fragment, useMemo } from "react";
import { useTheme } from "next-themes";
import { Chart } from "react-charts";
import type { AxisOptions, ChartOptions, UserSerie } from "react-charts";
import ProfilePicture from "@/components/profile/profile-picture";
import { CardEmpty } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GameForPlayPage } from "@/lib/db/store/game.store";
import type { GameScoringMode } from "@/lib/db/schema";
import {
  buildCumulativeScoreSeries,
  type ScoreBreakdownChartPoint,
} from "@/lib/game/score-breakdown-chart";
import { cn } from "@/lib/utils";

type ScoreBreakdownPlayer = GameForPlayPage["players"][number];
type ScoreBreakdownRound = GameForPlayPage["rounds"][number];

export type ScoreBreakdownDialogProps = {
  canEditPlayerScore: (userId: string) => boolean;
  editingDisabled: boolean;
  historyOnly: boolean;
  onEditRoundScore: (input: {
    playerId: string;
    roundNumber: number;
  }) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  players: ScoreBreakdownPlayer[];
  rounds: ScoreBreakdownRound[];
  scoringMode: GameScoringMode;
};

function getDisplayName(player: ScoreBreakdownPlayer) {
  const firstName = player.user.firstName?.trim() ?? "";
  const lastInitial =
    player.user.lastName?.trim().charAt(0).toUpperCase() ?? "";

  if (firstName && lastInitial) {
    return `${firstName} ${lastInitial}.`;
  }

  if (firstName) {
    return firstName;
  }

  const lastName = player.user.lastName?.trim() ?? "";

  if (lastName) {
    return `${lastName.charAt(0).toUpperCase()}.`;
  }

  return player.user.isGuest ? "Guest player" : "Unnamed player";
}

function ScoreHistoryChart({
  players,
  rounds,
  scoringMode,
}: Pick<
  ScoreBreakdownDialogProps,
  "players" | "rounds" | "scoringMode"
>) {
  const { resolvedTheme } = useTheme();
  const cumulativeSeries = useMemo(
    () => buildCumulativeScoreSeries({ players, rounds }),
    [players, rounds],
  );
  const chartData = useMemo(
    () =>
      cumulativeSeries.map((series) => {
        const player = players.find(
          (candidate) => candidate.userId === series.userId,
        );

        return {
          id: series.userId,
          label: player ? getDisplayName(player) : "Player",
          color: player?.user.color,
          data: series.points,
        } satisfies UserSerie<ScoreBreakdownChartPoint>;
      }),
    [cumulativeSeries, players],
  );
  const primaryAxis = useMemo(
    () =>
      ({
        getValue: (datum) => datum.roundLabel,
        position: "bottom",
        scaleType: "band",
        showGrid: false,
      }) satisfies AxisOptions<ScoreBreakdownChartPoint>,
    [],
  );
  const secondaryAxes = useMemo(
    () => [
      {
        getValue: (datum: ScoreBreakdownChartPoint) => datum.value,
        elementType: "line",
        position: "left",
        scaleType: "linear",
        showGrid: true,
        showDatumElements: false,
        formatters: {
          scale: (value: number) => String(Math.round(value)),
          tooltip: (value: number) => String(value),
        },
      } satisfies AxisOptions<ScoreBreakdownChartPoint>,
    ],
    [],
  );
  const chartOptions = useMemo(
    () =>
      ({
        data: chartData,
        primaryAxis,
        secondaryAxes,
        dark: resolvedTheme === "dark",
        initialHeight: 160,
        initialWidth: 560,
        interactionMode: "primary",
        padding: { left: 8, right: 12, top: 12, bottom: 4 },
        primaryCursor: false,
        secondaryCursor: false,
        showVoronoi: true,
        tooltip: { groupingMode: "primary" },
        useIntersectionObserver: false,
        getSeriesStyle: (series) => ({
          color: players.find((player) => player.userId === series.id)?.user
            .color,
          line: { strokeWidth: 3.5 },
          circle: { r: 3 },
        }),
      }) satisfies ChartOptions<ScoreBreakdownChartPoint>,
    [chartData, players, primaryAxis, resolvedTheme, secondaryAxes],
  );
  const winningCue =
    scoringMode === "highest_wins"
      ? "Higher score wins"
      : scoringMode === "lowest_wins"
        ? "Lower score wins"
        : null;

  return (
    <section
      aria-label="Scores over rounds"
      className="rounded-xl border border-border bg-muted/25 p-3"
      data-testid="score-history-chart"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-black">Scores over rounds</h3>
        {winningCue ? (
          <span className="shrink-0 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {winningCue}
          </span>
        ) : null}
      </div>
      <div
        aria-label="Player chart legend"
        className="mb-1 flex gap-3 overflow-x-auto pb-1"
      >
        {players.map((player) => (
          <div
            key={player.userId}
            className="flex shrink-0 items-center gap-1.5 text-xs font-semibold"
          >
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full"
              style={{ backgroundColor: player.user.color }}
            />
            <span>{getDisplayName(player)}</span>
          </div>
        ))}
      </div>
      <div
        aria-label="Cumulative player scores by round"
        className="h-40 w-full"
        role="img"
      >
        <Chart
          className="h-full w-full"
          options={chartOptions}
          style={{ height: "100%", width: "100%" }}
        />
      </div>
    </section>
  );
}

export function ScoreBreakdownDialog({
  canEditPlayerScore,
  editingDisabled,
  historyOnly,
  onEditRoundScore,
  onOpenChange,
  open,
  players,
  rounds,
  scoringMode,
}: ScoreBreakdownDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-xl p-5 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">
            Score breakdown
          </DialogTitle>
          <DialogDescription>
            {historyOnly
              ? "Round history for this game"
              : "Tap to edit any round scores"}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[80vh] space-y-3 overflow-y-auto pr-1">
          {rounds.length > 0 ? (
            <>
              <ScoreHistoryChart
                players={players}
                rounds={rounds}
                scoringMode={scoringMode}
              />
              <div
                className="overflow-x-auto rounded-xl border border-border bg-muted/50"
                data-testid="score-breakdown-grid"
              >
                <div
                  className="grid w-full min-w-max"
                  style={{
                    gridTemplateColumns: `3.5rem minmax(4.75rem, 0.9fr) repeat(${rounds.length}, minmax(4.25rem, 1fr))`,
                  }}
                >
                  <div className="sticky left-0 z-10 border-r border-b border-border bg-card px-3 py-3" />
                  <div className="border-r border-b border-border bg-muted px-3 py-3 text-center text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                    Total
                  </div>
                  {rounds.map((round) => (
                    <div
                      key={round.id}
                      className="border-r border-b border-border bg-muted px-3 py-3 text-center text-xs font-black uppercase tracking-[0.18em] text-muted-foreground"
                    >
                      <span>R{round.roundNumber}</span>
                    </div>
                  ))}

                  {players.map((player) => (
                    <Fragment key={player.id}>
                      <div
                        className="sticky left-0 z-10 flex items-center justify-center overflow-hidden border-r border-b border-border bg-card px-2 py-3"
                        title={getDisplayName(player)}
                      >
                        <ProfilePicture size="xs" user={player.user} />
                      </div>
                      <div className="flex items-center justify-center border-r border-b border-border bg-muted/60 px-2 py-3 text-center text-sm font-black text-foreground">
                        {player.score ?? 0}
                      </div>
                      {rounds.map((round) => {
                        const roundScore = (round.scores ?? []).find(
                          (score) => score.userId === player.userId,
                        )?.scoreDelta;

                        return (
                          <button
                            key={`${round.id}-${player.userId}`}
                            className={cn(
                              "flex min-h-12 items-center justify-center border-r border-b border-border px-2 py-3 text-center text-sm font-medium text-foreground/80",
                              canEditPlayerScore(player.userId) &&
                                !editingDisabled &&
                                "cursor-pointer hover:bg-background/70",
                            )}
                            disabled={
                              !canEditPlayerScore(player.userId) ||
                              editingDisabled
                            }
                            onClick={() =>
                              onEditRoundScore({
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
            </>
          ) : (
            <CardEmpty className="rounded-xl border border-dashed border-border bg-muted/30 py-10 text-center">
              Nothing here yet. Scores will show up after the first round.
            </CardEmpty>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
