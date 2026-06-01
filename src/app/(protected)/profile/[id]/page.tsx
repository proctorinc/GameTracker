import type { ReactNode } from "react";
import { Users, Trophy, Swords, Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProfilePicture from "@/components/profile/profile-picture";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function formatLastPlayedAt(lastPlayedAt: string | null) {
  if (!lastPlayedAt) {
    return "No games logged yet";
  }

  return new Date(lastPlayedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatGamesPlayedTogether(count: number) {
  return `Played ${count} game${count === 1 ? "" : "s"} together`;
}

function StatCard(props: {
  label: string;
  value: string | number;
  hint?: string;
  icon: ReactNode;
}) {
  return (
    <Card
      size="sm"
      className="relative min-h-36 border border-border/80 bg-card/95 sm:min-h-40"
    >
      <CardHeader className="pb-0">
        <CardTitle className="pl-0 text-center text-[11px] leading-tight font-semibold text-muted-foreground sm:text-xs">
          {props.label}
        </CardTitle>
        <div className="absolute top-3 right-3 rounded-2xl bg-muted p-1.5 text-foreground sm:top-4 sm:right-4 sm:p-2">
          <div className="size-3.5 sm:size-4">{props.icon}</div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center justify-center gap-2 pt-0 text-center">
        <p className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
          {props.value}
        </p>
        {props.hint ? (
          <p className="max-w-[12rem] text-[11px] leading-tight text-muted-foreground sm:max-w-none sm:text-xs">
            {props.hint}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
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

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            label="Games played"
            value={data.stats.gamesPlayed}
            hint={`${data.stats.titlesPlayed} different titles`}
            icon={<Swords className="size-4" />}
          />
          <StatCard
            label="Wins"
            value={data.stats.gamesWon}
            hint={
              data.stats.winRate === null
                ? "Win rate unlocks after a completed game"
                : `${data.stats.winRate}% win rate`
            }
            icon={<Trophy className="size-4" />}
          />
          <StatCard
            label="Friends"
            value={data.stats.friendCount}
            hint="The more the merrier!"
            icon={<Users className="size-4" />}
          />
          <StatCard
            label="Hosted"
            value={data.stats.gamesHosted}
            hint="Games started"
            icon={<Sparkles className="size-4" />}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card className="border border-border/80 bg-card/95">
            <CardHeader>
              <CardTitle className="pl-0 text-2xl font-black text-foreground">
                Fun stuff
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {data.bestFriend ? (
                <Link
                  href={`/profile/${encodeURIComponent(data.bestFriend.id)}`}
                  className="rounded-3xl border border-border/70 bg-muted/60 p-4 transition-colors hover:bg-muted/80"
                >
                  <p className="text-sm font-semibold text-muted-foreground">
                    Best friend
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <ProfilePicture user={data.bestFriend} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-xl font-black text-foreground">
                        {data.bestFriend.displayName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatGamesPlayedTogether(
                          data.bestFriend.gamesPlayedTogether,
                        )}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Last played together{" "}
                    {formatLastPlayedAt(data.bestFriend.lastPlayedAt)}
                  </p>
                </Link>
              ) : null}
              <div className="rounded-3xl border border-border/70 bg-muted/60 p-4">
                <p className="text-sm font-semibold text-muted-foreground">
                  Favorite title
                </p>
                <p className="mt-2 text-xl font-black text-foreground">
                  {data.stats.favoriteTitle ?? "Still exploring"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.stats.favoriteTitle
                    ? `Played ${data.stats.favoriteTitleCount} time${data.stats.favoriteTitleCount === 1 ? "" : "s"}`
                    : "Once a few more games are logged, a favorite will show up here."}
                </p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-muted/60 p-4">
                <p className="text-sm font-semibold text-muted-foreground">
                  Last table time
                </p>
                <p className="mt-2 text-xl font-black text-foreground">
                  {formatLastPlayedAt(data.stats.lastPlayedAt)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  A quick peek at how recently they&apos;ve played.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
