import Link from "next/link";
import { redirect } from "next/navigation";
import { FriendInviteShareCard } from "@/components/profile/friend-invite-share-card";
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
import { getInvitationFullByToken, getUserByFriendInviteToken } from "@/lib/db/store";
import {
  finalizeReusableFriendInvite,
  finalizeFriendLinkInvitation,
  finalizeGuestClaimInvitation,
} from "@/app/actions/friends";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await getInvitationFullByToken(token);
  const inviter = invitation ? null : await getUserByFriendInviteToken(token);

  let currentUser = null;

  try {
    currentUser = await loadCurrentUser();
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) {
      throw error;
    }
  }

  if (!invitation && !inviter) {
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

  if (!invitation && inviter) {
    const inviterName =
      [inviter.firstName, inviter.lastName].filter(Boolean).join(" ") ||
      "A friend";

    if (currentUser && currentUser.id === inviter.id) {
      return (
        <div className="min-h-screen px-4 py-8">
          <div className="mx-auto flex w-full max-w-md flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{inviterName} invited you</CardTitle>
                <CardDescription>
                  This is your invitation link. Share it with someone else to let
                  them connect with you.
                </CardDescription>
              </CardHeader>
            </Card>
            <FriendInviteShareCard
              initialInvitePath={`/invite/${token}`}
              title="Share your invite"
              description="Use this QR code or link to connect with friends instantly."
            />
          </div>
        </div>
      );
    }

    if (currentUser) {
      const result = await finalizeReusableFriendInvite({
        friendInviteToken: token,
        inviteeUserId: currentUser.id,
      });

      if (
        result.status === "accepted" ||
        result.status === "already_accepted" ||
        result.status === "own_invite"
      ) {
        redirect(`/profile/${inviter.id}`);
      }

      return (
        <div className="min-h-screen px-4 py-8">
          <div className="mx-auto w-full max-w-md">
            <Card>
              <CardHeader>
                <CardTitle>Invitation unavailable</CardTitle>
                <CardDescription>{result.reason}</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen px-4 py-8">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{inviterName} invited you</CardTitle>
              <CardDescription>
                Sign in to connect as friends.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button
                render={
                  <Link href={`/login?from=${encodeURIComponent(`/invite/${token}`)}`} />
                }
              >
                Sign in to connect
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  const inviterName =
    [invitation.inviter.firstName, invitation.inviter.lastName]
      .filter(Boolean)
      .join(" ") || "A friend";

  if (currentUser && currentUser.id === invitation.inviterUserId) {
    return (
      <div className="min-h-screen px-4 py-8">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{inviterName} invited you</CardTitle>
              <CardDescription>
                This is your invitation link. Share it with someone else to let
                them connect with you.
              </CardDescription>
            </CardHeader>
          </Card>
          <FriendInviteShareCard
            initialInvitePath={`/invite/${token}`}
            title="Share your invite"
            description="Use this QR code or link to connect with friends instantly."
          />
        </div>
      </div>
    );
  }

  if (currentUser && invitation.kind === "claim_guest") {
    const result = await finalizeGuestClaimInvitation({ inviteToken: token });

    if (result.status === "claimed") {
      redirect(
        currentUser.isProfileComplete
          ? "/profile?tab=friends&invites=1"
          : "/profile/complete",
      );
    }

    if (result.status === "already_claimed") {
      return (
        <div className="min-h-screen px-4 py-8">
          <div className="mx-auto w-full max-w-md">
            <Card>
              <CardHeader>
                <CardTitle>Profile already claimed</CardTitle>
                <CardDescription>
                  This guest profile is already connected to your account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  render={
                    <Link
                      href={
                        currentUser.isProfileComplete
                          ? "/profile?tab=friends&invites=1"
                          : "/profile/complete"
                      }
                    />
                  }
                >
                  Continue
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen px-4 py-8">
        <div className="mx-auto w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Invitation unavailable</CardTitle>
              <CardDescription>{result.reason}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (
    currentUser &&
    invitation.kind === "friend" &&
    invitation.targetType === "link"
  ) {
    const result = await finalizeFriendLinkInvitation({ inviteToken: token });

    if (result.status === "accepted" || result.status === "already_accepted") {
      redirect(`/profile/${invitation.inviterUserId}`);
    }

    return (
      <div className="min-h-screen px-4 py-8">
        <div className="mx-auto w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Invitation unavailable</CardTitle>
              <CardDescription>{result.reason}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{inviterName} invited you</CardTitle>
            <CardDescription>
              {invitation.kind === "claim_guest"
                ? "Accept to connect your account with a guest profile and keep game history."
                : "Sign in to connect as friends."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {invitation.status !== "pending" ? (
              <p className="text-sm text-muted-foreground">
                This invitation is {invitation.status}.
              </p>
            ) : !currentUser ? (
              <>
                <Button
                  render={
                    <Link href={`/login?from=${encodeURIComponent(`/invite/${token}`)}`} />
                  }
                >
                  {invitation.kind === "claim_guest"
                    ? "Sign in to claim"
                    : "Sign in to connect"}
                </Button>
                {invitation.kind === "claim_guest" ? (
                  <Button
                    variant="outline"
                    render={
                      <Link
                        href={`/register?from=${encodeURIComponent(`/invite/${token}`)}`}
                      />
                    }
                  >
                    Create account to claim
                  </Button>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Connecting your account...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
