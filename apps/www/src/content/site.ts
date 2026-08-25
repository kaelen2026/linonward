import type { Locale } from "@/lib/i18n";

/**
 * Every string on the marketing site, per locale.
 *
 * Copy is kept out of the components so the two locales stay structurally
 * identical — the `Record<Locale, SiteContent>` type below fails to compile the
 * moment one language grows a section the other is missing.
 *
 * TODO(product): the contact address and the section copy are a first draft.
 * Replace `contactEmail` and re-check every claim against what the platform
 * actually ships before this goes public.
 */

export const contactEmail = "hello@linonward.com";

/** Keys resolved to lucide components in `src/components/site/icon.tsx`. */
export type IconName =
  | "plug"
  | "ruler"
  | "trending-up"
  | "route"
  | "layout-dashboard"
  | "shield-check";

type NavItem = { label: string; href: string };
type Feature = { icon: IconName; title: string; description: string };
type Step = { title: string; description: string };
type Friction = { title: string; description: string };
type Audience = { role: string; question: string };

export type SiteContent = {
  brand: { name: string; tagline: string };
  meta: { title: string; description: string };
  nav: { items: NavItem[]; skipToContent: string };
  hero: {
    eyebrow: string;
    headlineLead: string;
    headlineAccent: string;
    subhead: string;
    primaryCta: string;
    secondaryCta: string;
    note: string;
    chart: { label: string; legendCurrent: string; legendPrior: string };
  };
  friction: { eyebrow: string; heading: string; items: Friction[] };
  features: { eyebrow: string; heading: string; subhead: string; items: Feature[] };
  how: { eyebrow: string; heading: string; steps: Step[] };
  audience: { eyebrow: string; heading: string; items: Audience[] };
  closing: {
    heading: string;
    body: string;
    primaryCta: string;
    secondaryCta: string;
    demoSubject: string;
  };
  footer: { blurb: string; rights: string; languageLabel: string };
};

const zh: SiteContent = {
  brand: {
    name: "Linonward",
    tagline: "B2B 增长度量与分析平台",
  },
  meta: {
    title: "Linonward — 让增长有迹可循",
    description:
      "Linonward 把散落在 CRM、产品埋点和账单系统里的数据接成一条口径统一的增长曲线，让收入、留存和渠道效率都能被追溯到源头。",
  },
  nav: {
    items: [
      { label: "能力", href: "#platform" },
      { label: "工作方式", href: "#how" },
      { label: "适用团队", href: "#audience" },
      { label: "联系我们", href: "#contact" },
    ],
    skipToContent: "跳到主要内容",
  },
  hero: {
    eyebrow: "增长度量与分析",
    headlineLead: "让增长",
    headlineAccent: "有迹可循",
    subhead:
      "把散落在 CRM、产品埋点和账单系统里的数据，接成一条你敢拿去开会的增长曲线。每个数字都能点开，一路追到它的来源。",
    primaryCta: "预约演示",
    secondaryCta: "看看它怎么工作",
    note: "先接一个数据源试试，不用整套迁移。",
    chart: { label: "净收入留存", legendCurrent: "本期", legendPrior: "去年同期" },
  },
  friction: {
    eyebrow: "问题在哪",
    heading: "大多数公司不缺数据，缺的是一个说得清的数字",
    items: [
      {
        title: "一个指标，三种算法",
        description:
          "销售看 CRM，财务看账单，产品看埋点。三份「本月新增收入」摆在会上，先花半小时对齐口径，再开始讨论。",
      },
      {
        title: "报表能看，不能问",
        description:
          "看板告诉你留存掉了 4 个点，但点不进去。到底是哪一批客户、从哪个渠道来、卡在哪一步流失，得回去手写 SQL。",
      },
      {
        title: "数据新鲜度靠人",
        description: "月初拉数、手动对账、粘进幻灯片。等结论出来，可以补救的窗口已经过去了。",
      },
    ],
  },
  features: {
    eyebrow: "平台能力",
    heading: "从接入到追问，在一个地方完成",
    subhead: "指标层是这套系统的地基 —— 口径只定义一次，所有看板、告警和导出都从它取数。",
    items: [
      {
        icon: "plug",
        title: "数据接入",
        description:
          "连接 CRM、产品埋点、账单与广告平台，也支持直连数据仓库。增量同步，不用先做一场数据搬迁。",
      },
      {
        icon: "ruler",
        title: "统一指标层",
        description:
          "把「活跃客户」「新增 ARR」「净留存」的口径写成版本化的定义。改口径要走评审，历史数据同步重算。",
      },
      {
        icon: "trending-up",
        title: "收入与留存",
        description:
          "MRR/ARR 拆解、净收入留存、分群留存曲线、扩张与流失归因，都是开箱即用的现成分析，不用自己拼 SQL。",
      },
      {
        icon: "route",
        title: "漏斗与归因",
        description:
          "从首次触达到签约续约的全链路漏斗，按渠道、行业、客户规模任意切分，看清哪条路径真的带来收入。",
      },
      {
        icon: "layout-dashboard",
        title: "看板与定期简报",
        description:
          "给每个团队一块自己的看板，再把关键变化按周推到邮件和群里 —— 让人来读结论，而不是去翻报表。",
      },
      {
        icon: "shield-check",
        title: "权限与审计",
        description: "按角色和数据行分权，谁改过哪条指标定义、谁导出过哪份明细，都留在审计日志里。",
      },
    ],
  },
  how: {
    eyebrow: "工作方式",
    heading: "三步接上，之后交给它跑",
    steps: [
      {
        title: "接入",
        description:
          "选一个最要紧的数据源先连上。首次同步跑完，你就能看到原始事实表，确认数字对不对。",
      },
      {
        title: "定义",
        description:
          "在指标层里把你们真正在用的口径写清楚，包括那些例外规则。定义一旦落库，全公司只有这一份。",
      },
      {
        title: "追踪",
        description: "搭看板、设阈值告警、订阅周报。数字有异动时它来找你，而不是等你想起来去查。",
      },
    ],
  },
  audience: {
    eyebrow: "适用团队",
    heading: "为需要拿数字做决定的人而建",
    items: [
      { role: "创始人 / CEO", question: "这个季度的增长，到底是哪块业务撑起来的？" },
      { role: "增长与市场", question: "哪个渠道带来的客户，一年后还留着？" },
      { role: "销售运营 / RevOps", question: "管道里的钱，卡在哪个阶段最久？" },
      { role: "数据团队", question: "能不能不再重复回答同一个取数需求？" },
    ],
  },
  closing: {
    heading: "先从一条曲线开始",
    body: "接一个数据源，定义一个指标，看看它和你现在手工算出来的数字差多少。这一步不需要立项。",
    primaryCta: "预约演示",
    secondaryCta: "或者直接写信：",
    demoSubject: "预约 Linonward 演示",
  },
  footer: {
    blurb: "Linonward 是面向 B2B 团队的增长度量与分析平台。",
    rights: "保留所有权利。",
    languageLabel: "切换语言",
  },
};

const en: SiteContent = {
  brand: {
    name: "Linonward",
    tagline: "Growth measurement and analytics for B2B",
  },
  meta: {
    title: "Linonward — Growth you can trace",
    description:
      "Linonward connects the data scattered across your CRM, product events, and billing into one growth curve with a single definition per metric — so revenue, retention, and channel efficiency all trace back to source.",
  },
  nav: {
    items: [
      { label: "Platform", href: "#platform" },
      { label: "How it works", href: "#how" },
      { label: "Who it's for", href: "#audience" },
      { label: "Contact", href: "#contact" },
    ],
    skipToContent: "Skip to main content",
  },
  hero: {
    eyebrow: "Growth measurement & analytics",
    headlineLead: "Growth you can",
    headlineAccent: "trace",
    subhead:
      "Connect the data scattered across your CRM, product events, and billing into one growth curve you'd defend in a board meeting. Every number opens up, all the way down to where it came from.",
    primaryCta: "Book a demo",
    secondaryCta: "See how it works",
    note: "Start with one source. No migration project required.",
    chart: {
      label: "Net revenue retention",
      legendCurrent: "This period",
      legendPrior: "Year ago",
    },
  },
  friction: {
    eyebrow: "The problem",
    heading: "Most companies aren't short on data. They're short on one number they can defend",
    items: [
      {
        title: "One metric, three answers",
        description:
          'Sales reads the CRM, finance reads billing, product reads events. Three versions of "new revenue this month" land in the same meeting, and the first half hour goes to reconciling definitions.',
      },
      {
        title: "Dashboards you can read but not question",
        description:
          "The chart says retention dropped four points. It won't say which cohort, which channel, or which step they fell out of. That answer still means writing SQL by hand.",
      },
      {
        title: "Freshness that depends on a person",
        description:
          "Pull the numbers, reconcile by hand, paste into slides. By the time the conclusion is ready, the window to act on it has closed.",
      },
    ],
  },
  features: {
    eyebrow: "Platform",
    heading: "From connection to follow-up question, in one place",
    subhead:
      "The metric layer is the foundation: each definition is written once, and every dashboard, alert, and export reads from it.",
    items: [
      {
        icon: "plug",
        title: "Connect your sources",
        description:
          "CRM, product events, billing, and ad platforms, plus a direct line to your warehouse. Incremental syncs, so nothing has to move first.",
      },
      {
        icon: "ruler",
        title: "One metric layer",
        description:
          '"Active account", "new ARR", "net revenue retention" — written as versioned definitions. Changes go through review, and history recomputes with them.',
      },
      {
        icon: "trending-up",
        title: "Revenue and retention",
        description:
          "MRR/ARR breakdowns, net revenue retention, cohort curves, expansion and churn attribution — ready to open, not to assemble from SQL.",
      },
      {
        icon: "route",
        title: "Funnels and attribution",
        description:
          "The whole path from first touch to renewal, sliced by channel, industry, or account size, so you can see which routes actually turn into revenue.",
      },
      {
        icon: "layout-dashboard",
        title: "Dashboards and digests",
        description:
          "A board for each team, plus a weekly push of what moved to email and chat — so people read conclusions instead of hunting for reports.",
      },
      {
        icon: "shield-check",
        title: "Permissions and audit",
        description:
          "Access by role and by row. Who changed a metric definition and who exported which rows both stay in the audit log.",
      },
    ],
  },
  how: {
    eyebrow: "How it works",
    heading: "Three steps to connect, then it runs",
    steps: [
      {
        title: "Connect",
        description:
          "Start with the source that matters most. Once the first sync lands you can read the raw fact tables and check the numbers yourself.",
      },
      {
        title: "Define",
        description:
          "Write down the definitions your team actually uses, exceptions included. Once they're in the metric layer, there is only one copy.",
      },
      {
        title: "Track",
        description:
          "Build boards, set thresholds, subscribe to the weekly digest. When something moves, it finds you instead of waiting to be checked.",
      },
    ],
  },
  audience: {
    eyebrow: "Who it's for",
    heading: "Built for the people who have to decide on the number",
    items: [
      {
        role: "Founders & CEOs",
        question: "Which part of the business actually carried this quarter?",
      },
      {
        role: "Growth & marketing",
        question: "Which channel's customers are still here a year later?",
      },
      { role: "Sales ops / RevOps", question: "Where in the pipeline does money sit the longest?" },
      { role: "Data teams", question: "Can we stop answering the same data request twice?" },
    ],
  },
  closing: {
    heading: "Start with a single curve",
    body: "Connect one source, define one metric, and see how far it lands from the number you calculate by hand today. That doesn't need a project plan.",
    primaryCta: "Book a demo",
    secondaryCta: "Or just write to us:",
    demoSubject: "Linonward demo request",
  },
  footer: {
    blurb: "Linonward is a growth measurement and analytics platform for B2B teams.",
    rights: "All rights reserved.",
    languageLabel: "Change language",
  },
};

export const siteContent: Record<Locale, SiteContent> = { zh, en };
