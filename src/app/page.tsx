import { loadUser } from "@/lib/auth/protected-session";

export default async function Home() {
  const { user } = await loadUser();

  return (
    <div className="flex h-screen flex-col gap-4 py-8 px-4">
      <h1 className="text-4xl font-black">Hi, {user?.first_name}!</h1>
      <div className="bg-white rounded-[2rem] h-[100px]">

      </div>
      <div className="bg-white rounded-[2rem] h-[100px]">

      </div>
      <div className="bg-white rounded-[2rem] h-[100px]">

      </div>
    </div>
  );
}
