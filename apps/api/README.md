# API

The backend for [`apps/www`](../www), built with [Hono](https://hono.dev) and laid out as a
**modular monolith**: one process, one deployable — with hard internal seams so a module can be
extracted later without an archaeology project first.

## Why modular monolith

A microservice split buys independent deploys at the cost of network calls, distributed
transactions, and N pipelines. At this size none of that is earning its keep. What a split really
buys is *boundaries*, and boundaries are free — they only have to be enforced. So the boundaries
are here, and the network hop is not.

## Layout

```
src/
├── index.ts                 # process entry: config → app → listen
├── composition.ts           # the mount table and the real dependencies
├── app.ts                   # composition root: request id, CORS, error envelope
├── config.ts                # environment → ApiConfig
├── shared/                  # the shared kernel — the only thing modules may import
│   ├── api-error.ts         # ApiError + the one error body every failure uses
│   └── module.ts            # the ApiModule contract, AppEnv, mountModules
└── modules/
    ├── boundaries.test.ts   # the fitness function that keeps modules apart
    ├── health/
    │   ├── index.ts         # the module's only public export: createHealthModule
    │   ├── routes.ts        # HTTP edge
    │   └── service.ts       # domain logic
    └── contact/
        ├── index.ts         # createContactModule
        ├── routes.ts        # HTTP edge + zod validation
        ├── service.ts       # domain logic
        ├── repository.ts    # storage port + in-memory adapter
        └── schema.ts        # the wire contract
```

### The three rules

1. **A module is a vertical slice.** `routes → service → repository`, all in one directory. A
   feature is added in one folder, not spread across `controllers/`, `services/`, `models/`.
2. **A module imports only itself and `src/shared`.** Never another module's service, repository,
   or schema. `src/modules/boundaries.test.ts` walks the sources and fails the build on a
   violation, naming the file and the import — a convention nobody enforces is a convention
   nobody keeps.
3. **A module exposes exactly one thing:** `create<Name>Module(dependencies): ApiModule`. The
   composition root gets a name, a base path, and a router; it cannot reach past that.

Cross-module work therefore goes *through* `composition.ts` — today by handing both modules the
same dependency, later by an in-process event bus. It never goes through a direct import, which
is the coupling that makes a monolith impossible to split.

Time, ids, and storage are injected (`clock`, `nextId`, `repository`), so every module is
testable without a server, a clock, or a database. That is why the suite runs in about a second.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness, running version, uptime |
| `POST` | `/contact/inquiries` | Submit a contact-form inquiry; `201` + `Location` |
| `GET` | `/contact/inquiries/:id` | Read one inquiry back |

Every failure — validation, unknown route, unexpected crash — uses one envelope:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "The inquiry is not valid",
    "requestId": "0f0a…",
    "details": [{ "path": "email", "message": "Invalid email address" }]
  }
}
```

`requestId` is also returned as `X-Request-Id`, so a user can quote it and an operator can find
the matching log line. An unexpected error is logged in full and answered with an opaque
`internal_error`; the original message never reaches the client.

## Storage is in memory, on purpose

`createInMemoryInquiryRepository` keeps inquiries in a `Map`. They do not survive a restart, and
a second replica would not see the first one's writes. `InquiryRepository` is the port to
implement when that stops being acceptable — nothing outside `repository.ts` changes.

## Run

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm --filter @linonward/api dev
```

```bash
curl localhost:3001/health
curl -X POST localhost:3001/contact/inquiries \
  -H 'content-type: application/json' \
  -d '{"name":"林望","email":"lin@example.com","message":"想了解贵司的交付流程。","locale":"zh"}'
```

Production artifact:

```bash
pnpm --filter @linonward/api build
pnpm --filter @linonward/api start
```

## Configure

Every variable is optional; the defaults run locally as-is. See
[`.env.example`](./.env.example) for the full list. `CORS_ALLOWED_ORIGINS` takes bare origins —
an entry with a path is rejected at boot rather than silently never matching.

## Test

```bash
pnpm --filter @linonward/api test
pnpm --filter @linonward/api test:watch
```

Vitest only; there is no browser to drive. Routes are exercised through `app.request()`, which
runs the real middleware stack without opening a socket.
