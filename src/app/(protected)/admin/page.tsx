import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { requireAdminPageUser } from "./admin-guard";

const adminLinks = [
  {
    href: "/admin/titles",
    title: "Game titles",
    description: "Review, merge, and promote titles.",
  },
  {
    href: "/admin/leaderboard",
    title: "Global leaderboard",
    description: "View the platform-wide Player Rank leaderboard.",
  },
  {
    href: "/admin/player-rank",
    title: "Global player rank",
    description: "Open the full Player Rank chart and comparison page.",
  },
  {
    href: "/admin/ranks",
    title: "Player Rank settings",
    description: "Tune payouts and preview ranking changes.",
  },
  {
    href: "/admin/users",
    title: "Users and invitations",
    description: "Manage invites, friendships, and guest merges.",
  },
];

export default async function AdminPage() {
  await requireAdminPageUser();

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
                  <CardTitle className="text-lg font-black">{link.title}</CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm font-semibold text-foreground">
                  Open workspace
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
