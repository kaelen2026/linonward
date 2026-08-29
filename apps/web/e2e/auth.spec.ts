import { expect, test } from "@playwright/test";

test("the publishing console redirects an unauthenticated browser to login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "管理员登录" })).toBeVisible();
});
