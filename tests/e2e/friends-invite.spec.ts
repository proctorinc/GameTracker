import { expect, test } from "@playwright/test";
import { login } from "./helpers/auth";

test("@smoke creates a phone invitation from the profile friends tab", async ({ page }) => {
  await login(page);
  await page.goto("/profile?tab=friends");
  await page.getByRole("button", { name: /Invite by phone/i }).click();
  await page.getByLabel("Phone").fill("15554443333");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Invite by phone/i })
    .click();

  await expect(page.getByText("Invitation created")).toBeVisible();
});
