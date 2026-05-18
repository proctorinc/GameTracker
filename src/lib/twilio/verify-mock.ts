import type { VerifyProvider, MockTwilioVerifyConfig } from "./types";

/**
 * Mock Twilio Verify provider for testing and development.
 * Accepts any 6-digit code when AUTH_MOCK_OTP is set in env.
 */
export default class MockTwilioVerifyProvider implements VerifyProvider {
  private readonly defaultCode: string;

  constructor(config?: MockTwilioVerifyConfig) {
    this.defaultCode = config?.defaultCode ?? (process.env.AUTH_MOCK_OTP ?? "123456");
  }

  /** Always succeed for testing */
  async sendOtp(_phoneE164: string): Promise<void> {
    // In a real app, you'd call twilio.verify.v2(serviceSid).create(...)
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  /** Check code (mock: accept any 6-digit code or AUTH_MOCK_OTP) */
  async checkOtp(_phoneE164: string, code: string): Promise<boolean> {
    const cleanCode = typeof code === "string" ? code.trim() : "";
    // Accept mock OTP from env (for tests), any 6-digit code (for manual testing), or the default mock code
    return cleanCode !== "" && (
      (cleanCode === process.env.AUTH_MOCK_OTP || cleanCode === this.defaultCode) ||
      /^\d{6}$/.test(cleanCode)
    );
  }
}
