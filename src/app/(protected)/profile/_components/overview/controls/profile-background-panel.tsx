"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { updateUserProfile } from "@/app/actions/user";
import { ProfileBackgroundSelector } from "@/components/profile/profile-background-selector";
import { useProfileOverview } from "../profile-overview-provider";
import { getProfileBackgroundUrl } from "@/lib/profile-backgrounds";

export function ProfileBackgroundPanel({
  hidePreview = false,
}: {
  hidePreview?: boolean;
}) {
  const router = useRouter();
  const { user, patchUser } = useProfileOverview();
  const [isPending, setIsPending] = useState(false);

  async function handleUpdateBackground(nextAvatarUrl: string | null) {
    const currentAvatarUrl = getProfileBackgroundUrl(user.avatarUrl);

    if (nextAvatarUrl === currentAvatarUrl || isPending) {
      return;
    }

    const previousAvatarUrl = user.avatarUrl;
    patchUser({ avatarUrl: nextAvatarUrl });
    setIsPending(true);

    try {
      await updateUserProfile({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        color: user.color,
        avatarUrl: nextAvatarUrl,
      });
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      patchUser({ avatarUrl: previousAvatarUrl });
      console.error("Failed to update profile background:", error);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="border-t border-border px-4 py-4">
      <ProfileBackgroundSelector
        hidePreview={hidePreview}
        avatarUrl={user.avatarUrl}
        color={user.color}
        firstName={user.firstName}
        lastName={user.lastName}
        onSelect={handleUpdateBackground}
        disabled={isPending}
        description="Tap a badge preview to update your profile background"
      />
    </div>
  );
}
