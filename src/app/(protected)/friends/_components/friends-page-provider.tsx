"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { FriendsPageData } from "@/app/actions/pages/friends";
import { getOrCreateFriendInviteLink } from "@/app/actions/user";
import {
  acceptInvitation,
  createFriendInvitationLink,
  createFriendInvitationByUserId,
  declineInvitation,
  mergeGuestIntoFriend,
  removeFriend,
  revokeInvitation,
} from "@/app/actions/friends";
import { usePageAutoRefresh } from "@/lib/use-page-auto-refresh";
import { useRememberedPageTabState } from "@/lib/use-remembered-page-tab-state";
import type { RecentlyPlayedItem, TabKey } from "./utils";
import { APP_NAME } from "@/lib/app-config";

const FRIENDS_TAB_STORAGE_KEY = "page-tab:/friends";
const FRIENDS_TABS = ["activity", "friends"] as const;

type FriendsPageProviderProps = {
  data: FriendsPageData;
  showInviteNotice: boolean;
  children: React.ReactNode;
};

type FriendsPageContextValue = {
  data: FriendsPageData;
  showInviteNotice: boolean;
  isPending: boolean;
  activeTab: TabKey;
  activeRecentPlayer: RecentlyPlayedItem | null;
  friendToRemove: FriendsPageData["friends"][number] | null;
  guestActionMode: "merge" | null;
  mergeFriendUserId: string;
  showAllFriends: boolean;
  showAllRecentlyPlayed: boolean;
  visibleFriends: FriendsPageData["friends"];
  visibleRecentlyPlayed: FriendsPageData["recentlyPlayedWith"];
  availableFriendsForMerge: FriendsPageData["friends"];
  setActiveTab: (tab: TabKey) => void;
  setFriendToRemove: (friend: FriendsPageData["friends"][number] | null) => void;
  setMergeFriendUserId: (value: string) => void;
  setGuestActionMode: (value: "merge" | null) => void;
  toggleShowAllFriends: () => void;
  toggleShowAllRecentlyPlayed: () => void;
  handleCreateInviteLink: (guestUserId?: string) => void;
  handleQuickInviteUser: (userId: string) => void;
  handleReshareInvitation: (input: {
    invitePath: string;
    guestName?: string | null;
  }) => Promise<void>;
  handleGuestMerge: () => void;
  handleRemoveFriendConfirm: () => void;
  handleAcceptInvitation: (invitationId: string) => void;
  handleDeclineInvitation: (invitationId: string) => void;
  handleRevokeInvitation: (invitationId: string) => void;
  openRecentPlayerDialog: (entry: RecentlyPlayedItem) => void;
  closeRecentPlayerDialog: () => void;
};

const FriendsPageContext = createContext<FriendsPageContextValue | null>(null);

export function FriendsPageProvider({
  data,
  showInviteNotice,
  children,
}: FriendsPageProviderProps) {
  usePageAutoRefresh();

  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const hasPendingInvitations = data.incomingInvitations.length > 0;
  const [activeTab, setActiveTab] = useRememberedPageTabState<TabKey>({
    storageKey: FRIENDS_TAB_STORAGE_KEY,
    initialValue: showInviteNotice || hasPendingInvitations ? "friends" : "activity",
    validTabs: FRIENDS_TABS,
  });
  const [activeRecentPlayer, setActiveRecentPlayer] =
    useState<RecentlyPlayedItem | null>(null);
  const [friendToRemove, setFriendToRemove] = useState<
    FriendsPageData["friends"][number] | null
  >(null);
  const [guestActionMode, setGuestActionMode] = useState<"merge" | null>(null);
  const [mergeFriendUserId, setMergeFriendUserId] = useState("");
  const [showAllFriends, setShowAllFriends] = useState(false);
  const [showAllRecentlyPlayed, setShowAllRecentlyPlayed] = useState(false);

  const { friends, recentlyPlayedWith } = data;
  const activeRecentPlayerId = activeRecentPlayer?.user.id ?? null;
  const availableFriendsForMerge = useMemo(
    () => friends.filter((friend) => friend.id !== activeRecentPlayerId),
    [activeRecentPlayerId, friends],
  );
  const visibleRecentlyPlayed = showAllRecentlyPlayed
    ? recentlyPlayedWith
    : recentlyPlayedWith.slice(0, 3);
  const visibleFriends = showAllFriends ? friends : friends.slice(0, 3);

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

  function runAsyncActionSilently<T>(
    work: () => Promise<T>,
    errorMessage: string,
    onSuccess?: (result: T) => void | Promise<void>,
  ) {
    startTransition(async () => {
      try {
        const result = await work();
        await onSuccess?.(result);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : errorMessage);
      }
    });
  }

  async function shareInvitationLink(input: {
    inviteUrl: string;
    title: string;
    text: string;
    copiedMessage: string;
    errorMessage: string;
  }) {
    try {
      if (navigator.share) {
        await navigator.share({
          title: input.title,
          text: input.text,
          url: input.inviteUrl,
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(input.inviteUrl);
        toast.success(input.copiedMessage);
        return;
      }

      toast.error("Sharing is not supported on this device");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      toast.error(input.errorMessage);
    }
  }

  async function handleReshareInvitation(input: {
    invitePath: string;
    guestName?: string | null;
  }) {
    const guestName = input.guestName?.trim() || "your guest profile";

    await shareInvitationLink({
      inviteUrl: `${window.location.origin}${input.invitePath}`,
      title: `${APP_NAME} invitation`,
      text: `Claim ${guestName} on ${APP_NAME} and keep the game history.`,
      copiedMessage: "Invitation link copied",
      errorMessage: "Unable to share the invitation link",
    });
  }

  function handleCreateInviteLink(guestUserId?: string) {
    const formData = new FormData();
    if (guestUserId) {
      formData.set("guestUserId", guestUserId);
    }

    runAsyncActionSilently(
      () =>
        guestUserId
          ? createFriendInvitationLink(formData).then((result) => ({
              invitePath: result.invitePath,
            }))
          : getOrCreateFriendInviteLink().then((result) => ({
              invitePath: result.invitePath,
            })),
      guestUserId ? "Failed to create invitation link" : "Failed to load invitation link",
      async (result) => {
        if (!result.invitePath) {
          throw new Error("Invite link was not created");
        }

        await shareInvitationLink({
          inviteUrl: `${window.location.origin}${result.invitePath}`,
          title: `${APP_NAME} invitation`,
          text: guestUserId
            ? `Claim your guest profile on ${APP_NAME} and keep the game history.`
            : `Join me on ${APP_NAME}.`,
          copiedMessage: guestUserId
            ? "Invitation link copied"
            : "Invitation link copied",
          errorMessage: guestUserId
            ? "Unable to share the invitation link"
            : "Unable to share the invitation link",
        });
        setActiveRecentPlayer(null);
        setGuestActionMode(null);
        setActiveTab("friends");
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
        setActiveTab("friends");
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
        setMergeFriendUserId("");
        setActiveRecentPlayer(null);
      },
    );
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
    setGuestActionMode(null);
    setMergeFriendUserId("");
  }

  function closeRecentPlayerDialog() {
    setActiveRecentPlayer(null);
    setGuestActionMode(null);
    setMergeFriendUserId("");
  }

  const value: FriendsPageContextValue = {
    data,
    showInviteNotice,
    isPending,
    activeTab,
    activeRecentPlayer,
    friendToRemove,
    guestActionMode,
    mergeFriendUserId,
    showAllFriends,
    showAllRecentlyPlayed,
    visibleFriends,
    visibleRecentlyPlayed,
    availableFriendsForMerge,
    setActiveTab,
    setFriendToRemove,
    setMergeFriendUserId,
    setGuestActionMode,
    toggleShowAllFriends() {
      setShowAllFriends((current) => !current);
    },
    toggleShowAllRecentlyPlayed() {
      setShowAllRecentlyPlayed((current) => !current);
    },
    handleCreateInviteLink,
    handleQuickInviteUser,
    handleReshareInvitation,
    handleGuestMerge,
    handleRemoveFriendConfirm,
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
