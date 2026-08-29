const statusPresentation = {
  success: { icon: "✅", label: "通过" },
  failure: { icon: "❌", label: "失败" },
  cancelled: { icon: "⚪", label: "取消" },
  skipped: { icon: "⏭️", label: "跳过" },
};

export function buildInspectionCard(environment) {
  const checks = [
    ["工作区", environment.WORKSPACE_RESULT],
    ["集成测试", environment.INTEGRATION_RESULT],
    ["端到端测试", environment.END_TO_END_RESULT],
    ["Android", environment.ANDROID_RESULT],
    ["iOS", environment.IOS_RESULT],
    ["HarmonyOS", environment.HARMONY_RESULT],
  ];
  const counts = {};
  for (const [, result] of checks) {
    counts[result] = (counts[result] ?? 0) + 1;
  }
  const abnormal = (counts.failure ?? 0) + (counts.cancelled ?? 0);
  const unknown = checks.filter(([, result]) => !(result in statusPresentation)).length;
  const healthy = abnormal === 0 && unknown === 0;
  const summary = [
    `${checks.length} 项检查`,
    `${counts.success ?? 0} 通过`,
    counts.skipped ? `${counts.skipped} 跳过` : undefined,
    abnormal ? `${abnormal} 异常` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
  const triggerLabels = { schedule: "定时", workflow_dispatch: "手动" };
  const completedAt = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
  }).format(new Date());

  return {
    config: { wide_screen_mode: true },
    header: {
      template: healthy ? "green" : "red",
      title: {
        tag: "plain_text",
        content: `LinOnward 每日巡检 · ${healthy ? "全部通过" : "发现异常"}`,
      },
    },
    elements: [
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: `**${summary}**\n${
            healthy ? "本次巡检未发现阻塞问题。" : "请及时查看异常任务并处理。"
          }`,
        },
      },
      { tag: "hr" },
      {
        tag: "div",
        fields: checks.map(([name, result]) => {
          const presentation = statusPresentation[result] ?? {
            icon: "❔",
            label: result || "未知",
          };
          return {
            is_short: true,
            text: {
              tag: "lark_md",
              content: `**${name}**\n${presentation.icon} ${presentation.label}`,
            },
          };
        }),
      },
      { tag: "hr" },
      {
        tag: "note",
        elements: [
          {
            tag: "plain_text",
            content: `${triggerLabels[environment.EVENT_NAME] ?? environment.EVENT_NAME}触发 · ${
              environment.REF_NAME
            } · ${environment.COMMIT_SHA.slice(0, 7)} · ${completedAt}`,
          },
        ],
      },
      {
        tag: "action",
        actions: [
          {
            tag: "button",
            text: { tag: "plain_text", content: "查看运行详情" },
            type: healthy ? "primary" : "danger",
            url: environment.RUN_URL,
          },
        ],
      },
    ],
  };
}

async function sendInspectionCard(environment) {
  const required = [
    "COMMIT_SHA",
    "EVENT_NAME",
    "FEISHU_APP_ID",
    "FEISHU_APP_SECRET",
    "FEISHU_CHAT_ID",
    "REF_NAME",
    "RUN_URL",
  ];
  for (const name of required) {
    if (!environment[name]) {
      throw new Error(`${name} is required`);
    }
  }

  const tokenResponse = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        app_id: environment.FEISHU_APP_ID,
        app_secret: environment.FEISHU_APP_SECRET,
      }),
    },
  );
  const tokenPayload = await tokenResponse.json();
  if (!tokenResponse.ok || tokenPayload.code !== 0 || !tokenPayload.tenant_access_token) {
    throw new Error(`Unable to obtain Feishu token: ${tokenPayload.code ?? tokenResponse.status}`);
  }

  const messageResponse = await fetch(
    "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenPayload.tenant_access_token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        receive_id: environment.FEISHU_CHAT_ID,
        msg_type: "interactive",
        content: JSON.stringify(buildInspectionCard(environment)),
      }),
    },
  );
  const messagePayload = await messageResponse.json();
  if (!messageResponse.ok || messagePayload.code !== 0) {
    throw new Error(
      `Unable to send Feishu message: ${messagePayload.code ?? messageResponse.status}`,
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await sendInspectionCard(process.env);
}
