# Free-tier deployment plan

This document defines the zero-monthly-platform-cost deployment target for LinOnward. It was
checked against provider documentation on 30 August 2026. Free plans change; verify every linked
limit before creating resources or attaching a payment method.

“Free” here means no recurring hosting charge while usage stays within the listed allowances. It
does not include the already-owned domain, Apple Developer Program, Google Play registration,
Huawei developer verification, taxes, or the engineering time needed to operate the stack.

## Decision

Use managed static/frontend hosting at the edge, but keep every stateful or continuously running
Node process on one Oracle Cloud Always Free VM:

| Concern | Service | Repository runtime | Monthly platform cost |
| --- | --- | --- | --- |
| Public website | Vercel Hobby | `apps/www` | $0 within Hobby limits |
| Consumer and administration Web app | Vercel Hobby | `apps/web` | $0 within Hobby limits |
| Article reader and immutable Hybrid assets | Vercel Hobby | `apps/h5` | $0 within Hobby limits |
| API | OCI Ampere A1 Always Free VM + Docker Compose | `apps/api` | $0 within Always Free allocation |
| Async jobs | Same OCI VM | `apps/worker` | $0 incremental |
| Feishu long-connection relay | Same OCI VM | `apps/feishu` | $0 incremental |
| PostgreSQL 18 | Same OCI VM, private Docker network | `postgres` in `compose.yml` | $0 incremental |
| Redis 8 | Same OCI VM, private Docker network | `redis` in `compose.yml` | $0 incremental |
| Transactional email | Resend Free | API email OTP | $0 up to quota |
| DNS | Cloudflare Free or the current registrar DNS | All public hostnames | $0 excluding registration |
| TLS and reverse proxy | Caddy + Let's Encrypt on OCI | `api.linonward.com` | $0 |
| CI | GitHub Actions | `.github/workflows/ci.yml` | $0 for public repos; quota for private repos |
| Monitoring | Uptime Kuma on the OCI VM | `/health` and `/health/ready` | $0 incremental |
| Backups | OCI Always Free volume backups + local `pg_dump` | PostgreSQL and configuration | $0 within quota |

This topology matches the current code. In particular, BullMQ needs persistent Redis and an
always-running worker, while the Feishu relay owns a long-lived connection. Moving those processes
to request-driven functions would require an architectural rewrite and would weaken delivery
semantics.

## Important eligibility constraint

Vercel Hobby is limited to personal, non-commercial use. It currently includes automatic HTTPS,
100 GB Fast Data Transfer, up to 200 projects, and bounded function/build usage; a Hobby account is
paused rather than charged after included usage is exhausted. See the official
[Hobby plan](https://vercel.com/docs/plans/hobby), [plan overview](https://vercel.com/docs/plans),
and [platform limits](https://vercel.com/docs/limits).

Therefore this plan is valid only while LinOnward is a personal, non-commercial pilot. Before
selling access, accepting commercial sponsorship, or operating it for a business, either move the
three frontend deployments to a provider whose free plan permits that use or budget Vercel Pro.
Do not conceal commercial use behind multiple Hobby accounts.

## Public topology

```text
linonward.com          Vercel project: www
app.linonward.com      Vercel project: web
h5.linonward.com       Vercel project: h5
api.linonward.com      OCI public IP -> Caddy -> apps/api:3001

                       OCI private Docker network
api -> PostgreSQL
api -> Redis <- worker
worker -> PostgreSQL
feishu -> Feishu/GitHub outbound only
```

Only ports 22, 80, and 443 are public on the OCI network security list and host firewall. Do not
publish PostgreSQL 5432 or Redis 6379. Restrict SSH to an administrator IP when possible, disable
password login after confirming key access, and run the containers as the non-root users already
declared by their Dockerfiles.

## Capacity budget

Oracle currently documents Always Free Ampere capacity as 1,500 OCPU-hours and 9,000 GB-hours per
month, equivalent to 2 OCPUs and 12 GB RAM, plus 200 GB total boot/block storage and five volume
backups in the tenancy home region. Capacity can be unavailable in a region, and resources created
outside the home region can be billable. Use one `VM.Standard.A1.Flex` VM with:

- 2 OCPUs and 12 GB RAM;
- a 100 GB boot volume, leaving storage allowance for a separate data volume or backups;
- Ubuntu 24.04 or Oracle Linux for Arm64;
- Docker Engine with the Compose plugin;
- no paid load balancer, managed database, NAT gateway, or extra block volume.

The repository's Node 24 Alpine images are multi-architecture and can build on Arm64. Build on the
VM initially to avoid a paid registry. If deployment time becomes excessive, publish public
multi-architecture images to GHCR and keep image retention inside GitHub's free allowance.

Oracle warns that Always Free capacity may return an “out of host capacity” error. Treat VM
availability, single-host failure, and manual operations as accepted pilot risks. Official limits:
[OCI Always Free resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
and [Free Tier overview](https://docs.oracle.com/iaas/Content/FreeTier/freetier.htm).

## Vercel projects

Create three independent projects from the monorepo. Keep `apps/h5/vercel.json` in the H5 project
so `/articles/:slug` falls back to `index.html`.

| Project | Root/build | Output/domain | Required build environment |
| --- | --- | --- | --- |
| `linonward-www` | repository root; `pnpm --filter @linonward/www build` | Next.js; `linonward.com` | `NEXT_PUBLIC_API_URL=https://api.linonward.com` |
| `linonward-web` | repository root; `pnpm --filter @linonward/web build` | Next.js; `app.linonward.com` | `NEXT_PUBLIC_API_URL=https://api.linonward.com` plus server-only admin values |
| `h5` | prebuild `apps/h5/dist`, or workspace build from root | `apps/h5/dist`; `h5.linonward.com` | `VITE_API_URL=https://api.linonward.com` |

The H5 URL is also compiled into iOS Release by `apps/ios/Config/Release.xcconfig`. Android and
HarmonyOS release configuration must use the same HTTPS origin when their share/deep-link flows
are enabled.

Set DNS records only after the Vercel project accepts each domain. For the current H5 deployment,
Vercel requests `A h5 76.76.21.21`. Re-check the dashboard instead of copying that value to other
hostnames. Cloudflare provides free authoritative DNS without query charges on its Free plan; see
the official [Cloudflare DNS FAQ](https://developers.cloudflare.com/dns/faq/).

## OCI deployment

Use `/opt/linonward` for the checkout and `/srv/linonward` on the attached data volume for durable
PostgreSQL, Redis, backups, and Caddy state. Do not store secrets in the checkout.

1. Provision the Always Free VM in the tenancy home region and reserve its public IP.
2. Point `api.linonward.com` to that IP.
3. Install Docker, clone the repository, and create a root-owned environment file with mode 0600.
4. Extend the production Compose file with Caddy and named bind mounts under `/srv/linonward`.
5. Start PostgreSQL and Redis, run the one-shot migration, then start API, worker, and Feishu.
6. Start Caddy only after DNS resolves; verify automatic TLS.
7. Verify `https://api.linonward.com/health` and `/health/ready` before retargeting clients.

The production environment contract is:

```dotenv
NODE_ENV=production
HOST=0.0.0.0
PORT=3001
DATABASE_URL=postgres://<user>:<password>@postgres:5432/linonward
REDIS_URL=redis://redis:6379
QUEUE_PREFIX=linonward
BETTER_AUTH_URL=https://app.linonward.com
BETTER_AUTH_SECRET=<at-least-32-random-characters>
CORS_ALLOWED_ORIGINS=https://linonward.com,https://app.linonward.com,https://h5.linonward.com
TRUSTED_PROXY_IPS=<literal-Caddy-container-IP-or-controlled-proxy-peer>
RESEND_API_KEY=<secret>
AUTH_EMAIL_FROM=LinOnward <login@linonward.com>
INTERNAL_CONSOLE_ADMIN_EMAILS=<normalized-admin-addresses>
```

Add Google identifiers only when all web, API, iOS, and provider redirect values agree. Keep
`DATABASE_URL`, `REDIS_URL`, OAuth secrets, Resend keys, and Feishu secrets off Vercel frontend
builds and out of GitHub variables visible to forks.

## Email budget

Resend Free currently allows 100 transactional emails per day and 3,000 per month. Both inbound
and outbound messages consume quota. LinOnward sends one OTP per request, so enforce application
rate limits and alert at 70, 85, and 95 percent of the smaller daily/monthly remaining allowance.
When quota is exhausted, sign-in email stops; there is no free overage. Verify the sending domain
before production. See Resend's official [quotas](https://resend.com/docs/knowledge-base/account-quotas-and-limits)
and [pricing explanation](https://resend.com/docs/knowledge-base/what-is-resend-pricing).

## Backups and recovery

Zero cost does not mean zero backup:

- run `pg_dump --format=custom` nightly to `/srv/linonward/backups/postgres`;
- retain seven daily and four weekly dumps, deleting only after a new dump passes `pg_restore --list`;
- take an OCI volume backup weekly and before schema migrations, staying within the five-backup allowance;
- copy one encrypted monthly dump to an administrator-controlled machine; a backup on the same VM
  is not disaster recovery;
- persist Redis AOF as required by the queue, but recover business truth from PostgreSQL and
  explicitly reconcile or re-enqueue incomplete jobs after a Redis loss;
- test a restore into a temporary database every month.

Never expose database dumps through Vercel, GitHub artifacts, a public object store, or the H5
release tree.

## CI and delivery budget

GitHub-hosted standard runners are free for public repositories. GitHub Free private repositories
currently include 2,000 minutes and 500 MB artifact storage per month; macOS minutes used by iOS
CI consume the allowance faster. The official rules are in
[GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
and [included product usage](https://docs.github.com/en/billing/reference/product-usage-included).

For a private repository:

- keep path-based CI selection enabled;
- run iOS only when iOS/shared paths change;
- retain reports for seven days or less;
- use the repository-owned macOS runner for HarmonyOS and optionally iOS;
- set the GitHub Actions budget to stop usage at the free allowance;
- deploy to OCI only after the existing verification jobs pass.

Deploy the backend over SSH by pulling an immutable commit, building images, running migrations,
and replacing containers. Keep the previous images until health checks pass so rollback does not
depend on rebuilding.

## Monitoring and hard stops

Run Uptime Kuma on the OCI VM, but recognize that it cannot report a total VM outage from inside
that VM. Add a free external HTTP monitor if available; do not make the deployment depend on a
trial-only monitoring product.

Minimum checks:

- Vercel: `/`, locale routes, and `/articles/<known-slug>`;
- API: `/health` every minute and `/health/ready` every five minutes;
- PostgreSQL: connection count, volume usage, last successful dump, and migration version;
- Redis: AOF status, memory usage, rejected connections, and queue lag;
- worker: last completed job and failed-job count;
- Resend: daily and monthly usage;
- TLS: certificate expiry and DNS resolution.

Do not enable pay-as-you-go on a “free-only” deployment. Configure provider budgets to stop usage,
not merely send an email. On OCI, use compartment quotas so only Always Free shapes and storage
can be created.

## Upgrade triggers

Free tier is an operating constraint, not a production SLA. Revisit the architecture when any of
these becomes true:

- the product becomes commercial, making Vercel Hobby ineligible;
- OTP demand approaches 70 emails/day or 2,100/month;
- the database exceeds 50 GB, the data volume exceeds 70 percent, or backups no longer fit;
- API p95 latency exceeds 500 ms under normal load;
- the worker needs independent scaling or jobs regularly wait more than five minutes;
- a single VM outage is no longer an acceptable recovery event;
- the team cannot restore PostgreSQL within the agreed recovery time;
- OCI reclaims capacity or the home region cannot supply an Always Free VM.

The first paid priorities should be a managed PostgreSQL service with point-in-time recovery,
managed durable Redis, and a second API/worker failure domain. Frontend plan upgrades come earlier
if commercial eligibility requires them.

## Rollout checklist

- [ ] Confirm the project is eligible for Vercel Hobby's non-commercial restriction.
- [ ] Configure provider budgets and deny paid OCI resource types.
- [ ] Provision one home-region Always Free Arm VM and durable storage.
- [ ] Harden SSH and expose only 22/80/443.
- [ ] Deploy PostgreSQL and Redis without public ports.
- [ ] Run migrations, then deploy API, worker, and Feishu.
- [ ] Configure Resend sender DNS and verify an OTP end to end.
- [ ] Deploy `www`, `web`, and `h5` as separate Vercel projects.
- [ ] Configure `NEXT_PUBLIC_API_URL` and `VITE_API_URL` before building.
- [ ] Point all public DNS records and verify HTTPS.
- [ ] Verify browser article sharing and `linonward://article/<slug>` on iOS.
- [ ] Configure nightly dumps, volume backups, retention, and a restore drill.
- [ ] Configure health, quota, disk, queue, and certificate alerts.
- [ ] Record owners for DNS, OCI, Vercel, Resend, GitHub, Feishu, and recovery credentials.
