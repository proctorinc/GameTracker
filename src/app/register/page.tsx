import { auth } from "@clerk/nextjs/server";
import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadOptionalCurrentUser } from "@/lib/auth/auth-me";

export default async function RegisterPage() {
  const [clerkAuth, currentUser] = await Promise.all([
    auth(),
    loadOptionalCurrentUser(),
  ]);

  if (clerkAuth.userId && currentUser) {
    redirect(currentUser.isProfileComplete ? "/dashboard" : "/profile/complete");
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
            fallbackRedirectUrl="/profile/complete"
          />
        </CardContent>
      </Card>
    </div>
  );
}
