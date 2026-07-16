import AdminGameTitles from "@/components/admin/admin-game-titles";
import {
  listAdminGameTitlesByIds,
  listAdminGameTitlesPage,
  type AdminGameTitleFilter,
} from "@/lib/db/store/game.store";
import { requireAdminPageUser } from "../admin-guard";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleValue(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parseFilter(value: string | undefined): AdminGameTitleFilter {
  switch (value) {
    case "all":
    case "user_custom":
    case "non_universal":
    case "universal":
    case "admin_seed":
      return value;
    default:
      return "user_custom";
  }
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

export default async function AdminTitlesPage({ searchParams }: PageProps) {
  await requireAdminPageUser();
  const params = await searchParams;
  const filter = parseFilter(getSingleValue(params, "filter"));
  const page = parsePositiveInt(getSingleValue(params, "page"), 1);
  const sourceId = getSingleValue(params, "sourceId")?.trim() || "";
  const targetId = getSingleValue(params, "targetId")?.trim() || "";

  const [pageData, selectedTitles] = await Promise.all([
    listAdminGameTitlesPage({
      filter,
      page,
      pageSize: 100,
    }),
    listAdminGameTitlesByIds([sourceId, targetId]),
  ]);
  const selectedTitlesById = new Map(
    selectedTitles.map((title) => [title.id, title]),
  );
  const totalPages = Math.max(Math.ceil(pageData.totalCount / 100), 1);
  const currentPage = Math.min(page, totalPages);

  return (
    <div className="min-h-screen overflow-y-auto px-4 pb-40 lg:px-6 xl:px-8">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black">Game Titles</h1>
          <p className="text-sm text-muted-foreground">
            Review and curate the global title library here.
          </p>
        </div>
        <AdminGameTitles
          titles={pageData.titles}
          counts={pageData.counts}
          filter={filter}
          page={currentPage}
          pageSize={100}
          totalCount={pageData.totalCount}
          totalPages={totalPages}
          selectedSourceTitle={sourceId ? (selectedTitlesById.get(sourceId) ?? null) : null}
          selectedTargetTitle={targetId ? (selectedTitlesById.get(targetId) ?? null) : null}
        />
      </div>
    </div>
  );
}
