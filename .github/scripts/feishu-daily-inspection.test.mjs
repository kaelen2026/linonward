import assert from "node:assert/strict";
import test from "node:test";

import { buildInspectionCard } from "./feishu-daily-inspection.mjs";

const healthyEnvironment = {
  ANDROID_RESULT: "success",
  COMMIT_SHA: "25e0aea0eaef4164fb9375a2d45538febda5d217",
  END_TO_END_RESULT: "success",
  EVENT_NAME: "workflow_dispatch",
  HARMONY_RESULT: "skipped",
  INTEGRATION_RESULT: "success",
  IOS_RESULT: "success",
  REF_NAME: "main",
  RUN_URL: "https://github.com/kaelen2026/linonward/actions/runs/1",
  WORKSPACE_RESULT: "success",
};

test("builds a compact green card for a healthy inspection", () => {
  const card = buildInspectionCard(healthyEnvironment);

  assert.equal(card.header.template, "green");
  assert.equal(card.header.title.content, "LinOnward 每日巡检 · 全部通过");
  assert.match(card.elements[0].text.content, /6 项检查 · 5 通过 · 1 跳过/);
  assert.equal(card.elements[2].fields.length, 6);
  assert.equal(card.elements.at(-1).actions[0].url, healthyEnvironment.RUN_URL);
});

test("uses an urgent treatment when any inspection job fails", () => {
  const card = buildInspectionCard({ ...healthyEnvironment, IOS_RESULT: "failure" });

  assert.equal(card.header.template, "red");
  assert.equal(card.header.title.content, "LinOnward 每日巡检 · 发现异常");
  assert.match(card.elements[0].text.content, /1 异常/);
  assert.equal(card.elements.at(-1).actions[0].type, "danger");
});
