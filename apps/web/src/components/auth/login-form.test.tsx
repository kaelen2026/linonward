import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LoginForm, type LoginFormClient } from "./login-form";

function client(): LoginFormClient {
  return {
    sendOtp: vi.fn(async () => ({ error: null })),
    signInWithGoogle: vi.fn(async () => ({ error: null })),
    verifyOtp: vi.fn(async () => ({ error: null })),
  };
}

describe("LoginForm", () => {
  it("requests an email sign-in code and advances to OTP entry", async () => {
    const auth = client();
    render(<LoginForm auth={auth} googleEnabled={false} />);

    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "发送验证码" }));

    await waitFor(() => expect(auth.sendOtp).toHaveBeenCalledWith("person@example.com"));
    expect(screen.getByLabelText("验证码")).toBeInTheDocument();
  });

  it("verifies the code for the same email", async () => {
    const auth = client();
    const onAuthenticated = vi.fn();
    render(<LoginForm auth={auth} googleEnabled={false} onAuthenticated={onAuthenticated} />);
    fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "发送验证码" }));
    await screen.findByLabelText("验证码");

    fireEvent.change(screen.getByLabelText("验证码"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() =>
      expect(auth.verifyOtp).toHaveBeenCalledWith("person@example.com", "123456"),
    );
    expect(onAuthenticated).toHaveBeenCalledOnce();
  });

  it("offers Google only when the API provider is configured", () => {
    const auth = client();
    const { rerender } = render(<LoginForm auth={auth} googleEnabled={false} />);
    expect(screen.queryByRole("button", { name: "使用 Google 登录" })).toBeNull();

    rerender(<LoginForm auth={auth} googleEnabled />);
    fireEvent.click(screen.getByRole("button", { name: "使用 Google 登录" }));
    expect(auth.signInWithGoogle).toHaveBeenCalledOnce();
  });
});
