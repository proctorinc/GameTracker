import { getGameHistoryPageData } from "@/app/actions/pages/game-history";
import GameHistoryPage from "@/components/game/game-history-page";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HistoryPage({ searchParams }: PageProps) {
  const data = await getGameHistoryPageData(await searchParams);

  return <GameHistoryPage data={data} />;
}
