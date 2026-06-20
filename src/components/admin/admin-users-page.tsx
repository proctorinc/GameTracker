"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowRightLeft, GitMerge, ShieldAlert, UserPlus, UserRound } from "lucide-react";
import {
  createAdminFriendship,
  mergeUsersAsAdmin,
  revokeAdminInvitation,
} from "@/app/actions/admin";
import type { getAdminUsersPageData } from "@/app/(protected)/admin/users/page-data";
import ProfilePicture from "@/components/profile/profile-picture";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type AdminUsersPageData = Awaited<ReturnType<typeof getAdminUsersPageData>>;

type UserOption = AdminUsersPageData["users"][number];

function getDisplayName(user: Pick<UserOption, "firstName" | "lastName">) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || "Skybo Player";
}

function getInvitationTargetLabel(
  invitation: AdminUsersPageData["invitations"][number],
) {
  if (invitation.targetType === "link") {
    return "Link invite";
  }

  return invitation.invitee ? getDisplayName(invitation.invitee) : "User invite";
}

function getInvitationStatusTone(status: string) {
  switch (status) {
    case "accepted":
      return "default";
    case "pending":
      return "outline";
    default:
      return "secondary";
  }
}

export function AdminUsersPage({ data }: { data: AdminUsersPageData }) {
  const router = useRouter();
  const [sourceUserId, setSourceUserId] = useState<string>("");
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const userOptions = useMemo(
    () =>
      data.users.map((user) => ({
        value: user.id,
        label: getDisplayName(user),
        keywords: [user.firstName, user.lastName, user.isGuest ? "guest" : "user"].filter(
          (value): value is string => Boolean(value),
        ),
        user,
      })),
    [data.users],
  );
  const friendships = useMemo(
    () =>
      new Set(
        data.friendships.map((friendship) =>
          [friendship.user1Id, friendship.user2Id].sort().join(":"),
        ),
      ),
    [data.friendships],
  );
  const usersById = useMemo(
    () => new Map(data.users.map((user) => [user.id, user])),
    [data.users],
  );
  const sourceUser = sourceUserId ? usersById.get(sourceUserId) ?? null : null;
  const targetUser = targetUserId ? usersById.get(targetUserId) ?? null : null;
  const friendshipKey =
    sourceUser && targetUser
      ? [sourceUser.id, targetUser.id].sort().join(":")
      : null;
  const alreadyFriends = friendshipKey ? friendships.has(friendshipKey) : false;

  const friendStatus = useMemo(() => {
    if (!sourceUser || !targetUser) {
      return {
        canSubmit: false,
        title: "Select two users",
        description: "Pick two active user accounts to evaluate friendship status.",
      };
    }

    if (sourceUser.id === targetUser.id) {
      return {
        canSubmit: false,
        title: "Choose different users",
        description: "Friendships require two distinct accounts.",
      };
    }

    if (sourceUser.isGuest || targetUser.isGuest) {
      return {
        canSubmit: false,
        title: "Guests cannot be friended directly",
        description: "Use merge tools for guest accounts instead of creating friendships.",
      };
    }

    if (alreadyFriends) {
      return {
        canSubmit: false,
        title: "Already friends",
        description: "This pair already has a friendship record.",
      };
    }

    return {
      canSubmit: true,
      title: "Ready to add friendship",
      description: "This will create the friendship immediately without an invite.",
    };
  }, [alreadyFriends, sourceUser, targetUser]);

  const mergeStatus = useMemo(() => {
    if (!sourceUser) {
      return {
        canSubmit: false,
        title: "Choose a source account",
        description: "The source account must be a guest that will be merged away.",
      };
    }

    if (!sourceUser.isGuest) {
      return {
        canSubmit: false,
        title: "Source must be a guest",
        description: "User -> user and user -> guest merges are not allowed.",
      };
    }

    if (sourceUser.mergedIntoUserId) {
      return {
        canSubmit: false,
        title: "Source already merged",
        description: "Pick a guest account that has not already been merged.",
      };
    }

    if (!targetUser) {
      return {
        canSubmit: false,
        title: "Choose a merge target",
        description: "Select the user or guest account that should keep the data.",
      };
    }

    if (sourceUser.id === targetUser.id) {
      return {
        canSubmit: false,
        title: "Source and target must differ",
        description: "A guest cannot be merged into itself.",
      };
    }

    return {
      canSubmit: true,
      title: "Ready to merge guest into target",
      description:
        targetUser.isGuest
          ? "This will merge one guest into another guest account."
          : "This will merge the guest into a full user account.",
    };
  }, [sourceUser, targetUser]);

  function runAction(action: () => Promise<void>) {
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="min-h-screen overflow-y-auto px-4 pb-40">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black">Users</h1>
          <p className="text-sm text-muted-foreground">
            Review invitations, add direct friendships, and merge guest accounts safely.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-black">Pair actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <SearchableSelect
                  value={sourceUserId || null}
                  options={userOptions}
                  onValueChange={setSourceUserId}
                  placeholder="Select source user"
                  searchPlaceholder="Search source user"
                  emptyMessage="No users match your search."
                  disabled={isPending}
                  includeValueInSearch={false}
                  renderOption={(option) => (
                    <span className="flex min-w-0 items-center gap-2">
                      <ProfilePicture user={option.user} size="xs" />
                      <span className="truncate">{option.label}</span>
                      {option.user.isGuest ? <Badge variant="outline">Guest</Badge> : null}
                    </span>
                  )}
                  renderSelectedValue={(option) => (
                    <span className="flex min-w-0 items-center gap-2">
                      <ProfilePicture user={option.user} size="xs" />
                      <span className="truncate">{option.label}</span>
                    </span>
                  )}
                />
                <SearchableSelect
                  value={targetUserId || null}
                  options={userOptions}
                  onValueChange={setTargetUserId}
                  placeholder="Select target user"
                  searchPlaceholder="Search target user"
                  emptyMessage="No users match your search."
                  disabled={isPending}
                  includeValueInSearch={false}
                  renderOption={(option) => (
                    <span className="flex min-w-0 items-center gap-2">
                      <ProfilePicture user={option.user} size="xs" />
                      <span className="truncate">{option.label}</span>
                      {option.user.isGuest ? <Badge variant="outline">Guest</Badge> : null}
                    </span>
                  )}
                  renderSelectedValue={(option) => (
                    <span className="flex min-w-0 items-center gap-2">
                      <ProfilePicture user={option.user} size="xs" />
                      <span className="truncate">{option.label}</span>
                    </span>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Alert>
                  <UserPlus className="size-4" />
                  <AlertTitle>{friendStatus.title}</AlertTitle>
                  <AlertDescription>{friendStatus.description}</AlertDescription>
                </Alert>
                <Alert>
                  <GitMerge className="size-4" />
                  <AlertTitle>{mergeStatus.title}</AlertTitle>
                  <AlertDescription>{mergeStatus.description}</AlertDescription>
                </Alert>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  disabled={isPending || !friendStatus.canSubmit || !sourceUser || !targetUser}
                  onClick={() =>
                    runAction(async () => {
                      const result = await createAdminFriendship({
                        userAId: sourceUser!.id,
                        userBId: targetUser!.id,
                      });
                      toast.success(
                        result.status === "already_friends"
                          ? "Those users are already friends"
                          : "Friendship created",
                      );
                    })
                  }
                >
                  <UserPlus className="size-4" />
                  Add friends
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending || !mergeStatus.canSubmit || !sourceUser || !targetUser}
                  onClick={() =>
                    runAction(async () => {
                      await mergeUsersAsAdmin({
                        sourceUserId: sourceUser!.id,
                        targetUserId: targetUser!.id,
                      });
                      toast.success("Guest merged");
                      setSourceUserId("");
                    })
                  }
                >
                  <GitMerge className="size-4" />
                  Merge source into target
                </Button>
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Merge direction</p>
                <p className="mt-1">
                  The source account is deleted after its records move into the target account.
                  Only guest sources are allowed.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-black">Selection summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[sourceUser, targetUser].map((user, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-border/70 bg-background/70 p-3"
                >
                  {user ? (
                    <div className="flex items-center gap-3">
                      <ProfilePicture user={user} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{getDisplayName(user)}</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <Badge variant="outline">
                            {index === 0 ? "Source" : "Target"}
                          </Badge>
                          <Badge variant={user.isGuest ? "outline" : "default"}>
                            {user.isGuest ? "Guest" : "User"}
                          </Badge>
                          {user.playerRankLeaderboardDisabled ? (
                            <Badge variant="secondary">Leaderboard disabled</Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <UserRound className="size-4" />
                      <span>{index === 0 ? "No source selected" : "No target selected"}</span>
                    </div>
                  )}
                </div>
              ))}
              {alreadyFriends ? (
                <Alert className="border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20">
                  <ShieldAlert className="size-4" />
                  <AlertTitle>Friendship already exists</AlertTitle>
                  <AlertDescription>
                    The selected pair already has a friendship record, so add-friend is disabled.
                  </AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-black">Invitations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={getInvitationStatusTone(invitation.status)}>
                        {invitation.status}
                      </Badge>
                      <Badge variant="outline">{invitation.kind}</Badge>
                      <Badge variant="outline">{invitation.targetType}</Badge>
                    </div>
                    <p className="text-sm">
                      <span className="font-semibold">{getDisplayName(invitation.inviter)}</span>
                      {" -> "}
                      <span className="font-semibold">
                        {getInvitationTargetLabel(invitation)}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Created {new Date(invitation.createdAt).toLocaleString()}</span>
                      {invitation.guestUser ? (
                        <span>Guest: {getDisplayName(invitation.guestUser)}</span>
                      ) : null}
                      {invitation.acceptedBy ? (
                        <span>Accepted by: {getDisplayName(invitation.acceptedBy)}</span>
                      ) : null}
                    </div>
                  </div>
                  {invitation.status === "pending" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() =>
                        runAction(async () => {
                          await revokeAdminInvitation({ invitationId: invitation.id });
                          toast.success("Invitation revoked");
                        })
                      }
                    >
                      <ArrowRightLeft className="size-4" />
                      Revoke
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
            {data.invitations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                No invitations found.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
