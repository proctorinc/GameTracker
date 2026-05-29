"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getPostLoginPath } from "@/lib/auth/post-login-path";
import { sanitizeReturnPath } from "@/lib/auth/return-path";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";

const IS_DEV = true;

interface LoginFormState {
  phone?: string;
  otpCode?: string;
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<LoginFormState>({
    phone: IS_DEV ? "15550009999" : "",
    otpCode: "",
  });

  async function loginWithPhone(phone: string, code?: string) {
    setLoading(true);
    setError(null);

    try {
      if (!IS_DEV) {
        const requestRes = await fetch("/api/auth/otp/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        });
        const requestData = await requestRes.json();
        if (!requestRes.ok) {
          throw new Error(
            requestData.error || "Failed to send verification code",
          );
        }
      }

      const verifyRes = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: code ?? "000000" }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Failed to sign in");
      }

      router.push(
        getPostLoginPath({
          requestedPath: searchParams.get("from"),
          hasPendingInvitations: Boolean(verifyData.hasPendingInvitations),
        }),
      );
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to sign in");
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setLoading(false);
    }
  }

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.phone) return;

    if (IS_DEV) {
      await loginWithPhone(formData.phone);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formData.phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send verification code");
      }

      setStep(2);
    } catch (err: unknown) {
      toast.error("Failed to send verification code");
      setError(
        err instanceof Error ? err.message : "Failed to send verification code",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.phone) return;
    await loginWithPhone(formData.phone, formData.otpCode);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Login</CardTitle>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {step === 1 || IS_DEV ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <InputOTP
                type="tel"
                autoComplete="tel"
                maxLength={10}
                value={formData.phone}
                onChange={(value) => setFormData({ ...formData, phone: value })}
                required
              >
                <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:text-xl *:data-[slot=input-otp-slot]:border">
                  <InputOTPSlot index={0} autoFocus />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSeparator />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                  <InputOTPSeparator />
                  <InputOTPSlot index={6} />
                  <InputOTPSlot index={7} />
                  <InputOTPSlot index={8} />
                  <InputOTPSlot index={9} />
                </InputOTPGroup>
              </InputOTP>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Signing in…" : IS_DEV ? "Sign in" : "Send Code"}
              </Button>

              {!IS_DEV && (
                <p className="mt-4 text-sm text-gray-500 text-center">
                  We will send a 6-digit code via SMS.
                </p>
              )}
            </form>
          ) : (
            <form onSubmit={handleOtpVerify} className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <div className="flex w-full justify-center">
                <InputOTP
                  type="number"
                  maxLength={6}
                  value={formData.otpCode}
                  onChange={(value) =>
                    setFormData({ ...formData, otpCode: value })
                  }
                >
                  <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                    <InputOTPSlot index={0} autoFocus />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Verifying…" : "Verify Code"}
              </Button>

              <p className="mt-4 text-sm text-gray-500 text-center">
                Didn&apos;t receive the code?{" "}
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-blue-600 hover:underline"
                >
                  Resend
                </button>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
