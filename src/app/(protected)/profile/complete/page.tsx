import { CompleteProfile } from "@/components/profile/complete-profile";
import { loadUser } from "@/lib/auth/protected-session";
import { logInfo } from "@/lib/server-log";
import { redirect } from "next/navigation";

export default async function CreateProfilePage() {
  const { user } = await loadUser();

  if (!user) {
    return <div>Loading...</div>
  }

  if (user.isProfileComplete) {
    logInfo("profile.complete_page.redirected", {
      reason: "profile_already_complete",
      userId: user.id,
    });
    redirect("/dashboard");
  }

  // Cast UserBase to UserFull - CompleteProfile handles optional relations
  return (
    <CompleteProfile user={user as any} />
  );
}
