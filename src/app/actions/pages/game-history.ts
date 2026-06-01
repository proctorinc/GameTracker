import { loadCurrentUser } from "@/lib/auth/auth-me";
import {
  type GameHistoryFilters,
  listGameHistoryForUser,
  listGameTitles,
  listAcceptedFriendsForUser,
} from "@/lib/db/store";
import { logError, logInfo } from "@/lib/server-log";
import { getServerRequestContext } from "@/lib/server-request-context";

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

export type GameHistoryPageCollections = {
  filters: Required<GameHistoryFilters>;
  games: Awaited<ReturnType<typeof listGameHistoryForUser>>;
  friends: Awaited<ReturnType<typeof listAcceptedFriendsForUser>>;
  gameTitles: Awaited<ReturnType<typeof listGameTitles>>;
};

export async function getGameHistoryPageCollections(input: {
  userId: string;
  searchParams: SearchParamsInput;
}): Promise<GameHistoryPageCollections> {
  const filters = parseGameHistoryFilters(input.searchParams);

  const [games, friends, gameTitles] = await Promise.all([
    listGameHistoryForUser(input.userId, filters),
    listAcceptedFriendsForUser(input.userId),
    listGameTitles(input.userId),
  ]);

  return {
    filters,
    games,
    friends,
    gameTitles,
  };
}

export async function getGameHistoryPageData(
  searchParams: SearchParamsInput,
) {
  const requestContext = await getServerRequestContext();

  try {
    const user = await loadCurrentUser();
    const { filters, games, friends, gameTitles } =
      await getGameHistoryPageCollections({
        userId: user.id,
        searchParams,
      });

    logInfo("game_history.page_data.read.succeeded", {
      ...requestContext,
      userId: user.id,
      gameCount: games.length,
      friendCount: friends.length,
      gameTitleCount: gameTitles.length,
      statusFilter: filters.status,
      creatorFilter: filters.creator,
      outcomeFilter: filters.outcome,
      sortOrder: filters.sort,
      hasFriendFilter: Boolean(filters.friendUserId),
      hasGameTitleFilter: Boolean(filters.gameTitleId),
    });

    return {
      user,
      filters,
      games,
      friends,
      gameTitles,
    };
  } catch (error) {
    logError("game_history.page_data.read.failed", error, {
      ...requestContext,
    });
    throw error;
  }
}
