import type { VerifyProvider } from "./types";

/** Dev-only provider: never sends SMS; accepts any verification code. */
export class DevVerifyProvider implements VerifyProvider {
  async sendOtp(_phoneE164: string): Promise<void> {
    // SMS disabled in development
  }

  async checkOtp(_phoneE164: string, _code: string): Promise<boolean> {
    return true;
  }
}
