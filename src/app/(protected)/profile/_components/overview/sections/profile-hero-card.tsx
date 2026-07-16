"use client";

import ProfilePicture from "@/components/profile/profile-picture";
import { useProfileOverview } from "../profile-overview-provider";
import Link from "next/link";
import { Settings, Shield } from "lucide-react";
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
  const { user, setActiveTab, activeTab } = useProfileOverview();
  const isSettingsActive = activeTab === "settings";

  return (
    <div className="flex flex-col gap-4 relative">
      <div className="flex items-center justify-between w-full gap-4 px-2">
        <div className="flex gap-4">
          <ProfilePicture user={user} size="lg" />
          <div className="z-10 flex flex-col justify-center gap-1">
            <h2 className="text-2xl font-black tracking-tight text-foreground">
              {formatDisplayName(user)}
            </h2>
            <div className="flex flex-col gap-1">
              <p className="text-sm">{formatMemberSince(user.createdAt)}</p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {user.role === "admin" ? (
            <Button
              aria-label="Admin tools"
              render={<Link href="/admin" />}
              size="icon-lg"
              variant="outline"
            >
              <Shield />
            </Button>
          ) : null}
          <Button
            size="icon-lg"
            variant={isSettingsActive ? "default" : "outline"}
            aria-label="Profile settings"
            onClick={() =>
              setActiveTab(isSettingsActive ? "stats" : "settings")
            }
          >
            <Settings />
          </Button>
        </div>
      </div>
    </div>
  );
}
