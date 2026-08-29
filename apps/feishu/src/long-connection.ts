import * as Lark from "@larksuiteoapi/node-sdk";

import {
  type BitableClient,
  createBitableMessageWriter,
  type WriteBitableMessage,
} from "./bitable.js";
import type { FeishuConfig } from "./config.js";
import { createRedisMessageDeduplicator, type RedisClient } from "./redis.js";
import {
  type DispatchTask,
  handleFeishuMessage,
  type PersistTask,
  type RelayConfig,
  type ReplyTask,
} from "./relay.js";

export async function startLongConnection(
  feishuConfig: FeishuConfig,
  relayConfig: RelayConfig,
  dispatch: DispatchTask,
  redis: Pick<RedisClient, "eval">,
  persistTask: PersistTask,
): Promise<Lark.WSClient> {
  const claimMessage = createRedisMessageDeduplicator(redis);
  const messageClient = new Lark.Client({
    appId: feishuConfig.appId,
    appSecret: feishuConfig.appSecret,
  });
  const writeBitableMessage: WriteBitableMessage | undefined = feishuConfig.bitable
    ? createBitableMessageWriter(messageClient as unknown as BitableClient, feishuConfig.bitable)
    : undefined;
  const reply: ReplyTask = async (task, text) => {
    const response = await messageClient.im.v1.message.reply({
      data: {
        content: JSON.stringify({ text }),
        msg_type: "text",
        reply_in_thread: true,
      },
      path: { message_id: task.messageId },
    });
    if (response.code !== 0) {
      throw new Error(`Feishu acknowledgement failed: ${response.code ?? "unknown"}`);
    }
  };
  const eventDispatcher = new Lark.EventDispatcher({}).register({
    "im.message.receive_v1": async (event) => {
      if (writeBitableMessage) {
        try {
          await writeBitableMessage(event.message);
        } catch (error) {
          console.error("Unable to write Feishu message to Bitable", error);
        }
      }
      return handleFeishuMessage(event, relayConfig, dispatch, reply, claimMessage, persistTask);
    },
  });
  const client = new Lark.WSClient({
    appId: feishuConfig.appId,
    appSecret: feishuConfig.appSecret,
    loggerLevel: Lark.LoggerLevel.info,
    onError: (error) => {
      console.error("Feishu long connection stopped", error);
      process.exitCode = 1;
    },
    onReady: () => {
      console.log("Feishu long connection established");
    },
  });

  await client.start({ eventDispatcher });
  return client;
}
