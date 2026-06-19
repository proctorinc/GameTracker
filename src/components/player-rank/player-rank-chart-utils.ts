"use client";

import type { UserSerie } from "react-charts";
import type { PlayerRankChartPoint } from "@/lib/db/store/player-rank.store";

export type PlayerRankChartSeries = {
  userId: string;
  label: string;
  color: string;
  isCurrentUser?: boolean;
  profileHref?: string;
  profileUser?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    color: string;
  };
  points: PlayerRankChartPoint[];
};

export type PlayerRankChartDatum = {
  userId: string;
  historyDate: string;
  historyDateLabel: string;
  date: Date;
  value: number;
  rawValue: number | null;
  point: PlayerRankChartPoint;
};

export type PlayerRankChartHighlightSummary = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  color: string;
  rankTotal: string;
  rankPosition: number | null;
  rankGamesCount: number;
  topThreeFinishes: number;
};

export function formatChartDate(historyDate: string) {
  return new Date(`${historyDate}T00:00:00.000Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatScoreValue(valueMinor: number) {
  return `${Math.round(valueMinor / 100)}`;
}

export function getPointValue(input: {
  point: PlayerRankChartPoint;
  metric: "rank" | "score";
}) {
  if (input.metric === "score") {
    return input.point.playerRankTotalMinor ?? 0;
  }

  return input.point.playerRankPosition;
}

export function buildChartData(input: {
  series: PlayerRankChartSeries[];
  metric: "rank" | "score";
  renderMissingAsBaseline: boolean;
}) {
  return input.series.map((entry) => {
    const data = entry.points.flatMap((point) => {
      const value = getPointValue({
        point,
        metric: input.metric,
      });

      if (value === null && !input.renderMissingAsBaseline) {
        return [];
      }

      return [
        {
          userId: entry.userId,
          historyDate: point.historyDate,
          historyDateLabel: formatChartDate(point.historyDate),
          date: new Date(`${point.historyDate}T00:00:00.000Z`),
          value: value ?? 0,
          rawValue: value,
          point,
        } satisfies PlayerRankChartDatum,
      ];
    });

    return {
      id: entry.userId,
      label: entry.label,
      color: entry.color,
      data,
    } satisfies UserSerie<PlayerRankChartDatum>;
  });
}

export function orderSeriesByHighlightedUser<T extends { userId: string }>(input: {
  series: T[];
  highlightedUserId: string | null;
}) {
  if (!input.highlightedUserId) {
    return input.series;
  }

  const highlightedSeries = input.series.find(
    (entry) => entry.userId === input.highlightedUserId,
  );

  if (!highlightedSeries) {
    return input.series;
  }

  return [
    ...input.series.filter((entry) => entry.userId !== input.highlightedUserId),
    highlightedSeries,
  ];
}

export function getLatestVisiblePointIndex(input: {
  points: PlayerRankChartPoint[];
  metric: "rank" | "score";
  renderMissingAsBaseline: boolean;
}) {
  for (let index = input.points.length - 1; index >= 0; index -= 1) {
    const point = input.points[index];

    if (!point) {
      continue;
    }

    const value = getPointValue({
      point,
      metric: input.metric,
    });

    if (value === null && !input.renderMissingAsBaseline) {
      continue;
    }

    return {
      index,
      value: value ?? 0,
      point,
    };
  }

  return null;
}

export function getPlotPositionStyle(input: {
  xPercent: number;
  yPercent: number;
  padding: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
}) {
  const horizontalPadding = input.padding.left + input.padding.right;
  const verticalPadding = input.padding.top + input.padding.bottom;

  return {
    left: `calc(${input.padding.left}px + (${input.xPercent} / 100) * (100% - ${horizontalPadding}px))`,
    top: `calc(${input.padding.top}px + (${input.yPercent} / 100) * (100% - ${verticalPadding}px))`,
  };
}
