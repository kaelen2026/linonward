import assert from "node:assert/strict";
import test from "node:test";

import { extractResultText, parseMessages } from "../execution-result.mjs";

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
