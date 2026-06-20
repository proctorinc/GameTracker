import "server-only";

import {
  listAdminFriendshipPairs,
  listAdminInvitations,
  listAdminManageableUsers,
} from "@/lib/db/store";

export async function getAdminUsersPageData() {
  const [users, invitations, friendships] = await Promise.all([
    listAdminManageableUsers(),
    listAdminInvitations(),
    listAdminFriendshipPairs(),
  ]);

  return {
    users,
    invitations,
    friendships,
  };
}
