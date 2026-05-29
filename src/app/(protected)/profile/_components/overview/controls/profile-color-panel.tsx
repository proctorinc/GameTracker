"use client";

import { useRouter } from "next/navigation";
import { updateUserProfile } from "@/app/actions/user";
import { ProfileColorSelector } from "@/components/profile/profile-color-selector";
import { useProfileOverview } from "../profile-overview-provider";
import { useState } from "react";

export function ProfileColorPanel({
  hidePreview = false,
}: {
  hidePreview?: boolean;
}) {
  const router = useRouter();
  const { user, patchUser } = useProfileOverview();
  const [isPending, setIsPending] = useState(false);

  async function handleUpdateColor(nextColor: string) {
    if (nextColor === user.color || isPending) {
      return;
    }

    const previousColor = user.color;
    patchUser({ color: nextColor });
    setIsPending(true);

    try {
      await updateUserProfile({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        color: nextColor,
      });
      router.refresh();
    } catch (error) {
      patchUser({ color: previousColor });
      console.error("Failed to update profile color:", error);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="border-t border-border px-4 py-4">
      <ProfileColorSelector
        hidePreview={hidePreview}
        color={user.color}
        onSelect={handleUpdateColor}
        disabled={isPending}
        description="Click a swatch to update your profile color"
      />
    </div>
  );
}
