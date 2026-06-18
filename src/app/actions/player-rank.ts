"use server";

import {
  backfillMissingPlayerRankResults,
  publishPlayerRankConfig,
  previewPlayerRankStandings,
  type PublishPlayerRankConfigInput,
} from "@/lib/db/store/player-rank.store";
import {
  revalidatePlayerRankStandings,
  revalidatePlayerRankPages,
  revalidateProfileOverviewPage,
  revalidatePublicProfilePage,
} from "@/lib/cache-invalidation";
import { loadUser } from "@/lib/auth/protected-session";
import { getUserById, listUsers, updateUser } from "@/lib/db/store";

async function requireAdminUser() {
  const { user } = await loadUser();

  if (!user || user.role !== "admin") {
    throw new Error("Admin access required");
  }

  return user;
}

async function revalidatePlayerRankForActiveUsers() {
  const allUsers = await listUsers();
  const activeUserIds = allUsers
    .filter((entry) => !entry.isGuest && !entry.mergedIntoUserId)
    .map((entry) => entry.id);

  revalidatePlayerRankStandings();
  revalidatePlayerRankPages(activeUserIds);

  for (const userId of activeUserIds) {
    revalidateProfileOverviewPage(userId);
    revalidatePublicProfilePage(userId);
  }
}

export async function generatePlayerRankPreview(input: PublishPlayerRankConfigInput) {
  await requireAdminUser();
  return previewPlayerRankStandings(input);
}

export async function publishPlayerRankSettings(input: PublishPlayerRankConfigInput) {
  const user = await requireAdminUser();
  const config = await publishPlayerRankConfig({
    actorUserId: user.id,
    config: input,
  });
  await revalidatePlayerRankForActiveUsers();

  return config;
}

export async function backfillPlayerRankHistory() {
  await requireAdminUser();
  const result = await backfillMissingPlayerRankResults();
  await revalidatePlayerRankForActiveUsers();

  return result;
}

export async function setPlayerRankLeaderboardDisabled(input: {
  userId: string;
  disabled: boolean;
}) {
  await requireAdminUser();
  const targetUser = await getUserById(input.userId);

  if (!targetUser || targetUser.isGuest || targetUser.mergedIntoUserId) {
    throw new Error("Player Rank user not found");
  }

  const updatedUser = await updateUser(input.userId, {
    playerRankLeaderboardDisabled: input.disabled,
  });

  if (!updatedUser) {
    throw new Error("Unable to update Player Rank leaderboard state");
  }

  await revalidatePlayerRankForActiveUsers();

  return updatedUser;
}
