"use client";

import { type FormEvent, useState } from "react";

import {
  sendSignInOtp,
  signInWithEmailOtp,
  signInWithGoogle as startGoogleSignIn,
} from "@/lib/auth-client";

type AuthResult = Promise<{ error: { message?: string } | null }>;

export type LoginFormClient = {
  sendOtp(email: string): AuthResult;
  signInWithGoogle(): AuthResult;
  verifyOtp(email: string, otp: string): AuthResult;
};

const defaultClient: LoginFormClient = {
  async sendOtp(email) {
    return sendSignInOtp(email);
  },
  async signInWithGoogle() {
    return startGoogleSignIn();
  },
  async verifyOtp(email, otp) {
    return signInWithEmailOtp(email, otp);
  },
};

export function LoginForm({
  auth = defaultClient,
  googleEnabled,
  onAuthenticated = () => window.location.assign("/"),
}: {
  auth?: LoginFormClient;
  googleEnabled: boolean;
  onAuthenticated?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);

    const result = step === "email" ? await auth.sendOtp(email) : await auth.verifyOtp(email, otp);
    setPending(false);

    if (result.error) {
      setError(result.error.message ?? "认证请求失败，请稍后重试。");
      return;
    }
    if (step === "email") setStep("otp");
    else onAuthenticated();
  }

  async function signInWithGoogle() {
    setPending(true);
    setError(undefined);
    const result = await auth.signInWithGoogle();
    if (result.error) {
      setPending(false);
      setError(result.error.message ?? "Google 登录失败，请稍后重试。");
    }
  }

  return (
    <div className="mt-8 grid gap-6">
      <form className="grid gap-4" onSubmit={submit}>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="email">
            邮箱
          </label>
          <input
            autoComplete="email"
            className="h-11 rounded-md border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-brand"
            disabled={pending || step === "otp"}
            id="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </div>

        {step === "otp" ? (
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="otp">
              验证码
            </label>
            <input
              autoComplete="one-time-code"
              className="h-11 rounded-md border border-border bg-background px-3 font-mono tracking-widest outline-none focus:ring-2 focus:ring-brand"
              id="otp"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setOtp(event.target.value)}
              pattern="[0-9]{6}"
              required
              value={otp}
            />
          </div>
        ) : null}

        {error ? (
          <p aria-live="polite" className="text-sm text-red-700 dark:text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        <button
          className="h-11 rounded-md bg-brand px-4 font-medium text-brand-foreground disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "请稍候…" : step === "email" ? "发送验证码" : "登录"}
        </button>
      </form>

      {googleEnabled ? (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
            或
          </div>
          <button
            className="h-11 rounded-md border border-border bg-background px-4 font-medium hover:bg-muted disabled:opacity-60"
            disabled={pending}
            onClick={() => void signInWithGoogle()}
            type="button"
          >
            使用 Google 登录
          </button>
        </>
      ) : null}
    </div>
  );
}
