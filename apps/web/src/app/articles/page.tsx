import Link from "next/link";
import { PublicHeader } from "@/components/articles/public-header";
import { fetchArticles, readingMinutes } from "@/lib/articles";

export default async function ArticlesPage() {
  const articles = await fetchArticles();
  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
        <h1 className="text-4xl font-semibold tracking-tight">所有文章</h1>
        <p className="mt-4 text-lg text-muted-foreground">关于技术、产品与组织的长期思考。</p>
        <ol className="mt-12 border-t border-border">
          {articles.map((article) => (
            <li className="border-b border-border py-8" key={article.id}>
              <Link className="text-2xl font-semibold" href={`/articles/${article.slug}`}>
                {article.title}
              </Link>
              <p className="mt-3 leading-7 text-muted-foreground">{article.excerpt}</p>
              <p className="mt-4 text-xs text-muted-foreground">
                {article.authorName} · {readingMinutes(article.content)} 分钟阅读
              </p>
            </li>
          ))}
        </ol>
      </main>
    </>
  );
}
