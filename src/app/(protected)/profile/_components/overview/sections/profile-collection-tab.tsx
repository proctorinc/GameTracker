"use client";

import { useState } from "react";
import Link from "next/link";
import type { CollectibleCardViewModel } from "@/lib/card-catalog";
import { CARD_RARITY_LABELS } from "@/lib/card-catalog";
import { CollectibleCard } from "@/components/card/collectible-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProfileOverview } from "../profile-overview-provider";

export function ProfileCollectionTab() {
  const { data } = useProfileOverview();
  const [selected, setSelected] = useState<CollectibleCardViewModel | null>(null);
  const totalCards = data.cardCollection.reduce((total, deck) => total + deck.totalCards, 0);

  if (data.cardCollection.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div>
            <h2 className="text-xl font-black">Your collection is empty</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete a game with another registered player, then open your reward pack.
            </p>
          </div>
          <Button render={<Link href="/dashboard" />}>Go to dashboard</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <p className="text-sm font-semibold text-muted-foreground">
          {totalCards} collected {totalCards === 1 ? "card" : "cards"}
        </p>
        {data.cardCollection.map((deck) => (
          <Card key={deck.deckName}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-3">
                <span>{deck.deckLabel}</span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {deck.collectedSlots} / {deck.eligibleSlots} collected · {deck.totalCards} cards
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-5 gap-2 p-3 pt-0">
              {deck.slots.map((slot) =>
                slot.collected ? (
                  <button
                    type="button"
                    key={slot.identityKey}
                    className="relative min-w-0 rounded-xl outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`View ${slot.subject?.name ?? slot.name}, ${CARD_RARITY_LABELS[slot.rarity]}`}
                    onClick={() => setSelected(slot)}
                  >
                    <CollectibleCard card={slot} compact />
                    {slot.quantity > 1 ? (
                      <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-foreground text-[9px] font-black text-background shadow-lg">
                        ×{slot.quantity}
                      </span>
                    ) : null}
                  </button>
                ) : (
                  <div key={slot.identityKey} aria-label={`${slot.subject?.name ?? slot.name}, not collected`}>
                    <CollectibleCard card={slot} compact placeholder />
                  </div>
                ),
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-sm">
          {selected ? (
            <>
              <DialogHeader className="pr-10">
                <DialogTitle>{selected.subject?.name ?? selected.name}</DialogTitle>
                <DialogDescription>
                  {selected.deckLabel} · {CARD_RARITY_LABELS[selected.rarity]} · {selected.quantity} owned
                </DialogDescription>
              </DialogHeader>
              <div className="mx-auto w-48">
                <CollectibleCard card={selected} />
              </div>
              {selected.description ? (
                <p className="text-center text-sm text-muted-foreground">{selected.description}</p>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
