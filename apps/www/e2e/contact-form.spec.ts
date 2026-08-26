import { expect, type Route, test } from "@playwright/test";

import { siteContent } from "@/content/site";

// The form's own logic lives in Vitest — `src/lib/inquiry.test.ts` and
// `src/components/site/contact-form.test.tsx` cover validation, the wire format
// and every failure branch in milliseconds. What only a browser can answer is
// whether the form is wired into the page at all and whether it hydrates: the
// page is an `async` server component, which Vitest cannot render.

const form = siteContent.zh.contactForm;

/**
 * The real API answers from another origin, so the browser sends a preflight
 * first. Mirroring that here keeps the test honest about the CORS contract
 * `CORS_ALLOWED_ORIGINS` exists to satisfy.
 */
const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "POST,OPTIONS",
};

async function fulfilCreated(route: Route) {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: corsHeaders });
    return;
  }

  await route.fulfill({
    status: 201,
    headers: { ...corsHeaders, "content-type": "application/json" },
    body: JSON.stringify({ id: "inq_e2e" }),
  });
}

test("the form is on the page and refuses an empty draft without calling the API", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/contact/inquiries", async (route) => {
    calls += 1;
    await route.abort();
  });

  await page.goto("/zh");
  // Before hydration the submit button would do a native GET submission and
  // navigate away, so wait for the client bundle to have settled. The URL
  // assertion below turns that race into a clear failure rather than a flake.
  await page.waitForLoadState("networkidle");

  const contact = page.locator("#contact");
  await expect(contact.getByLabel(form.fields.email.label)).toBeVisible();

  await contact.getByRole("button", { name: form.submit }).click();

  await expect(contact.getByRole("alert")).toContainText(form.status.invalid);
  await expect(page).toHaveURL(/\/zh$/);
  expect(calls).toBe(0);
});

test("a completed form posts the inquiry and confirms with its reference", async ({ page }) => {
  await page.route("**/contact/inquiries", fulfilCreated);

  await page.goto("/zh");
  await page.waitForLoadState("networkidle");

  const contact = page.locator("#contact");
  await contact.getByLabel(form.fields.name.label).fill("林望");
  await contact.getByLabel(form.fields.email.label).fill("lin@example.com");
  await contact.getByLabel(form.fields.message.label).fill("想了解贵司的交付流程和排期。");

  const [request] = await Promise.all([
    // Filtered to POST because the preflight hits the same URL.
    page.waitForRequest((r) => r.url().includes("/contact/inquiries") && r.method() === "POST"),
    contact.getByRole("button", { name: form.submit }).click(),
  ]);

  expect(request.postDataJSON()).toMatchObject({
    name: "林望",
    email: "lin@example.com",
    message: "想了解贵司的交付流程和排期。",
    // The locale the page was served in, so the reply has a template.
    locale: "zh",
  });

  const confirmation = contact.getByRole("status");
  await expect(confirmation).toContainText(form.status.successTitle);
  await expect(confirmation).toContainText("inq_e2e");
});
