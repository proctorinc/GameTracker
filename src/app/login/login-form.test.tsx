import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../tests/helpers/render";

const routerPush = vi.fn();
const routerRefresh = vi.fn();
const toastError = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    error: toastError,
  },
}));

vi.mock("@/components/ui/input-otp", () => ({
  InputOTP: ({
    value = "",
    onChange,
    ...props
  }: {
    value?: string;
    onChange?: (value: string) => void;
    ["data-testid"]?: string;
  }) => (
    <input
      data-testid={props["data-testid"]}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
  InputOTPGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  InputOTPSeparator: () => null,
  InputOTPSlot: () => null,
}));

async function renderLoginForm(options?: { appEnv?: string; from?: string | null }) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_APP_ENV", options?.appEnv ?? "test");

  vi.doMock("next/navigation", () => ({
    useRouter: () => ({
      push: routerPush,
      refresh: routerRefresh,
    }),
    useSearchParams: () => ({
      get: (key: string) => (key === "from" ? options?.from ?? null : null),
    }),
  }));

  const { default: LoginForm } = await import("./login-form");
  renderWithProviders(<LoginForm />);
}

describe("LoginForm", () => {
  beforeEach(() => {
    routerPush.mockReset();
    routerRefresh.mockReset();
    toastError.mockReset();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("signs in immediately in development mode", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ hasPendingInvitations: false }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await renderLoginForm({
      appEnv: "development",
      from: "/titles",
    });

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(routerPush).toHaveBeenCalledWith("/titles");
      expect(routerRefresh).toHaveBeenCalled();
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/auth/otp/verify");
  });

  it("runs the two-step OTP flow outside development", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasPendingInvitations: false }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await renderLoginForm({
      appEnv: "test",
      from: "/dashboard",
    });

    fireEvent.change(screen.getByTestId("login-phone"), {
      target: { value: "15550009999" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send Code" }));

    await screen.findByText("Verification Code");

    fireEvent.change(screen.getByTestId("login-otp"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify Code" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(routerPush).toHaveBeenCalledWith("/dashboard");
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/auth/otp/request");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/auth/otp/request");
    expect(fetchMock.mock.calls[2]?.[0]).toBe("/api/auth/otp/verify");
  });

  it("shows API errors from sign in attempts", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "invalid_otp" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await renderLoginForm({
      appEnv: "development",
    });

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByTestId("login-error")).toHaveTextContent("invalid_otp");
      expect(toastError).toHaveBeenCalledWith("invalid_otp");
    });
  });
});
