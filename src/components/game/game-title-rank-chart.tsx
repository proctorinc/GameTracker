"use client";

import { useMemo } from "react";
import type { GameTitleRankChartSeries } from "@/lib/db/store/game.store";
import { cn } from "@/lib/utils";

type GameTitleRankChartProps = {
  series: GameTitleRankChartSeries[];
  selectedComparisonUserId: string | null;
  className?: string;
};

const SVG_HEIGHT = 220;
const SVG_WIDTH = 1000;
const PADDING = { top: 16, right: 18, bottom: 34, left: 18 };

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function GameTitleRankChart({
  series,
  selectedComparisonUserId,
  className,
}: GameTitleRankChartProps) {
  const visibleSeries = useMemo(
    () =>
      series.filter(
        (entry) => entry.isCurrentUser || entry.userId === selectedComparisonUserId,
      ),
    [selectedComparisonUserId, series],
  );
  const points = useMemo(
    () =>
      visibleSeries
        .flatMap((entry) =>
          entry.points.map((point) => ({
            userId: entry.userId,
            label: entry.label,
            color: entry.color,
            completedAt: point.completedAt,
            deltaMinor: point.deltaMinor,
            deltaFormatted: point.deltaFormatted,
          })),
        )
        .sort((left, right) => left.completedAt.localeCompare(right.completedAt)),
    [visibleSeries],
  );

  if (points.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-36 items-center justify-center px-2 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        No rank changes from this title in the last 30 days.
      </div>
    );
  }

  const minDelta = Math.min(...points.map((point) => point.deltaMinor), 0);
  const maxDelta = Math.max(...points.map((point) => point.deltaMinor), 0);
  const range = Math.max(maxDelta - minDelta, 1);
  const innerWidth = SVG_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = SVG_HEIGHT - PADDING.top - PADDING.bottom;
  const baselineY =
    PADDING.top + ((maxDelta - 0) / range) * innerHeight;

  const yForValue = (value: number) =>
    PADDING.top + ((maxDelta - value) / range) * innerHeight;
  const xForIndex = (index: number) =>
    points.length === 1
      ? PADDING.left + innerWidth / 2
      : PADDING.left + (index / (points.length - 1)) * innerWidth;

  const tickValues = Array.from(new Set([minDelta, 0, maxDelta])).sort(
    (left, right) => right - left,
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-3 px-1">
        {visibleSeries.map((entry) => (
          <div key={entry.userId} className="inline-flex items-center gap-2 text-sm">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-medium text-foreground/90">{entry.label}</span>
          </div>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="h-[220px] w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Player Rank earned from this title over the last 30 days"
      >
        {tickValues.map((value) => {
          const y = yForValue(value);
          return (
            <g key={value}>
              <line
                x1={PADDING.left}
                x2={SVG_WIDTH - PADDING.right}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeDasharray={value === 0 ? "0" : "4 4"}
                className={value === 0 ? "text-border" : "text-border/60"}
              />
              <text
                x={SVG_WIDTH - PADDING.right}
                y={y - 6}
                textAnchor="end"
                className="fill-muted-foreground text-[11px]"
              >
                {Math.round(value / 100)}
              </text>
            </g>
          );
        })}

        {points.map((point, index) => {
          const x = xForIndex(index);
          const y = yForValue(point.deltaMinor);
          const isPositive = point.deltaMinor >= 0;

          return (
            <g key={`${point.userId}-${point.completedAt}-${index}`}>
              <line
                x1={x}
                x2={x}
                y1={baselineY}
                y2={y}
                stroke={point.color}
                strokeOpacity={0.45}
                strokeWidth={4}
                strokeLinecap="round"
              />
              <circle
                cx={x}
                cy={y}
                r={8}
                fill={point.color}
                fillOpacity={0.16}
              />
              <circle cx={x} cy={y} r={5} fill={point.color} />
              <text
                x={x}
                y={isPositive ? y - 14 : y + 20}
                textAnchor="middle"
                className="fill-foreground text-[11px] font-semibold"
              >
                {point.deltaFormatted}
              </text>
              <text
                x={x}
                y={SVG_HEIGHT - 10}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {formatDate(point.completedAt)}
              </text>
              <title>{`${point.label}: ${point.deltaFormatted} on ${formatDate(
                point.completedAt,
              )}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
