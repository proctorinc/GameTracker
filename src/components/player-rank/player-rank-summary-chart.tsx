"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { Chart } from "react-charts";
import type { AxisOptions, ChartOptions } from "react-charts";
import ProfilePicture from "@/components/profile/profile-picture";
import { cn } from "@/lib/utils";
import type { PlayerRankChartPoint } from "@/lib/db/store/player-rank.store";
import {
  buildChartData,
  getLatestVisiblePointIndex,
  getPlotPositionStyle,
  type PlayerRankChartDatum,
  type PlayerRankChartSeries,
} from "./player-rank-chart-utils";

type PlayerRankSummaryChartProps = {
  className?: string;
  color: string;
  emptyMessage?: string;
  points: PlayerRankChartPoint[];
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    color: string;
    avatarUrl: string | null;
  };
};

const CHART_HEIGHT = 72;
const CHART_PADDING = {
  left: 4,
  right: 28,
  top: 8,
  bottom: 8,
};

function getSummaryDomain(values: number[]) {
  if (values.length === 0) {
    return {
      min: 0,
      max: 1,
    };
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  const padding = range > 0 ? range * 0.4 : Math.max(maxValue * 0.12, 1200);
  const min = Math.max(0, minValue - padding);
  const max = maxValue + padding;

  return {
    min,
    max: max <= min ? min + 1 : max,
  };
}

function getSummaryYPercent(input: {
  value: number;
  minValue: number;
  maxValue: number;
}) {
  const domain = input.maxValue - input.minValue;

  if (domain <= 0) {
    return 50;
  }

  return 100 - ((input.value - input.minValue) / domain) * 100;
}

export function PlayerRankSummaryChart({
  className,
  color,
  emptyMessage = "No rank history yet",
  points,
  user,
}: PlayerRankSummaryChartProps) {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const series = useMemo(
    () => [
      {
        userId: user.id,
        label: "You",
        color,
        isCurrentUser: true,
        profileUser: user,
        points,
      } satisfies PlayerRankChartSeries,
    ],
    [color, points, user],
  );
  const chartData = useMemo(
    () =>
      buildChartData({
        series,
        metric: "score",
        renderMissingAsBaseline: false,
      }),
    [series],
  );
  const visibleValues = chartData.flatMap((entry) =>
    entry.data.map((datum) => datum.value),
  );
  const hasAnyData = visibleValues.length > 0;
  const domain = getSummaryDomain(visibleValues);
  const latestPoint = getLatestVisiblePointIndex({
    points,
    metric: "score",
    renderMissingAsBaseline: false,
  });

  const primaryAxis = useMemo(
    () =>
      ({
        getValue: (datum) => datum.date,
        scaleType: "time",
        position: "bottom",
        show: false,
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
        show: false,
        showGrid: false,
        showDatumElements: false,
        hardMin: domain.min,
        hardMax: domain.max,
      } satisfies AxisOptions<PlayerRankChartDatum>,
    ],
    [domain.max, domain.min],
  );
  const chartOptions = useMemo(
    () =>
      ({
        data: chartData,
        primaryAxis,
        secondaryAxes,
        defaultColors: [color],
        initialHeight: CHART_HEIGHT,
        initialWidth: 320,
        useIntersectionObserver: false,
        dark: isDarkMode,
        padding: CHART_PADDING,
        tooltip: false,
        primaryCursor: false,
        secondaryCursor: false,
        showVoronoi: false,
        getSeriesStyle: () => ({
          color,
          line: {
            strokeWidth: 5,
          },
          circle: {
            r: 0,
          },
        }),
      }) satisfies ChartOptions<PlayerRankChartDatum>,
    [chartData, color, isDarkMode, primaryAxis, secondaryAxes],
  );

  if (!hasAnyData) {
    return (
      <div
        className={cn(
          "flex min-h-14 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/25 px-3 text-center text-xs text-muted-foreground",
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  const latestPointStyle =
    latestPoint === null
      ? null
      : getPlotPositionStyle({
          xPercent:
            points.length <= 1
              ? 50
              : (latestPoint.index / (points.length - 1)) * 100,
          yPercent: getSummaryYPercent({
            value: latestPoint.value,
            minValue: domain.min,
            maxValue: domain.max,
          }),
          padding: CHART_PADDING,
        });

  return (
    <div className={cn("relative h-full w-full", className)}>
      <Chart
        options={chartOptions}
        className="h-full w-full"
        style={{ width: "100%", height: "100%" }}
      />
      {latestPointStyle ? (
        <div
          className="pointer-events-none absolute z-10"
          style={{
            ...latestPointStyle,
            transform: "translate(0%, -50%)",
          }}
        >
          <ProfilePicture
            user={user}
            size="xs"
            className="ring-2 ring-background shadow-md"
          />
        </div>
      ) : null}
    </div>
  );
}
