import { loadCurrentUser } from "@/lib/auth/auth-me";
import { buildRecentlyPlayedWithList } from "@/lib/recently-played-with";
import {
  InvitationFull,
  listFriendActivityGames,
  listAcceptedFriendsForUser,
  listGuestsCreatedByUser,
  listIncomingInvitationsForUser,
  listOutgoingInvitationsForUser,
  listRecentlyPlayedWithForUser,
} from "@/lib/db/store";

export type FriendConnectionsUser = Pick<
  Awaited<ReturnType<typeof loadCurrentUser>>,
  "id" | "firstName" | "lastName" | "phoneNumber" | "color" | "createdAt" | "role"
>;

export type FriendConnectionsCollections = {
  friends: Awaited<ReturnType<typeof listAcceptedFriendsForUser>>;
  incomingInvitations: InvitationFull[];
  outgoingInvitations: InvitationFull[];
  recentlyPlayedWith: Array<{
    user: Awaited<ReturnType<typeof listRecentlyPlayedWithForUser>>[number]["user"];
    lastPlayedAt: string | null;
    pendingInvitation: InvitationFull | null;
  }>;
};

export type FriendConnectionsData = FriendConnectionsCollections & {
  user: FriendConnectionsUser;
};

export type FriendsPageData = FriendConnectionsData & {
  friendActivity: Awaited<ReturnType<typeof listFriendActivityGames>>;
};

export type FriendsPageCollections = Omit<FriendsPageData, "user">;

export async function getFriendsPageCollections(input: {
  userId: string;
  phoneNumber: string | null;
}): Promise<FriendsPageCollections> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
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
  const friendActivity = await listFriendActivityGames({
    friendUserIds: friends.map((friend) => friend.id),
    since,
  });
  const recentlyPlayedWith = buildRecentlyPlayedWithList({
    createdGuests,
    recentlyPlayedWithRows,
    outgoingInvitations,
  });

  return {
    friends,
    incomingInvitations,
    outgoingInvitations,
    recentlyPlayedWith,
    friendActivity,
  };
}
