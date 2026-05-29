import "server-only";

import { getFriendsPageData } from "@/app/actions/pages/friends";

export async function getFriendsOverviewPageData() {
  return getFriendsPageData();
}
