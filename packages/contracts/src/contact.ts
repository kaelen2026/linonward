export const inquiryLimits = {
  name: { max: 80 },
  email: { max: 254 },
  company: { max: 120 },
  message: { min: 10, max: 2000 },
} as const;

export const inquiryLocales = ["zh", "en"] as const;

export type InquiryLocale = (typeof inquiryLocales)[number];

export type InquiryInput = {
  name: string;
  email: string;
  company?: string;
  message: string;
  locale: InquiryLocale;
};
