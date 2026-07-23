"use client";

import { ArrowRight, ListCheck, Swords, Trophy } from "lucide-react";
import Link from "next/link";
import { useDashboardPage } from "../dashboard-page-provider";
import { Card } from "@/components/ui/card";
import { AnnouncementModal } from "@/components/announcements/announcement-modal";

export function EmptyDashboardStateSection() {
  const { user, recentAnnouncements } = useDashboardPage();

  return (
    <Card className="relative overflow-hidden rounded-xl px-5 py-6 shadow-2xl">
      <div className="relative flex flex-col gap-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-4xl font-black tracking-tight">
              Hi, {user.firstName}!
            </h1>
            <AnnouncementModal
              announcements={recentAnnouncements}
              mode="recent"
            />
          </div>
          <p className="max-w-xs text-sm leading-6 text-slate-700 dark:text-white/80">
            Your dashboard wakes up once you start playing. Create your first
            game to track rounds, winners, and the games you keep coming back
            to.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Card className="rounded-xl bg-white/58 p-3 backdrop-blur-sm dark:bg-black/20 gap-0">
            <Swords className="size-4" />
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">
              Start
            </p>
            <p className="mt-1 text-sm font-bold">Set up and track any game</p>
          </Card>
          <Card className="rounded-xl bg-white/58 p-3 backdrop-blur-sm dark:bg-black/20 gap-0">
            <ListCheck className="size-4" />
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">
              Track
            </p>
            <p className="mt-1 text-sm font-bold">
              Keep score with your friends
            </p>
          </Card>
          <Card className="rounded-xl bg-white/58 p-3 backdrop-blur-sm dark:bg-black/20 gap-0">
            <Trophy className="size-4" />
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">
              Win
            </p>
            <p className="mt-1 text-sm font-bold">
              Track your wins historically
            </p>
          </Card>
        </div>

        <Link
          href="/game/create/settings"
          className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-foreground px-5 text-lg font-bold text-background transition-colors hover:opacity-90"
        >
          Start your first game
          <ArrowRight className="size-5" />
        </Link>
      </div>
    </Card>
  );
}
