"use client";

import { startTransition, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateUserProfile } from "@/app/actions/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfileOverview } from "../profile-overview-provider";

export function EditNameForm() {
  const router = useRouter();
  const { user, patchUser } = useProfileOverview();
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);

    const previousProfile = {
      firstName: user.firstName,
      lastName: user.lastName,
    };

    patchUser({
      firstName,
      lastName,
    });

    try {
      await updateUserProfile({
        firstName,
        lastName,
        color: user.color,
      });
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      patchUser(previousProfile);
      console.error("Failed to update profile:", error);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      className="grid gap-4 border-t border-border px-4 py-4"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-2">
        <Label htmlFor="first-name">First name</Label>
        <Input
          id="first-name"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          placeholder="First name"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="last-name">Last name</Label>
        <Input
          id="last-name"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          placeholder="Last name"
        />
      </div>
      <Button
        type="submit"
        disabled={
          isPending ||
          firstName.trim() === "" ||
          lastName.trim() === "" ||
          (firstName === (user.firstName ?? "") &&
            lastName === (user.lastName ?? ""))
        }
      >
        {isPending ? "Saving..." : "Update"}
      </Button>
    </form>
  );
}
