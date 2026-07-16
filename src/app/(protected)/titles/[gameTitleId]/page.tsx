import { notFound } from "next/navigation";
import GameTitlePage from "@/components/game/game-title-page";
import { loadUser } from "@/lib/auth/protected-session";
import { getGameTitleStatsPageData } from "@/lib/db/store/game.store";

type PageProps = {
  params: Promise<{
    gameTitleId: string;
  }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function TitleDetailsPage({ params, searchParams }: PageProps) {
  const { user } = await loadUser();
  const { gameTitleId } = await params;
  const data = await getGameTitleStatsPageData({
    userId: user.id,
    gameTitleId,
    allowAdminAccess: user.role === "admin",
  });

  if (!data) {
    notFound();
  }

  const canManageDefaults = data.title.isUniversal
    ? user.role === "admin"
    : data.title.createdByUserId === user.id;
  const canManageTitleArtwork = user.role === "admin";
  const canManageTitle = canManageDefaults || canManageTitleArtwork;
  const { tab } = await searchParams;
  const initialTab = tab === "admin" && canManageTitle ? "admin" : "stats";

  return (
    <GameTitlePage
      canManageDefaults={canManageDefaults}
      canManageTitleArtwork={canManageTitleArtwork}
      data={data}
      initialTab={initialTab}
    />
  );
}
