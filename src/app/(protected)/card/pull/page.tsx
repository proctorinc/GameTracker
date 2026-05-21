import { loadUser } from "@/lib/auth/protected-session";
import CardOpening from "@/components/card/card-opening";
import { createUserCard } from "@/lib/db/cards-store";

export default async function CreateProfilePage() {
  const { user } = await loadUser();

  if (!user) {
    return <div>Error</div>
  }

  return (
    <div className="h-screen overflow-clip">
      <CardOpening user={user} />
    </div>
  );
}
