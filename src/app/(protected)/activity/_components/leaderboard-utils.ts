import type { FriendConnectionsCollections } from "@/app/actions/pages/friends";
import type {
  PlayerRankGameDelta,
  PlayerRankStandingRow,
} from "@/lib/db/store/player-rank.store";
import type { UserBase } from "@/lib/db/store/user.store";
import { formatPlayerRankTotal } from "@/lib/player-rank";

type ActivityLeaderboardUser = Pick<
  UserBase,
  "id" | "firstName" | "lastName" | "color" | "playerRankLeaderboardDisabled"
>;

export type FriendRankSummary = {
  user: ActivityLeaderboardUser;
  isCurrentUser: boolean;
  friendPosition: number;
  playerRankTotal: string;
  playerRankTotalMinor: number;
  playerRankWindowLabel: string | null;
  playerRankGamesCount: number;
  topThreeFinishes: number;
};

export type ActivityLeaderboardFriend = FriendRankSummary & {
  recentRankedGameAt: string | null;
  recentActivityCount: number;
  headlineStat: {
    kind: "rank" | "wins" | "volume" | "idle";
    label: string;
  };
  supportingStats: string[];
};

function getDaysSince(input: { timestamp: string; now: Date }) {
  return Math.floor(
    (input.now.getTime() - new Date(input.timestamp).getTime()) /
      (24 * 60 * 60 * 1000),
  );
}

function formatLastPlayedLabel(input: {
  recentRankedGameAt: string | null;
  now: Date;
}) {
  if (!input.recentRankedGameAt) {
    return "No recent activity";
  }

  const daysSinceRecentGame = getDaysSince({
    timestamp: input.recentRankedGameAt,
    now: input.now,
  });

  if (daysSinceRecentGame <= 0) {
    return "Last played today";
  }

  if (daysSinceRecentGame === 1) {
    return "Last played yesterday";
  }

  return `Last played ${daysSinceRecentGame} days ago`;
}

function createVolumeLabel(count: number, windowLabel: string) {
  return `${count} game${count === 1 ? "" : "s"} ${windowLabel}`;
}

function createWinsLabel(wins: number, games: number) {
  return `Won ${wins} of last ${games}`;
}

function createRankLabel(deltaMinor: number, windowLabel: string) {
  return `+${formatPlayerRankTotal(deltaMinor)} ${windowLabel}`;
}

function buildRecentStats(input: {
  recentRankedGameAt: string | null;
  recentActivityCount: number;
  gamesLast3Days: number;
  gamesLast7Days: number;
  gamesLast14Days: number;
  recentWins: number;
  recentDecisiveGames: number;
  rankDeltaLast7Days: number;
  rankDeltaLast14Days: number;
  now: Date;
}) {
  const headlineStat =
    input.rankDeltaLast7Days > 0
      ? {
          kind: "rank" as const,
          label: createRankLabel(input.rankDeltaLast7Days, "in the last week"),
        }
      : input.gamesLast3Days >= 2
        ? {
            kind: "volume" as const,
            label: createVolumeLabel(
              input.gamesLast3Days,
              "in the last 3 days",
            ),
          }
        : input.recentDecisiveGames >= 3
          ? {
              kind: "wins" as const,
              label: createWinsLabel(
                input.recentWins,
                input.recentDecisiveGames,
              ),
            }
          : input.gamesLast14Days >= 2
            ? {
                kind: "volume" as const,
                label: createVolumeLabel(
                  input.gamesLast14Days,
                  "in the last 2 weeks",
                ),
              }
            : {
                kind: "idle" as const,
                label: formatLastPlayedLabel({
                  recentRankedGameAt: input.recentRankedGameAt,
                  now: input.now,
                }),
              };

  const supportingCandidates = [
    input.rankDeltaLast14Days > 0
      ? createRankLabel(
          input.rankDeltaLast14Days,
          "rank points in last 14 days",
        )
      : null,
    input.recentDecisiveGames >= 3
      ? createWinsLabel(input.recentWins, input.recentDecisiveGames)
      : null,
    input.gamesLast7Days >= 2
      ? createVolumeLabel(input.gamesLast7Days, "this week")
      : null,
    input.gamesLast14Days >= 2
      ? createVolumeLabel(input.gamesLast14Days, "in the last 2 weeks")
      : null,
    input.recentActivityCount > 0
      ? formatLastPlayedLabel({
          recentRankedGameAt: input.recentRankedGameAt,
          now: input.now,
        })
      : null,
  ].filter((value): value is string => Boolean(value));

  return {
    headlineStat,
    supportingStats: supportingCandidates
      .filter((value) => value !== headlineStat.label)
      .slice(0, 2),
  };
}

function getEligibleLeaderboardParticipants(input: {
  currentUser?: ActivityLeaderboardUser | null;
  friends: FriendConnectionsCollections["friends"];
}) {
  const participants = [
    ...(input.currentUser ? [input.currentUser] : []),
    ...input.friends,
  ].filter(
    (participant, index, collection) =>
      collection.findIndex((entry) => entry.id === participant.id) === index,
  );

  return participants.filter(
    (participant) =>
      participant.id === input.currentUser?.id ||
      !participant.playerRankLeaderboardDisabled,
  );
}

type FriendRankBaseRow = {
  user: ActivityLeaderboardUser;
  isCurrentUser: boolean;
  playerRankTotal: string;
  playerRankTotalMinor: number;
  playerRankWindowLabel: string | null;
  playerRankGamesCount: number;
  topThreeFinishes: number;
};

export function compareFriendRankRows(
  left: Pick<
    FriendRankBaseRow,
    | "playerRankGamesCount"
    | "playerRankTotalMinor"
    | "topThreeFinishes"
    | "user"
  >,
  right: Pick<
    FriendRankBaseRow,
    | "playerRankGamesCount"
    | "playerRankTotalMinor"
    | "topThreeFinishes"
    | "user"
  >,
) {
  if (right.playerRankTotalMinor !== left.playerRankTotalMinor) {
    return right.playerRankTotalMinor - left.playerRankTotalMinor;
  }

  if (right.topThreeFinishes !== left.topThreeFinishes) {
    return right.topThreeFinishes - left.topThreeFinishes;
  }

  if (right.playerRankGamesCount !== left.playerRankGamesCount) {
    return right.playerRankGamesCount - left.playerRankGamesCount;
  }

  return left.user.id.localeCompare(right.user.id);
}

export function buildFriendRankSummaries(input: {
  currentUser?: ActivityLeaderboardUser | null;
  friends: FriendConnectionsCollections["friends"];
  standings: PlayerRankStandingRow[];
}) {
  const eligibleParticipants = getEligibleLeaderboardParticipants(input);
  const standingsByUserId = new Map(
    input.standings.map((row) => [row.userId, row] as const),
  );

  return eligibleParticipants
    .map((participant) => {
      const standing = standingsByUserId.get(participant.id);

      return {
        user: participant,
        isCurrentUser: participant.id === input.currentUser?.id,
        playerRankTotal: standing?.playerRankTotal ?? "0",
        playerRankTotalMinor: standing?.playerRankTotalMinor ?? 0,
        playerRankWindowLabel: standing?.playerRankWindowLabel ?? null,
        playerRankGamesCount: standing?.playerRankGamesCount ?? 0,
        topThreeFinishes: standing?.topThreeFinishes ?? 0,
      } satisfies FriendRankBaseRow;
    })
    .sort(compareFriendRankRows)
    .map((row, index) => ({
      user: row.user,
      isCurrentUser: row.isCurrentUser,
      friendPosition: index + 1,
      playerRankTotal: row.playerRankTotal,
      playerRankTotalMinor: row.playerRankTotalMinor,
      playerRankWindowLabel: row.playerRankWindowLabel,
      playerRankGamesCount: row.playerRankGamesCount,
      topThreeFinishes: row.topThreeFinishes,
    }));
}

export function buildActivityLeaderboard(input: {
  currentUser?: ActivityLeaderboardUser | null;
  friends: FriendConnectionsCollections["friends"];
  friendActivity: Array<{
    id: string;
    createdAt: string | null;
    completedAt?: string | null;
    winners?: Array<{ userId: string }>;
    players: Array<{ userId: string }>;
  }>;
  playerRankDeltasByGameId?: Record<string, PlayerRankGameDelta[]>;
  standings: PlayerRankStandingRow[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const friendRankSummaries = buildFriendRankSummaries({
    currentUser: input.currentUser,
    friends: input.friends,
    standings: input.standings,
  });
  const activitySummaryByUserId = new Map<
    string,
    {
      count: number;
      recentRankedGameAt: string | null;
      gamesLast3Days: number;
      gamesLast7Days: number;
      gamesLast14Days: number;
      recentDecisiveGames: number;
      recentWins: number;
      rankDeltaLast7Days: number;
      rankDeltaLast14Days: number;
    }
  >();

  for (const row of friendRankSummaries) {
    activitySummaryByUserId.set(row.user.id, {
      count: 0,
      recentRankedGameAt: null,
      gamesLast3Days: 0,
      gamesLast7Days: 0,
      gamesLast14Days: 0,
      recentDecisiveGames: 0,
      recentWins: 0,
      rankDeltaLast7Days: 0,
      rankDeltaLast14Days: 0,
    });
  }

  for (const game of input.friendActivity) {
    const activityAt = game.completedAt ?? game.createdAt;
    const daysSinceGame = activityAt
      ? getDaysSince({ timestamp: activityAt, now })
      : null;

    for (const player of game.players) {
      const summary = activitySummaryByUserId.get(player.userId);

      if (!summary) {
        continue;
      }

      summary.count += 1;
      if (
        activityAt &&
        (!summary.recentRankedGameAt ||
          new Date(activityAt) > new Date(summary.recentRankedGameAt))
      ) {
        summary.recentRankedGameAt = activityAt;
      }

      if (daysSinceGame !== null && daysSinceGame <= 14) {
        summary.gamesLast14Days += 1;
      }
      if (daysSinceGame !== null && daysSinceGame <= 7) {
        summary.gamesLast7Days += 1;
      }
      if (daysSinceGame !== null && daysSinceGame <= 3) {
        summary.gamesLast3Days += 1;
      }

      const gameHasSingleWinner = (game.winners?.length ?? 0) === 1;
      if (gameHasSingleWinner && summary.recentDecisiveGames < 6) {
        summary.recentDecisiveGames += 1;
        if (game.winners?.some((winner) => winner.userId === player.userId)) {
          summary.recentWins += 1;
        }
      }

      const rankDelta = input.playerRankDeltasByGameId?.[game.id]?.find(
        (delta) => delta.userId === player.userId,
      );
      if (rankDelta && daysSinceGame !== null && daysSinceGame <= 14) {
        summary.rankDeltaLast14Days += rankDelta.deltaMinor;
        if (daysSinceGame <= 7) {
          summary.rankDeltaLast7Days += rankDelta.deltaMinor;
        }
      }
    }
  }

  return friendRankSummaries.map((summary) => {
    const activitySummary = activitySummaryByUserId.get(summary.user.id) ?? {
      count: 0,
      recentRankedGameAt: null,
      gamesLast3Days: 0,
      gamesLast7Days: 0,
      gamesLast14Days: 0,
      recentDecisiveGames: 0,
      recentWins: 0,
      rankDeltaLast7Days: 0,
      rankDeltaLast14Days: 0,
    };
    const recentStats = buildRecentStats({
      recentRankedGameAt: activitySummary.recentRankedGameAt,
      recentActivityCount: activitySummary.count,
      gamesLast3Days: activitySummary.gamesLast3Days,
      gamesLast7Days: activitySummary.gamesLast7Days,
      gamesLast14Days: activitySummary.gamesLast14Days,
      recentWins: activitySummary.recentWins,
      recentDecisiveGames: activitySummary.recentDecisiveGames,
      rankDeltaLast7Days: activitySummary.rankDeltaLast7Days,
      rankDeltaLast14Days: activitySummary.rankDeltaLast14Days,
      now,
    });

    return {
      ...summary,
      recentRankedGameAt: activitySummary.recentRankedGameAt,
      recentActivityCount: activitySummary.count,
      headlineStat: recentStats.headlineStat,
      supportingStats: recentStats.supportingStats,
    };
  });
}
