"use client";

import { SignIn } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
type LoginFormProps = {
  fallbackRedirectUrl: string;
};

export default function LoginForm({ fallbackRedirectUrl }: LoginFormProps) {

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Login</CardTitle>
        </CardHeader>

        <CardContent>
          <SignIn
            path="/login"
            routing="path"
            signUpUrl="/register"
            withSignUp
            fallbackRedirectUrl={fallbackRedirectUrl}
          />
        </CardContent>
      </Card>
    </div>
  );
}
