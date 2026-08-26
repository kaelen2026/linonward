import * as Lark from "@larksuiteoapi/node-sdk";

import type { FeishuConfig } from "./config.js";
import { type DispatchTask, handleFeishuMessage, type RelayConfig } from "./relay.js";

export async function startLongConnection(
  feishuConfig: FeishuConfig,
  relayConfig: RelayConfig,
  dispatch: DispatchTask,
): Promise<Lark.WSClient> {
  const eventDispatcher = new Lark.EventDispatcher({}).register({
    "im.message.receive_v1": async (event) => handleFeishuMessage(event, relayConfig, dispatch),
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
