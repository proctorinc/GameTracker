import { loadCurrentUser } from "@/lib/auth/auth-me";
import { listGameTitles } from "@/lib/db/store";
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

export type TitleLibraryFilters = {
  scope?: "all" | "mine" | "universal";
  source?:
    | "all"
    | "universal"
    | "created"
    | "played"
    | "shared"
    | "merged"
    | "admin_seed";
  sort?: "title-asc" | "title-desc" | "newest" | "oldest";
  query?: string;
};

export function parseTitleLibraryFilters(
  searchParams: SearchParamsInput,
): Required<TitleLibraryFilters> {
  return {
    scope: normalizeEnumValue(
      getSingleValue(searchParams, "scope"),
      ["all", "mine", "universal"],
      "all",
    ),
    source: normalizeEnumValue(
      getSingleValue(searchParams, "source"),
      ["all", "universal", "created", "played", "shared", "merged", "admin_seed"],
      "all",
    ),
    sort: normalizeEnumValue(
      getSingleValue(searchParams, "sort"),
      ["title-asc", "title-desc", "newest", "oldest"],
      "title-asc",
    ),
    query: getSingleValue(searchParams, "query")?.trim() ?? "",
  };
}

export type TitlesPageData = Awaited<ReturnType<typeof getTitlesPageData>>;

export type TitlesPageCollections = {
  filters: Required<TitleLibraryFilters>;
  gameTitles: Awaited<ReturnType<typeof listGameTitles>>;
  counts: {
    all: number;
    mine: number;
    universal: number;
  };
};

export async function getTitlesPageCollections(input: {
  userId: string;
  searchParams: SearchParamsInput;
}): Promise<TitlesPageCollections> {
  const filters = parseTitleLibraryFilters(input.searchParams);
  const gameTitles = await listGameTitles(input.userId);
  const counts = {
    all: gameTitles.length,
    mine: gameTitles.filter((title) => title.isOwned).length,
    universal: gameTitles.filter((title) => title.isUniversal).length,
  };

  return {
    filters,
    gameTitles,
    counts,
  };
}

export async function getTitlesPageData(searchParams: SearchParamsInput) {
  const requestContext = await getServerRequestContext();

  try {
    const user = await loadCurrentUser();
    const { filters, gameTitles, counts } = await getTitlesPageCollections({
      userId: user.id,
      searchParams,
    });

    logInfo("titles.page_data.read.succeeded", {
      ...requestContext,
      userId: user.id,
      gameTitleCount: gameTitles.length,
      scopeFilter: filters.scope,
      sourceFilter: filters.source,
      sortOrder: filters.sort,
      hasQuery: Boolean(filters.query),
      ownedCount: counts.mine,
      universalCount: counts.universal,
    });

    return {
      user,
      filters,
      gameTitles,
      counts,
    };
  } catch (error) {
    logError("titles.page_data.read.failed", error, {
      ...requestContext,
    });
    throw error;
  }
}
