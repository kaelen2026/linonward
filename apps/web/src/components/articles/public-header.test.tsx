import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicHeader } from "./public-header";

describe("PublicHeader", () => {
  it("offers login to an anonymous visitor", () => {
    render(<PublicHeader />);

    expect(screen.getByRole("link", { name: "登录" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("link", { name: "管理" })).not.toBeInTheDocument();
  });

  it("offers management and the shared avatar menu to a signed-in user", () => {
    render(
      <PublicHeader user={{ email: "member@example.com", image: null, name: "Member Example" }} />,
    );

    expect(screen.getByRole("link", { name: "管理" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("button", { name: "打开用户菜单" })).toHaveTextContent("ME");
    expect(screen.queryByRole("link", { name: "登录" })).not.toBeInTheDocument();
  });
});
