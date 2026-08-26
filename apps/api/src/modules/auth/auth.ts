import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { emailOTP } from "better-auth/plugins";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type { AuthConfig } from "../../shared/auth-config.js";
import { createEmailOtpSender } from "./email.js";
import type { AuthHandler } from "./index.js";
import * as schema from "./schema.js";

type EmailClient = Parameters<typeof createEmailOtpSender>[0];

export function createAuthHandler(
  config: AuthConfig,
  database: PostgresJsDatabase<typeof schema>,
  email: EmailClient,
): AuthHandler {
  const auth = betterAuth({
    appName: "LinOnward Web",
    baseURL: config.baseUrl,
    database: drizzleAdapter(database, {
      provider: "pg",
      schema,
      transaction: true,
    }),
    secret: config.secret,
    socialProviders: config.google ? { google: config.google } : undefined,
    trustedOrigins: [config.baseUrl],
    plugins: [
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
