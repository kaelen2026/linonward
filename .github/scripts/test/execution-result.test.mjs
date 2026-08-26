import assert from "node:assert/strict";
import test from "node:test";

import { extractResultText, formatExecutionReply, parseMessages } from "../execution-result.mjs";

test("uses the final result text from the Claude execution file", () => {
  const messages = parseMessages(
    JSON.stringify([
      { type: "assistant", message: { content: [{ type: "text", text: "intermediate" }] } },
      { type: "result", result: "最终中文回复" },
    ]),
  );

  assert.equal(extractResultText(messages), "最终中文回复");
});

test("accepts JSONL execution files", () => {
  const messages = parseMessages(
    '{"type":"result","result":"第一条"}\n{"type":"result","result":"最后一条"}',
  );

  assert.equal(extractResultText(messages), "最后一条");
});

test("falls back to the latest assistant text when no result record exists", () => {
  const messages = parseMessages(
    JSON.stringify([{ type: "assistant", content: [{ type: "text", text: "可以回帖的结论" }] }]),
  );

  assert.equal(extractResultText(messages), "可以回帖的结论");
});

test("explains a turn-limit failure and preserves the latest progress", () => {
  const messages = parseMessages(
    JSON.stringify([
      { type: "assistant", content: [{ type: "text", text: "Now 全仓验证：" }] },
      { is_error: true, subtype: "error_max_turns", type: "result" },
    ]),
  );

  assert.equal(
    formatExecutionReply(messages, "https://github.com/example/repo/actions/runs/1"),
    [
      "任务未完成：已达到本次操作轮数上限。",
      "",
      "最近进度：Now 全仓验证：",
      "",
      "请在当前话题回复“继续”以恢复会话并继续处理。",
      "运行日志：https://github.com/example/repo/actions/runs/1",
    ].join("\n"),
  );
});
