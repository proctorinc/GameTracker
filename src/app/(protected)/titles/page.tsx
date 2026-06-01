import TitlesLibraryPage from "@/components/game/titles-library-page";
import { getTitlesOverviewPageData } from "./page-data";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TitlesPage({ searchParams }: PageProps) {
  const data = await getTitlesOverviewPageData(await searchParams);

  return <TitlesLibraryPage data={data} />;
}
