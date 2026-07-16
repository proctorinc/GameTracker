import Link from "next/link";
import { Gift } from "lucide-react";
import type { GameForPlayPage } from "@/lib/db/store/game.store";
import { Button } from "@/components/ui/button";
import { getEligibleCardRewardUserIds } from "@/lib/card-reward-eligibility";

export function GameCardRewardCta({
  currentUserId,
  game,
}: {
  currentUserId: string;
  game: GameForPlayPage;
}) {
  if (!game.completedAt) {
    return null;
  }

  const eligibleUserIds = getEligibleCardRewardUserIds(game.players);
  if (eligibleUserIds.length < 2 || !eligibleUserIds.includes(currentUserId)) {
    return null;
  }
  return (
    <Button
      className="h-12 w-full shadow-lg shadow-amber-500/20"
      render={
        <Link href={`/card/pull?gameId=${encodeURIComponent(game.id)}`} />
      }
    >
      <Gift className="size-5" />
      Open your card pack
    </Button>
  );
}

export const SkyjoRewardCta = GameCardRewardCta;
