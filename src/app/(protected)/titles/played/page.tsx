import PlayedTitlesLibraryPage from "@/components/game/played-titles-library-page";
import { getPlayedTitlesOverviewPageData } from "./page-data";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PlayedTitlesPage({ searchParams }: PageProps) {
  const data = await getPlayedTitlesOverviewPageData(await searchParams);

  return <PlayedTitlesLibraryPage data={data} />;
}
