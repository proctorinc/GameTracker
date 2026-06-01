import { loadCurrentUser } from "@/lib/auth/auth-me";
import {
  InvitationFull,
  listAcceptedFriendsForUser,
  listGuestsCreatedByUser,
  listIncomingInvitationsForUser,
  listOutgoingInvitationsForUser,
  listRecentlyPlayedWithForUser,
} from "@/lib/db/store";

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

export type FriendsPageCollections = Omit<FriendsPageData, "user">;

export async function getFriendsPageCollections(input: {
  userId: string;
  phoneNumber: string | null;
}): Promise<FriendsPageCollections> {
  const [friends, incomingInvitations, outgoingInvitations, createdGuests] =
    await Promise.all([
      listAcceptedFriendsForUser(input.userId),
      listIncomingInvitationsForUser({
        userId: input.userId,
        phoneNumber: input.phoneNumber,
      }),
      listOutgoingInvitationsForUser(input.userId),
      listGuestsCreatedByUser(input.userId),
    ]);

  const recentlyPlayedWithRows = await listRecentlyPlayedWithForUser({
    userId: input.userId,
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

  return {
    friends,
    incomingInvitations,
    outgoingInvitations,
    recentlyPlayedWith,
  };
}
