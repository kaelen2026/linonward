# Async worker

`apps/worker` runs durable asynchronous jobs with BullMQ and Redis. It connects to the same
Postgres database as `apps/api` through the shared `@linonward/db` package, and injects that
database handle into every job processor. Jobs are retried three times
with exponential backoff. Successful jobs are retained for one day (up to 1,000), and failures
for seven days (up to 5,000).

## Local development

```bash
pnpm infra:up
cp apps/worker/.env.example apps/worker/.env
pnpm --filter @linonward/worker dev
```

In another terminal, enqueue the built-in smoke-test job:

```bash
pnpm --filter @linonward/worker enqueue:example -- "hello"
```

Add production job names, payloads, and processors to `src/jobs.ts`. Producers should import
`createAsyncQueue` from `src/queue.ts` and use the same `REDIS_URL` and `QUEUE_PREFIX` as the
worker. Configure `DATABASE_URL` with the same database used by `apps/api`.

BullMQ stores durable job state, so Redis must use `maxmemory-policy noeviction`. The root Compose
service configures that policy and enables append-only persistence.
