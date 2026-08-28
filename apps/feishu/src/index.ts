import { loadServiceConfig } from "./config.js";
import { createGitHubDispatcher } from "./github.js";
import { createHermesDispatcher } from "./hermes.js";
import { startLongConnection } from "./long-connection.js";
import { connectRedis } from "./redis.js";
import type { DispatchTask } from "./relay.js";

const config = loadServiceConfig(process.env);
const githubDispatch = createGitHubDispatcher(config.github);
const hermesDispatch = config.hermes ? createHermesDispatcher(config.hermes) : undefined;
const dispatch: DispatchTask = async (task) => {
  if (task.route === "hermes") {
    if (!hermesDispatch) {
      return { reply: "内容生产尚未配置。请联系管理员设置 Hermes 本地服务。" };
    }
    return hermesDispatch(task);
  }

  return githubDispatch(task);
};

const redis = await connectRedis(config.redisUrl);

void startLongConnection(config.feishu, config.relay, dispatch, redis).catch((error: unknown) => {
  console.error("Unable to start Feishu long connection", error);
  void redis.close();
  process.exitCode = 1;
});
