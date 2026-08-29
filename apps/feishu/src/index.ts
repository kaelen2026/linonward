import { loadServiceConfig } from "./config.js";
import { createFeishuImageLoader } from "./feishu-resource.js";
import { createGitHubDispatcher } from "./github.js";
import { createHermesDispatcher } from "./hermes.js";
import { startLongConnection } from "./long-connection.js";
import type { DispatchTask } from "./relay.js";

const config = loadServiceConfig(process.env);
const githubDispatch = createGitHubDispatcher(config.github);
const loadFeishuImages = createFeishuImageLoader(config.feishu);
const hermesDispatch = config.hermes
  ? createHermesDispatcher(config.hermes, fetch, loadFeishuImages)
  : undefined;
const dispatch: DispatchTask = async (task) => {
  return task.route === "hermes"
    ? hermesDispatch
      ? hermesDispatch(task)
      : { reply: "内容生产尚未配置。请联系管理员设置 Hermes 本地服务。" }
    : githubDispatch(task);
};

void startLongConnection(config.feishu, config.relay, dispatch).catch((error: unknown) => {
  console.error("Unable to start Feishu long connection", error);
  process.exitCode = 1;
});
