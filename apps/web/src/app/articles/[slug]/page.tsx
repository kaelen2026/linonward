import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleContent } from "@/components/articles/article-content";
import { PublicHeader } from "@/components/articles/public-header";
import { fetchArticle, readingMinutes } from "@/lib/articles";

export async function generateMetadata({
  params,
}: PageProps<"/articles/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchArticle(slug);
  return article ? { title: article.title, description: article.seoDescription } : {};
}
export default async function ArticlePage({ params }: PageProps<"/articles/[slug]">) {
  const { slug } = await params;
  const article = await fetchArticle(slug);
  if (!article) notFound();
  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-6 py-12 sm:py-20">
        <Link className="text-sm underline underline-offset-4" href="/articles">
          ← 返回文章列表
        </Link>
        <article className="mt-8">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl">
            {article.title}
          </h1>
          <p className="mt-5 text-sm text-muted-foreground">
            {article.authorName} ·{" "}
            {new Date(article.publishedAt ?? article.updatedAt).toLocaleDateString("zh-CN")} ·{" "}
            {readingMinutes(article.content)} 分钟阅读
          </p>
          <div className="editorial-landscape mt-10 aspect-[2/1] rounded-xl" />
          <div className="mt-12">
            <ArticleContent document={article.content} />
          </div>
        </article>
      </main>
    </>
  );
}
