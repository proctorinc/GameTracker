import { loadCurrentUser } from "@/lib/auth/auth-me";
import {
  InvitationFull,
  listAcceptedFriendsForUser,
  listGuestsCreatedByUser,
  listIncomingInvitationsForUser,
  listOutgoingInvitationsForUser,
  listRecentlyPlayedWithForUser,
} from "@/lib/db/store";
import { logError, logInfo } from "@/lib/server-log";
import { getServerRequestContext } from "@/lib/server-request-context";

export type FriendsPageData = {
  user: Awaited<ReturnType<typeof loadCurrentUser>>;
  friends: Awaited<ReturnType<typeof listAcceptedFriendsForUser>>;
  incomingInvitations: InvitationFull[];
  outgoingInvitations: InvitationFull[];
  recentlyPlayedWith: Array<{
    user: Awaited<ReturnType<typeof listRecentlyPlayedWithForUser>>[number]["user"];
    lastPlayedAt: string | null;
    pendingInvitation: InvitationFull | null;
  }>;
};

export async function getFriendsPageData(): Promise<FriendsPageData> {
  const requestContext = await getServerRequestContext();

  try {
    const user = await loadCurrentUser();
    const [friends, incomingInvitations, outgoingInvitations, createdGuests] =
      await Promise.all([
        listAcceptedFriendsForUser(user.id),
        listIncomingInvitationsForUser({
          userId: user.id,
          phoneNumber: user.phoneNumber,
        }),
        listOutgoingInvitationsForUser(user.id),
        listGuestsCreatedByUser(user.id),
      ]);

    const recentlyPlayedWithRows = await listRecentlyPlayedWithForUser({
      userId: user.id,
      friendUserIds: friends.map((friend) => friend.id),
    });

    const recentlyPlayedWithByUserId = new Map<
      string,
      {
        user: (typeof recentlyPlayedWithRows)[number]["user"];
        lastPlayedAt: string | null;
        pendingInvitation: InvitationFull | null;
      }
    >();

    for (const guest of createdGuests) {
      recentlyPlayedWithByUserId.set(guest.id, {
        user: guest,
        lastPlayedAt: null,
        pendingInvitation:
          outgoingInvitations.find(
            (invitation) =>
              invitation.guestUserId === guest.id ||
              invitation.inviteeUserId === guest.id,
          ) ?? null,
      });
    }

    for (const entry of recentlyPlayedWithRows) {
      const existing = recentlyPlayedWithByUserId.get(entry.user.id);
      const pendingInvitation =
        outgoingInvitations.find(
          (invitation) =>
            invitation.inviteeUserId === entry.user.id ||
            invitation.guestUserId === entry.user.id,
        ) ?? null;

      if (!existing) {
        recentlyPlayedWithByUserId.set(entry.user.id, {
          user: entry.user,
          lastPlayedAt: entry.lastPlayedAt,
          pendingInvitation,
        });
        continue;
      }

      if (entry.lastPlayedAt && (!existing.lastPlayedAt || entry.lastPlayedAt > existing.lastPlayedAt)) {
        recentlyPlayedWithByUserId.set(entry.user.id, {
          user: existing.user,
          lastPlayedAt: entry.lastPlayedAt,
          pendingInvitation: existing.pendingInvitation ?? pendingInvitation,
        });
      }
    }

    const recentlyPlayedWith = Array.from(recentlyPlayedWithByUserId.values()).sort(
      (entryA, entryB) => {
        if (entryA.lastPlayedAt && entryB.lastPlayedAt) {
          return entryB.lastPlayedAt.localeCompare(entryA.lastPlayedAt);
        }

        if (entryA.lastPlayedAt) {
          return -1;
        }

        if (entryB.lastPlayedAt) {
          return 1;
        }

        const nameA = [entryA.user.firstName, entryA.user.lastName]
          .filter(Boolean)
          .join(" ");
        const nameB = [entryB.user.firstName, entryB.user.lastName]
          .filter(Boolean)
          .join(" ");
        return nameA.localeCompare(nameB);
      },
    );

    logInfo("friends.page_data.read.succeeded", {
      ...requestContext,
      userId: user.id,
      friendCount: friends.length,
      incomingInvitationCount: incomingInvitations.length,
      outgoingInvitationCount: outgoingInvitations.length,
      recentEntryCount: recentlyPlayedWith.length,
      createdGuestCount: createdGuests.length,
    });

    return {
      user,
      friends,
      incomingInvitations,
      outgoingInvitations,
      recentlyPlayedWith,
    };
  } catch (error) {
    logError("friends.page_data.read.failed", error, {
      ...requestContext,
    });
    throw error;
  }
}
