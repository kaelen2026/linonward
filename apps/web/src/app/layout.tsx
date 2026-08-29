import type { Metadata } from "next";
import { QueryProvider } from "@/components/providers/query-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "LinOnward",
    template: "%s | LinOnward",
  },
  description: "关于技术、产品与组织的长期思考。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
