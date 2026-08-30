export interface ReaderArticleImage {
  alt: string;
  caption?: string;
  url: string;
}

export interface ReaderArticle {
  author?: string;
  contentHtml: string;
  cover?: ReaderArticleImage;
  id: string;
  publishedAt?: string;
  readingMinutes?: number;
  title: string;
}

interface RichTextAttributes {
  href?: string;
  level?: number;
}

interface RichTextMark {
  attrs?: RichTextAttributes;
  type: string;
}

interface RichTextNode {
  attrs?: RichTextAttributes;
  content?: RichTextNode[];
  marks?: RichTextMark[];
  text?: string;
  type: string;
}

interface PublishedArticle {
  authorName: string;
  content: RichTextNode;
  coverImageUrl?: string;
  id: string;
  publishedAt?: string;
  title: string;
  updatedAt: string;
}

interface ArticlesResponse {
  articles: PublishedArticle[];
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function characterCount(node: RichTextNode): number {
  let count = (node.text ?? '').replace(/\s/g, '').length;
  for (const child of node.content ?? []) {
    count += characterCount(child);
  }
  return count;
}

function richTextHtml(node: RichTextNode): string {
  if (node.type === 'text') {
    let result = escapeHtml(node.text ?? '');
    for (const mark of node.marks ?? []) {
      if (mark.type === 'strong') result = `<strong>${result}</strong>`;
      if (mark.type === 'em') result = `<em>${result}</em>`;
      if (mark.type === 'code') result = `<code>${result}</code>`;
      if (mark.type === 'link' && mark.attrs?.href !== undefined) {
        result = `<a href="${escapeHtml(mark.attrs.href)}">${result}</a>`;
      }
    }
    return result;
  }

  let children = '';
  for (const child of node.content ?? []) children += richTextHtml(child);
  if (node.type === 'paragraph') return `<p>${children}</p>`;
  if (node.type === 'heading') return node.attrs?.level === 1 ? `<h2>${children}</h2>` : `<h3>${children}</h3>`;
  if (node.type === 'blockquote') return `<blockquote>${children}</blockquote>`;
  if (node.type === 'bullet_list') return `<ul>${children}</ul>`;
  if (node.type === 'ordered_list') return `<ol>${children}</ol>`;
  if (node.type === 'list_item') return `<li>${children}</li>`;
  if (node.type === 'hard_break') return '<br>';
  return children;
}

export function decodeArticles(raw: string): ReaderArticle[] {
  const response = JSON.parse(raw) as ArticlesResponse;
  return response.articles.map((article: PublishedArticle): ReaderArticle => {
    const result: ReaderArticle = {
      author: article.authorName,
      contentHtml: richTextHtml(article.content),
      id: article.id,
      publishedAt: article.publishedAt ?? article.updatedAt,
      readingMinutes: Math.max(1, Math.ceil(characterCount(article.content) / 400)),
      title: article.title
    };
    if (article.coverImageUrl !== undefined && article.coverImageUrl !== null) {
      result.cover = { alt: article.title, url: article.coverImageUrl };
    }
    return result;
  });
}
