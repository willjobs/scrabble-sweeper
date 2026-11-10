import { expect, test } from "@playwright/test";
test("opens the application", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Tile Theory");
  await expect(
    page.getByRole("heading", { name: "Tile Theory" }),
  ).toBeVisible();
});
