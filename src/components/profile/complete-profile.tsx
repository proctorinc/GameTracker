"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updateUserProfile } from "@/app/actions/user";
import { useRouter } from "next/navigation";
import { UserFull } from "@/lib/db/store/user.store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import ProfilePicture from "./profile-picture";
import { ProfileColorSelector } from "./profile-color-selector";
import { ProfileBackgroundSelector } from "./profile-background-selector";
import { getProfileBackgroundUrl } from "@/lib/profile-backgrounds";

export interface ProfileOverviewProps {
  user: UserFull;
}

export function CompleteProfile({ user }: ProfileOverviewProps) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [color, setColor] = useState(user.color);
  const [avatarUrl, setAvatarUrl] = useState(getProfileBackgroundUrl(user.avatarUrl));
  const [isPending, setIsPending] = useState(false);

  async function handleCompleteProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);

    try {
      await updateUserProfile({
        firstName,
        lastName,
        color,
        avatarUrl,
      });

      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="min-h-screen overflow-y-auto px-4 pb-40">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <Card className="relative">
          <CardHeader className="flex items-center gap-4">
            <ProfilePicture
              size="lg"
              user={{ ...user, firstName, lastName, color, avatarUrl }}
            />
            <div className="flex flex-col gap-1">
              <h2 className="text-3xl font-black tracking-tight text-foreground">
                {firstName === "" && lastName === "" ? (
                  <>Your name</>
                ) : (
                  <>
                    {firstName} {lastName}
                  </>
                )}
              </h2>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="gap-2">
            <CardTitle>Complete Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCompleteProfile} className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="complete-profile-first-name">First name</Label>
                <Input
                  id="complete-profile-first-name"
                  placeholder="First name"
                  onChange={(e) => setFirstName(e.target.value)}
                  value={firstName}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="complete-profile-last-name">Last name</Label>
                <Input
                  id="complete-profile-last-name"
                  placeholder="Last name"
                  onChange={(e) => setLastName(e.target.value)}
                  value={lastName}
                />
              </div>
              <ProfileColorSelector
                hidePreview
                color={color}
                onSelect={setColor}
                disabled={isPending}
              />
              <ProfileBackgroundSelector
                hidePreview
                avatarUrl={avatarUrl}
                color={color}
                firstName={firstName}
                lastName={lastName}
                onSelect={setAvatarUrl}
                disabled={isPending}
              />
              <Button
                type="submit"
                disabled={
                  isPending ||
                  firstName.trim() === "" ||
                  lastName.trim() === "" ||
                  color.trim() === ""
                }
                className="w-full"
              >
                {isPending ? "Saving..." : "Continue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
