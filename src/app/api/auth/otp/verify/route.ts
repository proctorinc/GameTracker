import { NextResponse } from "next/server";
import {
  normalizePhoneToE164,
} from "@/lib/auth/phone";
import { countIncomingPendingInvitationsForUser } from "@/lib/db/store/invitation.store";
import { ensureUserVerifiedAfterOtp } from "@/lib/db/store/user.store";
import { resolveVerifyProvider } from "@/lib/twilio/service";
import { isDev, isProd } from "@/lib/env";
import { createSession } from "@/lib/db/store";
import { logError, redactPhoneNumber } from "@/lib/server-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = async (request: Request) => {
  let phoneForLogs: string | null = null;

  try {
    let body: { phone?: string; code?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const { phone, code } = body;
    phoneForLogs = phone ?? null;

    if (!phone) {
      return NextResponse.json({ error: "phone is required" }, { status: 400 });
    }

    if (!isDev() && !code) {
      return NextResponse.json(
        { error: "phone and code are required" },
        { status: 400 },
      );
    }

    if (!isDev() && code) {
      const codeLength = code.length;
      if (codeLength < 4 || codeLength > 8) {
        return NextResponse.json(
          { error: "code must be 4-8 digits" },
          { status: 400 },
        );
      }
    }

    const result = normalizePhoneToE164(phone);
    if (typeof result !== "string") {
      return NextResponse.json(result, { status: 400 });
    }

    const phoneE164 = result;
    const verifyProvider = resolveVerifyProvider();
    const isApproved = await verifyProvider.checkOtp(phoneE164, code ?? "");

    if (!isApproved) {
      return NextResponse.json({ error: "invalid_otp" }, { status: 401 });
    }

    const user = await ensureUserVerifiedAfterOtp(phoneE164);
    const pendingInvitationCount = await countIncomingPendingInvitationsForUser({
      userId: user.id,
      phoneNumber: user.phoneNumber,
    });

    const { createSessionTokenWithSecret } = await import("@/lib/auth/tokens");
    const { raw, hashed: sessionTokenHash } =
      await createSessionTokenWithSecret();
    const expiresAtIso = new Date(Date.now() + 60 * 60 * 24 * 400 * 1000).toISOString();
    await createSession(user.id, sessionTokenHash, expiresAtIso);

    const response = NextResponse.json(
      {
        user,
        hasPendingInvitations: pendingInvitationCount > 0,
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
    logError("auth.otp.verify.failed", error, {
      path: new URL(request.url).pathname,
      phoneNumber: redactPhoneNumber(phoneForLogs),
    });
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 },
    );
  }
};
