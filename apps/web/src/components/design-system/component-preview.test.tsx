import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ComponentPreview } from "./component-preview";

describe("ComponentPreview", () => {
  it("organizes the component catalog into named sections", () => {
    render(<ComponentPreview />);

    expect(screen.getByRole("heading", { level: 1, name: "组件预览" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "按钮与状态" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "表单控件" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "标签页与反馈" })).toBeInTheDocument();
  });

  it("switches the visible tab example", () => {
    render(<ComponentPreview />);

    fireEvent.click(screen.getByRole("tab", { name: "活动" }));

    expect(screen.getByRole("tabpanel", { name: "活动" })).toHaveTextContent(
      "最近的组件更新会显示在这里。",
    );
  });
});
