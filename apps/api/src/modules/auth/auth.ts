import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { bearer, emailOTP } from "better-auth/plugins";
import type { AuthConfig } from "../../shared/auth-config.js";
import { authSchema, type Database } from "../../shared/database.js";
import { createEmailOtpSender } from "./email.js";
import type { AuthHandler } from "./index.js";

type EmailClient = Parameters<typeof createEmailOtpSender>[0];

export function createAuthHandler(
  config: AuthConfig,
  database: Database,
  email: EmailClient,
): AuthHandler {
  const auth = betterAuth({
    appName: "LinOnward Web",
    baseURL: config.baseUrl,
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: authSchema,
      transaction: true,
    }),
    secret: config.secret,
    socialProviders: config.google ? { google: config.google } : undefined,
    trustedOrigins: [config.baseUrl],
    plugins: [
      // `apps/ios` has no cookie jar and sends no `Origin`, so it authenticates
      // with `Authorization: Bearer <token>` read from the `set-auth-token`
      // response header. Better Auth's CSRF check only runs on requests that
      // carry a `Cookie` header, and this plugin injects the session cookie
      // into a copy of the headers rather than the original request — so a
      // bearer call stays exempt. The browser console is unaffected: it keeps
      // using first-party cookies through the Web proxy, and a cross-site page
      // cannot attach an `Authorization` header without a CORS preflight.
      bearer(),
      emailOTP({
        allowedAttempts: 5,
        expiresIn: 600,
        sendVerificationOTP: createEmailOtpSender(email, config.emailFrom),
        storeOTP: "hashed",
      }),
    ],
  });
  return auth.handler;
}
