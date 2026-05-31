"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  acceptInvitation,
  createFriendInvitationByPhone,
  createFriendInvitationByUserId,
  createFriendInvitationLink,
  declineInvitation,
  mergeGuestIntoFriend,
  removeFriend,
  revokeInvitation,
} from "@/app/actions/friends";
import type { FriendsPageData } from "@/app/actions/pages/friends";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardEmpty,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneNumberInput } from "@/components/ui/phone-number-input";
import {
  AlertCircle,
  Check,
  Link2,
  Phone,
  Plus,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import ProfilePicture from "../profile/profile-picture";

type FriendsPageClientProps = {
  data: FriendsPageData;
  inviteBaseUrl: string;
  showInviteNotice: boolean;
};

type TabKey = "friends" | "invitations";
type RecentlyPlayedItem = FriendsPageData["recentlyPlayedWith"][number];

function getDisplayName(input: {
  firstName?: string | null;
  lastName?: string | null;
}) {
  return (
    [input.firstName, input.lastName].filter(Boolean).join(" ") ||
    "Unnamed user"
  );
}

function formatLastPlayedAt(value: string | null) {
  if (!value) {
    return "Played together";
  }

  return `Played ${new Date(value).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  })}`;
}

export function FriendsPageClient({
  data,
  inviteBaseUrl,
  showInviteNotice,
}: FriendsPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<TabKey>(
    showInviteNotice ? "invitations" : "friends",
  );
  const [invitePhone, setInvitePhone] = useState("");
  const [latestInviteLink, setLatestInviteLink] = useState<string | null>(null);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [activeRecentPlayer, setActiveRecentPlayer] =
    useState<RecentlyPlayedItem | null>(null);
  const [guestPhoneInput, setGuestPhoneInput] = useState("");
  const [mergeFriendUserId, setMergeFriendUserId] = useState("");
  const [friendToRemove, setFriendToRemove] = useState<
    FriendsPageData["friends"][number] | null
  >(null);
  const [showAllFriends, setShowAllFriends] = useState(false);
  const [showAllRecentlyPlayed, setShowAllRecentlyPlayed] = useState(false);

  const {
    friends,
    incomingInvitations,
    outgoingInvitations,
    recentlyPlayedWith,
  } = data;
  const activeRecentPlayerId = activeRecentPlayer?.user.id ?? null;

  const availableFriendsForMerge = useMemo(
    () => friends.filter((friend) => friend.id !== activeRecentPlayerId),
    [activeRecentPlayerId, friends],
  );
  const visibleFriends = showAllFriends ? friends : friends.slice(0, 3);
  const visibleRecentlyPlayed = showAllRecentlyPlayed
    ? recentlyPlayedWith
    : recentlyPlayedWith.slice(0, 3);

  function refreshWithSuccess(message: string) {
    router.refresh();
    toast.success(message);
  }

  function runAsyncAction<T>(
    work: () => Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    },
    onSuccess?: (result: T) => void | Promise<void>,
  ) {
    startTransition(async () => {
      const loadingId = toast.loading(messages.loading);

      try {
        const result = await work();
        await onSuccess?.(result);
        toast.dismiss(loadingId);
        refreshWithSuccess(messages.success);
      } catch (error) {
        toast.dismiss(loadingId);
        toast.error(error instanceof Error ? error.message : messages.error);
      }
    });
  }

  function copyLink(value: string) {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(value);
    }

    return Promise.resolve();
  }

  function handleInviteByPhone() {
    if (!invitePhone.trim()) {
      toast.error("Enter a phone number");
      return;
    }

    const formData = new FormData();
    formData.set("phoneNumber", invitePhone);

    runAsyncAction(
      () => createFriendInvitationByPhone(formData),
      {
        loading: "Creating invitation...",
        success: "Invitation created",
        error: "Failed to create invitation",
      },
      () => {
        setInvitePhone("");
        setIsInviteDialogOpen(false);
        setActiveTab("invitations");
      },
    );
  }

  function handleCreateLink(guestUserId?: string) {
    const formData = new FormData();
    if (guestUserId) {
      formData.set("guestUserId", guestUserId);
    }

    runAsyncAction(
      () => createFriendInvitationLink(formData),
      {
        loading: "Creating invite link...",
        success: "Invite link created",
        error: "Failed to create invite link",
      },
      async (result) => {
        if (!result.invitePath) {
          return;
        }

        const absoluteLink = `${inviteBaseUrl}${result.invitePath}`;
        setLatestInviteLink(absoluteLink);
        await copyLink(absoluteLink);
        toast.success("Invite link copied");
        setActiveRecentPlayer(null);
        setActiveTab("invitations");
      },
    );
  }

  function handleQuickInviteUser(userId: string) {
    runAsyncAction(
      () => createFriendInvitationByUserId({ inviteeUserId: userId }),
      {
        loading: "Creating invitation...",
        success: "Invitation created",
        error: "Failed to create invitation",
      },
      () => {
        setActiveTab("invitations");
      },
    );
  }

  function handleGuestPhoneInvite() {
    if (!activeRecentPlayer) {
      return;
    }

    if (!guestPhoneInput.trim()) {
      toast.error("Enter a phone number for the guest");
      return;
    }

    const formData = new FormData();
    formData.set("guestUserId", activeRecentPlayer.user.id);
    formData.set("phoneNumber", guestPhoneInput);

    runAsyncAction(
      () => createFriendInvitationByPhone(formData),
      {
        loading: "Creating guest invite...",
        success: "Guest invite created",
        error: "Failed to create guest invite",
      },
      () => {
        setGuestPhoneInput("");
        setMergeFriendUserId("");
        setActiveRecentPlayer(null);
        setActiveTab("invitations");
      },
    );
  }

  function handleGuestMerge() {
    if (!activeRecentPlayer) {
      return;
    }

    if (!mergeFriendUserId.trim()) {
      toast.error("Choose a friend to merge into");
      return;
    }

    runAsyncAction(
      () =>
        mergeGuestIntoFriend({
          guestUserId: activeRecentPlayer.user.id,
          friendUserId: mergeFriendUserId,
        }),
      {
        loading: "Merging guest...",
        success: "Guest merged into friend",
        error: "Failed to merge guest",
      },
      () => {
        setGuestPhoneInput("");
        setMergeFriendUserId("");
        setActiveRecentPlayer(null);
      },
    );
  }

  function handleInvitationAction(
    action: (formData: FormData) => Promise<unknown>,
    invitationId: string,
    messages: {
      loading: string;
      success: string;
      error: string;
    },
  ) {
    const formData = new FormData();
    formData.set("invitationId", invitationId);
    runAsyncAction(() => action(formData), messages);
  }

  function openRecentPlayerDialog(entry: RecentlyPlayedItem) {
    setActiveRecentPlayer(entry);
    setGuestPhoneInput("");
    setMergeFriendUserId("");
  }

  function handleRemoveFriendConfirm() {
    if (!friendToRemove) {
      return;
    }

    runAsyncAction(
      () => removeFriend({ friendUserId: friendToRemove.id }),
      {
        loading: "Removing friend...",
        success: "Friend removed",
        error: "Failed to remove friend",
      },
      () => {
        setFriendToRemove(null);
      },
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto px-4 py-6 pb-40">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-black">My Friends</h1>
          <div className="flex items-center gap-2">
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => setIsInviteDialogOpen(true)}
            >
              <Plus />
              <span className="sr-only">Invite friend</span>
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => handleCreateLink()}
            >
              <Link2 />
              <span className="sr-only">Create share link</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-muted/70 p-1">
          <Button
            variant={activeTab === "friends" ? "default" : "ghost"}
            className="rounded-xl"
            onClick={() => setActiveTab("friends")}
          >
            <Users />
            My friends
          </Button>
          <Button
            variant={activeTab === "invitations" ? "default" : "ghost"}
            className="rounded-xl"
            size="lg"
            onClick={() => setActiveTab("invitations")}
          >
            <UserPlus />
            Invitations
          </Button>
        </div>

        {showInviteNotice && activeTab === "invitations" ? (
          <Card size="sm">
            <CardContent className="flex items-center gap-2 pt-4 text-sm text-muted-foreground">
              <AlertCircle className="size-4" /> Pending invitations need your
              review.
            </CardContent>
          </Card>
        ) : null}

        {latestInviteLink && activeTab === "invitations" ? (
          <Card size="sm">
            <CardContent className="flex items-center gap-3 pt-4">
              <Link2 className="size-4 shrink-0 text-muted-foreground" />
              <p className="min-w-0 flex-1 truncate text-sm">
                {latestInviteLink}
              </p>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => {
                  copyLink(latestInviteLink).then(() => {
                    toast.success("Invite link copied");
                  });
                }}
              >
                <Link2 />
                <span className="sr-only">Copy latest invite link</span>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {activeTab === "friends" ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>My Friends</CardTitle>
              </CardHeader>
              <CardContent>
                {friends.length === 0 ? (
                  <CardEmpty>No friends yet</CardEmpty>
                ) : (
                  <div className="flex flex-col gap-2">
                    {visibleFriends.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center gap-3 rounded-2xl border border-border bg-muted/60 px-4 py-3"
                      >
                        <ProfilePicture user={friend} size="sm" linkToProfile />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">
                            {getDisplayName(friend)}
                          </p>
                        </div>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          disabled={isPending}
                          onClick={() => setFriendToRemove(friend)}
                        >
                          <Trash2 />
                          <span className="sr-only">Remove friend</span>
                        </Button>
                      </div>
                    ))}
                    {friends.length > 3 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="self-start"
                        onClick={() => setShowAllFriends((current) => !current)}
                      >
                        {showAllFriends
                          ? "Show less"
                          : `Show all (${friends.length})`}
                      </Button>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recently Played With</CardTitle>
              </CardHeader>
              <CardContent>
                {recentlyPlayedWith.length === 0 ? (
                  <CardEmpty>No recent players yet</CardEmpty>
                ) : (
                  <div className="flex flex-col gap-2">
                    {visibleRecentlyPlayed.map((entry) => (
                      <div
                        key={entry.user.id}
                        className="flex items-center gap-3 rounded-2xl border border-border bg-muted/60 px-4 py-3"
                      >
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          onClick={() =>
                            entry.user.isGuest
                              ? openRecentPlayerDialog(entry)
                              : undefined
                          }
                        >
                          <ProfilePicture user={entry.user} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">
                              {getDisplayName(entry.user)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatLastPlayedAt(entry.lastPlayedAt)}
                            </p>
                          </div>
                        </button>
                        {entry.user.isGuest ? (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() => openRecentPlayerDialog(entry)}
                          >
                            <UserPlus />
                            <span className="sr-only">Open guest actions</span>
                          </Button>
                        ) : entry.pendingInvitation ? (
                          <Badge variant="outline">Pending</Badge>
                        ) : (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() => handleQuickInviteUser(entry.user.id)}
                          >
                            <UserPlus />
                            <span className="sr-only">
                              Invite to be friends
                            </span>
                          </Button>
                        )}
                      </div>
                    ))}
                    {recentlyPlayedWith.length > 3 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="self-start"
                        onClick={() =>
                          setShowAllRecentlyPlayed((current) => !current)
                        }
                      >
                        {showAllRecentlyPlayed
                          ? "Show less"
                          : `Show all (${recentlyPlayedWith.length})`}
                      </Button>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Invitations</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                {incomingInvitations.length === 0 ? (
                  <CardEmpty>No incoming invites</CardEmpty>
                ) : (
                  incomingInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-muted/60 px-4 py-3"
                    >
                      <ProfilePicture user={invitation.inviter} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {getDisplayName(invitation.inviter)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {invitation.kind === "claim_guest"
                            ? "Claim guest history"
                            : "Friend invitation"}
                        </p>
                      </div>
                      <Button
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() =>
                          handleInvitationAction(
                            acceptInvitation,
                            invitation.id,
                            {
                              loading: "Accepting invitation...",
                              success: "Invitation accepted",
                              error: "Failed to accept invitation",
                            },
                          )
                        }
                      >
                        <Check />
                        <span className="sr-only">Accept invitation</span>
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() =>
                          handleInvitationAction(
                            declineInvitation,
                            invitation.id,
                            {
                              loading: "Declining invitation...",
                              success: "Invitation declined",
                              error: "Failed to decline invitation",
                            },
                          )
                        }
                      >
                        <X />
                        <span className="sr-only">Decline invitation</span>
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {outgoingInvitations.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {outgoingInvitations.map((invitation) => {
                    const linkValue = invitation.inviteToken
                      ? `${inviteBaseUrl}/invite/${invitation.inviteToken}`
                      : null;

                    return (
                      <div
                        key={invitation.id}
                        className="flex items-center gap-3 rounded-2xl border border-border bg-muted/60 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">
                            {invitation.invitee
                              ? getDisplayName(invitation.invitee)
                              : invitation.inviteePhoneNumber || "Share link"}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">
                            {linkValue ?? invitation.status}
                          </p>
                        </div>
                        {linkValue ? (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() => {
                              copyLink(linkValue).then(() => {
                                toast.success("Invite link copied");
                              });
                            }}
                          >
                            <Link2 />
                            <span className="sr-only">Copy invite link</span>
                          </Button>
                        ) : null}
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          disabled={isPending}
                          onClick={() =>
                            handleInvitationAction(
                              revokeInvitation,
                              invitation.id,
                              {
                                loading: "Canceling invitation...",
                                success: "Invitation canceled",
                                error: "Failed to cancel invitation",
                              },
                            )
                          }
                        >
                          <X />
                          <span className="sr-only">Cancel invitation</span>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Friend</DialogTitle>
            <DialogDescription>
              Invite by phone. If they already have an account, we will match it
              after they verify that number.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="invite-phone">Phone</FieldLabel>
              <FieldContent>
                <PhoneNumberInput
                  id="invite-phone"
                  value={invitePhone}
                  onChange={setInvitePhone}
                  disabled={isPending}
                />
                <FieldDescription>
                  Use a phone number or share a personal invite link instead.
                </FieldDescription>
              </FieldContent>
            </Field>
            <Button
              type="button"
              disabled={isPending}
              onClick={handleInviteByPhone}
            >
              <Phone /> Invite by phone
            </Button>
          </FieldGroup>

          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(activeRecentPlayer)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveRecentPlayer(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {activeRecentPlayer
                ? getDisplayName(activeRecentPlayer.user)
                : "Player"}
            </DialogTitle>
            <DialogDescription>
              Invite this guest by phone, merge them into an existing friend, or
              create a share link.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="guest-phone">Phone</FieldLabel>
              <FieldContent>
                <PhoneNumberInput
                  id="guest-phone"
                  value={guestPhoneInput}
                  onChange={setGuestPhoneInput}
                  disabled={isPending}
                />
              </FieldContent>
            </Field>
            <Button
              type="button"
              disabled={isPending}
              onClick={handleGuestPhoneInvite}
            >
              <Phone /> Invite by phone
            </Button>
          </FieldGroup>

          {availableFriendsForMerge.length > 0 ? (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="guest-merge-friend">
                  Merge with friend
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="guest-merge-friend"
                    list="friend-merge-options"
                    placeholder="Friend user id"
                    value={mergeFriendUserId}
                    onChange={(event) =>
                      setMergeFriendUserId(event.target.value)
                    }
                    disabled={isPending}
                  />
                  <datalist id="friend-merge-options">
                    {availableFriendsForMerge.map((friend) => (
                      <option key={friend.id} value={friend.id}>
                        {getDisplayName(friend)}
                      </option>
                    ))}
                  </datalist>
                </FieldContent>
              </Field>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={handleGuestMerge}
              >
                <Users /> Merge with friend
              </Button>
            </FieldGroup>
          ) : null}

          <Button
            type="button"
            variant="outline"
            disabled={isPending || !activeRecentPlayer}
            onClick={() =>
              activeRecentPlayer && handleCreateLink(activeRecentPlayer.user.id)
            }
          >
            <Link2 /> Create link
          </Button>

          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(friendToRemove)}
        onOpenChange={(open) => {
          if (!open) {
            setFriendToRemove(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Friend</DialogTitle>
            <DialogDescription>
              This will remove{" "}
              {friendToRemove ? getDisplayName(friendToRemove) : "this friend"}{" "}
              from your friends list.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Please confirm again to continue.
          </p>
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={handleRemoveFriendConfirm}
            >
              <Trash2 /> Remove friend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
