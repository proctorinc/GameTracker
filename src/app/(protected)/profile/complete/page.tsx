import { CompleteProfile } from "@/components/profile/complete-profile";
import { loadUser } from "@/lib/auth/protected-session";

export default async function CreateProfilePage() {
  const { user } = await loadUser();

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <CompleteProfile user={user} />
  );
}
