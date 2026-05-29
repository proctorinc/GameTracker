import { loadCurrentUser } from "@/lib/auth/auth-me";
import {
  type GameHistoryFilters,
  listGameHistoryForUser,
  listGameTitles,
  listAcceptedFriendsForUser,
} from "@/lib/db/store";

type SearchParamsInput = Record<string, string | string[] | undefined>;

function getSingleValue(
  params: SearchParamsInput,
  key: string,
): string | undefined {
  const value = params[key];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizeEnumValue<T extends string>(
  value: string | undefined,
  options: readonly T[],
  fallback: T,
): T {
  if (!value) {
    return fallback;
  }

  return options.includes(value as T) ? (value as T) : fallback;
}

export function parseGameHistoryFilters(
  searchParams: SearchParamsInput,
): Required<GameHistoryFilters> {
  return {
    status: normalizeEnumValue(
      getSingleValue(searchParams, "status"),
      ["all", "active", "completed"],
      "all",
    ),
    gameTitleId: getSingleValue(searchParams, "titleId")?.trim() || null,
    friendUserId: getSingleValue(searchParams, "friendUserId")?.trim() || null,
    creator: normalizeEnumValue(
      getSingleValue(searchParams, "creator"),
      ["all", "me"],
      "all",
    ),
    outcome: normalizeEnumValue(
      getSingleValue(searchParams, "outcome"),
      ["all", "won"],
      "all",
    ),
    sort: normalizeEnumValue(
      getSingleValue(searchParams, "sort"),
      ["newest", "oldest"],
      "newest",
    ),
  };
}

export type GameHistoryPageData = Awaited<
  ReturnType<typeof getGameHistoryPageData>
>;

export async function getGameHistoryPageData(
  searchParams: SearchParamsInput,
) {
  const user = await loadCurrentUser();
  const filters = parseGameHistoryFilters(searchParams);

  const [games, friends, gameTitles] = await Promise.all([
    listGameHistoryForUser(user.id, filters),
    listAcceptedFriendsForUser(user.id),
    listGameTitles(user.id),
  ]);

  return {
    user,
    filters,
    games,
    friends,
    gameTitles,
  };
}
