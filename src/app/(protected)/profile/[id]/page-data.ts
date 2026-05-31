import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { loadOptionalCurrentUser } from "@/lib/auth/auth-me";
import {
  db,
  gamePlayers,
  gameWinners,
  games,
  getAcceptedFriendshipsByUserId,
  getFriendshipByUsers,
  getUserById,
  invitations,
} from "@/lib/db/store";

function formatDisplayName(input: {
  firstName: string | null;
  lastName: string | null;
}) {
  return [input.firstName, input.lastName].filter(Boolean).join(" ").trim() || "Skybo Player";
}

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
  profile: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    color: string;
    createdAt: string | null;
    displayName: string;
  };
  bestFriend: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    color: string;
    displayName: string;
    gamesPlayedTogether: number;
    lastPlayedAt: string | null;
  } | null;
  viewerState: PublicProfileViewerState;
  stats: {
    friendCount: number;
    gamesPlayed: number;
    gamesWon: number;
    winRate: number | null;
    gamesHosted: number;
    titlesPlayed: number;
    favoriteTitle: string | null;
    favoriteTitleCount: number;
    lastPlayedAt: string | null;
  };
};

export async function getPublicProfilePageData(
  profileId: string,
): Promise<PublicProfilePageData | null> {
  const profileUser = await getUserById(profileId);

  if (!profileUser || profileUser.mergedIntoUserId || profileUser.isGuest) {
    return null;
  }

  const viewer = await loadOptionalCurrentUser();

  const [friendships, participations, wins, createdGames] = await Promise.all([
    getAcceptedFriendshipsByUserId(profileId),
    db.query.gamePlayers.findMany({
      where: eq(gamePlayers.userId, profileId),
      with: {
        game: {
          columns: {
            id: true,
            createdAt: true,
            completedAt: true,
            gameTitleId: true,
          },
          with: {
            gameTitle: {
              columns: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    }),
    db.query.gameWinners.findMany({
      where: eq(gameWinners.userId, profileId),
      with: {
        game: {
          columns: {
            id: true,
            createdAt: true,
            completedAt: true,
          },
        },
      },
    }),
    db.query.games.findMany({
      where: eq(games.creatorId, profileId),
      columns: {
        id: true,
      },
    }),
  ]);

  let viewerState: PublicProfileViewerState;

  if (!viewer) {
    viewerState = { kind: "signed_out" };
  } else if (viewer.id === profileUser.id) {
    viewerState = { kind: "self" };
  } else {
    const [friendship, outgoingInvitation, incomingInvitation] = await Promise.all([
      getFriendshipByUsers(viewer.id, profileUser.id),
      db.query.invitations.findFirst({
        where: and(
          eq(invitations.inviterUserId, viewer.id),
          eq(invitations.inviteeUserId, profileUser.id),
          eq(invitations.targetType, "user"),
          eq(invitations.status, "pending"),
        ),
      }),
      db.query.invitations.findFirst({
        where: and(
          eq(invitations.inviterUserId, profileUser.id),
          eq(invitations.inviteeUserId, viewer.id),
          eq(invitations.targetType, "user"),
          eq(invitations.status, "pending"),
        ),
      }),
    ]);

    if (friendship) {
      viewerState = { kind: "friends" };
    } else if (outgoingInvitation) {
      viewerState = {
        kind: "outgoing_invitation",
        invitationId: outgoingInvitation.id,
      };
    } else if (incomingInvitation) {
      viewerState = {
        kind: "incoming_invitation",
        invitationId: incomingInvitation.id,
      };
    } else {
      viewerState = { kind: "can_invite" };
    }
  }

  const completedParticipations = participations.filter(
    ({ game }) => Boolean(game?.completedAt),
  );
  const winsInCompletedGames = wins.filter(({ game }) => Boolean(game?.completedAt));
  const uniqueGameIds = new Set(participations.map(({ gameId }) => gameId));
  const gameIds = Array.from(uniqueGameIds);
  const titleCounts = new Map<string, { title: string; count: number }>();
  let lastPlayedAt: string | null = null;

  for (const participation of participations) {
    const playedAt = participation.game?.createdAt ?? null;
    if (playedAt && (!lastPlayedAt || playedAt > lastPlayedAt)) {
      lastPlayedAt = playedAt;
    }

    const title = participation.game?.gameTitle?.title;
    const titleId = participation.game?.gameTitle?.id;

    if (!title || !titleId) {
      continue;
    }

    const existing = titleCounts.get(titleId);
    titleCounts.set(titleId, {
      title,
      count: (existing?.count ?? 0) + 1,
    });
  }

  const favoriteTitle = Array.from(titleCounts.values()).sort((entryA, entryB) => {
    if (entryB.count !== entryA.count) {
      return entryB.count - entryA.count;
    }

    return entryA.title.localeCompare(entryB.title);
  })[0] ?? null;

  let bestFriend: PublicProfilePageData["bestFriend"] = null;

  if (gameIds.length > 0) {
    const sharedPlayers = await db.query.gamePlayers.findMany({
      where: inArray(gamePlayers.gameId, gameIds),
      with: {
        game: {
          columns: {
            createdAt: true,
          },
        },
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            color: true,
            isGuest: true,
            mergedIntoUserId: true,
          },
        },
      },
    });

    const sharedCounts = new Map<
      string,
      {
        user: {
          id: string;
          firstName: string | null;
          lastName: string | null;
          color: string;
        };
        gameIds: Set<string>;
        lastPlayedAt: string | null;
      }
    >();

    for (const participant of sharedPlayers) {
      const candidate = participant.user;

      if (
        !candidate ||
        candidate.id === profileId ||
        candidate.isGuest ||
        candidate.mergedIntoUserId
      ) {
        continue;
      }

      const existing = sharedCounts.get(candidate.id);
      const candidatePlayedAt = participant.game?.createdAt ?? null;

      if (!existing) {
        sharedCounts.set(candidate.id, {
          user: {
            id: candidate.id,
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            color: candidate.color,
          },
          gameIds: new Set([participant.gameId]),
          lastPlayedAt: candidatePlayedAt,
        });
        continue;
      }

      existing.gameIds.add(participant.gameId);

      if (
        candidatePlayedAt &&
        (!existing.lastPlayedAt || candidatePlayedAt > existing.lastPlayedAt)
      ) {
        existing.lastPlayedAt = candidatePlayedAt;
      }
    }

    const topSharedPlayer = Array.from(sharedCounts.values())
      .map((entry) => ({
        ...entry,
        gamesPlayedTogether: entry.gameIds.size,
        displayName: formatDisplayName(entry.user),
      }))
      .sort((entryA, entryB) => {
        if (entryB.gamesPlayedTogether !== entryA.gamesPlayedTogether) {
          return entryB.gamesPlayedTogether - entryA.gamesPlayedTogether;
        }

        if (entryA.lastPlayedAt && entryB.lastPlayedAt) {
          return entryB.lastPlayedAt.localeCompare(entryA.lastPlayedAt);
        }

        if (entryA.lastPlayedAt) {
          return -1;
        }

        if (entryB.lastPlayedAt) {
          return 1;
        }

        return entryA.displayName.localeCompare(entryB.displayName);
      })[0];

    if (topSharedPlayer) {
      bestFriend = {
        ...topSharedPlayer.user,
        displayName: topSharedPlayer.displayName,
        gamesPlayedTogether: topSharedPlayer.gamesPlayedTogether,
        lastPlayedAt: topSharedPlayer.lastPlayedAt,
      };
    }
  }

  const gamesPlayed = uniqueGameIds.size;
  const completedGames = new Set(completedParticipations.map(({ gameId }) => gameId)).size;
  const gamesWon = new Set(winsInCompletedGames.map(({ gameId }) => gameId)).size;
  const winRate = completedGames > 0 ? Math.round((gamesWon / completedGames) * 100) : null;

  return {
    profile: {
      id: profileUser.id,
      firstName: profileUser.firstName,
      lastName: profileUser.lastName,
      color: profileUser.color,
      createdAt: profileUser.createdAt,
      displayName: formatDisplayName(profileUser),
    },
    bestFriend,
    viewerState,
    stats: {
      friendCount: friendships.length,
      gamesPlayed,
      gamesWon,
      winRate,
      gamesHosted: createdGames.length,
      titlesPlayed: titleCounts.size,
      favoriteTitle: favoriteTitle?.title ?? null,
      favoriteTitleCount: favoriteTitle?.count ?? 0,
      lastPlayedAt,
    },
  };
}
