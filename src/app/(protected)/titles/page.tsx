import { getTitlesPageData } from "@/app/actions/pages/titles";
import TitlesLibraryPage from "@/components/game/titles-library-page";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TitlesPage({ searchParams }: PageProps) {
  const data = await getTitlesPageData(await searchParams);

  return <TitlesLibraryPage data={data} />;
}
