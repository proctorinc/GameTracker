import AdminGameTitles from "@/components/admin/admin-game-titles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadUser } from "@/lib/auth/protected-session";
import { listAdminGameTitles } from "@/lib/db/store/game.store";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const { user } = await loadUser();

  if (user.role !== "admin") {
    redirect("/profile");
  }

  const titles = await listAdminGameTitles();

  return (
    <div className="min-h-screen overflow-y-auto px-4 pb-40">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black">Admin</h1>
          <p className="text-sm text-muted-foreground">
            Review and curate game titles here.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-black">
              Admin workspace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This workspace gives you title review plus the new Player Rank
              controls and preview tooling.
            </p>
            <Link
              href="/admin/ranks"
              className="flex items-center justify-between rounded-2xl border border-border bg-muted/60 px-4 py-3 transition-colors hover:bg-muted"
            >
              <div>
                <p className="text-sm font-medium">Player Rank settings</p>
                <p className="text-xs text-muted-foreground">
                  Tune payouts and preview platform rankings
                </p>
              </div>
              <span className="text-sm font-semibold">Open</span>
            </Link>
          </CardContent>
        </Card>

        <AdminGameTitles titles={titles} />
      </div>
    </div>
  );
}
