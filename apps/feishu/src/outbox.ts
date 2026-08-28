import type { Sql } from "@linonward/db";

import type { Task } from "./relay.js";

/** Durable boundary between a Feishu delivery and an external side effect. */
export function createTaskOutbox(sql: Sql) {
  return {
    async enqueue(task: Task): Promise<boolean> {
      const rows = await sql<{ message_id: string }[]>`
        insert into task_outbox (message_id, chat_id, thread_key, route, sender_open_id, payload)
        values (${task.messageId}, ${task.chatId}, ${task.threadKey}, ${task.route}, ${task.senderOpenId ?? ""}, ${task.text})
        on conflict (message_id) do nothing
        returning message_id
      `;
      return rows.length === 1;
    },
    async completed(messageId: string): Promise<void> {
      await sql`update task_outbox set status = 'completed', attempts = attempts + 1, completed_at = now(), updated_at = now() where message_id = ${messageId}`;
    },
    async failed(messageId: string, error: unknown): Promise<void> {
      const reason = error instanceof Error ? error.message.slice(0, 1_000) : "unknown failure";
      await sql`update task_outbox set status = 'failed', attempts = attempts + 1, last_error = ${reason}, updated_at = now() where message_id = ${messageId}`;
    },
    async recoverable(limit = 20): Promise<Task[]> {
      const rows = await sql<
        {
          chat_id: string;
          message_id: string;
          payload: string;
          route: Task["route"];
          sender_open_id: string;
          thread_key: string;
        }[]
      >`
        select chat_id, message_id, payload, route, sender_open_id, thread_key
        from task_outbox
        where status in ('pending', 'failed') and attempts < 5
        order by updated_at asc
        limit ${limit}
      `;
      return rows.map((row) => ({
        chatId: row.chat_id,
        messageId: row.message_id,
        route: row.route,
        senderOpenId: row.sender_open_id || undefined,
        text: row.payload,
        threadKey: row.thread_key,
      }));
    },
  };
}

export type TaskOutbox = ReturnType<typeof createTaskOutbox>;
