export const locales = ["zh", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "zh";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Label shown in the language switcher, always written in its own language. */
export const localeLabels: Record<Locale, string> = {
  zh: "中文",
  en: "English",
};

/** BCP 47 tag for <html lang> and hreflang. */
export const localeTags: Record<Locale, string> = {
  zh: "zh-CN",
  en: "en",
};
