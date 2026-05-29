import type { GameHistoryPageData } from "@/app/actions/pages/game-history";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GameHistoryFilters from "./game-history-filters";
import GameHistoryList from "./game-history-list";

export default function GameHistoryPage({
  data,
}: {
  data: GameHistoryPageData;
}) {
  const { user, games, filters, friends, gameTitles } = data;

  return (
    <div className="min-h-screen px-4 pb-24">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="space-y-2">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight">Game history</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-black">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <GameHistoryFilters
              filters={filters}
              friends={friends}
              gameTitles={gameTitles}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-black">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{games.length} games</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <GameHistoryList
              games={games}
              currentUserId={user.id}
              emptyMessage="No games match these filters yet."
              emptyActionHref="/game/create"
              emptyActionLabel="Start a new game"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
