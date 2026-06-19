import { auth } from "@clerk/nextjs/server";
import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadOptionalCurrentUser } from "@/lib/auth/auth-me";
import {
  DEFAULT_RETURN_PATH,
  sanitizeReturnPath,
} from "@/lib/auth/return-path";

export default async function RegisterPage({
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Create account</CardTitle>
        </CardHeader>
        <CardContent>
          <SignUp
            path="/register"
            routing="path"
            signInUrl="/login"
            fallbackRedirectUrl={target}
          />
        </CardContent>
      </Card>
    </div>
  );
}
