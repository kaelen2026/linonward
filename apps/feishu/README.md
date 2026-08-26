# Feishu relay

This service maintains a Feishu long connection and turns an authorized text message into the
`feishu-task` GitHub `repository_dispatch` event consumed by
[`.github/workflows/feishu-task.yml`](../../.github/workflows/feishu-task.yml).

It immediately acknowledges every accepted request under its Feishu topic. That reply opens a
topic for a main-stream message; follow-ups in the same topic share one Claude Code session while
unrelated messages receive independent sessions.

## Security model

- The Feishu SDK authenticates the long connection with the application's ID and secret.
- Only `im.message.receive_v1` text messages are accepted.
- Only senders listed in `FEISHU_ALLOWED_OPEN_IDS` can trigger a task. Use open IDs, not
  display names, and keep the allowlist deliberately small.
- The GitHub dispatch token is only used by this service and is never passed to a workflow.
- Task text defaults to 6,000 characters (set `MAX_TASK_LENGTH` to lower it, if needed).

Long connection mode does not expose a callback URL or an inbound HTTP endpoint. It must run as
one long-lived process with outbound access to Feishu and GitHub.

## Configure

1. Copy `.env.example` to an untracked `.env` file and replace every placeholder.
2. Create a fine-grained GitHub token scoped to this repository with **Contents: write**.
   Store it as `GITHUB_DISPATCH_TOKEN`. GitHub requires that permission to create a
   `repository_dispatch` event.
3. In the Feishu developer console, select **Use long connection to receive events** as the event
   subscription mode. No request URL, verification token, or public ingress is needed.
4. Subscribe to `im.message.receive_v1`, grant the bot the required message-receiving scope, and
   publish the app to the users represented by `FEISHU_ALLOWED_OPEN_IDS`.
5. Set the repository secrets used by the workflow itself:
   `CLAUDE_CODE_OAUTH_TOKEN`, `LARKSUITE_CLI_APP_ID`, and `LARKSUITE_CLI_APP_SECRET`.

`repository_dispatch` only reads workflows from the repository's default branch. Merge
`feishu-task.yml` into `main` before running an end-to-end test.

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
`只说明仓库当前默认分支和最新提交，不修改文件`. GitHub Actions starts the `Feishu task` run, and
the relay immediately replies `收到，正在处理。` in that message's topic. When the task finishes,
the workflow replies there again with the run URL. Send a follow-up in the same topic to continue
the Claude Code session.
