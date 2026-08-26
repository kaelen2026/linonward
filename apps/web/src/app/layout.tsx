import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "LinOnward Web",
    template: "%s | LinOnward Web",
  },
  description: "LinOnward 内部控制台。",
  // Internal tooling, so nothing here belongs in a search index.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
