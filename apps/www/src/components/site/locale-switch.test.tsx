import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LocaleSwitch } from "@/components/site/locale-switch";

describe("LocaleSwitch", () => {
  it("tells assistive tech which language is showing", () => {
    render(<LocaleSwitch current="en" label="Language" />);

    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "中文" })).not.toHaveAttribute("aria-current");
  });

  it("points each language at its own page, tagged for crawlers", () => {
    render(<LocaleSwitch current="zh" label="语言" />);

    expect(screen.getByRole("link", { name: "中文" })).toHaveAttribute("href", "/zh");

    const english = screen.getByRole("link", { name: "English" });
    expect(english).toHaveAttribute("href", "/en");
    expect(english).toHaveAttribute("hreflang", "en");
  });

  it("names the control so it is reachable as a landmark", () => {
    render(<LocaleSwitch current="zh" label="语言" />);

    expect(screen.getByRole("navigation", { name: "语言" })).toBeInTheDocument();
  });
});
