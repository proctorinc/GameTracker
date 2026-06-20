import { loadUser } from "@/lib/auth/protected-session";
import { redirect } from "next/navigation";

export async function requireAdminPageUser() {
  const { user } = await loadUser();

  if (!user || user.role !== "admin") {
    redirect("/profile");
  }

  return user;
}
