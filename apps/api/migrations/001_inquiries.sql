create table if not exists inquiries (
  id text primary key,
  name text not null,
  email text not null,
  company text,
  message text not null,
  locale text not null,
  received_at timestamptz not null
);

-- Reading one person's history is the first thing anyone asks of this table.
create index if not exists inquiries_email_idx on inquiries (email);
