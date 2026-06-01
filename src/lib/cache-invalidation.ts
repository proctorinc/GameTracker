import { revalidateTag } from "next/cache";
import {
  getDashboardTag,
  getFriendsTag,
  getGameHistoryTag,
  getProfileOverviewTag,
  getPublicProfileTag,
  getTitlesGlobalTag,
  getTitlesTag,
} from "./cache-tags";

function isPresentUserId(userId: string | null | undefined): userId is string {
  return typeof userId === "string" && userId.length > 0;
}

export function revalidateDashboardPage(userId?: string | null) {
  if (userId) {
    revalidateTag(getDashboardTag(userId), "max");
  }
}

export function revalidateDashboardPages(userIds: Array<string | null | undefined>) {
  for (const userId of new Set(userIds.filter(isPresentUserId))) {
    revalidateTag(getDashboardTag(userId), "max");
  }
}

export function revalidateFriendsPage(userId?: string | null) {
  if (userId) {
    revalidateTag(getFriendsTag(userId), "max");
  }
}

export function revalidateTitlesPage(userId?: string | null) {
  if (userId) {
    revalidateTag(getTitlesTag(userId), "max");
  }
}

export function revalidateTitlesPages(userIds: Array<string | null | undefined>) {
  for (const userId of new Set(userIds.filter(isPresentUserId))) {
    revalidateTag(getTitlesTag(userId), "max");
  }
}

export function revalidateTitlesGlobal() {
  revalidateTag(getTitlesGlobalTag(), "max");
}

export function revalidateGameHistoryPage(userId?: string | null) {
  if (userId) {
    revalidateTag(getGameHistoryTag(userId), "max");
  }
}

export function revalidateGameHistoryPages(userIds: Array<string | null | undefined>) {
  for (const userId of new Set(userIds.filter(isPresentUserId))) {
    revalidateTag(getGameHistoryTag(userId), "max");
  }
}

export function revalidateProfileOverviewPage(userId?: string | null) {
  if (userId) {
    revalidateTag(getProfileOverviewTag(userId), "max");
  }
}

export function revalidatePublicProfilePage(userId?: string | null) {
  if (!userId) {
    return;
  }

  revalidateTag(getPublicProfileTag(userId), "max");
}
