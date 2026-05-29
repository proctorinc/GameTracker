import { loadCurrentUser } from "@/lib/auth/auth-me";
import {
  type GameTitleLibraryEntry,
  listGameTitles,
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

function matchesScope(
  title: GameTitleLibraryEntry,
  scope: Required<TitleLibraryFilters>["scope"],
) {
  if (scope === "mine") {
    return title.isOwned;
  }

  if (scope === "universal") {
    return title.isUniversal;
  }

  return true;
}

function matchesSource(
  title: GameTitleLibraryEntry,
  source: Required<TitleLibraryFilters>["source"],
) {
  if (source === "all") {
    return true;
  }

  return title.accessSource === source;
}

function sortTitles(
  titles: GameTitleLibraryEntry[],
  sort: Required<TitleLibraryFilters>["sort"],
) {
  return [...titles].sort((left, right) => {
    switch (sort) {
      case "title-desc":
        return right.title.localeCompare(left.title);
      case "newest":
        return right.createdAt.localeCompare(left.createdAt);
      case "oldest":
        return left.createdAt.localeCompare(right.createdAt);
      case "title-asc":
      default:
        return left.title.localeCompare(right.title);
    }
  });
}

export type TitlesPageData = Awaited<ReturnType<typeof getTitlesPageData>>;

export async function getTitlesPageData(searchParams: SearchParamsInput) {
  const user = await loadCurrentUser();
  const filters = parseTitleLibraryFilters(searchParams);
  const gameTitles = await listGameTitles(user.id);
  const normalizedQuery = filters.query.toLowerCase();

  const filteredTitles = sortTitles(
    gameTitles.filter((title) => {
      if (!matchesScope(title, filters.scope)) {
        return false;
      }

      if (!matchesSource(title, filters.source)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [title.title, title.normalizedTitle].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    }),
    filters.sort,
  );

  return {
    user,
    filters,
    gameTitles: filteredTitles,
    counts: {
      all: gameTitles.length,
      mine: gameTitles.filter((title) => title.isOwned).length,
      universal: gameTitles.filter((title) => title.isUniversal).length,
    },
  };
}
