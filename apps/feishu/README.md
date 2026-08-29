# Feishu relay

This service is the single Feishu long-connection owner. It turns authorized text messages into
either the `workflow_dispatch` input for the unified
[`linonward-bot` workflow](../../.github/workflows/linonward-bot.yml), or a local Hermes
content-production request.

It immediately acknowledges every accepted request under its Feishu topic. That reply opens a
topic for a main-stream message; follow-ups in the same topic share one Claude Code session while
unrelated messages receive independent sessions.

## Routes

| Message | Destination | Context |
| --- | --- | --- |
| Any normal text | GitHub Actions / Claude Code | The Feishu topic maps to one Claude session. |
| `/内容 <需求>` or `/content <request>` | Local Hermes `contentchief` API | The Feishu topic maps to one Hermes conversation. |

Hermes is never configured as a second Feishu bot. The relay receives and replies to all Feishu
events, so there is only one long connection and every reply uses the same Bot identity.

## Security model

- The Feishu SDK authenticates the long connection with the application's ID and secret.
- Only `im.message.receive_v1` text messages are accepted.
- Only senders listed in `FEISHU_ALLOWED_OPEN_IDS` can trigger a task. Use open IDs, not
  display names, and keep the allowlist deliberately small.
- The GitHub dispatch token is only used by this service to start `linonward-bot`; it is never
  passed to a workflow.
- Hermes is addressed through its loopback-only API server with a bearer key; it is not exposed to
  Feishu or the public network. The Docker service reaches it through `host.docker.internal`.
- Task text defaults to 6,000 characters (set `MAX_TASK_LENGTH` to lower it, if needed).
- Redis atomically claims each Feishu message for 24 hours, so retries, restarts, and accidental
  replica overlap cannot dispatch the same task twice.
- GitHub and Hermes calls time out after 30 seconds by default; set
  `EXTERNAL_REQUEST_TIMEOUT_MS` between 1,000 and 120,000 when needed.

Long connection mode does not expose a callback URL or an inbound HTTP endpoint. It must run as
one long-lived process with outbound access to Feishu and GitHub, plus its Redis dependency.

## Configure

1. Copy `.env.example` to an untracked `.env` file and replace every placeholder.
2. Create a fine-grained GitHub token scoped to this repository with **Actions: write**.
   Store it as `GITHUB_DISPATCH_TOKEN`; the relay uses it only to invoke `linonward-bot` on
   `main`.
3. In the Feishu developer console, select **Use long connection to receive events** as the event
   subscription mode. No request URL, verification token, or public ingress is needed.
4. Subscribe to `im.message.receive_v1`, grant the bot the required message-receiving scope, and
   publish the app to the users represented by `FEISHU_ALLOWED_OPEN_IDS`.
5. Create and install a GitHub App named `linonward-bot` on this repository. Grant it
   **Contents**, **Issues**, and **Pull requests** read/write access. Set its client ID as the
   repository variable `LINONWARD_BOT_CLIENT_ID` and its private key as the repository secret
   `LINONWARD_BOT_PRIVATE_KEY`.
6. Set the repository secrets used by the workflow itself:
   `CLAUDE_CODE_OAUTH_TOKEN`, `LARKSUITE_CLI_APP_ID`, and `LARKSUITE_CLI_APP_SECRET`.

### Request a pull request review

Every opened or reopened pull request automatically receives the `bot-review` label. For a non-bot
actor, opening or reopening also requests a read-only review from `linonward-bot`. The bot submits a
`COMMENT` review and optional inline findings; it never approves, requests changes, or replaces the
human reviewer responsible for the final decision. While the label remains attached, a new head
commit or ready-for-review transition triggers another review. Applying the `bot-review` label also
requests one. The same events from `linonward-bot` are
deliberately ignored; a human must close and reopen the pull request to trigger both CI and review
for that head. Draft pull requests receive the label immediately but wait until they are marked
ready. Removing the label disables later automatic reviews; reopening the pull request opts it back
in.

Each completed review includes the pull request head SHA in a hidden marker. Repeated delivery of
the same label or synchronization event reconciles against that marker and does not create a
duplicate review.

`workflow_dispatch` requires `linonward-bot.yml` to exist on `main` before the relay can invoke
it. Set `GITHUB_WORKFLOW_REF` only when deliberately dispatching a different ref.

### Add local Hermes content production

Use the existing `contentchief` profile as an API service and explicitly disable its Feishu
platform. That profile must not operate a Feishu gateway after this integration: this relay is the
sole Bot connection.

```bash
# Run these locally; choose a high-entropy value for the API key.
hermes -p contentchief config set gateway.api_server.enabled true
hermes -p contentchief config set gateway.api_server.port 8642
hermes -p contentchief config set gateway.api_server.host 127.0.0.1
hermes -p contentchief config set gateway.api_server.key '<local-api-key>'
hermes -p contentchief config set platforms.feishu.enabled false
hermes -p contentchief gateway restart
```

Set the corresponding values in `apps/feishu/.env` (never commit that file):

```dotenv
HERMES_API_URL=http://host.docker.internal:8642/v1
HERMES_API_KEY=<local-api-key>
HERMES_MODEL=contentchief
```

Verify Hermes without printing the key by calling its local health endpoint, then start the relay.
Send `/内容 写一篇产品介绍` to the existing Feishu Bot. It immediately acknowledges the message,
then writes the generated content into the same topic. A follow-up `/内容 ...` in that topic uses
the same Hermes conversation.

## Run and verify

```bash
pnpm install
cp apps/feishu/.env.example apps/feishu/.env
pnpm --filter @linonward/feishu dev
```

The service logs `Feishu long connection established` after it connects.

Build and run the production artifact with:

```bash
pnpm --filter @linonward/feishu build
pnpm --filter @linonward/feishu start
```

## Run with Docker Compose

Docker needs no published ports because the application establishes an outbound long connection.

```bash
cp apps/feishu/.env.example apps/feishu/.env
# Edit apps/feishu/.env with real credentials before starting.
docker compose -f apps/feishu/compose.yml up --build -d
docker compose -f apps/feishu/compose.yml logs -f
```

Wait for `Feishu long connection established` in the logs. To stop the service, run:

```bash
docker compose -f apps/feishu/compose.yml down
```

For the first live check, send an innocuous message from an allowlisted account, such as
`只说明仓库当前默认分支和最新提交，不修改文件`. GitHub Actions starts the `linonward-bot` run, and
the relay immediately replies `收到，正在处理。` in that message's topic. When the task finishes,
the workflow replies there again with Claude's final response. A run URL is included only when
Claude's output cannot be read. Send a follow-up in the same topic to continue the Claude Code
session.
