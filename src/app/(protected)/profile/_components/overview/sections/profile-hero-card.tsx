"use client";

import ProfilePicture from "@/components/profile/profile-picture";
import { Card, CardHeader } from "@/components/ui/card";
import { useProfileOverview } from "../profile-overview-provider";

function formatMemberSince(createdAt: string | null) {
  if (!createdAt) {
    return "User since recently";
  }

  return `User since ${new Date(createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })}`;
}

function formatDisplayName(input: {
  firstName: string | null;
  lastName: string | null;
}) {
  return (
    [input.firstName, input.lastName].filter(Boolean).join(" ") ||
    "Your profile"
  );
}

export function ProfileHeroCard() {
  const { user } = useProfileOverview();

  return (
    <Card className="relative">
      <CardHeader className="flex items-center gap-4">
        <ProfilePicture size="lg" user={user} />
        <div className="z-10 flex flex-col justify-center gap-1">
          <h2 className="text-3xl font-black tracking-tight text-foreground">
            {formatDisplayName(user)}
          </h2>
          <div className="flex flex-col gap-1">
            <p>{formatMemberSince(user.createdAt)}</p>
            <p>{user.phoneNumber}</p>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
