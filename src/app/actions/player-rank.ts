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
import { listUsers } from "@/lib/db/store";

async function requireAdminUser() {
  const { user } = await loadUser();

  if (!user || user.role !== "admin") {
    throw new Error("Admin access required");
  }

  return user;
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

  return config;
}

export async function backfillPlayerRankHistory() {
  await requireAdminUser();
  const result = await backfillMissingPlayerRankResults();

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

  return result;
}
