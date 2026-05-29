import { expect, test } from "@playwright/test";
import { login } from "./helpers/auth";

test("@smoke signs in and lands on the dashboard", async ({ page }) => {
  await login(page);
  await expect(page.getByText("Start a new game")).toBeVisible();
});
