import { describe, expect, it } from '@ohos/hypium';
import { decodeArticles } from '../main/ets/feature/reading/ArticleModels';

export default function articleModelsTest() {
  describe('ArticleModels', () => {
    it('decodes escaped rich text for the hybrid reader', 0, () => {
      const articles = decodeArticles('{"articles":[{"id":"article-1",' +
        '"title":"Safe article","authorName":"Ada","content":{"type":"doc",' +
        '"content":[{"type":"paragraph","content":[{"type":"text","text":"<safe>",' +
        '"marks":[{"type":"strong"}]}]}]},"coverImageUrl":null,"publishedAt":null,' +
        '"updatedAt":"2026-08-30T00:00:00.000Z"}]}');
      expect(articles.length).assertEqual(1);
      expect(articles[0].contentHtml).assertEqual('<p><strong>&lt;safe&gt;</strong></p>');
      expect(articles[0].publishedAt).assertEqual('2026-08-30T00:00:00.000Z');
      expect(articles[0].readingMinutes).assertEqual(1);
    });
  });
}
