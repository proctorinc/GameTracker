import { notFound } from "next/navigation";
import ProfilePicture from "@/components/profile/profile-picture";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProfileStatsSections } from "../_components/profile-stats-sections";
import { PublicProfileActions } from "./public-profile-actions";
import { getPublicProfilePageData } from "./page-data";

function formatMemberSince(createdAt: string | null) {
  if (!createdAt) {
    return "Joined recently";
  }

  return `Joined ${new Date(createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })}`;
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getPublicProfilePageData(id);

  if (!data) {
    notFound();
  }

  return (
    <main className="min-h-screen px-4 pb-40">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <Card className="overflow-hidden border border-border/80 bg-card/95 pt-0 shadow-2xl">
          <div
            className="h-28 w-full"
            style={{
              background: `linear-gradient(135deg, ${data.profile.color}, rgba(15,23,42,0.18))`,
            }}
          />
          <CardContent className="-mt-14 flex flex-col gap-5">
            <div className="flex flex-col gap-4">
              <ProfilePicture
                size="xl"
                user={data.profile}
                className="border-4 border-background shadow-xl"
              />
              <div className="space-y-3">
                <div className="space-y-1">
                  <h1 className="text-4xl font-black tracking-tight text-foreground">
                    {data.profile.displayName}
                  </h1>
                  <p className="text-base text-muted-foreground">
                    {formatMemberSince(data.profile.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    Public profile
                  </Badge>
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    {data.stats.friendCount} friends
                  </Badge>
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    {data.stats.gamesHosted} games hosted
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <PublicProfileActions
                profileId={data.profile.id}
                profileName={data.profile.displayName}
                viewerState={data.viewerState}
              />
            </div>
          </CardContent>
        </Card>
        <ProfileStatsSections data={data} />
      </div>
    </main>
  );
}
