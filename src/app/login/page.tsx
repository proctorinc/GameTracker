import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import LoginForm from "./login-form";
import {
  DEFAULT_RETURN_PATH,
  sanitizeReturnPath,
} from "@/lib/auth/return-path";
import { loadOptionalCurrentUser } from "@/lib/auth/auth-me";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ from }, clerkAuth, currentUser] = await Promise.all([
    searchParams,
    auth(),
    loadOptionalCurrentUser(),
  ]);
  const target = sanitizeReturnPath(from ?? DEFAULT_RETURN_PATH);

  if (clerkAuth.userId && currentUser) {
    redirect(currentUser.isProfileComplete ? target : "/profile/complete");
  }

  return <LoginForm fallbackRedirectUrl={target} />;
}
