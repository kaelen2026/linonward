# Feishu topic-group archive and task workflow

Status: implementation specification

This document is the source of truth for connecting a Feishu topic group, a Bitable archive, and
LinOnward tasks. If existing behavior differs from this document, the implementation must be
changed deliberately or this document must be revised before the behavior is shipped.

## Goals

- Archive every supported message from one configured Feishu topic group, whether or not it
  mentions the Bot.
- Let an authorized user start a task either by mentioning the Bot in the topic group or by
  triggering the archived Bitable record.
- Reply with task progress and results under the original Feishu message's topic.
- Keep the original message in Bitable, but do not copy Bot result text into Bitable.
- Make every task traceable from its source message and archived record.
- Make Feishu event retries and repeated trigger delivery safe.

## Non-goals

- Bitable is not the task execution log or the canonical task database.
- Bot acknowledgements, progress, results, and failure details are not stored as Bitable text.
- A normal Bitable cell mention is not treated as an IM event. Bitable-triggered execution uses
  an explicit automation/action contract described below.
- Messages from other chats are not archived.
- Historical backfill is not part of the first implementation.

## User-visible workflow

### Topic-group message mentioning the Bot

1. Feishu delivers `im.message.receive_v1` over the long connection.
2. The service verifies that the message belongs to `FEISHU_BITABLE_CHAT_ID`.
3. If the sender is allowed to trigger tasks and the message contains a real mention of this Bot,
   the Bot immediately acknowledges the request with a reply using `reply_in_thread: true`. This
   reply creates or opens the independent topic and must not wait for Bitable or task persistence.
4. The service archives the original message in Bitable.
5. The service creates one task linked to the archived message.
6. The task runs through the configured GitHub or Hermes route.
7. Progress and the final result are replied under the same source message's topic.
8. Bitable retains only source data and task-tracing metadata, not the result body.

### Topic-group message without a Bot mention

1. The service archives the original message in Bitable.
2. It does not create a task and does not reply in the group.
3. An authorized user may trigger a task later from that Bitable record.

### Task triggered from Bitable

“Mention Bot in Bitable” is implemented as an explicit Bitable action, such as a button,
checkbox, or status transition named `触发任务`. A plain rich-text `@Bot` mention is not a reliable
server event and must not be the integration contract.

1. A user activates `触发任务` on one archived record.
2. Bitable automation calls the service's authenticated task-trigger endpoint with the record ID.
3. The service loads and validates the record, including its source message identifiers.
4. The service creates a task with trigger source `bitable`.
5. The Bot acknowledges and later returns the result under the original source message's topic.
6. The record's task reference and coarse task status may be updated. Result text is not written
   to Bitable.

## Routing and reply rules

The source message supplies three identifiers:

- `chat_id` identifies the configured topic group.
- `message_id` identifies the exact source message and is the reply target.
- `thread_id`, falling back to `root_id`, identifies the topic and task session.

The service replies with Feishu's reply-to-message API using `message_id` and
`reply_in_thread: true`. A group mention alone does not create an independent topic; the immediate
Bot acknowledgement does. It must not send a new top-level group message. If `thread_id` is
absent, the session key falls back to `root_id`, then to `message_id`.

Every trigger carries the same source identifiers into the task system. A Bitable-triggered task
therefore behaves exactly like a group-triggered task after task creation.

## Mention and authorization rules

- Mention detection uses Feishu's structured mention data and the configured Bot/application
  identity. It must not rely on text containing `@Bot`.
- The target chat is archived regardless of sender allowlist membership.
- Only senders in `FEISHU_ALLOWED_OPEN_IDS` may trigger a task from the group.
- The Bitable automation must provide the triggering user's identity. The same authorization
  policy applies to Bitable triggers; an automation call without a verifiable actor is denied.
- Bot-authored messages and task replies must not create new archive-trigger-task loops.
- Messages outside `FEISHU_BITABLE_CHAT_ID` continue to follow the separately documented relay
  policy and are never written to this Bitable.

## Bitable schema

The first three columns are user-facing source data. The remaining columns are implementation and
audit metadata and may be hidden from normal views.

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `内容` | Text | Yes | Original user-authored text or a stable description of a non-text message |
| `附件` | Attachment | No | Images and files copied from the source message |
| `时间` | Date | Yes | Original Feishu message creation time |
| `消息ID` | Text | Yes | Immutable Feishu `message_id`; unique archive/idempotency key |
| `群ID` | Text | Yes | Source `chat_id` |
| `话题ID` | Text | Yes | `thread_id`, `root_id`, or `message_id` fallback |
| `发送人ID` | Text | Yes | Source sender open ID |
| `记录状态` | Single select | Yes | `已留存`, `留存失败`, or `不可处理` |
| `触发任务` | Checkbox/button | No | Explicit Bitable automation trigger |
| `最近任务ID` | Text/URL | No | Most recently created task identifier or trace URL |
| `最近任务状态` | Single select | No | `未触发`, `待处理`, `处理中`, `成功`, or `失败` |
| `最近触发来源` | Single select | No | `话题群` or `多维表格` |
| `最近触发时间` | Date | No | Time at which the latest task was accepted |

`内容`, `附件`, and `时间` preserve the requested visible archive. The additional source fields
are mandatory because a record ID alone cannot locate the original Feishu reply target.

One message owns one archive record. A message may create multiple task executions over time.
Complete execution history belongs in the task system or task outbox; Bitable exposes only the
latest task reference and state. If product requirements later require browsing every execution
from Bitable, add a separate task-index table related one-to-many to the message table. Do not add
Bot result bodies to the message table.

## Task and audit model

Each task records at least:

- task ID;
- source message ID, chat ID, and topic key;
- Bitable app token, table ID, and record ID;
- trigger source (`feishu_mention` or `bitable`);
- triggering actor open ID;
- route (`github` or `hermes`);
- timestamps, attempt count, status, and bounded failure reason;
- downstream run/session identifier when available.

The task database/outbox is the canonical audit record. The task ID is returned to Bitable and is
also included in operational logs. Message bodies, attachment contents, credentials, and Bot
result bodies must not be written to structured logs.

## Idempotency and ordering

Archive and task idempotency are separate concerns:

- Archive key: `message_id`. Feishu retry delivery must update or return the existing record, not
  create another row.
- Direct-trigger key: `feishu:<message_id>`. Repeated delivery of the same mention creates one
  task.
- Bitable-trigger key: an automation delivery/event ID. Repeated delivery creates one execution.
  A later explicit re-trigger uses a new event ID and may create another execution.
- Attachment upload happens only when the archive record does not already contain the attachment
  token. A retry after partial upload must reconcile the record rather than append duplicates.

For a direct mention, the topic acknowledgement is attempted before archival or task persistence.
This gives the user an immediate independent topic even if a downstream dependency is unavailable.
Archival is then attempted before direct task creation so the task can carry the record ID. A
Bitable outage must not silently lose the task request: persist an archive/task-pending state
locally, retry it, and report the failure in the topic that was already opened.

## Failure behavior

| Failure | Required behavior |
| --- | --- |
| Unsupported message type | Archive a stable type description or mark `不可处理`; do not trigger |
| Attachment download/upload failure | Retain a retryable archive failure; do not create a partial duplicate row |
| Bitable record write failure | Persist retry state and log identifiers without message content |
| Unauthorized direct mention | Archive only; do not acknowledge or create a task |
| Unauthorized Bitable trigger | Reject it and leave task state unchanged |
| Task dispatch failure | Reply with a concise failure under the source topic; retain failure in task audit |
| Reply failure | Retain a retryable reply operation linked to the task; do not rerun the task |
| Missing/deleted source message | Mark reply failure in task audit; do not write result text to Bitable |

Archiving and task execution must not share one Redis claim in a way that causes one successful
side effect to suppress retry of the other. Each durable side effect needs its own status.

## Feishu application configuration

Enable the Bot capability, use long-connection event delivery, and subscribe to
`im.message.receive_v1`. The published self-built application needs the current equivalents of:

| Capability | Permission scope |
| --- | --- |
| Receive every group message, including messages without a Bot mention | `im:message.group_msg:readonly` |
| Read message images and files | `im:resource` |
| Reply as the Bot | `im:message:send_as_bot` |
| Create and update Bitable records | `bitable:app` |
| Upload Bitable attachment media | `drive:drive` |

Permission names and approval requirements can change in Feishu. Before deployment, verify the
exact scopes shown by the API explorer for the SDK/API versions in use. The Bot must be a member of
the target group. The application must also be added as a collaborator with edit access to the
target Bitable; API scopes alone do not grant document access.

## Environment contract

Application credentials and resource identifiers are supplied through environment variables.
They must never be committed.

```dotenv
# Feishu self-built application
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx
FEISHU_ALLOWED_OPEN_IDS=ou_xxx,ou_yyy

# Topic-group archive destination
FEISHU_BITABLE_CHAT_ID=oc_xxx
FEISHU_BITABLE_APP_TOKEN=bascn_xxx
FEISHU_BITABLE_TABLE_ID=tbl_xxx

# Bitable automation callback authentication
FEISHU_BITABLE_TRIGGER_SECRET=high-entropy-secret

# Field names; defaults shown
FEISHU_BITABLE_CONTENT_FIELD=内容
FEISHU_BITABLE_ATTACHMENT_FIELD=附件
FEISHU_BITABLE_TIME_FIELD=时间
FEISHU_BITABLE_MESSAGE_ID_FIELD=消息ID
FEISHU_BITABLE_CHAT_ID_FIELD=群ID
FEISHU_BITABLE_THREAD_ID_FIELD=话题ID
FEISHU_BITABLE_SENDER_ID_FIELD=发送人ID
FEISHU_BITABLE_TRIGGER_FIELD=触发任务
FEISHU_BITABLE_TASK_ID_FIELD=最近任务ID
FEISHU_BITABLE_TASK_STATUS_FIELD=最近任务状态
```

The service must reject partial destination configuration at startup. Secrets must be redacted
from configuration errors and logs. Existing database, Redis, GitHub, and optional Hermes
variables remain required by their respective routes.

## Component boundaries

Implementation should keep these responsibilities separate:

- Feishu event adapter: normalize event data and structured mentions.
- Archive service: reconcile one message and its attachments into one Bitable record.
- Trigger endpoint: authenticate Bitable automation calls and resolve the triggering actor.
- Task service/outbox: authorize, create, dispatch, retry, and audit task executions.
- Reply service/outbox: acknowledge and deliver final output to the original source message.
- Configuration: validate credentials, destination IDs, field mappings, and trigger secret.

The event adapter must not contain task persistence or Bitable field-shaping logic. External
clients should be wrapped behind narrow interfaces so behavior can be tested without live Feishu
or GitHub access.

## Security and data handling

- Treat archived messages and attachments as potentially sensitive personal or business data.
- Use tenant/application access tokens through the official SDK; do not expose them to Bitable
  automation payloads or task workflows.
- Authenticate the Bitable trigger with a high-entropy shared secret and replay protection. Place
  the endpoint behind TLS and a request-size limit.
- Authorize the actor in addition to authenticating the automation.
- Do not place message text, attachment bytes, secrets, or Bot output in logs.
- Apply the repository's approved retention and deletion policy to Bitable, task audit, and
  backups before enabling automated deletion.

## Acceptance criteria

1. A supported message without a Bot mention creates exactly one Bitable record and no task or
   Bot reply.
2. A real Bot mention from an allowed sender creates exactly one archive record and one task.
3. The first acknowledgement for an allowed mention uses `reply_in_thread: true` before Bitable or
   task persistence, so the message has an independent topic even during a downstream outage.
4. Plain text containing `@Bot` without a structured mention does not trigger a task.
5. A mention from a sender outside the allowlist is archived but creates no task.
6. Image and file messages appear as attachments on the same archive record.
7. A Bitable action from an allowed actor creates a task linked to the existing record.
8. Direct and Bitable-triggered tasks reply under the original message's topic.
9. Bot result text never appears in the Bitable record.
10. Replaying the same Feishu event, Bitable automation delivery, or reply job produces no
   duplicate side effect.
11. A second intentional Bitable trigger creates a distinct task while retaining the same source
    message and record links.
12. Task ID, trigger source, actor, status, attempts, and downstream run/session ID are queryable in
    the task audit store.
13. Configuration validation fails before connection startup when any required group, Bitable, or
    trigger setting is incomplete.

## Current implementation gap

The initial Bitable writer in `apps/feishu` only filters by chat ID and writes `内容`, `附件`, and
`时间`. It does not yet implement this complete specification. In particular, implementation must
still add structured Bot-mention routing, source metadata fields, durable archive reconciliation,
the authenticated Bitable trigger, actor authorization, task/record linkage, and independently
retryable reply delivery. These gaps must be closed before the workflow is considered complete.
