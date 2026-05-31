import twilio from "twilio";
import type { VerifyProvider, TwilioVerifyConfig } from "./types";

export class TwilioVerifyProvider implements VerifyProvider {
  private readonly client: ReturnType<typeof twilio>;
  private readonly verifyServiceSid: string;

  constructor(config: TwilioVerifyConfig) {
    this.client = twilio(config.accountSid, config.authToken);
    this.verifyServiceSid = config.verifyServiceSid;
  }

  async sendOtp(phoneE164: string): Promise<void> {
    await this.client.verify.v2.services(this.verifyServiceSid).verifications.create({
      to: phoneE164,
      channel: "sms",
    });
  }

  async checkOtp(phoneE164: string, code: string): Promise<boolean> {
    const serviceCheck = await this.client.verify.v2
      .services(this.verifyServiceSid)
      .verificationChecks.create({
      to: phoneE164,
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
