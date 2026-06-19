"use client";

import { useState } from "react";
import { Filter, Focus, X } from "lucide-react";
import { PlayerRankPageChart } from "@/components/player-rank/player-rank-page-chart";
import { PlayerRankSummaryCard } from "@/components/player-rank/player-rank-summary-card";
import ProfilePicture from "@/components/profile/profile-picture";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import type { PlayerRankPageData } from "./page-data";

export function PlayerRankPageView({ data }: { data: PlayerRankPageData }) {
  const [selectedUserIds, setSelectedUserIds] = useState(
    data.defaultSelectedUserIds,
  );
  const [highlightedUserId, setHighlightedUserId] = useState(
    data.currentUserId,
  );
  const [isHighlightDrawerOpen, setIsHighlightDrawerOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  const visibleSeries = data.comparisonSeries.filter((series) =>
    selectedUserIds.includes(series.userId),
  );
  const hasVisibleHistory = visibleSeries.some((series) => series.hasHistory);
  const resolvedHighlightedUserId = visibleSeries.some(
    (series) => series.userId === highlightedUserId,
  )
    ? highlightedUserId
    : (visibleSeries[0]?.userId ?? data.currentUserId);
  const highlightedSummary = data.summaryByUserId[resolvedHighlightedUserId];

  if (!data.canViewPlayerRank) {
    return (
      <div className="min-h-screen overflow-y-auto px-4 pb-28">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-black">Player Rank</h1>
            <p className="text-sm text-muted-foreground">
              Player Rank is waiting on the latest database migration.
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-black">
                Migration needed
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Run <code>npm run db:migrate</code> in this environment, then
              refresh this page to load Player Rank standings.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-5.5rem)] overflow-hidden px-4 pb-6">
      <div className="mx-auto flex h-full w-full max-w-md flex-col gap-4">
        <PlayerRankSummaryCard
          title="Highlighted Player Rank"
          highlightedUser={
            highlightedSummary
              ? {
                  id: highlightedSummary.userId,
                  firstName: highlightedSummary.firstName,
                  lastName: highlightedSummary.lastName,
                  color: highlightedSummary.color,
                  displayName: highlightedSummary.displayName,
                }
              : null
          }
          rankGamesCount={highlightedSummary?.rankGamesCount ?? null}
          rankPosition={highlightedSummary?.rankPosition ?? null}
          rankPositionLabel="Global"
          rankTotal={highlightedSummary?.rankTotal ?? null}
          recentChangeSummary={highlightedSummary?.recentChangeSummary ?? null}
          topThreeFinishes={highlightedSummary?.topThreeFinishes ?? null}
          windowLabel={data.playerRankWindowLabel}
          twoPlayerPrizePool={data.twoPlayerPrizePool}
          threePlayerPrizePool={data.threePlayerPrizePool}
          sixPlusPlayerPrizePool={data.sixPlusPlayerPrizePool}
        />

        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="relative z-30 flex items-center justify-between gap-3">
            <div className="flex-1" />
            <div className="flex items-center gap-2">
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
                        className="shrink-0 rounded-[1.1rem]"
                        onClick={() => setIsHighlightDrawerOpen(false)}
                      >
                        <X className="size-5" />
                      </Button>
                    </div>
                  </DrawerHeader>
                  <div className="max-h-[60vh] overflow-y-auto pr-1">
                    <div className="flex flex-col gap-3">
                      {visibleSeries.map((series) => {
                        const isHighlighted =
                          resolvedHighlightedUserId === series.userId;

                        return (
                          <button
                            key={series.userId}
                            type="button"
                            aria-label={`${series.displayName} ${series.currentRankTotal} points`}
                            className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-3 py-3 text-left"
                            onClick={() => {
                              setHighlightedUserId(series.userId);
                              setIsHighlightDrawerOpen(false);
                            }}
                          >
                            <ProfilePicture
                              user={{
                                id: series.userId,
                                firstName: series.firstName,
                                lastName: series.lastName,
                                color: series.color,
                              }}
                              size="sm"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold">
                                {series.displayName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {series.currentRankTotal} points
                              </p>
                            </div>
                            {series.isCurrentUser ? <Badge>You</Badge> : null}
                            {isHighlighted ? (
                              <Badge variant="default">Active</Badge>
                            ) : null}
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
                          Toggle which lines appear on the 30-day rank chart.
                        </DrawerDescription>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-lg"
                        aria-label="Close filter drawer"
                        className="shrink-0 rounded-[1.1rem]"
                        onClick={() => setIsFilterDrawerOpen(false)}
                      >
                        <X className="size-5" />
                      </Button>
                    </div>
                  </DrawerHeader>
                  <div className="max-h-[60vh] overflow-y-auto pr-1">
                    <div className="flex flex-col gap-3">
                      {data.comparisonSeries.map((series) => {
                        const isSelected = selectedUserIds.includes(
                          series.userId,
                        );

                        return (
                          <label
                            key={series.userId}
                            className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-3 py-3"
                          >
                            <Checkbox
                              checked={isSelected}
                              disabled={series.isCurrentUser}
                              onCheckedChange={(checked) => {
                                if (series.isCurrentUser) {
                                  return;
                                }

                                setSelectedUserIds((current) =>
                                  checked
                                    ? [...current, series.userId]
                                    : current.filter(
                                        (userId) => userId !== series.userId,
                                      ),
                                );
                              }}
                            />
                            <ProfilePicture
                              user={{
                                id: series.userId,
                                firstName: series.firstName,
                                lastName: series.lastName,
                                color: series.color,
                              }}
                              size="sm"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold">
                                {series.displayName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {series.currentRankTotal} points
                              </p>
                            </div>
                            {series.isCurrentUser ? <Badge>You</Badge> : null}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </DrawerContent>
              </Drawer>
            </div>
          </div>

          <PlayerRankPageChart
            className="min-h-0 flex-1"
            highlightedUserId={resolvedHighlightedUserId}
            onHighlightChange={setHighlightedUserId}
            renderMissingAsBaseline
            showYAxis
            series={visibleSeries.map((series) => ({
              userId: series.userId,
              label: series.displayName,
              color: series.color,
              isCurrentUser: series.isCurrentUser,
              profileHref: `/profile/${series.userId}`,
              profileUser: {
                id: series.userId,
                firstName: series.firstName,
                lastName: series.lastName,
                color: series.color,
              },
              points: series.chartPoints,
            }))}
          />

          {!hasVisibleHistory ? (
            <p className="text-sm text-muted-foreground">
              No saved history yet, so the chart is showing a flat 0 baseline
              until ranked games are recorded.
            </p>
          ) : null}
          {data.comparisonSeries.length <= 1 ? (
            <p className="text-sm text-muted-foreground">
              Add friends to compare your line against more players.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
