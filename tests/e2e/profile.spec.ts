import { expect, test } from "@playwright/test";
import { login } from "./helpers/auth";

test("@smoke updates the profile name", async ({ page }) => {
  await login(page);
  await page.goto("/profile");
  await page.getByText("Change your name").click();
  await page.getByLabel("First name").fill("Play");
  await page.getByLabel("Last name").fill("Tester");
  await page.getByRole("button", { name: "Update" }).click();

  await expect(page.getByDisplayValue("Play")).toBeVisible();
  await expect(page.getByDisplayValue("Tester")).toBeVisible();
});
