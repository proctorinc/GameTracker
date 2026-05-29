"use client";

import { createContext, useContext, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { FriendsPageData } from "@/app/actions/pages/friends";
import {
  acceptInvitation,
  createFriendInvitationByPhone,
  createFriendInvitationByUserId,
  declineInvitation,
  mergeGuestIntoFriend,
  removeFriend,
  revokeInvitation,
} from "@/app/actions/friends";
import type { RecentlyPlayedItem, TabKey } from "./utils";

type FriendsPageProviderProps = {
  data: FriendsPageData;
  baseUrl: string;
  showInviteNotice: boolean;
  children: React.ReactNode;
};

type FriendsPageContextValue = {
  data: FriendsPageData;
  baseUrl: string;
  publicProfileUrl: string;
  showInviteNotice: boolean;
  isPending: boolean;
  activeTab: TabKey;
  isInviteDialogOpen: boolean;
  activeRecentPlayer: RecentlyPlayedItem | null;
  guestPhoneInput: string;
  mergeFriendUserId: string;
  invitePhone: string;
  friendToRemove: FriendsPageData["friends"][number] | null;
  showAllFriends: boolean;
  showAllRecentlyPlayed: boolean;
  visibleFriends: FriendsPageData["friends"];
  visibleRecentlyPlayed: FriendsPageData["recentlyPlayedWith"];
  availableFriendsForMerge: FriendsPageData["friends"];
  setActiveTab: (tab: TabKey) => void;
  setInvitePhone: (value: string) => void;
  setIsInviteDialogOpen: (open: boolean) => void;
  setGuestPhoneInput: (value: string) => void;
  setMergeFriendUserId: (value: string) => void;
  setFriendToRemove: (
    friend: FriendsPageData["friends"][number] | null,
  ) => void;
  toggleShowAllFriends: () => void;
  toggleShowAllRecentlyPlayed: () => void;
  copyLink: (value: string) => Promise<void>;
  handleInviteByPhone: () => void;
  handleQuickInviteUser: (userId: string) => void;
  handleGuestPhoneInvite: () => void;
  handleGuestMerge: () => void;
  handleAcceptInvitation: (invitationId: string) => void;
  handleDeclineInvitation: (invitationId: string) => void;
  handleRevokeInvitation: (invitationId: string) => void;
  openRecentPlayerDialog: (entry: RecentlyPlayedItem) => void;
  closeRecentPlayerDialog: () => void;
  handleRemoveFriendConfirm: () => void;
};

const FriendsPageContext = createContext<FriendsPageContextValue | null>(null);

export function FriendsPageProvider({
  data,
  baseUrl,
  showInviteNotice,
  children,
}: FriendsPageProviderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<TabKey>(
    showInviteNotice ? "invitations" : "friends",
  );
  const [invitePhone, setInvitePhone] = useState("");
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

  const { friends, recentlyPlayedWith } = data;
  const activeRecentPlayerId = activeRecentPlayer?.user.id ?? null;
  const availableFriendsForMerge = useMemo(
    () => friends.filter((friend) => friend.id !== activeRecentPlayerId),
    [activeRecentPlayerId, friends],
  );
  const visibleFriends = showAllFriends ? friends : friends.slice(0, 3);
  const visibleRecentlyPlayed = showAllRecentlyPlayed
    ? recentlyPlayedWith
    : recentlyPlayedWith.slice(0, 3);
  const publicProfileUrl = baseUrl ? `${baseUrl}/profile/${data.user.id}` : "";

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

  function closeRecentPlayerDialog() {
    setActiveRecentPlayer(null);
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

  const value: FriendsPageContextValue = {
    data,
    baseUrl,
    publicProfileUrl,
    showInviteNotice,
    isPending,
    activeTab,
    isInviteDialogOpen,
    activeRecentPlayer,
    guestPhoneInput,
    mergeFriendUserId,
    invitePhone,
    friendToRemove,
    showAllFriends,
    showAllRecentlyPlayed,
    visibleFriends,
    visibleRecentlyPlayed,
    availableFriendsForMerge,
    setActiveTab,
    setInvitePhone,
    setIsInviteDialogOpen,
    setGuestPhoneInput,
    setMergeFriendUserId,
    setFriendToRemove,
    toggleShowAllFriends() {
      setShowAllFriends((current) => !current);
    },
    toggleShowAllRecentlyPlayed() {
      setShowAllRecentlyPlayed((current) => !current);
    },
    copyLink,
    handleInviteByPhone,
    handleQuickInviteUser,
    handleGuestPhoneInvite,
    handleGuestMerge,
    handleAcceptInvitation(invitationId) {
      handleInvitationAction(acceptInvitation, invitationId, {
        loading: "Accepting invitation...",
        success: "Invitation accepted",
        error: "Failed to accept invitation",
      });
    },
    handleDeclineInvitation(invitationId) {
      handleInvitationAction(declineInvitation, invitationId, {
        loading: "Declining invitation...",
        success: "Invitation declined",
        error: "Failed to decline invitation",
      });
    },
    handleRevokeInvitation(invitationId) {
      handleInvitationAction(revokeInvitation, invitationId, {
        loading: "Canceling invitation...",
        success: "Invitation canceled",
        error: "Failed to cancel invitation",
      });
    },
    openRecentPlayerDialog,
    closeRecentPlayerDialog,
    handleRemoveFriendConfirm,
  };

  return (
    <FriendsPageContext.Provider value={value}>
      {children}
    </FriendsPageContext.Provider>
  );
}

export function useFriendsPage() {
  const context = useContext(FriendsPageContext);

  if (!context) {
    throw new Error("useFriendsPage must be used within a FriendsPageProvider");
  }

  return context;
}
