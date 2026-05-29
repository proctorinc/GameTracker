import { expect, type Page } from "@playwright/test";

export async function login(page: Page, phone = "15550009999") {
  await page.goto("/login");
  await page.getByTestId("login-phone").fill(phone);

  const sendOrSignIn = page.getByRole("button", {
    name: /Send Code|Sign in/i,
  });
  await sendOrSignIn.click();

  const otpInput = page.getByTestId("login-otp");
  if (await otpInput.isVisible().catch(() => false)) {
    await otpInput.fill("123456");
    await page.getByRole("button", { name: "Verify Code" }).click();
  }

  await expect(page).toHaveURL(/\/dashboard/);
}
