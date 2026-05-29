import { expect, test } from "@playwright/test";
import { login } from "./helpers/auth";

test("@smoke creates a game from a new title", async ({ page }) => {
  await login(page);
  await page.goto("/game/create");
  await page.getByPlaceholder("Enter a title").fill("Playwright Skybo");
  await page.getByRole("button", { name: /Continue to settings/i }).click();
  await page.getByRole("button", { name: /Start game/i }).click();

  await expect(page).toHaveURL(/\/game\/.+\/play/);
});
