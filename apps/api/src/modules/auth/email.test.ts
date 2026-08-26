import { describe, expect, it, vi } from "vitest";

import { createEmailOtpSender } from "./email.js";

describe("createEmailOtpSender", () => {
  it("sends a short-lived sign-in code without exposing it in the subject", async () => {
    const send = vi.fn(async () => ({ data: { id: "email_1" }, error: null }));
    const sender = createEmailOtpSender({ emails: { send } }, "LinOnward <login@example.com>");

    await sender({ email: "person@example.com", otp: "123456", type: "sign-in" });

    expect(send).toHaveBeenCalledWith({
      from: "LinOnward <login@example.com>",
      to: "person@example.com",
      subject: "LinOnward 登录验证码",
      text: expect.stringContaining("123456"),
    });
  });

  it("turns a provider rejection into a delivery failure", async () => {
    const sender = createEmailOtpSender(
      { emails: { send: vi.fn(async () => ({ data: null, error: { message: "rejected" } })) } },
      "LinOnward <login@example.com>",
    );

    await expect(
      sender({ email: "person@example.com", otp: "123456", type: "sign-in" }),
    ).rejects.toThrow("Unable to send authentication email");
  });
});
