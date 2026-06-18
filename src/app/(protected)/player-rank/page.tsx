import { PlayerRankPageView } from "./_components/player-rank-page";
import { getPlayerRankPageData } from "./_components/page-data";

export default async function PlayerRankPage() {
  const data = await getPlayerRankPageData();

  return <PlayerRankPageView data={data} />;
}
