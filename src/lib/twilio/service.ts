import type { VerifyProvider, TwilioVerifyServiceConfig } from "./types";
import { isDev, isProd, isTest } from "@/lib/env";
import { getEnv } from "@/lib/env-config";
import { DevVerifyProvider } from "./verify-dev";
import MockTwilioVerifyProvider from "./verify-mock";
import { TwilioVerifyProvider } from "./verify";

function readTwilioConfig(): TwilioVerifyServiceConfig | null {
  const env = getEnv();
  if (env.APP_ENV !== "production") {
    return null;
  }
  return {
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
    verifyServiceSid: env.TWILIO_VERIFY_SERVICE_SID,
  };
}

/** Resolve the OTP provider for the current environment. */
export function resolveVerifyProvider(): VerifyProvider {
  if (isDev()) {
    return new DevVerifyProvider();
  }

  if (isTest()) {
    return new MockTwilioVerifyProvider();
  }

  if (isProd()) {
    const config = readTwilioConfig();
    if (!config) {
      throw new Error(
        "Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID) are required in production",
      );
    }
    return new TwilioVerifyProvider(config);
  }

  return new DevVerifyProvider();
}

/** @deprecated Use resolveVerifyProvider */
export function getTwilioVerificationService(
  config?: TwilioVerifyServiceConfig,
): VerifyProvider | undefined {
  if (isDev()) {
    return new DevVerifyProvider();
  }

  const resolved = config ?? readTwilioConfig();
  if (!resolved) {
    return undefined;
  }

  return new TwilioVerifyProvider(resolved);
}
