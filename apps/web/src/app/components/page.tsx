import type { Metadata } from "next";

import { ComponentPreview } from "@/components/design-system/component-preview";

export const metadata: Metadata = {
  title: "组件预览",
  description: "LinOnward Web 端 shadcn/ui 基础组件与交互状态预览。",
};

export default function ComponentsPage() {
  return <ComponentPreview />;
}
