import type { FriendsPageData } from "@/app/actions/pages/friends";

export type TabKey = "activity" | "friends" | "invitations";
export type RecentlyPlayedItem = FriendsPageData["recentlyPlayedWith"][number];
export type FriendActivityItem = FriendsPageData["friendActivity"][number];

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

export function formatActivityDay(value: string | null) {
  if (!value) {
    return "Recently";
  }

  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const dateKey = date.toDateString();

  if (dateKey === today.toDateString()) {
    return "Today";
  }

  if (dateKey === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

export function formatActivityTime(value: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getActivityDisplayName(input: {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  currentUserId: string;
}) {
  if (input.id === input.currentUserId) {
    return "You";
  }

  return input.firstName || input.lastName
    ? [input.firstName, input.lastName].filter(Boolean).join(" ")
    : "Player";
}

export function getActivityShortName(input: {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  currentUserId: string;
}) {
  if (input.id === input.currentUserId) {
    return "You";
  }

  const firstName = input.firstName?.trim();
  const lastInitial = input.lastName?.trim().charAt(0);

  if (firstName && lastInitial) {
    return `${firstName} ${lastInitial}.`;
  }

  if (firstName) {
    return firstName;
  }

  if (lastInitial) {
    return `${lastInitial}.`;
  }

  return "Player";
}
