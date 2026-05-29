"use client";

import { ChevronDown } from "lucide-react";
import { getInitials } from "@/components/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfileOverview } from "../profile-overview-provider";
import { EditNameForm } from "../controls/edit-name-form";
import { ProfileColorPanel } from "../controls/profile-color-panel";
import { ThemeModePanel } from "../controls/theme-mode-panel";

export function ProfileDetailsCard() {
  const { user } = useProfileOverview();

  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle>Edit Profile</CardTitle>
        <details className="group rounded-2xl border border-border bg-muted/60">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-sm font-black text-background">
                {getInitials(user)}
              </div>
              <div>
                <p className="text-sm font-medium">Change your name</p>
                <p className="text-xs text-muted-foreground">
                  Update your first and last name
                </p>
              </div>
            </div>
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <EditNameForm
            key={`${user.firstName ?? ""}:${user.lastName ?? ""}`}
          />
        </details>
        <details className="group rounded-2xl border border-border bg-muted/60">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <span
                className="h-9 w-9 rounded-xl shadow-sm ring-1 ring-black/8 dark:ring-white/12"
                style={{ backgroundColor: user.color }}
              />
              <div>
                <p className="text-sm font-medium">Choose your color</p>
                <p className="text-xs text-muted-foreground">
                  Change your profile color
                </p>
              </div>
            </div>
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <ProfileColorPanel hidePreview />
        </details>
        <ThemeModePanel />
      </CardHeader>
    </Card>
  );
}
