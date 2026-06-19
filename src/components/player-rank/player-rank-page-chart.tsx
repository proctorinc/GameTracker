"use client";

import { useMemo, useState } from "react";
import { Chart } from "react-charts";
import type { AxisOptions, ChartOptions, Datum } from "react-charts";
import ProfilePicture from "@/components/profile/profile-picture";
import { cn } from "@/lib/utils";
import {
  buildChartData,
  formatChartDate,
  formatScoreValue,
  getLatestVisiblePointIndex,
  getPlotPositionStyle,
  orderSeriesByHighlightedUser,
  type PlayerRankChartDatum,
  type PlayerRankChartSeries,
} from "./player-rank-chart-utils";

type PlayerRankPageChartProps = {
  className?: string;
  emptyMessage?: string;
  highlightedUserId?: string | null;
  onHighlightChange?: (userId: string) => void;
  renderMissingAsBaseline?: boolean;
  series: PlayerRankChartSeries[];
  showYAxis?: boolean;
};

const CHART_HEIGHT = 256;
const CHART_PADDING = {
  left: 24,
  right: 34,
  top: 18,
  bottom: 14,
};

function getScoreYPercent(input: { value: number; maxValue: number }) {
  if (input.maxValue <= 0) {
    return 100;
  }

  return 100 - (input.value / input.maxValue) * 100;
}

export function PlayerRankPageChart({
  className,
  emptyMessage = "No rank history yet",
  highlightedUserId = null,
  onHighlightChange,
  renderMissingAsBaseline = false,
  series,
  showYAxis = false,
}: PlayerRankPageChartProps) {
  const [hoveredDatum, setHoveredDatum] = useState<PlayerRankChartDatum | null>(
    null,
  );
  const orderedSeries = useMemo(
    () =>
      orderSeriesByHighlightedUser({
        series,
        highlightedUserId,
      }),
    [highlightedUserId, series],
  );

  const visibleValues = orderedSeries.flatMap((entry) =>
    entry.points.flatMap((point) =>
      point.playerRankTotalMinor === null ? [] : [point.playerRankTotalMinor],
    ),
  );
  const maxValue = Math.max(...visibleValues, 0);
  const hasAnyData = visibleValues.length > 0 || renderMissingAsBaseline;
  const firstHistoryDate = orderedSeries[0]?.points[0]?.historyDate ?? null;
  const lastHistoryDate =
    orderedSeries[0]?.points[orderedSeries[0].points.length - 1]?.historyDate ??
    null;

  const chartData = useMemo(
    () =>
      buildChartData({
        series: orderedSeries,
        metric: "score",
        renderMissingAsBaseline,
      }),
    [orderedSeries, renderMissingAsBaseline],
  );
  const latestPointPositions = useMemo(
    () =>
      Object.fromEntries(
        orderedSeries.map((entry) => {
          const latestPoint = getLatestVisiblePointIndex({
            points: entry.points,
            metric: "score",
            renderMissingAsBaseline,
          });

          return [
            entry.userId,
            latestPoint
              ? getPlotPositionStyle({
                  xPercent:
                    entry.points.length <= 1
                      ? 50
                      : (latestPoint.index / (entry.points.length - 1)) * 100,
                  yPercent: getScoreYPercent({
                    value: latestPoint.value,
                    maxValue,
                  }),
                  padding: CHART_PADDING,
                })
              : null,
          ];
        }),
      ),
    [maxValue, orderedSeries, renderMissingAsBaseline],
  );

  const activeDatum =
    hoveredDatum?.userId && hoveredDatum.userId !== highlightedUserId
      ? hoveredDatum
      : null;
  const activeUserId = activeDatum?.userId ?? null;
  const activeSeries = activeUserId
    ? (orderedSeries.find((entry) => entry.userId === activeUserId) ?? null)
    : null;
  const activeValue =
    activeDatum?.userId === activeUserId ? activeDatum : null;

  const scoreAxisLabels = [maxValue, Math.round(maxValue / 2), 0];

  const primaryAxis = useMemo(
    () =>
      ({
        getValue: (datum) => datum.date,
        scaleType: "time",
        position: "bottom",
        show: true,
        showGrid: false,
        tickCount: 2,
        formatters: {
          scale: (value: Date) =>
            value.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
          tooltip: (value: Date) =>
            value.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
        },
      }) satisfies AxisOptions<PlayerRankChartDatum>,
    [],
  );
  const secondaryAxes = useMemo(
    () => [
      {
        getValue: (datum: PlayerRankChartDatum) => datum.value,
        elementType: "line",
        scaleType: "linear",
        position: "left",
        show: showYAxis,
        showGrid: true,
        showDatumElements: "onFocus",
        hardMin: 0,
        hardMax: maxValue <= 0 ? 1 : maxValue,
        tickCount: 3,
        formatters: {
          scale: (value: number) => formatScoreValue(value),
          tooltip: (value: number) => formatScoreValue(value),
        },
      } satisfies AxisOptions<PlayerRankChartDatum>,
    ],
    [maxValue, showYAxis],
  );
  const chartOptions = useMemo(
    () =>
      ({
        data: chartData,
        primaryAxis,
        secondaryAxes,
        defaultColors: orderedSeries.map((entry) => entry.color),
        initialHeight: CHART_HEIGHT,
        initialWidth: 320,
        useIntersectionObserver: false,
        padding: CHART_PADDING,
        tooltip: false,
        primaryCursor: false,
        secondaryCursor: false,
        interactionMode: "primary",
        showVoronoi: true,
        getSeriesStyle: (chartSeries) => {
          const isHighlighted = highlightedUserId === chartSeries.id;
          const matchingSeries = orderedSeries.find(
            (entry) => entry.userId === chartSeries.id,
          );
          const lineOpacity = highlightedUserId && !isHighlighted ? 0.6 : 1;
          const lineWidth =
            isHighlighted ||
            (!highlightedUserId && matchingSeries?.isCurrentUser)
              ? 4.75
              : matchingSeries?.isCurrentUser
                ? 4
                : 3.5;

          return {
            color: matchingSeries?.color,
            opacity: lineOpacity,
            line: {
              strokeWidth: lineWidth,
            },
            circle: {
              r: 0,
            },
          };
        },
        onFocusDatum: (datum: Datum<PlayerRankChartDatum> | null) => {
          setHoveredDatum(datum?.originalDatum ?? null);
        },
        onClickDatum: (datum: Datum<PlayerRankChartDatum> | null) => {
          const nextUserId = datum?.seriesId ?? null;
          setHoveredDatum(datum?.originalDatum ?? null);

          if (nextUserId) {
            onHighlightChange?.(nextUserId);
          }
        },
      }) satisfies ChartOptions<PlayerRankChartDatum>,
    [
      chartData,
      highlightedUserId,
      onHighlightChange,
      orderedSeries,
      primaryAxis,
      secondaryAxes,
    ],
  );

  if (!hasAnyData) {
    return (
      <div
        className={cn(
          "flex min-h-32 items-center justify-center rounded-3xl border border-dashed border-border/70 bg-muted/25 px-4 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col justify-end",
        className,
      )}
    >
      {activeSeries && activeValue ? (
        <div className="absolute top-2 left-2 z-20 rounded-2xl border border-border/70 bg-background/95 px-3 py-2 text-sm shadow-lg backdrop-blur-sm">
          <p className="font-semibold">{activeSeries.label}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: activeSeries.color }}
            />
            <span>
              {formatScoreValue(activeValue.point.playerRankTotalMinor ?? 0)}
            </span>
          </div>
        </div>
      ) : null}

      <div className="relative h-full w-full">
        <Chart
          options={chartOptions}
          className="h-full w-full"
          style={{ width: "100%", height: "100%" }}
        />
        {orderedSeries.map((entry) => {
          const latestPointStyle = latestPointPositions[entry.userId];
          const isHighlighted = highlightedUserId === entry.userId;
          const avatarFilter =
            highlightedUserId && !isHighlighted
              ? "brightness(0.72) saturate(0.9)"
              : "none";

          if (!latestPointStyle || !entry.profileUser) {
            return null;
          }

          return (
            <button
              key={`latest-avatar-${entry.userId}`}
              type="button"
              data-testid={`player-rank-avatar-${entry.userId}`}
              aria-label={`Highlight ${entry.label}`}
              className="absolute"
              style={{
                ...latestPointStyle,
                filter: avatarFilter,
                transform: "translate(-50%, -50%)",
                zIndex: isHighlighted ? 15 : 10,
                transition: "filter 180ms ease",
              }}
              onClick={() => onHighlightChange?.(entry.userId)}
            >
              <ProfilePicture
                user={entry.profileUser}
                size="sm"
                className={cn(
                  "ring-2 ring-background shadow-md transition-transform",
                  isHighlighted && "scale-105",
                )}
              />
            </button>
          );
        })}

        {showYAxis ? (
          <div className="pointer-events-none absolute inset-y-4 left-0 flex w-12 flex-col justify-between pr-2 text-right text-xs font-medium text-muted-foreground">
            {scoreAxisLabels.map((label, index) => (
              <span key={`${label}-${index}`}>{formatScoreValue(label)}</span>
            ))}
          </div>
        ) : null}
      </div>

      {orderedSeries.map((entry) => (
        <button
          key={entry.userId}
          type="button"
          data-testid={`player-rank-series-${entry.userId}`}
          className="sr-only"
          onClick={() => onHighlightChange?.(entry.userId)}
        >
          {entry.label}
        </button>
      ))}

      {firstHistoryDate && lastHistoryDate ? (
        <div className="mt-3 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>{formatChartDate(firstHistoryDate)}</span>
          <span>Score</span>
          <span>{formatChartDate(lastHistoryDate)}</span>
        </div>
      ) : null}
    </div>
  );
}
