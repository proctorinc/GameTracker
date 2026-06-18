type RecentlyPlayedSortableUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
};

type RecentlyPlayedRow<TUser extends RecentlyPlayedSortableUser> = {
  user: TUser;
  lastPlayedAt: string | null;
};

type PendingInvitationLike = {
  guestUserId: string | null;
  inviteeUserId: string | null;
};

export function buildRecentlyPlayedWithList<
  TUser extends RecentlyPlayedSortableUser,
  TInvitation extends PendingInvitationLike,
>(input: {
  createdGuests: TUser[];
  recentlyPlayedWithRows: Array<RecentlyPlayedRow<TUser>>;
  outgoingInvitations?: TInvitation[];
}): Array<{
  user: TUser;
  lastPlayedAt: string | null;
  pendingInvitation: TInvitation | null;
}> {
  const recentlyPlayedWithByUserId = new Map<
    string,
    {
      user: TUser;
      lastPlayedAt: string | null;
      pendingInvitation: TInvitation | null;
    }
  >();

  for (const guest of input.createdGuests) {
    recentlyPlayedWithByUserId.set(guest.id, {
      user: guest,
      lastPlayedAt: null,
      pendingInvitation: findPendingInvitation(input.outgoingInvitations, guest.id),
    });
  }

  for (const entry of input.recentlyPlayedWithRows) {
    const existing = recentlyPlayedWithByUserId.get(entry.user.id);
    const pendingInvitation = findPendingInvitation(
      input.outgoingInvitations,
      entry.user.id,
    );

    if (!existing) {
      recentlyPlayedWithByUserId.set(entry.user.id, {
        user: entry.user,
        lastPlayedAt: entry.lastPlayedAt,
        pendingInvitation,
      });
      continue;
    }

    if (
      entry.lastPlayedAt &&
      (!existing.lastPlayedAt || entry.lastPlayedAt > existing.lastPlayedAt)
    ) {
      recentlyPlayedWithByUserId.set(entry.user.id, {
        user: existing.user,
        lastPlayedAt: entry.lastPlayedAt,
        pendingInvitation: existing.pendingInvitation ?? pendingInvitation,
      });
    }
  }

  return Array.from(recentlyPlayedWithByUserId.values()).sort((entryA, entryB) => {
    if (entryA.lastPlayedAt && entryB.lastPlayedAt) {
      return entryB.lastPlayedAt.localeCompare(entryA.lastPlayedAt);
    }

    if (entryA.lastPlayedAt) {
      return -1;
    }

    if (entryB.lastPlayedAt) {
      return 1;
    }

    return getDisplayNameForSort(entryA.user).localeCompare(
      getDisplayNameForSort(entryB.user),
    );
  });
}

function findPendingInvitation<TInvitation extends PendingInvitationLike>(
  outgoingInvitations: TInvitation[] | undefined,
  userId: string,
) {
  return (
    outgoingInvitations?.find(
      (invitation) =>
        invitation.guestUserId === userId || invitation.inviteeUserId === userId,
    ) ?? null
  );
}

function getDisplayNameForSort(user: RecentlyPlayedSortableUser) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ");
}
