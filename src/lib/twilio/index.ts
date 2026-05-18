import type { VerifyProvider, TwilioVerifyServiceConfig, MockTwilioVerifyConfig } from "./types";
import MockTwilioVerifyProvider from "./verify-mock";

export interface TwilioVerifyConfig extends TwilioVerifyServiceConfig {
  accountSid: string;
  authToken: string;
  serviceSid: string;
}

/** Get production Twilio Verify client */
export function getTwilioVerificationService(config: TwilioVerifyConfig): VerifyProvider {
  const twilio = require("twilio") as any;
  const client = new twilio.Client(config.accountSid, config.authToken);
  const verifyService = client.verify.v2(config.serviceSid);

  return {
    sendOtp(phoneE164: string) {
      return verifyService.checkCode({ to: phoneE164 });
    },

    checkOtp(phoneE164: string, code: string): Promise<boolean> {
      return verifyService.verify({ to: phoneE164, code })
        .then((result: any) => result.status === "approved")
        .catch(() => false);
    },
  };
}

/** Get mock provider for tests */
export function getMockTwilioProvider(config?: MockTwilioVerifyConfig): VerifyProvider {
  return new MockTwilioVerifyProvider(config);
}
