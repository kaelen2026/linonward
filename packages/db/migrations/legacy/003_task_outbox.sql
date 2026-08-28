-- Additive migration: producers write before dispatching external work. The
-- message id is the idempotency key supplied by Feishu.
create table if not exists task_outbox (
  message_id text primary key,
  chat_id text not null,
  thread_key text not null,
  route text not null check (route in ('github', 'hermes')),
  sender_open_id text not null,
  payload text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists task_outbox_recovery_idx on task_outbox (status, updated_at);
