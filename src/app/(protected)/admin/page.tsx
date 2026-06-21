import {
  AlertTriangle,
  Gamepad2,
  ListOrdered,
  Settings2,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPlayerRankHealthCheck } from "@/lib/db/store/player-rank.store";
import Link from "next/link";
import { requireAdminPageUser } from "./admin-guard";

const adminLinks = [
  {
    href: "/admin/titles",
    title: "Game titles",
    description: "Manage the title library.",
    icon: Gamepad2,
  },
  {
    href: "/admin/leaderboard",
    title: "Global leaderboard",
    description: "See platform-wide standings.",
    icon: Trophy,
  },
  {
    href: "/admin/player-rank",
    title: "Global player rank",
    description: "Compare rank history globally.",
    icon: ListOrdered,
  },
  {
    href: "/admin/ranks",
    title: "Player Rank settings",
    description: "Edit rank rules and previews.",
    icon: Settings2,
  },
  {
    href: "/admin/users",
    title: "Users and invitations",
    description: "Manage users, invites, and merges.",
    icon: Users,
  },
] satisfies Array<{
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}>;

function getHealthTone(status: "good" | "review" | "error") {
  if (status === "good") {
    return "bg-emerald-500";
  }

  if (status === "review") {
    return "bg-amber-500";
  }

  return "bg-red-500";
}

export default async function AdminPage() {
  await requireAdminPageUser();
  const playerRankHealthCheck = await getPlayerRankHealthCheck();

  return (
    <div className="min-h-screen overflow-y-auto px-4 pb-40">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black">Admin</h1>
          <p className="text-sm text-muted-foreground">
            Choose a dedicated admin workspace.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {adminLinks.map((link) => (
            <Link key={link.href} href={link.href} className="block">
              <Card className="h-full transition-transform hover:-translate-y-0.5">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-1 items-center">
                      <div className="mb-2 flex size-11 items-center justify-center rounded-2xl border border-border/70 bg-muted/50">
                        <link.icon className="size-5" />
                      </div>
                      <CardTitle className="text-lg font-black">
                        {link.title}
                      </CardTitle>
                    </div>
                    {link.href === "/admin/ranks" ? (
                      <Badge variant="outline" className="shrink-0 gap-1.5">
                        <span
                          className={`inline-block size-2 rounded-full ${getHealthTone(playerRankHealthCheck.status)}`}
                        />
                        {playerRankHealthCheck.label}
                      </Badge>
                    ) : null}
                  </div>
                  <CardDescription>{link.description}</CardDescription>
                  {link.href === "/admin/ranks" &&
                  playerRankHealthCheck.status !== "good" ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <AlertTriangle className="size-3.5" />
                      <span>
                        {playerRankHealthCheck.status === "review"
                          ? `${playerRankHealthCheck.affectedGameCount} game${playerRankHealthCheck.affectedGameCount === 1 ? "" : "s"} need review`
                          : "Health check unavailable"}
                      </span>
                    </div>
                  ) : null}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
