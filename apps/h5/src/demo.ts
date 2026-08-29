import type { ArticlePayload } from "./types";

export const demoArticle: ArticlePayload = {
  article: {
    id: "long-term-thinking",
    title: "长期主义，不只是坚持得更久",
    author: "LinOnward 编辑部",
    publishedAt: "2026-08-29",
    readingMinutes: 8,
    cover: {
      url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=85",
      alt: "山脊延伸到远方",
    },
    contentHtml: `
      <p>在一个追求短期回报的世界里，长期主义常常被误解为“慢”和“保守”。但真正的长期主义，不是被动等待时间的眷顾，而是主动选择在时间的复利下，持续做对长期有价值的事。</p>
      <p>它不是口号，也不是情怀，而是一种面向未来的思考方式和行动策略：把目光放长远，把基础打扎实，把节奏守稳定，把复利交给时间。</p>
      <blockquote>真正的复利，来自持续做对长期有价值的事。</blockquote>
      <h2>把时间变成你的盟友</h2>
      <p>时间不会辜负认真生活的人。长期主义的第一步，是学会与时间合作，而不是与它赛跑。</p>
      <p>每天进步一点，看起来微不足道；但一年后，你会比现在强大许多。复利的本质，是把每一次正确的积累，交给时间去放大。</p>
      <figure>
        <img src="https://images.unsplash.com/photo-1458014854819-1a40aa70211c?auto=format&fit=crop&w=1400&q=85" alt="阳光下生长的新芽" />
        <figcaption>积累很慢，但时间会证明它的价值。</figcaption>
      </figure>
      <p>与其追逐风口，不如深耕能力；与其期待捷径，不如打造可持续的系统。时间，会奖励那些方向正确且持续行动的人。</p>
    `,
  },
  settings: { locale: "zh-CN", theme: "system" },
};
