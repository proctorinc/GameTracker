import { NextResponse } from "next/server";
import { normalizePhoneToE164, parsePhoneForInternalUse } from "@/lib/auth/phone";
import { ensureUserVerifiedAfterOtp } from "@/lib/auth/user-store";
import { createSession } from "@/lib/auth/session-store";
import { resolveVerifyProvider } from "@/lib/twilio/service";
import { isDev, isProd } from "@/lib/env";

export const POST = async (request: Request) => {
  try {
    let body: { phone?: string; code?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const { phone, code } = body;

    if (!phone) {
      return NextResponse.json({ error: "phone is required" }, { status: 400 });
    }

    if (!isDev() && !code) {
      return NextResponse.json({ error: "phone and code are required" }, { status: 400 });
    }

    if (!isDev() && code) {
      const codeLength = code.length;
      if (codeLength < 4 || codeLength > 8) {
        return NextResponse.json({ error: "code must be 4-8 digits" }, { status: 400 });
      }
    }

    const result = normalizePhoneToE164(phone);
    if (typeof result !== "string") {
      return NextResponse.json(result, { status: 400 });
    }

    const phoneE164 = parsePhoneForInternalUse(phone) as string;
    const verifyProvider = resolveVerifyProvider();
    const isApproved = await verifyProvider.checkOtp(phoneE164, code ?? "");

    if (!isApproved) {
      return NextResponse.json({ error: "invalid_otp" }, { status: 401 });
    }

    const user = await ensureUserVerifiedAfterOtp(phoneE164);

    const { createSessionTokenWithSecret } = await import("@/lib/auth/tokens");
    const { raw, hashed: sessionTokenHash } = await createSessionTokenWithSecret();
    const expiresAtMs = Date.now() + 60 * 60 * 24 * 400 * 1000; // 400 days
    await createSession(user.id, sessionTokenHash, expiresAtMs);

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          phone: user.phone_e164,
          first_name: user.first_name,
          last_name: user.last_name,
          group_id: user.group_id,
          phone_verified_at: user.phone_verified_at,
        },
      },
      { status: 200 },
    );

    response.cookies.set("app_session", raw, {
      httpOnly: true,
      secure: isProd(),
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
    });

    return response;
  } catch (error) {
    console.error("OTP verify error:", error);
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
};
