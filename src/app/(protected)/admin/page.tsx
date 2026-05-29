import AdminGameTitles from "@/components/admin/admin-game-titles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadUser } from "@/lib/auth/protected-session";
import { listAdminGameTitles } from "@/lib/db/store/game.store";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const { user } = await loadUser();

  if (user.role !== "admin") {
    redirect("/profile");
  }

  const titles = await listAdminGameTitles();

  return (
    <div className="min-h-screen overflow-y-auto px-4 pb-24">
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
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This first pass gives you title review, universal promotion, and
              duplicate merging. We can add richer moderation tools here next.
            </p>
          </CardContent>
        </Card>

        <AdminGameTitles titles={titles} />
      </div>
    </div>
  );
}
