"use client";

import { useEffect, useState } from "react";
import {
  type Article,
  type ArticleInput,
  parseArticleResponse,
  parseArticlesResponse,
} from "@/lib/articles";
import { highlightPlugin } from "./highlight-plugin";
import { RichTextEditor } from "./rich-text-editor";
import { starterDocument } from "./rich-text-schema";

const blank: ArticleInput = {
  title: "",
  slug: "",
  excerpt: "",
  content: starterDocument,
  coverImageUrl: null,
  locale: "zh",
  authorName: "LinOnward 编辑部",
  seoDescription: "",
};
const request = (path: string, init?: RequestInit) =>
  fetch(`/api/content/admin${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });

export function EditorWorkbench({
  authorName,
  canPublish,
}: {
  authorName: string;
  canPublish: boolean;
}) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [draft, setDraft] = useState<ArticleInput>({ ...blank, authorName });
  const [editorKey, setEditorKey] = useState(0);
  const [message, setMessage] = useState("尚未保存");
  useEffect(() => {
    request("/articles").then(async (response) => {
      if (response.ok) setArticles(parseArticlesResponse(await response.json()));
    });
  }, []);
  function select(article: Article) {
    setSelectedId(article.id);
    setDraft(article);
    setEditorKey((value) => value + 1);
    setMessage("已载入");
  }
  function createNew() {
    setSelectedId(undefined);
    setDraft({ ...blank, authorName });
    setEditorKey((value) => value + 1);
    setMessage("新文章");
  }
  async function saveDraft(): Promise<Article | null> {
    setMessage("正在保存…");
    const response = await request(selectedId ? `/articles/${selectedId}` : "/articles", {
      method: selectedId ? "PUT" : "POST",
      body: JSON.stringify(draft),
    });
    if (!response.ok) {
      setMessage(
        response.status === 403 ? "你没有权限修改这篇文章" : "保存失败，请检查必填项和 URL 别名",
      );
      return null;
    }
    const article = parseArticleResponse(await response.json());
    setSelectedId(article.id);
    setDraft(article);
    setArticles((current) => [article, ...current.filter((item) => item.id !== article.id)]);
    setMessage("草稿已保存");
    return article;
  }
  async function changePublication(status: "draft" | "published") {
    const saved = await saveDraft();
    if (!saved) return;
    setMessage(status === "published" ? "正在发布…" : "正在撤回…");
    const response = await request(
      `/articles/${saved.id}/${status === "published" ? "publish" : "unpublish"}`,
      { method: "POST" },
    );
    if (!response.ok) {
      setMessage(response.status === 403 ? "你没有发布权限" : "状态变更失败，请稍后重试");
      return;
    }
    const article = parseArticleResponse(await response.json());
    setDraft(article);
    setArticles((current) => [article, ...current.filter((item) => item.id !== article.id)]);
    setMessage(status === "published" ? "已发布" : "已撤回为草稿");
  }
  const selectedArticle = articles.find((article) => article.id === selectedId);
  return (
    <div className="admin-workbench">
      <aside className="admin-nav">
        <p className="text-xl font-semibold">LinOnward</p>
        <p className="mt-1 text-xs text-muted-foreground">内容管理</p>
        <button
          className="mt-8 w-full rounded-md bg-brand px-3 py-2.5 font-medium text-brand-foreground"
          onClick={createNew}
          type="button"
        >
          ＋ 新建文章
        </button>
        <nav aria-label="文章列表" className="mt-6 space-y-1">
          {articles.map((article) => (
            <button
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              key={article.id}
              onClick={() => select(article)}
              type="button"
            >
              <span className="line-clamp-1 font-medium">{article.title}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {article.status === "published" ? "已发布" : "草稿"}
              </span>
            </button>
          ))}
        </nav>
      </aside>
      <section className="min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-border px-6">
          <p className="text-sm text-muted-foreground">{message}</p>
          <div className="flex gap-2">
            <button
              className="rounded-md border border-border px-3 py-2 text-sm"
              onClick={() => void saveDraft()}
              type="button"
            >
              保存草稿
            </button>
            {canPublish ? (
              <button
                className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground"
                onClick={() =>
                  void changePublication(
                    selectedArticle?.status === "published" ? "draft" : "published",
                  )
                }
                type="button"
              >
                {selectedArticle?.status === "published" ? "撤回" : "发布"}
              </button>
            ) : null}
          </div>
        </header>
        <div className="mx-auto max-w-4xl px-6 py-10">
          <input
            aria-label="文章标题"
            className="w-full bg-transparent text-4xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground"
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            placeholder="文章标题"
            value={draft.title}
          />
          <textarea
            aria-label="文章摘要"
            className="mt-5 min-h-20 w-full resize-none border-l-2 border-border bg-transparent pl-4 text-lg leading-7 text-muted-foreground outline-none"
            onChange={(event) => setDraft({ ...draft, excerpt: event.target.value })}
            placeholder="用一两句话概括文章"
            value={draft.excerpt}
          />
          <div className="mt-8">
            <RichTextEditor
              initialDocument={draft.content}
              key={editorKey}
              onChange={(content) => setDraft((current) => ({ ...current, content }))}
              plugins={[highlightPlugin]}
            />
          </div>
        </div>
      </section>
      <aside className="admin-inspector">
        <h2 className="font-semibold">文章设置</h2>
        <div className="mt-6 grid gap-5">
          <label className="grid gap-2 text-sm">
            URL 别名
            <input
              className="h-10 rounded-md border border-border bg-background px-3"
              onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
              placeholder="article-slug"
              value={draft.slug}
            />
          </label>
          <label className="grid gap-2 text-sm">
            语言
            <select
              className="h-10 rounded-md border border-border bg-background px-3"
              onChange={(event) =>
                setDraft({ ...draft, locale: event.target.value as "zh" | "en" })
              }
              value={draft.locale}
            >
              <option value="zh">简体中文</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            作者
            <input
              className="h-10 rounded-md border border-border bg-background px-3"
              onChange={(event) => setDraft({ ...draft, authorName: event.target.value })}
              value={draft.authorName}
            />
          </label>
          <label className="grid gap-2 text-sm">
            封面图片 URL
            <input
              className="h-10 rounded-md border border-border bg-background px-3"
              onChange={(event) =>
                setDraft({ ...draft, coverImageUrl: event.target.value || null })
              }
              value={draft.coverImageUrl ?? ""}
            />
          </label>
          <label className="grid gap-2 text-sm">
            SEO 描述
            <textarea
              className="min-h-28 rounded-md border border-border bg-background p-3"
              onChange={(event) => setDraft({ ...draft, seoDescription: event.target.value })}
              value={draft.seoDescription}
            />
          </label>
        </div>
      </aside>
    </div>
  );
}
