import { expect, test } from "@playwright/test";

test("the internal console redirects an unauthenticated browser to login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "登录" })).toBeVisible();
});
