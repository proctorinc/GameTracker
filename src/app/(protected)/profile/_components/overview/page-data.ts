import "server-only";

import { loadCurrentUser } from "@/lib/auth/auth-me";
import { getUserById } from "@/lib/db/store";
import type { ProfileOverviewPageData } from "./types";

export async function getProfileOverviewPageData(): Promise<ProfileOverviewPageData> {
  const sessionUser = await loadCurrentUser();
  const user = await getUserById(sessionUser.id);

  if (!user) {
    throw new Error("Authenticated user not found");
  }

  return {
    user: {
      id: user.id,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      color: user.color,
      phoneNumber: user.phoneNumber,
      createdAt: user.createdAt,
      publicProfileUrl: "",
    },
  };
}
