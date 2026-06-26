import { and, eq, or } from "drizzle-orm";
import { db, friendships } from "../index";

export type FriendshipBase = typeof friendships.$inferSelect;
export type FriendshipInsert = typeof friendships.$inferInsert;
export type FriendshipWithUser1 = FriendshipBase & {
  user1: typeof db._.fullSchema.users.$inferSelect;
};
export type FriendshipWithUser2 = FriendshipBase & {
  user2: typeof db._.fullSchema.users.$inferSelect;
};
export type FriendshipWithInviter = FriendshipBase & {
  inviter: typeof db._.fullSchema.users.$inferSelect;
};
export type FriendshipFull = FriendshipBase & {
  user1: typeof db._.fullSchema.users.$inferSelect;
  user2: typeof db._.fullSchema.users.$inferSelect;
  inviter: typeof db._.fullSchema.users.$inferSelect;
};
export type FriendshipWithUsers = FriendshipBase & {
  user1: typeof db._.fullSchema.users.$inferSelect;
  user2: typeof db._.fullSchema.users.$inferSelect;
};

function orderUserIds(userAId: string, userBId: string) {
  return userAId < userBId ? [userAId, userBId] : [userBId, userAId];
}

export function getCanonicalFriendshipUserIds(
  userAId: string,
  userBId: string,
) {
  return orderUserIds(userAId, userBId);
}

export async function createFriendship(
  input: FriendshipInsert,
): Promise<FriendshipBase> {
  const [user1Id, user2Id] = orderUserIds(input.user1Id, input.user2Id);
  const [friendship] = await db
    .insert(friendships)
    .values({
      ...input,
      user1Id,
      user2Id,
    })
    .returning();

  return friendship;
}

export async function getFriendshipByUsers(
  userAId: string,
  userBId: string,
): Promise<FriendshipBase | null> {
  const [user1Id, user2Id] = orderUserIds(userAId, userBId);
  const friendship = await db.query.friendships.findFirst({
    where: and(
      eq(friendships.user1Id, user1Id),
      eq(friendships.user2Id, user2Id),
    ),
  });

  return friendship ?? null;
}

export async function getFriendshipFullByUsers(
  userAId: string,
  userBId: string,
): Promise<FriendshipFull | null> {
  const [user1Id, user2Id] = orderUserIds(userAId, userBId);
  const friendship = await db.query.friendships.findFirst({
    where: and(
      eq(friendships.user1Id, user1Id),
      eq(friendships.user2Id, user2Id),
    ),
    with: {
      user1: true,
      user2: true,
      inviter: true,
    },
  });

  return friendship ?? null;
}

export async function listFriendships(): Promise<FriendshipBase[]> {
  return db.query.friendships.findMany();
}

export async function getFriendshipsByUserId(
  userId: string,
): Promise<FriendshipBase[]> {
  return db.query.friendships.findMany({
    where: or(eq(friendships.user1Id, userId), eq(friendships.user2Id, userId)),
  });
}

export async function getAcceptedFriendshipsByUserId(
  userId: string,
): Promise<FriendshipWithUsers[]> {
  return db.query.friendships.findMany({
    where: or(eq(friendships.user1Id, userId), eq(friendships.user2Id, userId)),
    with: {
      user1: true,
      user2: true,
    },
  });
}

export async function listAcceptedFriendsForUser(
  userId: string,
): Promise<Array<typeof db._.fullSchema.users.$inferSelect>> {
  const friendshipsForUser = await getAcceptedFriendshipsByUserId(userId);

  return friendshipsForUser.map((friendship) =>
    friendship.user1Id === userId ? friendship.user2 : friendship.user1,
  );
}

export async function deleteFriendship(
  userAId: string,
  userBId: string,
): Promise<FriendshipBase | null> {
  const [user1Id, user2Id] = orderUserIds(userAId, userBId);
  const [friendship] = await db
    .delete(friendships)
    .where(
      and(eq(friendships.user1Id, user1Id), eq(friendships.user2Id, user2Id)),
    )
    .returning();

  return friendship ?? null;
}

export async function ensureFriendshipExists(input: {
  userAId: string;
  userBId: string;
  inviterId: string;
}) {
  if (input.userAId === input.userBId) {
    return null;
  }

  const existing = await getFriendshipByUsers(input.userAId, input.userBId);

  if (existing) {
    return existing;
  }

  return createFriendship({
    user1Id: input.userAId,
    user2Id: input.userBId,
    inviterId: input.inviterId,
  });
}
