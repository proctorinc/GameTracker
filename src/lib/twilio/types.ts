export interface VerifyProvider {
  sendOtp(phoneE164: string): Promise<void>;
  checkOtp(phoneE164: string, code: string): Promise<boolean>;
}

export interface TwilioVerifyServiceConfig {
  accountSid: string;
  authToken: string;
  verifyServiceSid: string;
}

/** @deprecated Use TwilioVerifyServiceConfig */
export type TwilioVerifyConfig = TwilioVerifyServiceConfig;

export interface MockTwilioVerifyConfig {
  /** Code to accept (when AUTH_MOCK_OTP is set). */
  defaultCode?: string;
}
