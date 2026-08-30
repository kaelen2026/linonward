import type { ArticleInput } from "@linonward/contracts/content";
import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import { UserMenu } from "@/components/auth/user-menu";
import type { Article } from "@/lib/articles";
import { highlightPlugin } from "./highlight-plugin";
import { RichTextEditor } from "./rich-text-editor";

type EditorWorkbenchViewProps = {
  articles: Article[];
  canPublish: boolean;
  changePublication: (status: "draft" | "published") => Promise<void>;
  createArticle: () => void;
  draft: ArticleInput;
  editorKey: number;
  isPending: boolean;
  message: string;
  saveDraft: () => Promise<Article | null>;
  selectArticle: (article: Article) => void;
  selectedArticle?: Article;
  setDraft: Dispatch<SetStateAction<ArticleInput>>;
  userEmail: string;
  userImage?: string | null;
  userName: string;
};

export function EditorWorkbenchView({
  articles,
  canPublish,
  changePublication,
  createArticle,
  draft,
  editorKey,
  isPending,
  message,
  saveDraft,
  selectArticle,
  selectedArticle,
  setDraft,
  userEmail,
  userImage,
  userName,
}: EditorWorkbenchViewProps) {
  return (
    <div className="admin-workbench">
      <aside className="admin-nav flex flex-col">
        <Link className="text-xl font-semibold hover:text-brand" href="/">
          LinOnward
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">内容管理</p>
        <button
          className="mt-8 w-full rounded-md bg-brand px-3 py-2.5 font-medium text-brand-foreground"
          onClick={createArticle}
          type="button"
        >
          ＋ 新建文章
        </button>
        <nav aria-label="文章列表" className="mt-6 flex-1 space-y-1">
          {articles.map((article) => (
            <button
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              key={article.id}
              onClick={() => selectArticle(article)}
              type="button"
            >
              <span className="line-clamp-1 font-medium">{article.title}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {article.status === "published" ? "已发布" : "草稿"}
              </span>
            </button>
          ))}
        </nav>
        <section
          aria-label="当前用户"
          className="mt-6 flex justify-end border-t border-border pt-4"
        >
          <UserMenu email={userEmail} image={userImage} name={userName} />
        </section>
      </aside>
      <section className="min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-border px-6">
          <p className="text-sm text-muted-foreground">{message}</p>
          <div className="flex gap-2">
            <button
              className="rounded-md border border-border px-3 py-2 text-sm"
              disabled={isPending}
              onClick={() => void saveDraft()}
              type="button"
            >
              保存草稿
            </button>
            {canPublish ? (
              <button
                className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground"
                disabled={isPending}
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
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="文章标题"
            value={draft.title}
          />
          <textarea
            aria-label="文章摘要"
            className="mt-5 min-h-20 w-full resize-none border-l-2 border-border bg-transparent pl-4 text-lg leading-7 text-muted-foreground outline-none"
            onChange={(event) =>
              setDraft((current) => ({ ...current, excerpt: event.target.value }))
            }
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
              onChange={(event) =>
                setDraft((current) => ({ ...current, slug: event.target.value }))
              }
              placeholder="article-slug"
              value={draft.slug}
            />
          </label>
          <label className="grid gap-2 text-sm">
            语言
            <select
              className="h-10 rounded-md border border-border bg-background px-3"
              onChange={(event) =>
                setDraft((current) => ({ ...current, locale: event.target.value as "zh" | "en" }))
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
              onChange={(event) =>
                setDraft((current) => ({ ...current, authorName: event.target.value }))
              }
              value={draft.authorName}
            />
          </label>
          <label className="grid gap-2 text-sm">
            封面图片 URL
            <input
              className="h-10 rounded-md border border-border bg-background px-3"
              onChange={(event) =>
                setDraft((current) => ({ ...current, coverImageUrl: event.target.value || null }))
              }
              value={draft.coverImageUrl ?? ""}
            />
          </label>
          <label className="grid gap-2 text-sm">
            SEO 描述
            <textarea
              className="min-h-28 rounded-md border border-border bg-background p-3"
              onChange={(event) =>
                setDraft((current) => ({ ...current, seoDescription: event.target.value }))
              }
              value={draft.seoDescription}
            />
          </label>
        </div>
      </aside>
    </div>
  );
}
