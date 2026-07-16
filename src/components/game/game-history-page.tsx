import type { GameHistoryPageData } from "@/app/actions/pages/game-history";
import { Badge } from "@/components/ui/badge";
import GameHistoryFilters from "./game-history-filters";
import GameHistoryList from "./game-history-list";

export default function GameHistoryPage({
  data,
}: {
  data: GameHistoryPageData;
}) {
  const { user, games, filters, friends, gameTitles } = data;

  return (
    <div className="min-h-screen px-4 pb-40">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="space-y-2">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight">Game history</h1>
          </div>
        </div>

        <GameHistoryFilters
          filters={filters}
          friends={friends}
          gameTitles={gameTitles}
        />

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{games.length} games</Badge>
          </div>
          <div className="flex flex-col gap-5 px-5 sm:px-8">
            <GameHistoryList
              games={games}
              currentUserId={user.id}
              emptyMessage="No games match these filters yet."
              emptyActionHref="/game/create/settings"
              emptyActionLabel="Start a new game"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
