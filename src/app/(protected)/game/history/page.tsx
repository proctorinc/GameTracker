import GameHistoryPage from "@/components/game/game-history-page";
import { getGameHistoryOverviewPageData } from "./page-data";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HistoryPage({ searchParams }: PageProps) {
  const data = await getGameHistoryOverviewPageData(await searchParams);

  return <GameHistoryPage data={data} />;
}
