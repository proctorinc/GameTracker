import { CompleteProfile } from "@/components/profile/complete-profile";
import { loadUser } from "@/lib/auth/protected-session";

export default async function CreateProfilePage() {
  const { user } = await loadUser();

  if (!user) {
    return <div>Loading...</div>
  }

  // Cast UserBase to UserFull - CompleteProfile handles optional relations
  return (
    <CompleteProfile user={user as any} />
  );
}
