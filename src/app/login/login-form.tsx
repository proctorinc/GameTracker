"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sanitizeReturnPath } from "@/lib/auth/return-path";

const IS_DEV = process.env.NEXT_PUBLIC_APP_ENV === "development";

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
  const [formData, setFormData] = useState<LoginFormState>({ phone: "", otpCode: "" });

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
          throw new Error(requestData.error || "Failed to send verification code");
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

      router.push(sanitizeReturnPath(searchParams.get("from")));
      router.refresh();
    } catch (err: unknown) {
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
      setError(err instanceof Error ? err.message : "Failed to send verification code");
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Phone Authentication</h1>

        {IS_DEV && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded mb-4 text-sm">
            <strong>Dev mode:</strong> SMS is disabled. Enter any valid US phone to sign in
            instantly. Try the hub account <code className="text-xs">+15550009999</code> for
            referral network data.
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {step === 1 || IS_DEV ? (
          <form onSubmit={handlePhoneSubmit}>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="+1 (555) 000-1001"
              required
              autoComplete="tel"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? "Signing in…" : IS_DEV ? "Sign in" : "Send Verification Code"}
            </button>

            {!IS_DEV && (
              <p className="mt-4 text-sm text-gray-500 text-center">
                We will send a 6-digit code via SMS.
              </p>
            )}
          </form>
        ) : (
          <form onSubmit={handleOtpVerify}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verification Code
            </label>
            <input
              type="text"
              value={formData.otpCode}
              onChange={(e) => setFormData({ ...formData, otpCode: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none tracking-widest text-center"
              placeholder="######"
              maxLength={8}
              required
              autoComplete="one-time-code"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? "Verifying…" : "Verify Code"}
            </button>

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

        {!IS_DEV && step === 2 && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setFormData({ phone: formData.phone, otpCode: "" });
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Back
            </button>
          </div>
        )}

        <p className="mt-4 text-center text-xs text-gray-400">
          {IS_DEV ? "Development authentication (no SMS)" : "Powered by Twilio Verify"}
        </p>
      </div>
    </div>
  );
}
