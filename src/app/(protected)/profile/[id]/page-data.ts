import "server-only";

import { unstable_cache } from "next/cache";
import { and, eq } from "drizzle-orm";
import { loadOptionalCurrentUser } from "@/lib/auth/auth-me";
import { getPublicProfileTag } from "@/lib/cache-tags";
import { buildRecentlyPlayedWithList } from "@/lib/recently-played-with";
import {
  db,
  getAcceptedFriendshipsByUserId,
  getFriendshipByUsers,
  getUserById,
  invitations,
  listRecentlyPlayedWithForUser,
  listGuestsCreatedByUser,
} from "@/lib/db/store";
import {
  getActivePlayerRankConfig,
  getPlayerRankRecentChangeSummary,
  getUserPlayerRankSummary,
  listPlayerRankGameDeltasByGameIds,
} from "@/lib/db/store/player-rank.store";
import { formatPlayerRankTotal } from "@/lib/player-rank";
import {
  buildComparisonOptions,
  buildProfileStats,
  formatProfileDisplayName,
  type ProfileStatsCompletedGame,
} from "@/lib/profile-stats";
import type { ProfileStatsPageData, PublicProfileSummaryData } from "../profile-types";

const PUBLIC_PROFILE_REVALIDATE_SECONDS = 15;

export type PublicProfileViewerState =
  | {
      kind:
        | "signed_out"
        | "self"
        | "friends"
        | "outgoing_invitation"
        | "incoming_invitation"
        | "can_invite";
      invitationId?: string;
    };

export type PublicProfilePageData = {
  profile: PublicProfileSummaryData["profile"];
  canViewPlayerRank: boolean;
  playerRankTotal: string | null;
  playerRankPosition: number | null;
  playerRankWindowLabel: string | null;
  playerRankGamesCount: number | null;
  topThreeFinishes: number | null;
  playerRankRecentChangeSummary: PublicProfileSummaryData["playerRankRecentChangeSummary"];
  twoPlayerPrizePool: string | null;
  threePlayerPrizePool: string | null;
  sixPlusPlayerPrizePool: string | null;
  defaultBestFriend: PublicProfileSummaryData["defaultBestFriend"];
  viewerState: PublicProfileViewerState;
  stats: PublicProfileSummaryData["stats"];
  comparisonOptions: ProfileStatsPageData["comparisonOptions"];
  comparisonSummariesByUserId: ProfileStatsPageData["comparisonSummariesByUserId"];
  defaultComparisonUserId: ProfileStatsPageData["defaultComparisonUserId"];
};

export async function getPublicProfilePageData(
  profileId: string,
): Promise<PublicProfilePageData | null> {
  const profileData = await getPublicProfileStatsPageData(profileId);

  if (!profileData) {
    return null;
  }

  const viewer = await loadOptionalCurrentUser();
  const viewerState = await getPublicProfileViewerState(profileId, viewer?.id ?? null);
  const [playerRankSummary, playerRankConfig, playerRankRecentChangeSummary] =
    await Promise.all([
      getUserPlayerRankSummary(profileId),
      getActivePlayerRankConfig(),
      getPlayerRankRecentChangeSummary(profileId),
    ]);

  return {
    ...profileData,
    canViewPlayerRank: Boolean(playerRankConfig),
    playerRankTotal: playerRankSummary?.playerRankTotal ?? null,
    playerRankPosition: playerRankSummary?.playerRankPosition ?? null,
    playerRankWindowLabel: playerRankSummary?.playerRankWindowLabel ?? null,
    playerRankGamesCount: playerRankSummary?.playerRankGamesCount ?? null,
    topThreeFinishes: playerRankSummary?.topThreeFinishes ?? null,
    playerRankRecentChangeSummary: playerRankConfig
      ? playerRankRecentChangeSummary
      : null,
    twoPlayerPrizePool: playerRankConfig
      ? formatPlayerRankTotal(playerRankConfig.prizePoolByPlayerCount[2] ?? 0)
      : null,
    threePlayerPrizePool: playerRankConfig
      ? formatPlayerRankTotal(playerRankConfig.prizePoolByPlayerCount[3] ?? 0)
      : null,
    sixPlusPlayerPrizePool: playerRankConfig
      ? formatPlayerRankTotal(
          playerRankConfig.prizePoolByPlayerCount[6] ??
            playerRankConfig.defaultMaxPrizePool,
        )
      : null,
    viewerState,
  };
}

export async function getPublicProfileSummaryData(
  profileId: string,
): Promise<PublicProfileSummaryData | null> {
  const data = await getProfileStatsPageData({
    profileId,
    includeGuests: false,
    cacheKey: "public",
  });

  if (!data) {
    return null;
  }

  return {
    profile: data.profile,
    canViewPlayerRank: false,
    playerRankTotal: null,
    playerRankPosition: null,
    playerRankWindowLabel: null,
    playerRankGamesCount: null,
    topThreeFinishes: null,
    playerRankRecentChangeSummary: null,
    twoPlayerPrizePool: null,
    threePlayerPrizePool: null,
    sixPlusPlayerPrizePool: null,
    defaultBestFriend: data.defaultBestFriend,
    stats: data.stats,
  };
}

export async function getPublicProfileStatsPageData(
  profileId: string,
): Promise<ProfileStatsPageData | null> {
  return getProfileStatsPageData({
    profileId,
    includeGuests: false,
    cacheKey: "public",
  });
}

export async function getOwnProfileStatsPageData(
  profileId: string,
): Promise<ProfileStatsPageData | null> {
  return getProfileStatsPageData({
    profileId,
    includeGuests: true,
    cacheKey: "own",
  });
}

async function getProfileStatsPageData(input: {
  profileId: string;
  includeGuests: boolean;
  cacheKey: "public" | "own";
}): Promise<ProfileStatsPageData | null> {
  return unstable_cache(
    async () => {
      const profileUser = await getUserById(input.profileId);

      if (!profileUser || profileUser.mergedIntoUserId || profileUser.isGuest) {
        return null;
      }

      const [friendships, guests, completedParticipations] = await Promise.all([
        getAcceptedFriendshipsByUserId(input.profileId),
        input.includeGuests ? listGuestsCreatedByUser(input.profileId) : Promise.resolve([]),
        db.query.gamePlayers.findMany({
          where: (gamePlayers, { eq }) => eq(gamePlayers.userId, input.profileId),
          with: {
            game: {
              columns: {
                id: true,
                createdAt: true,
                completedAt: true,
                scoringMode: true,
              },
              with: {
                gameTitle: {
                  columns: {
                    id: true,
                    title: true,
                    color: true,
                    imageUrl: true,
                  },
                },
                players: {
                  columns: {
                    userId: true,
                    score: true,
                  },
                },
                winners: {
                  columns: {
                    userId: true,
                  },
                },
              },
            },
          },
        }),
      ]);
      const recentlyPlayedWith = buildRecentlyPlayedWithList({
        createdGuests: input.includeGuests ? guests : [],
        recentlyPlayedWithRows: await listRecentlyPlayedWithForUser({
          userId: input.profileId,
          friendUserIds: friendships.map((friendship) =>
            friendship.user1Id === input.profileId
              ? friendship.user2Id
              : friendship.user1Id,
          ),
        }),
      }).map((entry) => entry.user);
      const comparisonOptions = buildComparisonOptions({
        profileUserId: input.profileId,
        friends: friendships.map((friendship) =>
          friendship.user1Id === input.profileId ? friendship.user2 : friendship.user1,
        ),
        guests,
        recentlyPlayedWith,
        includeGuests: input.includeGuests,
      });

      const comparisonCompletedParticipations =
        comparisonOptions.length > 0
          ? await db.query.gamePlayers.findMany({
              where: (gamePlayers, { inArray }) =>
                inArray(
                  gamePlayers.userId,
                  comparisonOptions.map((option) => option.id),
                ),
              with: {
                game: {
                  columns: {
                    id: true,
                    createdAt: true,
                    completedAt: true,
                    scoringMode: true,
                  },
                  with: {
                    gameTitle: {
                      columns: {
                        id: true,
                        title: true,
                        color: true,
                        imageUrl: true,
                      },
                    },
                    players: {
                      columns: {
                        userId: true,
                        score: true,
                      },
                    },
                    winners: {
                      columns: {
                        userId: true,
                      },
                    },
                  },
                },
              },
            })
          : [];
      const allRelevantUserIds = Array.from(
        new Set([input.profileId, ...comparisonOptions.map((option) => option.id)]),
      );
      const allCompletedGames = [
        ...completedParticipations.flatMap((participation) => {
          const game = mapParticipationToCompletedGame(participation);
          return game ? [game] : [];
        }),
        ...comparisonCompletedParticipations.flatMap((participation) => {
          const game = mapParticipationToCompletedGame(participation);
          return game ? [game] : [];
        }),
      ];
      const uniqueCompletedGames = Array.from(
        new Map(allCompletedGames.map((game) => [game.id, game])).values(),
      );
      const [playerRankConfig, playerRankDeltasByGameId, currentGlobalRankSummaryByUserId] =
        await Promise.all([
          getActivePlayerRankConfig(),
          listPlayerRankGameDeltasByGameIds(uniqueCompletedGames.map((game) => game.id)),
          Promise.all(
            allRelevantUserIds.map(async (userId) => [
              userId,
              await getUserPlayerRankSummary(userId),
            ] as const),
          ).then((entries) => Object.fromEntries(entries)),
        ]);
      const rankWindowStart = playerRankConfig
        ? new Date(
            new Date().setMonth(new Date().getMonth() - playerRankConfig.windowMonths),
          ).toISOString()
        : null;
      const rankWindowLabel = playerRankConfig
        ? `${playerRankConfig.windowMonths}-month rank gain`
        : "Window rank gain";
      const rankDeltaMinorByGameIdByUserId = Object.fromEntries(
        allRelevantUserIds.map((userId) => [
          userId,
          Object.fromEntries(
            uniqueCompletedGames.map((game) => [
              game.id,
              playerRankDeltasByGameId[game.id]?.find((delta) => delta.userId === userId)
                ?.deltaMinor ?? 0,
            ]),
          ),
        ]),
      ) as Record<string, Record<string, number>>;
      const comparisonCompletedGamesByUserId = comparisonCompletedParticipations.reduce<
        Record<string, ProfileStatsCompletedGame[]>
      >((accumulator, participation) => {
        const game = mapParticipationToCompletedGame(participation);

        if (!game) {
          return accumulator;
        }

        accumulator[participation.userId] ??= [];
        accumulator[participation.userId].push(game);
        return accumulator;
      }, {});

      const builtStats = buildProfileStats({
        profileUserId: input.profileId,
        friendCount: friendships.length,
        comparisonOptions,
        comparisonCompletedGamesByUserId,
        rankDeltaMinorByGameIdByUserId,
        rankWindowStart,
        rankWindowLabel,
        currentGlobalRankSummaryByUserId: Object.fromEntries(
          Object.entries(currentGlobalRankSummaryByUserId).map(([userId, summary]) => [
            userId,
            {
              playerRankTotal: summary?.playerRankTotal ?? null,
              playerRankPosition: summary?.playerRankPosition ?? null,
            },
          ]),
        ),
        completedGames: completedParticipations.flatMap((participation) => {
          const game = mapParticipationToCompletedGame(participation);
          return game ? [game] : [];
        }),
      });

      return {
        profile: {
          id: profileUser.id,
          firstName: profileUser.firstName,
          lastName: profileUser.lastName,
          color: profileUser.color,
          createdAt: profileUser.createdAt,
          displayName: formatProfileDisplayName(profileUser),
        },
        canViewPlayerRank: false,
        playerRankTotal: null,
        playerRankPosition: null,
        playerRankWindowLabel: null,
        playerRankGamesCount: null,
        topThreeFinishes: null,
        playerRankRecentChangeSummary: null,
        twoPlayerPrizePool: null,
        threePlayerPrizePool: null,
        sixPlusPlayerPrizePool: null,
        defaultBestFriend: builtStats.defaultBestFriend,
        comparisonOptions: builtStats.comparisonOptions,
        comparisonSummariesByUserId: builtStats.comparisonSummariesByUserId,
        defaultComparisonUserId: builtStats.defaultComparisonUserId,
        stats: builtStats.stats,
      };
    },
    [`${input.profileId}:${input.cacheKey}`],
    {
      tags: [getPublicProfileTag(input.profileId)],
      revalidate: PUBLIC_PROFILE_REVALIDATE_SECONDS,
    },
  )();
}

function mapParticipationToCompletedGame(participation: {
    game: {
      id: string;
      createdAt: string;
      completedAt: string | null;
      scoringMode: "lowest_wins" | "highest_wins" | "no_score";
      gameTitle: {
        id: string;
        title: string;
        color: string;
        imageUrl: string;
      } | null;
    players: Array<{ userId: string; score: number | null }>;
    winners: Array<{ userId: string }>;
  } | null;
}): ProfileStatsCompletedGame | null {
  const game = participation.game;

  if (!game?.completedAt) {
    return null;
  }

  return {
    id: game.id,
    createdAt: game.createdAt,
    completedAt: game.completedAt,
    title: game.gameTitle
      ? {
          id: game.gameTitle.id,
          title: game.gameTitle.title,
          color: game.gameTitle.color,
          imageUrl: game.gameTitle.imageUrl,
        }
      : null,
    scoringMode: game.scoringMode,
    participants: game.players.map((player) => ({
      userId: player.userId,
      score: player.score,
    })),
    participantUserIds: game.players.map((player) => player.userId),
    winnerUserIds: game.winners.map((winner) => winner.userId),
  };
}

async function getPublicProfileViewerState(
  profileId: string,
  viewerId: string | null,
): Promise<PublicProfileViewerState> {
  if (!viewerId) {
    return { kind: "signed_out" };
  }

  if (viewerId === profileId) {
    return { kind: "self" };
  }

  const [friendship, outgoingInvitation, incomingInvitation] = await Promise.all([
    getFriendshipByUsers(viewerId, profileId),
    db.query.invitations.findFirst({
      where: and(
        eq(invitations.inviterUserId, viewerId),
        eq(invitations.inviteeUserId, profileId),
        eq(invitations.targetType, "user"),
        eq(invitations.status, "pending"),
      ),
    }),
    db.query.invitations.findFirst({
      where: and(
        eq(invitations.inviterUserId, profileId),
        eq(invitations.inviteeUserId, viewerId),
        eq(invitations.targetType, "user"),
        eq(invitations.status, "pending"),
      ),
    }),
  ]);

  if (friendship) {
    return { kind: "friends" };
  }

  if (outgoingInvitation) {
    return {
      kind: "outgoing_invitation",
      invitationId: outgoingInvitation.id,
    };
  }

  if (incomingInvitation) {
    return {
      kind: "incoming_invitation",
      invitationId: incomingInvitation.id,
    };
  }

  return { kind: "can_invite" };
}
