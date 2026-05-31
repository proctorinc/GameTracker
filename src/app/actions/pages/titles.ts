import { loadCurrentUser } from "@/lib/auth/auth-me";
import { listGameTitles } from "@/lib/db/store";

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

export async function getTitlesPageData(searchParams: SearchParamsInput) {
  const user = await loadCurrentUser();
  const filters = parseTitleLibraryFilters(searchParams);
  const gameTitles = await listGameTitles(user.id);

  return {
    user,
    filters,
    gameTitles,
    counts: {
      all: gameTitles.length,
      mine: gameTitles.filter((title) => title.isOwned).length,
      universal: gameTitles.filter((title) => title.isUniversal).length,
    },
  };
}
