"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { Chart } from "react-charts";
import type { AxisOptions, ChartOptions } from "react-charts";
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

const CHART_HEIGHT = 240;
const CHART_PADDING = {
  left: 24,
  right: 34,
  top: 18,
  bottom: 14,
};
const AVATAR_OVERLAY_PADDING = {
  ...CHART_PADDING,
  // The chart library reserves extra room for the bottom axis labels, so the
  // plotted line sits slightly higher than the raw chart padding suggests.
  bottom: CHART_PADDING.bottom + 20,
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
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
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
                  padding: AVATAR_OVERLAY_PADDING,
                })
              : null,
          ];
        }),
      ),
    [maxValue, orderedSeries, renderMissingAsBaseline],
  );

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
        dark: isDarkMode,
        getSeriesOrder: (chartSeries) => {
          if (!highlightedUserId) {
            return chartSeries;
          }

          const highlightedSeries = chartSeries.find(
            (entry) => entry.id === highlightedUserId,
          );

          if (!highlightedSeries) {
            return chartSeries;
          }

          return [
            ...chartSeries.filter((entry) => entry.id !== highlightedUserId),
            highlightedSeries,
          ];
        },
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
        onClickDatum: (datum) => {
          const nextUserId = datum?.seriesId ?? null;

          if (nextUserId) {
            onHighlightChange?.(nextUserId);
          }
        },
      }) satisfies ChartOptions<PlayerRankChartDatum>,
    [
      chartData,
      isDarkMode,
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
                transform: "translate(-0%, -50%)",
                zIndex: isHighlighted ? 15 : 10,
                transition: "filter 180ms ease",
              }}
              onClick={() => onHighlightChange?.(entry.userId)}
            >
              <ProfilePicture
                user={entry.profileUser}
                size="xs"
                className={cn(
                  "ring-2 ring-background shadow-md transition-transform",
                  isHighlighted && "scale-105",
                )}
              />
            </button>
          );
        })}
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
        <div className="mt-3 flex items-center justify-between px-2 text-xs font-medium text-muted-foreground">
          <span>{formatChartDate(firstHistoryDate)}</span>
          <span>{formatChartDate(lastHistoryDate)}</span>
        </div>
      ) : null}
    </div>
  );
}
