import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";

import { siteContent } from "@/content/site";
import { isLocale, locales, localeTags } from "@/lib/i18n";
import "../globals.css";

/* The `--font-geist-*` names are read by `--font-sans` / `--font-mono` in
 * globals.css, where the system CJK fallback is appended. Renaming either side
 * without the other silently drops the fallback. */
const fontSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fontMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://linonward.com";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const content = siteContent[locale];

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: content.meta.title,
      template: `%s | ${content.brand.name}`,
    },
    description: content.meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        "zh-CN": "/zh",
        en: "/en",
        // Tells crawlers which page to serve when no language matches.
        "x-default": "/zh",
      },
    },
    openGraph: {
      type: "website",
      url: `/${locale}`,
      siteName: content.brand.name,
      title: content.meta.title,
      description: content.meta.description,
      locale: localeTags[locale],
    },
    twitter: {
      card: "summary_large_image",
      title: content.meta.title,
      description: content.meta.description,
    },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html
      className={`${fontSans.variable} ${fontMono.variable}`}
      lang={localeTags[locale]}
      suppressHydrationWarning
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
