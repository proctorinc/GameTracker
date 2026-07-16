import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../tests/helpers/render";
import AppShellHeader from "./app-shell-header";

let pathname = "/dashboard";
const push = vi.fn();
const back = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({
    back,
    push,
  }),
}));

describe("AppShellHeader", () => {
  it("always routes play pages back to the dashboard", () => {
    pathname = "/game/game-1/play";
    push.mockReset();
    back.mockReset();

    Object.defineProperty(window, "history", {
      configurable: true,
      value: { length: 2 },
    });
    Object.defineProperty(document, "referrer", {
      configurable: true,
      value: "http://localhost:3000/game/game-1/settings",
    });

    renderWithProviders(<AppShellHeader />);

    fireEvent.click(screen.getByRole("button", { name: /go back/i }));

    expect(push).toHaveBeenCalledWith("/dashboard");
    expect(back).not.toHaveBeenCalled();
  });
});
