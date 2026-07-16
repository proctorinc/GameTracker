import { notFound } from "next/navigation";
import { AdminGameTitlePage } from "@/components/admin/admin-game-title-page";
import { getGameTitleStatsPageData } from "@/lib/db/store/game.store";
import { requireAdminPageUser } from "../../admin-guard";

type PageProps = {
  params: Promise<{
    gameTitleId: string;
  }>;
};

export default async function AdminTitleDetailsPage({ params }: PageProps) {
  const user = await requireAdminPageUser();
  const { gameTitleId } = await params;
  const data = await getGameTitleStatsPageData({
    userId: user.id,
    gameTitleId,
    allowAdminAccess: true,
  });

  if (!data) {
    notFound();
  }

  return <AdminGameTitlePage data={data} />;
}
