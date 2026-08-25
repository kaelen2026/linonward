import { describe, expect, it } from "vitest";

import { defaultLocale, isLocale, locales } from "@/lib/i18n";

describe("isLocale", () => {
  it("accepts every locale the site ships", () => {
    for (const locale of locales) {
      expect(isLocale(locale)).toBe(true);
    }
  });

  it("rejects a language the site does not ship", () => {
    expect(isLocale("fr")).toBe(false);
  });

  it("rejects a close-but-wrong tag instead of guessing", () => {
    // The [locale] segment is matched exactly, so /zh-CN is a 404. Widening
    // this to accept regional tags would route them to a page that does not
    // exist rather than to /zh.
    expect(isLocale("zh-CN")).toBe(false);
    expect(isLocale("EN")).toBe(false);
  });

  it("rejects an empty segment", () => {
    expect(isLocale("")).toBe(false);
  });
});

describe("defaultLocale", () => {
  it("is a locale the site actually ships", () => {
    expect(isLocale(defaultLocale)).toBe(true);
  });
});
