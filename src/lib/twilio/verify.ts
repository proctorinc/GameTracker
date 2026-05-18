import twilio from "twilio";
import type { VerifyProvider, TwilioVerifyConfig } from "./types";

export class TwilioVerifyProvider implements VerifyProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any;
  private verifyServiceSid: string;

  constructor(config: TwilioVerifyConfig) {
    this.client = twilio(config.accountSid, config.authToken);
    this.verifyServiceSid = config.verifyServiceSid;
  }

  async sendOtp(phoneE164: string): Promise<void> {
    const verifyApiInstance = this.client.verify.v2(this.verifyServiceSid);

    await verifyApiInstance.checkRequest({
      to: phoneE164,
      channel: "sms",
    });

    return verifyApiInstance.createBinding({
      to: phoneE164,
      channel: "sms",
      amount: 1,
    });
  }

  async checkOtp(phoneE164: string, code: string): Promise<boolean> {
    const verifyApiInstance = this.client.verify.v2(this.verifyServiceSid);

    const serviceCheck = await verifyApiInstance.checkAttempt({
      to: phoneE164,
      channel: "sms",
      code,
    });

    return serviceCheck.status === "approved";
  }
}

export function getTwilioProvider(): VerifyProvider {
  if (process.env.NODE_ENV === "test") {
    throw new Error("Use mock Twilio provider in test environment");
  }

  return new TwilioVerifyProvider({
    accountSid: process.env.TWILIO_ACCOUNT_SID!,
    authToken: process.env.TWILIO_AUTH_TOKEN!,
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID!,
  });
}
