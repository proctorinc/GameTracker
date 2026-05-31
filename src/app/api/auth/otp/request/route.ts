import { NextResponse } from "next/server";
import { normalizePhoneToE164 } from "@/lib/auth/phone";
import { checkRateLimit } from "@/lib/auth/rate-limiter";
import { resolveVerifyProvider } from "@/lib/twilio/service";
import { isDev } from "@/lib/env";
import { logError, logInfo, logWarn, redactPhoneNumber } from "@/lib/server-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = async (request: Request) => {
  let phoneForLogs: string | null = null;
  const path = new URL(request.url).pathname;

  try {
    let body: { phone?: string };
    try {
      body = await request.json();
    } catch {
      logWarn("auth.otp.request.rejected", {
        path,
        reason: "invalid_json",
      });
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const { phone } = body;
    phoneForLogs = phone ?? null;

    if (!phone) {
      logWarn("auth.otp.request.rejected", {
        path,
        reason: "missing_phone",
      });
      return NextResponse.json({ error: "phone is required" }, { status: 400 });
    }

    const result = normalizePhoneToE164(phone);
    if (typeof result !== "string") {
      logWarn("auth.otp.request.rejected", {
        path,
        reason: result.error,
        phoneNumber: redactPhoneNumber(phoneForLogs),
      });
      return NextResponse.json(result, { status: 400 });
    }

    const phoneE164 = result;

    const rateLimitResult = await checkRateLimit(phoneE164);
    if (!rateLimitResult.allowed) {
      logWarn("auth.otp.request.rate_limited", {
        path,
        phoneNumber: redactPhoneNumber(phoneE164),
        reason: rateLimitResult.reason ?? "rate_limit_exceeded",
      });
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: rateLimitResult.reason },
        { status: 429 },
      );
    }

    const verifyProvider = resolveVerifyProvider();
    await verifyProvider.sendOtp(phoneE164);

    logInfo("auth.otp.request.succeeded", {
      path,
      phoneNumber: redactPhoneNumber(phoneE164),
      verifyProvider: verifyProvider.constructor.name,
      devMode: isDev(),
    });

    return NextResponse.json({ ok: true, dev: isDev() }, { status: 200 });
  } catch (error) {
    logError("auth.otp.request.failed", error, {
      path,
      phoneNumber: redactPhoneNumber(phoneForLogs),
    });
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
};
