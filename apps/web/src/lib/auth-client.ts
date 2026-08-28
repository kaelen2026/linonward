import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient({
  plugins: [emailOTPClient()],
});

export type AuthClientResult = Promise<{ error: { message?: string } | null }>;

function result(error: { message?: string } | null): { error: { message?: string } | null } {
  return { error };
}

export async function sendSignInOtp(email: string): AuthClientResult {
  const response = await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
  return result(response.error);
}

export async function signInWithEmailOtp(email: string, otp: string): AuthClientResult {
  const response = await authClient.signIn.emailOtp({ email, otp });
  return result(response.error);
}

export async function signInWithGoogle(): AuthClientResult {
  const response = await authClient.signIn.social({ callbackURL: "/admin", provider: "google" });
  return result(response.error);
}

export async function signOut(): AuthClientResult {
  const response = await authClient.signOut();
  return result(response.error);
}
