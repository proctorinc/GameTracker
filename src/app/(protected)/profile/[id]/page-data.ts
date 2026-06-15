import "server-only";

import { unstable_cache } from "next/cache";
import { and, eq } from "drizzle-orm";
import { loadOptionalCurrentUser } from "@/lib/auth/auth-me";
import { getPublicProfileTag } from "@/lib/cache-tags";
import {
  db,
  getAcceptedFriendshipsByUserId,
  getFriendshipByUsers,
  getUserById,
  invitations,
  listGuestsCreatedByUser,
} from "@/lib/db/store";
import {
  buildComparisonOptions,
  buildProfileStats,
  formatProfileDisplayName,
} from "@/lib/profile-stats";
import type { ProfileStatsPageData, PublicProfileSummaryData } from "../profile-types";

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

  return {
    ...profileData,
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
              },
              with: {
                gameTitle: {
                  columns: {
                    id: true,
                    title: true,
                    imageUrl: true,
                  },
                },
                players: {
                  columns: {
                    userId: true,
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
      const comparisonOptions = buildComparisonOptions({
        profileUserId: input.profileId,
        friends: friendships.map((friendship) =>
          friendship.user1Id === input.profileId ? friendship.user2 : friendship.user1,
        ),
        guests,
        includeGuests: input.includeGuests,
      });

      const builtStats = buildProfileStats({
        profileUserId: input.profileId,
        friendCount: friendships.length,
        comparisonOptions,
        completedGames: completedParticipations.flatMap((participation) => {
          const game = participation.game;
          if (!game?.completedAt) {
            return [];
          }

          return [
            {
              id: game.id,
              createdAt: game.createdAt,
              completedAt: game.completedAt,
              title: game.gameTitle
                ? {
                    id: game.gameTitle.id,
                    title: game.gameTitle.title,
                    imageUrl: game.gameTitle.imageUrl,
                  }
                : null,
              participantUserIds: game.players.map((player) => player.userId),
              winnerUserIds: game.winners.map((winner) => winner.userId),
            },
          ];
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
    },
  )();
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
