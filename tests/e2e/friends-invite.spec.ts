import { expect, test } from "@playwright/test";
import { login } from "./helpers/auth";

test("@smoke creates a phone invitation from the friends page", async ({ page }) => {
  await login(page);
  await page.goto("/friends");
  await page.getByRole("button", { name: "Invite friend" }).click();
  await page.getByLabel("Phone").fill("15554443333");
  await page.getByRole("button", { name: /Invite by phone/i }).click();

  await expect(page.getByText("Invitation created")).toBeVisible();
});
