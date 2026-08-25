import { expect, test } from "@playwright/test";

import { siteContent } from "@/content/site";

test("the skip link is reachable by keyboard and jumps to the main landmark", async ({ page }) => {
  await page.goto("/zh");

  // Hidden until focused (`sr-only focus:not-sr-only`), so the only way to
  // reach it is the first Tab — exactly how a keyboard user meets it.
  await page.keyboard.press("Tab");

  const skipLink = page.getByRole("link", { name: siteContent.zh.nav.skipToContent });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();

  await skipLink.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("every nav item points at a section that exists on the page", async ({ page }) => {
  await page.goto("/zh");

  for (const item of siteContent.zh.nav.items) {
    // A nav link to a section that was renamed or removed scrolls nowhere, and
    // neither the type checker nor the build can see it.
    await expect(page.locator(item.href)).toHaveCount(1);
  }
});

test("clicking a nav item scrolls its section into view", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "the header nav is hidden below the md breakpoint");

  await page.goto("/zh");

  const [first] = siteContent.zh.nav.items;
  if (!first) throw new Error("the site has no nav items to exercise");

  await page.getByRole("banner").getByRole("link", { name: first.label }).click();

  await expect(page).toHaveURL(new RegExp(`${first.href}$`));
  await expect(page.locator(first.href)).toBeInViewport();
});

test("the header nav follows the breakpoint, the footer nav does not", async ({
  page,
}, testInfo) => {
  await page.goto("/zh");

  // Both the header and the footer nav carry the brand tagline as their
  // accessible name, so each has to be reached through its own landmark. The
  // header also holds a second nav — the language switcher.
  const mainNav = { name: siteContent.zh.brand.tagline };
  const headerNav = page.getByRole("banner").getByRole("navigation", mainNav);
  const footerNav = page.getByRole("contentinfo").getByRole("navigation", mainNav);

  if (testInfo.project.name === "mobile") {
    await expect(headerNav).toBeHidden();
  } else {
    await expect(headerNav).toBeVisible();
  }

  // The footer keeps the same links reachable at every width, which is what
  // makes hiding the header nav on mobile acceptable in the first place.
  await expect(footerNav).toBeVisible();
});

test("the contact call to action opens a prefilled mail draft", async ({ page }) => {
  await page.goto("/zh");

  const mailto = page.locator('a[href^="mailto:"]').first();
  const href = await mailto.getAttribute("href");

  expect(href).toContain("linonward@gmail.com");
  expect(href).toContain("subject=");
});
