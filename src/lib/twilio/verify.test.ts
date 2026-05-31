import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createMockTwilioClient = () => {
  const verificationsCreate = vi.fn();
  const verificationChecksCreate = vi.fn();
  const services = vi.fn(() => ({
    verifications: {
      create: verificationsCreate,
    },
    verificationChecks: {
      create: verificationChecksCreate,
    },
  }));
  const client = {
    verify: {
      v2: {
        services,
      },
    },
  };

  return {
    client,
    services,
    verificationsCreate,
    verificationChecksCreate,
  };
};

describe("TwilioVerifyProvider", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.doUnmock("twilio");
  });

  it("creates an SMS verification with the configured Verify service", async () => {
    const mockTwilio = createMockTwilioClient();
    mockTwilio.verificationsCreate.mockResolvedValue({ sid: "VE123" });

    vi.doMock("twilio", () => ({
      default: vi.fn(() => mockTwilio.client),
    }));

    const { TwilioVerifyProvider } = await import("./verify");
    const provider = new TwilioVerifyProvider({
      accountSid: "AC123",
      authToken: "token",
      verifyServiceSid: "VA123",
    });

    await provider.sendOtp("+15550001111");

    expect(mockTwilio.services).toHaveBeenCalledWith("VA123");
    expect(mockTwilio.verificationsCreate).toHaveBeenCalledWith({
      to: "+15550001111",
      channel: "sms",
    });
  });

  it("approves OTPs based on Twilio verification check status", async () => {
    const mockTwilio = createMockTwilioClient();
    mockTwilio.verificationChecksCreate.mockResolvedValue({ status: "approved" });

    vi.doMock("twilio", () => ({
      default: vi.fn(() => mockTwilio.client),
    }));

    const { TwilioVerifyProvider } = await import("./verify");
    const provider = new TwilioVerifyProvider({
      accountSid: "AC123",
      authToken: "token",
      verifyServiceSid: "VA123",
    });

    await expect(provider.checkOtp("+15550001111", "123456")).resolves.toBe(true);
    expect(mockTwilio.verificationChecksCreate).toHaveBeenCalledWith({
      to: "+15550001111",
      code: "123456",
    });
  });

  it("treats non-approved verification statuses as failed OTP checks", async () => {
    const mockTwilio = createMockTwilioClient();
    mockTwilio.verificationChecksCreate.mockResolvedValue({ status: "pending" });

    vi.doMock("twilio", () => ({
      default: vi.fn(() => mockTwilio.client),
    }));

    const { TwilioVerifyProvider } = await import("./verify");
    const provider = new TwilioVerifyProvider({
      accountSid: "AC123",
      authToken: "token",
      verifyServiceSid: "VA123",
    });

    await expect(provider.checkOtp("+15550001111", "654321")).resolves.toBe(false);
  });
});
