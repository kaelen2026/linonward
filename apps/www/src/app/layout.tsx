import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const fontSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fontMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://linonward.com"),
  title: {
    default: "Linonward",
    template: "%s | Linonward",
  },
  description: "Linonward official website.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      className={`${fontSans.variable} ${fontMono.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
