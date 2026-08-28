# Operations and governance

## Deployment order

Deploy schema changes with an expand/contract sequence: first add compatible
columns or tables, deploy readers and writers that tolerate both versions,
migrate data, then remove old fields in a later release. Do not combine
destructive DDL with an application rollout.

Run the migration image exactly once before starting new API or Feishu replicas:

```sh
docker compose --profile migrate run --rm migrate
docker compose up -d api
```

The migrator holds a database advisory lock, so a duplicated deployment job
waits rather than applying the same migration concurrently.

## Access and audit boundary

`apps/web` is an internal administrator console. Its server-only
`INTERNAL_CONSOLE_ADMIN_EMAILS` allow-list is the current administrator role;
an authenticated account not on that list receives `/unauthorized`. Keep this
environment variable in the deployment secret store, never in a
`NEXT_PUBLIC_*` variable. Before adding write-capable console features, record
the actor, action, target, request ID, and result in an append-only audit table.

## Data lifecycle

Contact inquiries and Feishu task payloads can contain personal data. The
current code does not automatically delete them: retention duration, legal hold
process, backup retention, deletion approver, and restoration RTO/RPO must be
approved by the data owner before a destructive scheduler is enabled. Until
then, restrict database backups and production log access to operators, do not
put message bodies in structured logs, and test a restore each quarter.

## Feishu task recovery

Each valid Feishu command is inserted into `task_outbox` before an external
dispatcher is called. The message ID is the idempotency key; failed and pending
tasks are retried at startup and every minute, up to five attempts. The
downstream GitHub/Hermes operation must also be idempotent on message ID before
changing the retry limit or retrying a manually compensated task.
