import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../tests/helpers/render";
import LoginForm from "./login-form";

const signInProps = vi.fn();

vi.mock("@clerk/nextjs", () => ({
  SignIn: (props: Record<string, unknown>) => {
    signInProps(props);
    return <div data-testid="clerk-sign-in">Clerk Sign In</div>;
  },
}));

describe("LoginForm", () => {
  it("renders the Clerk SignIn component with app routing", () => {
    renderWithProviders(<LoginForm fallbackRedirectUrl="/dashboard" />);

    expect(screen.getByTestId("clerk-sign-in")).toHaveTextContent(
      "Clerk Sign In",
    );
    expect(signInProps).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/login",
        routing: "path",
        signUpUrl: "/register",
        fallbackRedirectUrl: "/dashboard",
      }),
    );
  });
});
