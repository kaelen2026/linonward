export type Task = {
  chatId: string;
  messageId: string;
  text: string;
};

export type RelayConfig = {
  allowedOpenIds: ReadonlySet<string>;
  maxTaskLength: number;
};

export type DispatchTask = (task: Task) => Promise<void>;

export type FeishuMessageEvent = {
  message: {
    chat_id: string;
    content: string;
    message_id: string;
    message_type: string;
  };
  sender: {
    sender_id?: {
      open_id?: string;
    };
  };
};

export async function handleFeishuMessage(
  event: FeishuMessageEvent,
  config: RelayConfig,
  dispatch: DispatchTask,
): Promise<{ status: "dispatched" | "ignored" }> {
  if (event.message.message_type !== "text") {
    return { status: "ignored" };
  }

  const openId = event.sender.sender_id?.open_id;
  if (!openId || !config.allowedOpenIds.has(openId)) {
    return { status: "ignored" };
  }

  const task = getTask(event.message, config.maxTaskLength);
  if (!task) {
    return { status: "ignored" };
  }

  await dispatch(task);
  return { status: "dispatched" };
}

function getTask(message: FeishuMessageEvent["message"], maxTaskLength: number): Task | undefined {
  const content = parseTextContent(message.content);
  if (!content) {
    return undefined;
  }

  const text = content.trim();
  if (!text || text.length > maxTaskLength) {
    return undefined;
  }

  return { chatId: message.chat_id, messageId: message.message_id, text };
}

function parseTextContent(content: string): string | undefined {
  try {
    const value: unknown = JSON.parse(content);
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return undefined;
    }
    const text = (value as Record<string, unknown>).text;
    return typeof text === "string" ? text : undefined;
  } catch {
    return undefined;
  }
}
