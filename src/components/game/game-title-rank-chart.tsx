"use client";

import { useState } from "react";
import { Filter, Focus, X } from "lucide-react";
import { PlayerRankPageChart } from "@/components/player-rank/player-rank-page-chart";
import ProfilePicture from "@/components/profile/profile-picture";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import type { GameTitleRankChartSeries } from "@/lib/db/store/game.store";
import { cn } from "@/lib/utils";

type GameTitleRankChartProps = {
  series: GameTitleRankChartSeries[];
  defaultSelectedUserIds: string[];
  className?: string;
};

export function GameTitleRankChart({
  series,
  defaultSelectedUserIds,
  className,
}: GameTitleRankChartProps) {
  const [selectedUserIds, setSelectedUserIds] = useState(
    defaultSelectedUserIds,
  );
  const [highlightedUserId, setHighlightedUserId] = useState(
    defaultSelectedUserIds[0] ?? null,
  );
  const [isHighlightDrawerOpen, setIsHighlightDrawerOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const uniqueSeries = series.filter(
    (entry, index, collection) =>
      collection.findIndex((candidate) => candidate.userId === entry.userId) ===
      index,
  );
  const visibleSeries = uniqueSeries.filter((entry) =>
    selectedUserIds.includes(entry.userId),
  );
  const resolvedHighlightedUserId = visibleSeries.some(
    (entry) => entry.userId === highlightedUserId,
  )
    ? highlightedUserId
    : (visibleSeries[0]?.userId ?? null);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative z-30 flex items-center justify-end gap-2">
        <Drawer
          open={isHighlightDrawerOpen}
          onOpenChange={setIsHighlightDrawerOpen}
        >
          <DrawerTrigger
            render={
              <Button
                size="sm"
                variant="outline"
                className="relative z-30 shrink-0"
              />
            }
          >
            <Focus />
            Highlight
          </DrawerTrigger>
          <DrawerContent className="gap-4 pb-10">
            <DrawerHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DrawerTitle className="text-xl font-black">
                    Highlight player
                  </DrawerTitle>
                  <DrawerDescription>
                    Bring one visible line to the front and dim the rest.
                  </DrawerDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  aria-label="Close highlight drawer"
                  className="shrink-0 rounded-xl"
                  onClick={() => setIsHighlightDrawerOpen(false)}
                >
                  <X className="size-5" />
                </Button>
              </div>
            </DrawerHeader>
            <div className="max-h-[60vh] overflow-y-auto pr-1">
              <div className="flex flex-col gap-3">
                {visibleSeries.map((entry) => {
                  const isHighlighted =
                    resolvedHighlightedUserId === entry.userId;

                  return (
                    <button
                      key={entry.userId}
                      type="button"
                      aria-label={`${entry.label} ${entry.currentTitleRankTotal} points`}
                      className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-left"
                      onClick={() => {
                        setHighlightedUserId(entry.userId);
                        setIsHighlightDrawerOpen(false);
                      }}
                    >
                      <ProfilePicture
                        user={{
                          id: entry.userId,
                          firstName: entry.firstName,
                          lastName: entry.lastName,
                          color: entry.color,
                          avatarUrl: entry.avatarUrl,
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{entry.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.currentTitleRankTotal} points
                        </p>
                      </div>
                      {entry.isCurrentUser ? <Badge>You</Badge> : null}
                      {isHighlighted ? <Badge variant="default">Active</Badge> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        <Drawer
          open={isFilterDrawerOpen}
          onOpenChange={setIsFilterDrawerOpen}
        >
          <DrawerTrigger
            render={
              <Button
                size="sm"
                variant="outline"
                className="relative z-30 shrink-0"
              />
            }
          >
            <Filter />
            Filter
          </DrawerTrigger>
          <DrawerContent className="gap-4 pb-10">
            <DrawerHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DrawerTitle className="text-xl font-black">
                    Compare friends
                  </DrawerTitle>
                  <DrawerDescription>
                    Toggle which lines appear on the 90-day title rank chart.
                  </DrawerDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  aria-label="Close filter drawer"
                  className="shrink-0 rounded-xl"
                  onClick={() => setIsFilterDrawerOpen(false)}
                >
                  <X className="size-5" />
                </Button>
              </div>
            </DrawerHeader>
            <div className="max-h-[60vh] overflow-y-auto pr-1">
              <div className="flex flex-col gap-3">
                {uniqueSeries.map((entry) => {
                  const isSelected = selectedUserIds.includes(entry.userId);

                  return (
                    <label
                      key={entry.userId}
                      className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/70 px-3 py-2"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          setSelectedUserIds((current) =>
                            checked
                              ? [...current, entry.userId]
                              : current.filter((userId) => userId !== entry.userId),
                          );
                        }}
                      />
                      <ProfilePicture
                        user={{
                          id: entry.userId,
                          firstName: entry.firstName,
                          lastName: entry.lastName,
                          color: entry.color,
                          avatarUrl: entry.avatarUrl,
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{entry.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.currentTitleRankTotal} points
                        </p>
                      </div>
                      {entry.isCurrentUser ? <Badge>You</Badge> : null}
                    </label>
                  );
                })}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      <div
        className="h-[220px]"
        role="img"
        aria-label="90-day title rank history in Player Rank points"
      >
        <PlayerRankPageChart
          className="h-full"
          emptyMessage="No Player Rank history for this title yet"
          highlightedUserId={resolvedHighlightedUserId}
          onHighlightChange={setHighlightedUserId}
          renderMissingAsBaseline
          showYAxis
          series={visibleSeries.map((entry) => ({
            userId: entry.userId,
            label: entry.label,
            color: entry.color,
            isCurrentUser: entry.isCurrentUser,
            profileHref: `/profile/${entry.userId}`,
            profileUser: {
              id: entry.userId,
              firstName: entry.firstName,
              lastName: entry.lastName,
              color: entry.color,
              avatarUrl: entry.avatarUrl,
            },
            points: entry.points,
          }))}
        />
      </div>
    </div>
  );
}
