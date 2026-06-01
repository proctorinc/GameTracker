import type { FriendsPageData } from "@/app/actions/pages/friends";

export type TabKey = "friends" | "invitations";
export type RecentlyPlayedItem = FriendsPageData["recentlyPlayedWith"][number];

export function getDisplayName(input: {
  firstName?: string | null;
  lastName?: string | null;
}) {
  return (
    [input.firstName, input.lastName].filter(Boolean).join(" ") ||
    "Unnamed user"
  );
}

export function formatLastPlayedAt(value: string | null) {
  if (!value) {
    return "Played together";
  }

  return `Played ${new Date(value).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  })}`;
}
