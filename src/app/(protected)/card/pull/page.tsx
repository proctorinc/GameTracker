import CardOpening from "@/components/card/card-opening";
import { loadCurrentUser } from "@/lib/auth/auth-me";
import {
  getCardDropForUserByGame,
  getUnopenedCardDropForUser,
  listUnopenedCardPackGroups,
} from "@/lib/card-rewards";
import { areCardsEnabled } from "@/lib/db/store/feature-flags.store";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CardPullPage({
  searchParams,
}: {
  searchParams: Promise<{ gameId?: string; deck?: string }>;
}) {
  if (!(await areCardsEnabled())) {
    redirect("/dashboard");
  }

  const user = await loadCurrentUser({
    onMissingAuth: "redirect",
    returnPath: "/card/pull",
  });
  const params = await searchParams;
  const gameDrop = params.gameId
    ? await getCardDropForUserByGame({ userId: user.id, gameId: params.gameId })
    : null;
  const drop = params.gameId
    ? gameDrop?.openedAt === null
      ? gameDrop
      : null
    : await getUnopenedCardDropForUser({
        userId: user.id,
        deckName: params.deck ?? null,
      });
  const packGroups = await listUnopenedCardPackGroups(user.id);
  const remainingPackCount = packGroups.reduce(
    (total, group) => total + group.packCount,
    0,
  );

  return (
    <div className="h-screen overflow-clip">
      <CardOpening
        alreadyOpened={Boolean(gameDrop?.openedAt)}
        drop={drop}
        remainingPackCount={remainingPackCount}
      />
    </div>
  );
}
