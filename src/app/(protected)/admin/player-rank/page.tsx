import { PlayerRankPageView } from "@/app/(protected)/player-rank/_components/player-rank-page";
import { requireAdminPageUser } from "../admin-guard";
import { getAdminPlayerRankPageData } from "./page-data";

export default async function AdminPlayerRankPage() {
  await requireAdminPageUser();
  const data = await getAdminPlayerRankPageData();

  return <PlayerRankPageView data={data} />;
}
