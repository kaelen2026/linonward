import Link from "next/link";
import { PublicHeader } from "@/components/articles/public-header";
import { fetchArticles, readingMinutes } from "@/lib/articles";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const [articles, session] = await Promise.all([fetchArticles(), getSession()]);
  const [featured, ...latest] = articles;
  return (
    <>
      <PublicHeader userEmail={session?.user.email} />
      <main className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <section className="grid gap-12 border-b border-border pb-16 lg:grid-cols-[0.95fr_1.2fr] lg:items-center">
          <div>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl">
              探索面向未来的技术与人文
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-muted-foreground">
              聚焦技术、产品与组织的交汇点，记录值得长期阅读的思考与实践。
            </p>
            {featured ? (
              <article className="mt-10 border-l-2 border-brand pl-5">
                <h2 className="text-2xl font-semibold">
                  <Link href={`/articles/${featured.slug}`}>{featured.title}</Link>
                </h2>
                <p className="mt-3 leading-7 text-muted-foreground">{featured.excerpt}</p>
                <Link
                  className="mt-5 inline-block font-medium underline decoration-brand decoration-2 underline-offset-4"
                  href={`/articles/${featured.slug}`}
                >
                  阅读全文 →
                </Link>
              </article>
            ) : (
              <p className="mt-10 text-muted-foreground">第一篇文章正在准备中。</p>
            )}
          </div>
          <div className="editorial-landscape aspect-[4/3] rounded-xl" />
        </section>
        <section className="py-14">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">最新文章</h2>
            <Link className="text-sm underline underline-offset-4" href="/articles">
              查看全部
            </Link>
          </div>
          <ol className="mt-7 border-t border-border">
            {[...(featured ? [featured] : []), ...latest].slice(0, 6).map((article) => (
              <li
                className="grid gap-3 border-b border-border py-6 sm:grid-cols-[1fr_auto] sm:items-center"
                key={article.id}
              >
                <div>
                  <Link className="text-lg font-semibold" href={`/articles/${article.slug}`}>
                    {article.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">{article.excerpt}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {readingMinutes(article.content)} 分钟
                </span>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} LinOnward
      </footer>
    </>
  );
}
