"use client";

import { PlayerRankSummaryCard } from "@/components/player-rank/player-rank-summary-card";
import ProfilePicture from "@/components/profile/profile-picture";
import { useProfileOverview } from "../profile-overview-provider";
import { Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function formatMemberSince(createdAt: string | null) {
  if (!createdAt) {
    return "User since recently";
  }

  return `User since ${new Date(createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })}`;
}

function formatDisplayName(input: {
  firstName: string | null;
  lastName: string | null;
}) {
  return (
    [input.firstName, input.lastName].filter(Boolean).join(" ") ||
    "Your profile"
  );
}

export function ProfileHeroCard() {
  const { user, data, setActiveTab } = useProfileOverview();

  return (
    <div className="flex flex-col gap-4 relative">
      <div className="flex items-center justify-between w-full gap-4 px-2">
        <div className="flex gap-4">
          <ProfilePicture user={user} />
          <div className="z-10 flex flex-col justify-center gap-1">
            <h2 className="text-2xl font-black tracking-tight text-foreground">
              {formatDisplayName(user)}
            </h2>
            <div className="flex flex-col gap-1">
              <p>{formatMemberSince(user.createdAt)}</p>
            </div>
          </div>
        </div>
        <Button
          size="icon-lg"
          variant="outline"
          onClick={() => setActiveTab("settings")}
        >
          <Settings />
        </Button>
      </div>
      {data.canViewPlayerRank ? (
        <PlayerRankSummaryCard
          title="Your Player Rank"
          rankGamesCount={data.playerRankGamesCount}
          rankPosition={data.playerRankPosition}
          recentChangeSummary={data.playerRankRecentChangeSummary}
          rankTotal={data.playerRankTotal}
          topThreeFinishes={data.topThreeFinishes}
          windowLabel={data.playerRankWindowLabel}
          twoPlayerPrizePool={data.twoPlayerPrizePool}
          threePlayerPrizePool={data.threePlayerPrizePool}
          sixPlusPlayerPrizePool={data.sixPlusPlayerPrizePool}
        />
      ) : null}
    </div>
  );
}
