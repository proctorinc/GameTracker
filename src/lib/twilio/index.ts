import type {
  VerifyProvider,
  TwilioVerifyServiceConfig,
  MockTwilioVerifyConfig,
} from "./types";
import MockTwilioVerifyProvider from "./verify-mock";
import { TwilioVerifyProvider } from "./verify";

export type { MockTwilioVerifyConfig, TwilioVerifyServiceConfig } from "./types";
export { TwilioVerifyProvider } from "./verify";

/** @deprecated Prefer resolveVerifyProvider from ./service. */
export function getTwilioVerificationService(
  config: TwilioVerifyServiceConfig,
): VerifyProvider {
  return new TwilioVerifyProvider(config);
}

/** Get mock provider for tests */
export function getMockTwilioProvider(config?: MockTwilioVerifyConfig): VerifyProvider {
  return new MockTwilioVerifyProvider(config);
}
