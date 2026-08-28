import { connectDatabase } from "@linonward/db";
import { loadServiceConfig } from "./config.js";
import { createGitHubDispatcher } from "./github.js";
import { createHermesDispatcher } from "./hermes.js";
import { startLongConnection } from "./long-connection.js";
import { createTaskOutbox } from "./outbox.js";
import { connectRedis } from "./redis.js";
import type { DispatchTask } from "./relay.js";

const config = loadServiceConfig(process.env);
const githubDispatch = createGitHubDispatcher(config.github);
const hermesDispatch = config.hermes ? createHermesDispatcher(config.hermes) : undefined;
const postgres = connectDatabase(config.databaseUrl);
const outbox = createTaskOutbox(postgres.sql);
const dispatch: DispatchTask = async (task) => {
  try {
    const result =
      task.route === "hermes"
        ? hermesDispatch
          ? await hermesDispatch(task)
          : { reply: "内容生产尚未配置。请联系管理员设置 Hermes 本地服务。" }
        : await githubDispatch(task);
    await outbox.completed(task.messageId);
    return result;
  } catch (error) {
    await outbox.failed(task.messageId, error);
    throw error;
  }
};

const redis = await connectRedis(config.redisUrl);

async function retryOutbox(): Promise<void> {
  for (const task of await outbox.recoverable()) {
    try {
      await dispatch(task);
    } catch (error) {
      console.error("Unable to retry persisted Feishu task", { messageId: task.messageId, error });
    }
  }
}

await retryOutbox();
const retryTimer = setInterval(() => void retryOutbox(), 60_000);
retryTimer.unref();

void startLongConnection(config.feishu, config.relay, dispatch, redis, outbox.enqueue).catch(
  (error: unknown) => {
    console.error("Unable to start Feishu long connection", error);
    void redis.close();
    void postgres.close();
    process.exitCode = 1;
  },
);
