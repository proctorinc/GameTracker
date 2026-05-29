import { notFound } from "next/navigation";
import GameTitlePage from "@/components/game/game-title-page";
import { loadUser } from "@/lib/auth/protected-session";
import { getGameTitleStatsPageData } from "@/lib/db/store/game.store";

type PageProps = {
  params: Promise<{
    gameTitleId: string;
  }>;
};

export default async function TitleDetailsPage({ params }: PageProps) {
  const { user } = await loadUser();
  const { gameTitleId } = await params;
  const data = await getGameTitleStatsPageData({
    userId: user.id,
    gameTitleId,
  });

  if (!data) {
    notFound();
  }

  const canManageDefaults = data.title.isUniversal
    ? user.role === "admin"
    : data.title.createdByUserId === user.id;

  return (
    <GameTitlePage
      canManageDefaults={canManageDefaults}
      currentUserId={user.id}
      data={data}
    />
  );
}
