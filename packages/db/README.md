# @linonward/db

The backend database boundary: one Postgres connection factory, the complete Drizzle schema,
relations, and migration history.

## Layout

```text
src/
├── client.ts             # postgres.js pool + typed Drizzle client
└── schema/
    ├── auth.ts           # Better Auth tables
    ├── contact.ts        # inquiries
    ├── relations.ts      # explicit Drizzle relations
    └── index.ts          # the schema exported to consumers and drizzle-kit
migrations/
├── legacy/               # existing idempotent SQL; retained for deployed databases
└── drizzle/              # Drizzle Kit baseline and all future migrations
```

`apps/api` is currently the only runtime consumer. Keeping the package separate makes the schema
and migrations reusable by future workers without allowing frontend apps to access Postgres.

## Change the schema

1. Edit `src/schema/` and its relations.
2. Generate and inspect the SQL and snapshot:

   ```bash
   pnpm db:generate
   pnpm db:check
   ```

3. Run the migration against local Postgres:

   ```bash
   DATABASE_URL=postgres://linonward:linonward@localhost:5432/linonward \
     pnpm --filter @linonward/api migrate
   ```

Do not edit a generated migration after it has been deployed. The `0000` migration is the one
exception: it is an intentional no-op baseline whose snapshot describes the schema created by
the two legacy migrations. The API applies legacy migrations first and Drizzle migrations second,
so both fresh and previously deployed databases converge safely.
