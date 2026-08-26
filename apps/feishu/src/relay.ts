export type Task = {
  chatId: string;
  messageId: string;
  route: "github" | "hermes";
  senderOpenId?: string;
  text: string;
  threadKey: string;
};

export type RelayConfig = {
  allowedOpenIds: ReadonlySet<string>;
  maxTaskLength: number;
};

export type DispatchResult = {
  reply?: string;
};

export type DispatchTask = (task: Task) => Promise<DispatchResult | undefined>;
export type ReplyTask = (task: Task, text: string) => Promise<void>;

export type FeishuMessageEvent = {
  message: {
    chat_id: string;
    content: string;
    message_id: string;
    message_type: string;
    root_id?: string;
    thread_id?: string;
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
  reply: ReplyTask = async () => undefined,
): Promise<{ status: "dispatched" | "ignored" }> {
  if (event.message.message_type !== "text") {
    return { status: "ignored" };
  }

  const openId = event.sender.sender_id?.open_id;
  if (!openId || !config.allowedOpenIds.has(openId)) {
    return { status: "ignored" };
  }

  const task = getTask(event.message, config.maxTaskLength, openId);
  if (!task) {
    return { status: "ignored" };
  }

  try {
    await reply(task, "收到，正在处理。");
  } catch (error) {
    console.error("Unable to acknowledge Feishu message", error);
  }

  try {
    const result = await dispatch(task);
    if (result?.reply) {
      await reply(task, result.reply);
    }
  } catch (error) {
    console.error("Unable to process Feishu message", error);
    await reply(task, "处理失败，请稍后重试。");
  }
  return { status: "dispatched" };
}

function getTask(
  message: FeishuMessageEvent["message"],
  maxTaskLength: number,
  senderOpenId: string,
): Task | undefined {
  const content = parseTextContent(message.content);
  if (!content) {
    return undefined;
  }

  const text = content.trim();
  if (!text || text.length > maxTaskLength) {
    return undefined;
  }

  const contentTask = text.match(/^\/(?:content|内容)\s+(.+)$/isu);

  return {
    chatId: message.chat_id,
    messageId: message.message_id,
    route: contentTask ? "hermes" : "github",
    text: contentTask?.[1]?.trim() ?? text,
    senderOpenId,
    threadKey: message.thread_id ?? message.root_id ?? message.message_id,
  };
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
