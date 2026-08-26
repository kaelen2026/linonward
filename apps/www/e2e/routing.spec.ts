import { expect, test } from "@playwright/test";

import { siteContent } from "@/content/site";

test("the bare root sends visitors to the default locale", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/zh$/);
});

test.describe("each locale page", () => {
  for (const [locale, tag] of [
    ["zh", "zh-CN"],
    ["en", "en"],
  ] as const) {
    test(`/${locale} declares lang="${tag}" and its own title`, async ({ page }) => {
      await page.goto(`/${locale}`);

      await expect(page.locator("html")).toHaveAttribute("lang", tag);
      await expect(page).toHaveTitle(siteContent[locale].meta.title);
    });
  }
});

test("crawlers get a complete set of hreflang alternates", async ({ page }) => {
  await page.goto("/zh");

  // A missing x-default is the classic i18n SEO bug: without it a search engine
  // picks a language for the visitor rather than being told which one to serve.
  for (const [hreflang, href] of [
    ["zh-CN", "/zh"],
    ["en", "/en"],
    ["x-default", "/zh"],
  ] as const) {
    await expect(page.locator(`link[rel="alternate"][hreflang="${hreflang}"]`)).toHaveAttribute(
      "href",
      new RegExp(`${href}$`),
    );
  }

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/zh$/);
});

test("a language the site does not ship is a 404, not a guess", async ({ page }) => {
  const response = await page.goto("/fr");

  expect(response?.status()).toBe(404);
});
