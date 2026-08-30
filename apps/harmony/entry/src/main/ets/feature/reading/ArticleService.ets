import http from '@ohos.net.http';
import { apiEndpoint } from '../../config/ApiConfiguration';
import { decodeArticles, ReaderArticle } from './ArticleModels';

function localeCode(locale: string): string {
  return locale.toLowerCase().startsWith('en') ? 'en' : 'zh';
}

export function articleEndpoint(locale: string): string {
  return `${apiEndpoint('/api/content/articles')}?locale=${localeCode(locale)}`;
}

export async function loadArticles(locale: string): Promise<ReaderArticle[]> {
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
    const articles = decodeArticles(response.result);
    if (articles.length > 0 || localeCode(locale) !== 'en') return articles;
    return loadArticles('zh');
  } catch (_) {
    throw new Error('article_service_unavailable');
  } finally {
    client.destroy();
  }
}
