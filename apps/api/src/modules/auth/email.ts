import type { EmailOTPOptions } from "better-auth/plugins";

type EmailMessage = {
  from: string;
  to: string;
  subject: string;
  text: string;
};

type EmailClient = {
  emails: {
    send(message: EmailMessage): Promise<{ error: { message?: string } | null }>;
  };
};

export function createEmailOtpSender(
  client: EmailClient,
  from: string,
): NonNullable<EmailOTPOptions["sendVerificationOTP"]> {
  return async ({ email, otp, type }) => {
    const subject = type === "sign-in" ? "LinOnward 登录验证码" : "LinOnward 邮箱验证码";
    const { error } = await client.emails.send({
      from,
      to: email,
      subject,
      text: `您的验证码是 ${otp}。验证码将在 10 分钟后失效；如果并非您本人操作，请忽略此邮件。`,
    });

    if (error) throw new Error("Unable to send authentication email");
  };
}
