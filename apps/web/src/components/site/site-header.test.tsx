import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SiteHeader } from "@/components/site/site-header";

describe("SiteHeader", () => {
  it("is reachable as the page banner", () => {
    render(<SiteHeader pathname="/" />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("sends the wordmark home", () => {
    render(<SiteHeader pathname="/status" />);

    expect(screen.getByRole("link", { name: "LinOnward" })).toHaveAttribute("href", "/");
  });

  it("names its navigation so it can be jumped to", () => {
    render(<SiteHeader pathname="/" />);

    expect(screen.getByRole("navigation", { name: "主导航" })).toBeInTheDocument();
  });

  it("tells assistive tech which page is showing", () => {
    render(<SiteHeader pathname="/observability" showOperations />);

    const nav = screen.getByRole("navigation", { name: "主导航" });
    expect(nav.querySelector('[aria-current="page"]')).toHaveTextContent("可观测性");
  });

  it("marks nothing current on a page outside the navigation", () => {
    render(<SiteHeader pathname="/somewhere-else" />);

    const nav = screen.getByRole("navigation", { name: "主导航" });
    expect(nav.querySelector('[aria-current="page"]')).toBeNull();
  });
});
