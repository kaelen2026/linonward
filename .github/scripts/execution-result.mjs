export function parseMessages(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line)];
        } catch {
          return [];
        }
      });
  }
}

export function extractResultText(messages) {
  if (!Array.isArray(messages)) return undefined;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.type === "result" && typeof message.result === "string" && message.result.trim()) {
      return message.result.trim();
    }
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const content = message?.message?.content ?? message?.content;
    if (message?.type !== "assistant" || !Array.isArray(content)) continue;
    const text = content
      .filter((block) => block?.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .join("\n")
      .trim();
    if (text) return text;
  }

  return undefined;
}
