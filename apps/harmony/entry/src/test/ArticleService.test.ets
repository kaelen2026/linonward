import { describe, expect, it } from '@ohos/hypium';
import { ArticleCache, ArticleSource, OfflineArticleSource } from '../main/ets/feature/reading/ArticleService';
import { ReaderArticle } from '../main/ets/feature/reading/ArticleModels';

class MemoryArticleCache implements ArticleCache {
  private snapshots: Map<string, ReaderArticle[]> = new Map();

  async load(locale: string): Promise<ReaderArticle[] | undefined> {
    return this.snapshots.get(locale);
  }

  async save(locale: string, articles: ReaderArticle[]): Promise<void> {
    this.snapshots.set(locale, articles);
  }
}

class SuccessfulArticleSource implements ArticleSource {
  private articles: ReaderArticle[];

  constructor(articles: ReaderArticle[]) {
    this.articles = articles;
  }

  async load(_: string): Promise<ReaderArticle[]> {
    return this.articles;
  }
}

class FailingArticleSource implements ArticleSource {
  async load(_: string): Promise<ReaderArticle[]> {
    throw new Error('remote_failure');
  }
}

function article(id: string): ReaderArticle {
  return {
    contentHtml: '<p>Article</p>',
    id,
    title: id
  };
}

export default function articleServiceTest() {
  describe('ArticleService', () => {
    it('stores successful responses for later offline use', 0, async () => {
      const fresh = [article('fresh')];
      const cache = new MemoryArticleCache();
      const source = new OfflineArticleSource(new SuccessfulArticleSource(fresh), cache);

      expect((await source.load('en'))[0].id).assertEqual('fresh');
      expect((await cache.load('en'))?.[0].id).assertEqual('fresh');
    });

    it('returns the last snapshot when the remote request fails', 0, async () => {
      const cache = new MemoryArticleCache();
      await cache.save('zh', [article('cached')]);
      const source = new OfflineArticleSource(new FailingArticleSource(), cache);

      expect((await source.load('zh'))[0].id).assertEqual('cached');
    });

    it('preserves the remote failure when no snapshot exists', 0, async () => {
      const source = new OfflineArticleSource(new FailingArticleSource(), new MemoryArticleCache());
      let message = '';
      try {
        await source.load('en');
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).assertEqual('remote_failure');
    });
  });
}
