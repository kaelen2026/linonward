import { fileIo } from '@kit.CoreFileKit';
import { ArticleCache, localeCode } from './ArticleService';
import { ReaderArticle } from './ArticleModels';

export class FileArticleCache implements ArticleCache {
  private cacheDirectory: string;

  constructor(cacheDirectory: string) {
    this.cacheDirectory = cacheDirectory;
  }

  async load(locale: string): Promise<ReaderArticle[] | undefined> {
    try {
      const snapshot = this.snapshotPath(locale);
      if (!await fileIo.access(snapshot)) return undefined;
      return JSON.parse(await fileIo.readText(snapshot)) as ReaderArticle[];
    } catch (_) {
      throw new Error('article_cache_unavailable');
    }
  }

  async save(locale: string, articles: ReaderArticle[]): Promise<void> {
    try {
      const directory = `${this.cacheDirectory}/articles`;
      await fileIo.mkdir(directory, true);
      const snapshot = this.snapshotPath(locale);
      const temporary = `${snapshot}.tmp`;
      const file = await fileIo.open(
        temporary,
        fileIo.OpenMode.CREATE | fileIo.OpenMode.WRITE_ONLY | fileIo.OpenMode.TRUNC
      );
      try {
        await fileIo.write(file.fd, JSON.stringify(articles));
      } finally {
        await fileIo.close(file);
      }
      try {
        await fileIo.rename(temporary, snapshot);
      } finally {
        if (await fileIo.access(temporary)) await fileIo.unlink(temporary);
      }
    } catch (_) {
      throw new Error('article_cache_unavailable');
    }
  }

  private snapshotPath(locale: string): string {
    return `${this.cacheDirectory}/articles/${localeCode(locale)}.json`;
  }
}
