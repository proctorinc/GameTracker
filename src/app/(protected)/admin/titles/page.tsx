import AdminGameTitles from "@/components/admin/admin-game-titles";
import { listAdminGameTitles } from "@/lib/db/store/game.store";
import { requireAdminPageUser } from "../admin-guard";

export default async function AdminTitlesPage() {
  await requireAdminPageUser();
  const titles = await listAdminGameTitles();

  return (
    <div className="min-h-screen overflow-y-auto px-4 pb-40">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black">Game Titles</h1>
          <p className="text-sm text-muted-foreground">
            Review and curate the global title library here.
          </p>
        </div>
        <AdminGameTitles titles={titles} />
      </div>
    </div>
  );
}
