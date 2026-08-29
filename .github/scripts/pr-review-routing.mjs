// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: GitHub Actions supplies these only at runtime.
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const REVIEW_LABEL = "bot-review";
const BOT_LOGIN = "linonward-bot[bot]";

function hasReviewLabel(pullRequest) {
  return pullRequest.labels.some((label) => label.name === REVIEW_LABEL);
}

export function resolvePullRequestReview(event) {
  const pullRequest = event.pull_request;
  if (
    !pullRequest ||
    typeof pullRequest.number !== "number" ||
    typeof pullRequest.draft !== "boolean" ||
    typeof pullRequest.head?.sha !== "string" ||
    !Array.isArray(pullRequest.labels)
  ) {
    throw new Error("Invalid pull_request payload");
  }

  const result = {
    shouldReview: false,
    reason: "unsupported-event",
    number: pullRequest.number,
    headSha: pullRequest.head.sha,
  };

  if (event.sender?.login === BOT_LOGIN) {
    return { ...result, reason: "self-trigger" };
  }
  if (pullRequest.draft) {
    return { ...result, reason: "draft" };
  }

  if (event.action === "opened" || event.action === "reopened") {
    return { ...result, shouldReview: true, reason: "automatic" };
  }

  if (event.action === "labeled") {
    return event.label?.name === REVIEW_LABEL
      ? { ...result, shouldReview: true, reason: "requested" }
      : { ...result, reason: "label-missing" };
  }

  if (event.action === "synchronize" || event.action === "ready_for_review") {
    return hasReviewLabel(pullRequest)
      ? { ...result, shouldReview: true, reason: "updated" }
      : { ...result, reason: "label-missing" };
  }

  return result;
}

function writeGitHubOutput(result, outputPath) {
  const lines = [
    `should_review=${result.shouldReview}`,
    `reason=${result.reason}`,
    `pr_number=${result.number}`,
    `head_sha=${result.headSha}`,
    `marker=<!-- linonward-bot-review:${result.headSha} -->`,
  ];
  appendFileSync(outputPath, `${lines.join("\n")}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!eventPath || !outputPath) {
    throw new Error("GITHUB_EVENT_PATH and GITHUB_OUTPUT are required");
  }

  const event = JSON.parse(readFileSync(eventPath, "utf8"));
  writeGitHubOutput(resolvePullRequestReview(event), outputPath);
}
