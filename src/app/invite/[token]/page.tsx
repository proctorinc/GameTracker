import Link from "next/link";
import { acceptInvitation, declineInvitation } from "@/app/actions/friends";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loadCurrentUser } from "@/lib/auth/auth-me";
import { UnauthorizedError } from "@/lib/auth/session";
import { getInvitationFullByToken } from "@/lib/db/store";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await getInvitationFullByToken(token);

  if (!invitation) {
    return (
      <div className="min-h-screen px-4 py-8">
        <div className="mx-auto w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Invitation not found</CardTitle>
              <CardDescription>
                This invite link is missing or no longer available.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  let currentUser = null;

  try {
    currentUser = await loadCurrentUser();
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) {
      throw error;
    }
  }

  const inviterName =
    [invitation.inviter.firstName, invitation.inviter.lastName]
      .filter(Boolean)
      .join(" ") || "A friend";

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{inviterName} invited you</CardTitle>
            <CardDescription>
              {invitation.kind === "claim_guest"
                ? "Accept to connect your account with a guest profile and keep game history."
                : "Accept to become friends after you sign in."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {invitation.status !== "pending" ? (
              <p className="text-sm text-muted-foreground">
                This invitation is {invitation.status}.
              </p>
            ) : !currentUser ? (
              <Button render={<Link href={`/login?from=${encodeURIComponent(`/invite/${token}`)}`} />}>
                Sign in to accept
              </Button>
            ) : currentUser.id === invitation.inviterUserId ? (
              <p className="text-sm text-muted-foreground">
                This is your invitation link. Share it with someone else to let
                them connect with you.
              </p>
            ) : (
              <div className="flex gap-2">
                <form action={acceptInvitation}>
                  <input type="hidden" name="inviteToken" value={token} />
                  <Button type="submit">Accept invitation</Button>
                </form>
                <form action={declineInvitation}>
                  <input type="hidden" name="inviteToken" value={token} />
                  <Button variant="outline" type="submit">
                    Decline
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
