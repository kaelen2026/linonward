"use client";

import type { ArticleInput } from "@linonward/contracts/content";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ApiRequestError } from "@/lib/api";
import type { Article } from "@/lib/articles";
import { changeAdminArticlePublication, listAdminArticles, saveAdminArticle } from "./editor-api";
import { starterDocument } from "./rich-text-schema";

const articleKeys = { all: ["admin", "articles"] as const };

function emptyDraft(authorName: string): ArticleInput {
  return {
    title: "",
    slug: "",
    excerpt: "",
    content: starterDocument,
    coverImageUrl: null,
    locale: "zh",
    authorName,
    seoDescription: "",
  };
}

function upsertArticle(articles: Article[] | undefined, article: Article): Article[] {
  return [article, ...(articles ?? []).filter((item) => item.id !== article.id)];
}

export function useEditorWorkbench(authorName: string) {
  const queryClient = useQueryClient();
  const articlesQuery = useQuery({ queryKey: articleKeys.all, queryFn: listAdminArticles });
  const [selectedId, setSelectedId] = useState<string>();
  const [draft, setDraft] = useState<ArticleInput>(() => emptyDraft(authorName));
  const [editorKey, setEditorKey] = useState(0);
  const [message, setMessage] = useState("尚未保存");

  const saveMutation = useMutation({ mutationFn: saveAdminArticle });
  const publicationMutation = useMutation({ mutationFn: changeAdminArticlePublication });

  function cacheArticle(article: Article) {
    queryClient.setQueryData<Article[]>(articleKeys.all, (articles) =>
      upsertArticle(articles, article),
    );
  }

  function selectArticle(article: Article) {
    setSelectedId(article.id);
    setDraft(article);
    setEditorKey((value) => value + 1);
    setMessage("已载入");
  }

  function createArticle() {
    setSelectedId(undefined);
    setDraft(emptyDraft(authorName));
    setEditorKey((value) => value + 1);
    setMessage("新文章");
  }

  async function saveDraft(): Promise<Article | null> {
    setMessage("正在保存…");
    try {
      const article = await saveMutation.mutateAsync({ articleId: selectedId, draft });
      setSelectedId(article.id);
      setDraft(article);
      cacheArticle(article);
      setMessage("草稿已保存");
      return article;
    } catch (error) {
      setMessage(
        error instanceof ApiRequestError && error.status === 403
          ? "你没有权限修改这篇文章"
          : "保存失败，请检查必填项和 URL 别名",
      );
      return null;
    }
  }

  async function changePublication(status: "draft" | "published") {
    const saved = await saveDraft();
    if (!saved) return;
    setMessage(status === "published" ? "正在发布…" : "正在撤回…");
    try {
      const article = await publicationMutation.mutateAsync({ articleId: saved.id, status });
      setDraft(article);
      cacheArticle(article);
      setMessage(status === "published" ? "已发布" : "已撤回为草稿");
    } catch (error) {
      setMessage(
        error instanceof ApiRequestError && error.status === 403
          ? "你没有发布权限"
          : "状态变更失败，请稍后重试",
      );
    }
  }

  const articles = articlesQuery.data ?? [];
  return {
    articles,
    changePublication,
    createArticle,
    draft,
    editorKey,
    isPending: saveMutation.isPending || publicationMutation.isPending,
    message: articlesQuery.isError && message === "尚未保存" ? "文章列表加载失败" : message,
    saveDraft,
    selectArticle,
    selectedArticle: articles.find((article) => article.id === selectedId),
    setDraft,
  };
}
