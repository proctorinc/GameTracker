"use client";

import Link from "next/link";
import { ChevronRight, DoorOpen, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfileOverview } from "../profile-overview-provider";
import { SignOutButton } from "@clerk/nextjs";

export function PublicProfileCard() {
  const { user } = useProfileOverview();

  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle>My Profile</CardTitle>
        <Link
          href={`/profile/${encodeURIComponent(user.id)}`}
          className="flex items-center justify-between rounded-2xl border border-border bg-muted/60 px-4 py-3 transition-colors hover:bg-muted"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
              <ExternalLink className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">View public profile</p>
              <p className="text-xs text-muted-foreground">
                Open the version other people can see
              </p>
            </div>
          </div>
          <ExternalLink className="size-4 text-muted-foreground" />
        </Link>
        <SignOutButton redirectUrl="/login">
          <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/60 px-4 py-3 transition-colors hover:bg-muted">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
                <DoorOpen className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Logout</p>
                <p className="text-xs text-muted-foreground">Exit the app</p>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
        </SignOutButton>
      </CardHeader>
    </Card>
  );
}
