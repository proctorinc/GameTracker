import { loadCurrentUser } from "@/lib/auth/auth-me";
import { listPlayedGameTitleSummaries } from "@/lib/db/store";
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

export type PlayedTitlesPageFilters = {
  query: string;
};

export function parsePlayedTitlesPageFilters(
  searchParams: SearchParamsInput,
): PlayedTitlesPageFilters {
  return {
    query: getSingleValue(searchParams, "query")?.trim() ?? "",
  };
}

export type PlayedTitlesPageData = Awaited<
  ReturnType<typeof getPlayedTitlesPageData>
>;

export type PlayedTitlesPageCollections = {
  filters: PlayedTitlesPageFilters;
  gameTitles: Awaited<ReturnType<typeof listPlayedGameTitleSummaries>>;
};

export async function getPlayedTitlesPageCollections(input: {
  userId: string;
  searchParams: SearchParamsInput;
}): Promise<PlayedTitlesPageCollections> {
  const filters = parsePlayedTitlesPageFilters(input.searchParams);
  const gameTitles = await listPlayedGameTitleSummaries(input.userId);

  return {
    filters,
    gameTitles,
  };
}

export async function getPlayedTitlesPageData(
  searchParams: SearchParamsInput,
) {
  const requestContext = await getServerRequestContext();

  try {
    const user = await loadCurrentUser();
    const { filters, gameTitles } = await getPlayedTitlesPageCollections({
      userId: user.id,
      searchParams,
    });

    logInfo("played_titles.page_data.read.succeeded", {
      ...requestContext,
      userId: user.id,
      gameTitleCount: gameTitles.length,
      hasQuery: Boolean(filters.query),
    });

    return {
      user,
      filters,
      gameTitles,
    };
  } catch (error) {
    logError("played_titles.page_data.read.failed", error, {
      ...requestContext,
    });
    throw error;
  }
}
