# Feishu relay

This service maintains a Feishu long connection and turns an authorized text message into the
`feishu-task` GitHub `repository_dispatch` event consumed by
[`.github/workflows/feishu-task.yml`](../../.github/workflows/feishu-task.yml).

## Security model

- The Feishu SDK authenticates the long connection with the application's ID and secret.
- Only `im.message.receive_v1` text messages are accepted.
- Only senders listed in `FEISHU_ALLOWED_OPEN_IDS` can trigger a task. Use open IDs, not
  display names, and keep the allowlist deliberately small.
- The GitHub dispatch token is only used by this service and is never passed to a workflow.
- Requests are limited to 1 MB and task text defaults to 6,000 characters (set
  `MAX_TASK_LENGTH` to lower it, if needed).

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

For the first live check, send an innocuous message from an allowlisted account, such as
`只说明仓库当前默认分支和最新提交，不修改文件`. GitHub Actions starts the `Feishu task` run, and
the workflow replies to the original Feishu message with the run URL.
