# Local Web application authentication

The consumer Web application at `http://localhost:3002` uses the API's Better Auth routes and
Resend to deliver email one-time passwords. Authentication is deliberately disabled in
zero-configuration development, even though `GET /health` still succeeds. Its content-management
and operational routes require the appropriate protected access.

## 1. Start PostgreSQL and Redis

From the repository root:

```bash
pnpm infra:up
pnpm infra:status
```

PostgreSQL must report healthy before continuing. Authentication stores users, sessions, and
verification codes there; there is no in-memory authentication fallback. Redis should also be
healthy for the repository's normal shared rate limiting, but email OTP authentication does not
depend on it in local development.

## 2. Prepare Resend

Create a Resend API key and choose a sender accepted by Resend. For production, verify the sender
domain first. Keep the API key out of Git, terminal transcripts, screenshots, and chat messages.

## 3. Configure the API

Copy the ignored example file:

```bash
cp apps/api/.env.example apps/api/.env
openssl rand -base64 32
```

Put the generated value and the Resend credentials into `apps/api/.env`. For the default local
Compose services, the authentication-related settings should have this shape:

```dotenv
DATABASE_URL=postgres://linonward:linonward@localhost:5432/linonward
REDIS_URL=redis://localhost:6379
BETTER_AUTH_URL=http://localhost:3002
BETTER_AUTH_SECRET=<the generated value, at least 32 characters>
RESEND_API_KEY=<your Resend API key>
AUTH_EMAIL_FROM=<a sender accepted by Resend>
INTERNAL_CONSOLE_ADMIN_EMAILS=<your sign-in email>
```

Do not commit `apps/api/.env`. Authentication configuration is all-or-nothing: a missing database
URL, secret, base URL, Resend key, or sender makes the API refuse to start instead of mounting a
partly working authentication service.

## 4. Configure the Web application

Copy the Web application example:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Set the same administrator email in `apps/web/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=false
INTERNAL_CONSOLE_ADMIN_EMAILS=<the same sign-in email>
```

The value is intentionally configured in both applications. It bootstraps an administrator and
provides an emergency access path; normal content editors are assigned through the database-backed
role model after their first sign-in. The API protects content data, while the Web server protects
administration routes. Both variables are server-only and must never use a `NEXT_PUBLIC_` prefix.

## 5. Apply migrations

```bash
pnpm --filter @linonward/api migrate
```

This creates or updates the Better Auth tables and the content role-assignment table.

## 6. Start and verify

Restart both processes after changing environment files. Run each long-lived process in its own
terminal:

```bash
# Terminal 1
pnpm --filter @linonward/api dev

# Terminal 2
pnpm --filter @linonward/web dev
```

In another terminal, confirm that the API is alive and that the authentication route is mounted:

```bash
curl -i http://localhost:3001/health
curl -i http://localhost:3001/api/auth/get-session
```

The health request should return `200`. The session request may return an empty session while
signed out, but it must not return the repository's `not_found` envelope. Open
`http://localhost:3002/login`, enter the allow-listed email, and check its inbox for the six-digit
code.

## Troubleshooting

### “认证请求失败，请稍后重试。” and an authentication endpoint returns 404

The API is running without authentication mounted. Confirm that `apps/api/.env` exists in the
worktree where the API process starts, contains every value from step 3, and that the API was
restarted. A healthy `/health` endpoint alone does not prove authentication is enabled.

### The API exits during startup

Read the first configuration error in the API terminal. The API names the missing or invalid
variable. Do not work around this validation by inserting placeholder credentials.

### The route exists but sending the code fails

Check the API log using the response's `X-Request-Id`. The usual causes are an invalid Resend API
key, an unverified sender domain, or a sender address that the Resend account cannot use. Do not log
or paste the API key while diagnosing it.

### Login succeeds but the Web application redirects to `/unauthorized`

Make sure the normalized sign-in address appears in `INTERNAL_CONSOLE_ADMIN_EMAILS` in both
`apps/api/.env` and `apps/web/.env.local`, then restart both applications.
