import assert from "node:assert/strict";
import test from "node:test";

import { resolvePullRequestReview } from "./pr-review-routing.mjs";

const pullRequest = ({ draft = false, labels = [{ name: "bot-review" }] } = {}) => ({
  action: "synchronize",
  pull_request: {
    number: 42,
    draft,
    head: { sha: "abc123" },
    labels,
  },
  sender: { login: "octocat" },
});

test("starts a review when bot-review is added", () => {
  const event = pullRequest({ labels: [] });
  event.action = "labeled";
  event.label = { name: "bot-review" };

  assert.deepEqual(resolvePullRequestReview(event), {
    shouldReview: true,
    reason: "requested",
    number: 42,
    headSha: "abc123",
  });
});

test("automatically reviews a newly opened pull request", () => {
  const event = pullRequest({ labels: [] });
  event.action = "opened";

  assert.deepEqual(resolvePullRequestReview(event), {
    shouldReview: true,
    reason: "automatic",
    number: 42,
    headSha: "abc123",
  });
});

test("automatically reviews a reopened pull request", () => {
  const event = pullRequest({ labels: [] });
  event.action = "reopened";

  assert.deepEqual(resolvePullRequestReview(event), {
    shouldReview: true,
    reason: "automatic",
    number: 42,
    headSha: "abc123",
  });
});

test("reviews a new commit while bot-review remains attached", () => {
  assert.deepEqual(resolvePullRequestReview(pullRequest()), {
    shouldReview: true,
    reason: "updated",
    number: 42,
    headSha: "abc123",
  });
});

test("reviews a labeled draft once it becomes ready", () => {
  const event = pullRequest();
  event.action = "ready_for_review";

  assert.deepEqual(resolvePullRequestReview(event), {
    shouldReview: true,
    reason: "updated",
    number: 42,
    headSha: "abc123",
  });
});

test("ignores synchronization without bot-review", () => {
  assert.deepEqual(resolvePullRequestReview(pullRequest({ labels: [{ name: "bug" }] })), {
    shouldReview: false,
    reason: "label-missing",
    number: 42,
    headSha: "abc123",
  });
});

test("ignores drafts until they are marked ready", () => {
  assert.deepEqual(resolvePullRequestReview(pullRequest({ draft: true })), {
    shouldReview: false,
    reason: "draft",
    number: 42,
    headSha: "abc123",
  });
});

test("ignores events emitted by linonward-bot", () => {
  const event = pullRequest();
  event.sender.login = "linonward-bot[bot]";

  assert.deepEqual(resolvePullRequestReview(event), {
    shouldReview: false,
    reason: "self-trigger",
    number: 42,
    headSha: "abc123",
  });
});

test("rejects malformed pull request payloads", () => {
  assert.throws(() => resolvePullRequestReview({ action: "synchronize" }), /pull_request payload/);
});
