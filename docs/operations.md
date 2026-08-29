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

## Web/API observability

The browser starts a W3C trace for contact submissions and sends both
`traceparent` and `X-Request-Id`. The API continues the trace with a server span,
returns `Traceparent`, `X-Trace-Id`, and `X-Request-Id`, and writes the same
`traceId`, `spanId`, and `requestId` into its JSON request log. These identifiers
are operational metadata only; do not add form fields, email addresses, message
bodies, session cookies, or authorization headers to logs or metric labels.

The API's `/metrics` endpoint exposes the RED signals with bounded labels:

- `linonward_http_requests_total` by HTTP method, route template, and status;
- `linonward_http_request_duration_milliseconds` as a latency histogram;
- `linonward_http_requests_active` as an in-flight gauge.

Route templates are used instead of raw URLs to prevent IDs and arbitrary 404
paths from creating unbounded Prometheus series. The `/metrics` scrape itself is
excluded from application measurements.

Start the local monitoring stack with:

```sh
OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318 \
  docker compose --profile observability up -d
```

Grafana is then available at `http://localhost:3003` (user `admin`, password
`linonward` unless `GRAFANA_ADMIN_PASSWORD` is set), with the provisioned
**LinOnward API Overview** dashboard. Prometheus is bound to loopback at
`http://localhost:9090`; Tempo receives API spans over OTLP/HTTP and is available
as Grafana's Explore data source. Production must set a non-default Grafana
password and should place both endpoints behind operator authentication rather
than exposing them publicly.

The checked-in alert rules cover API availability, a sustained 5xx ratio above
5%, and p95 latency above one second. They intentionally have no notification
receiver: connect Prometheus/Alertmanager or translate the expressions into the
deployment platform's alerting system, then route critical alerts to the
on-call channel and warning alerts to the service owner.

Incident correlation sequence:

1. Ask for the response's `X-Request-Id`, or copy `X-Trace-Id` from browser
   developer tools.
2. Search Tempo by `traceId`, and filter API JSON logs by `requestId` for one
   request or `traceId` for the same browser/API trace.
3. Use the log's `route`, `status`, and `durationMs` to pivot to the matching
   Grafana RED panel and determine whether the event is isolated or systemic.
4. For unexpected 500 responses, use the paired `http_request_failed` event;
   client responses stay intentionally opaque and contain no internal error.

Prometheus data is retained for 15 days in local Compose. Production retention,
log indexing, SLO targets, paging ownership, and long-term storage remain
deployment decisions and must be documented alongside the chosen platform.
