import Link from "next/link";
import { redirect } from "next/navigation";
import { enterSharedGame } from "@/app/actions/game";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loadOptionalCurrentUser } from "@/lib/auth/auth-me";
import { getGameByShareToken } from "@/lib/db/store/game.store";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function GameInvitePage({ params }: PageProps) {
  const { token } = await params;
  const [viewer, game] = await Promise.all([
    loadOptionalCurrentUser(),
    getGameByShareToken(token),
  ]);

  if (!game || game.completedAt) {
    return (
      <div className="min-h-screen px-4 py-8">
        <div className="mx-auto w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Game invite not found</CardTitle>
              <CardDescription>
                This shared game is missing or no longer available.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const gameTitle = game.gameTitle?.title ?? "Untitled game";

  if (!viewer) {
    return (
      <div className="min-h-screen px-4 py-8">
        <div className="mx-auto w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Join {gameTitle}</CardTitle>
              <CardDescription>
                Sign in to join this game and connect with the host.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                render={
                  <Link
                    href={`/login?from=${encodeURIComponent(`/invite/game/${token}`)}`}
                  />
                }
              >
                Sign in to continue
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const result = await enterSharedGame({ shareToken: token });

  if (
    result.status === "joined" ||
    result.status === "already_joined" ||
    result.status === "own_game"
  ) {
    redirect(`/game/${result.gameId}/play`);
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{gameTitle}</CardTitle>
            <CardDescription>
              {result.status === "requested"
                ? "Your join request has been sent to the game manager."
                : result.status === "request_pending"
                  ? "Your join request is still waiting for approval."
                  : result.reason}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button render={<Link href="/" />}>Back home</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
