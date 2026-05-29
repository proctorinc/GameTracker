import { NextResponse } from "next/server";
import { normalizePhoneToE164 } from "@/lib/auth/phone";
import { checkRateLimit } from "@/lib/auth/rate-limiter";
import { resolveVerifyProvider } from "@/lib/twilio/service";
import { isDev } from "@/lib/env";
import { logError, redactPhoneNumber } from "@/lib/server-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = async (request: Request) => {
  let phoneForLogs: string | null = null;

  try {
    let body: { phone?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const { phone } = body;
    phoneForLogs = phone ?? null;

    if (!phone) {
      return NextResponse.json({ error: "phone is required" }, { status: 400 });
    }

    const result = normalizePhoneToE164(phone);
    if (typeof result !== "string") {
      return NextResponse.json(result, { status: 400 });
    }

    const phoneE164 = result;

    const rateLimitResult = await checkRateLimit(phoneE164);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: rateLimitResult.reason },
        { status: 429 },
      );
    }

    const verifyProvider = resolveVerifyProvider();
    await verifyProvider.sendOtp(phoneE164);

    return NextResponse.json({ ok: true, dev: isDev() }, { status: 200 });
  } catch (error) {
    logError("auth.otp.request.failed", error, {
      path: new URL(request.url).pathname,
      phoneNumber: redactPhoneNumber(phoneForLogs),
    });
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
};
