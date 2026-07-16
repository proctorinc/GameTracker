import { formatPlayerRankTotal } from "@/lib/player-rank";

export const GAME_TITLE_RANK_CHART_DAYS = 90;

export type GameTitleRankChartPoint = {
  historyDate: string;
  hasSnapshot: boolean;
  playerRankPosition: number | null;
  playerRankTotal: string | null;
  playerRankTotalMinor: number | null;
  playerRankGamesCount: number | null;
  topThreeFinishes: number | null;
};

type GameTitleRankResult = {
  completedAt: string;
  pointsAwardedMinor: number;
};

export function toGameTitleRankHistoryDate(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

export function addGameTitleRankHistoryDays(historyDate: string, days: number) {
  const date = new Date(`${historyDate}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toGameTitleRankHistoryDate(date);
}

export function buildGameTitleRankChartPoints(input: {
  results: GameTitleRankResult[];
  now?: Date;
  days?: number;
}): GameTitleRankChartPoint[] {
  const days = Math.max(1, input.days ?? GAME_TITLE_RANK_CHART_DAYS);
  const endDate = toGameTitleRankHistoryDate(input.now ?? new Date());
  const startDate = addGameTitleRankHistoryDays(endDate, -(days - 1));
  const pointsByDate = new Map<string, number>();

  for (const result of input.results) {
    const historyDate = toGameTitleRankHistoryDate(result.completedAt);

    if (historyDate < startDate || historyDate > endDate) {
      continue;
    }

    pointsByDate.set(
      historyDate,
      (pointsByDate.get(historyDate) ?? 0) + result.pointsAwardedMinor,
    );
  }

  let cumulativeMinor = 0;
  let hasHistory = false;

  return Array.from({ length: days }, (_, index) => {
    const historyDate = addGameTitleRankHistoryDays(startDate, index);
    const dailyPoints = pointsByDate.get(historyDate);

    if (dailyPoints !== undefined) {
      cumulativeMinor += dailyPoints;
      hasHistory = true;
    }

    return {
      historyDate,
      hasSnapshot: hasHistory,
      playerRankPosition: null,
      playerRankTotal: hasHistory
        ? formatPlayerRankTotal(cumulativeMinor)
        : null,
      playerRankTotalMinor: hasHistory ? cumulativeMinor : null,
      playerRankGamesCount: null,
      topThreeFinishes: null,
    };
  });
}
