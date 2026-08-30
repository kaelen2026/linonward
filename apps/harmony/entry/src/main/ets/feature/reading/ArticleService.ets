import http from '@ohos.net.http';
import { apiEndpoint } from '../../config/ApiConfiguration';
import { decodeArticles, ReaderArticle } from './ArticleModels';

export interface ArticleSource {
  load(locale: string): Promise<ReaderArticle[]>;
}

export interface ArticleCache {
  load(locale: string): Promise<ReaderArticle[] | undefined>;
  save(locale: string, articles: ReaderArticle[]): Promise<void>;
}

export function localeCode(locale: string): string {
  return locale.toLowerCase().startsWith('en') ? 'en' : 'zh';
}

export function articleEndpoint(locale: string): string {
  return `${apiEndpoint('/api/content/articles')}?locale=${localeCode(locale)}`;
}

export class HttpArticleSource implements ArticleSource {
  async load(locale: string): Promise<ReaderArticle[]> {
    const articles = await this.request(localeCode(locale));
    if (articles.length > 0 || localeCode(locale) !== 'en') return articles;
    return this.request('zh');
  }

  private async request(locale: string): Promise<ReaderArticle[]> {
    const client = http.createHttp();
    try {
      const response = await client.request(articleEndpoint(locale), {
        method: http.RequestMethod.GET,
        header: { Accept: 'application/json' },
        connectTimeout: 10000,
        readTimeout: 15000
      });
      if (response.responseCode !== 200 || typeof response.result !== 'string') {
        throw new Error('article_service_unavailable');
      }
      return decodeArticles(response.result);
    } catch (_) {
      throw new Error('article_service_unavailable');
    } finally {
      client.destroy();
    }
  }
}

export class OfflineArticleSource implements ArticleSource {
  private remote: ArticleSource;
  private cache: ArticleCache;

  constructor(remote: ArticleSource, cache: ArticleCache) {
    this.remote = remote;
    this.cache = cache;
  }

  async load(locale: string): Promise<ReaderArticle[]> {
    try {
      const articles = await this.remote.load(locale);
      try {
        await this.cache.save(locale, articles);
      } catch (_) {
        // Fresh content remains usable when only the app-private snapshot write fails.
      }
      return articles;
    } catch (remoteFailure) {
      try {
        const cached = await this.cache.load(locale);
        if (cached !== undefined) return cached;
      } catch (_) {
        // Preserve the remote failure when the snapshot is missing or corrupt.
      }
      throw new Error((remoteFailure as Error).message);
    }
  }
}
