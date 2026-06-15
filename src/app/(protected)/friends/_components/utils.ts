import { useSyncExternalStore } from "react";
import type { FriendsPageData } from "@/app/actions/pages/friends";

export type TabKey = "activity" | "friends";
export type RecentlyPlayedItem = FriendsPageData["recentlyPlayedWith"][number];
export type FriendActivityItem = FriendsPageData["friendActivity"][number];

type DateFormattingOptions = {
  mounted: boolean;
  timeZone?: string;
  now?: Date;
};

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

function getDateTimeFormatOptions(
  options: DateFormattingOptions,
) {
  return options.mounted && options.timeZone
    ? { timeZone: options.timeZone }
    : undefined;
}

export function useClientDateFormatting(): DateFormattingOptions {
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const timeZone = mounted
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : undefined;

  return {
    mounted,
    timeZone,
  };
}

export function getDisplayName(input: {
  firstName?: string | null;
  lastName?: string | null;
}) {
  return (
    [input.firstName, input.lastName].filter(Boolean).join(" ") ||
    "Unnamed user"
  );
}

export function formatLastPlayedAt(
  value: string | null,
  options: DateFormattingOptions,
) {
  if (!value) {
    return "Played together";
  }

  if (!options.mounted) {
    return "Played recently";
  }

  return `Played ${new Date(value).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    ...getDateTimeFormatOptions(options),
  })}`;
}

export function formatActivityDay(
  value: string | null,
  options: DateFormattingOptions,
) {
  if (!value) {
    return "Recently";
  }

  if (!options.mounted) {
    return "Recent activity";
  }

  const date = new Date(value);
  const today = options.now ? new Date(options.now) : new Date();
  const yesterday = new Date();
  yesterday.setTime(today.getTime());
  yesterday.setDate(today.getDate() - 1);

  const formatterOptions = getDateTimeFormatOptions(options);
  const dateKey = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    ...formatterOptions,
  });
  const todayKey = today.toLocaleDateString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    ...formatterOptions,
  });
  const yesterdayKey = yesterday.toLocaleDateString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    ...formatterOptions,
  });

  if (dateKey === todayKey) {
    return "Today";
  }

  if (dateKey === yesterdayKey) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    ...formatterOptions,
  });
}

export function formatActivityTime(
  value: string | null,
  options: DateFormattingOptions,
) {
  if (!value) {
    return "";
  }

  if (!options.mounted) {
    return "";
  }

  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    ...getDateTimeFormatOptions(options),
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
