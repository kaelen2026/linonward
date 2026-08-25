import { expect, test } from "@playwright/test";

import { siteContent } from "@/content/site";
import { localeLabels } from "@/lib/i18n";

// The switcher appears twice — header and footer. Every locator here is scoped
// to one of them on purpose; an unscoped `getByRole` matches both.

test("switching language lands on the other locale with its copy", async ({ page }) => {
  await page.goto("/zh");
  await expect(
    page.getByRole("heading", { level: 1, name: new RegExp(siteContent.zh.hero.headlineLead) }),
  ).toBeVisible();

  await page.getByRole("banner").getByRole("link", { name: localeLabels.en }).click();

  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", { level: 1, name: new RegExp(siteContent.en.hero.headlineLead) }),
  ).toBeVisible();
});

test("the footer switcher works the same as the header one", async ({ page }) => {
  await page.goto("/zh");

  await page.getByRole("contentinfo").getByRole("link", { name: localeLabels.en }).click();

  await expect(page).toHaveURL(/\/en$/);
});

test("both switchers mark the language currently showing", async ({ page }) => {
  await page.goto("/en");

  for (const region of ["banner", "contentinfo"] as const) {
    const scope = page.getByRole(region);
    await expect(scope.getByRole("link", { name: localeLabels.en })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(scope.getByRole("link", { name: localeLabels.zh })).not.toHaveAttribute(
      "aria-current",
      /.*/,
    );
  }
});
