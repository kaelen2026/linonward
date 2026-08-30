import i18n from '@ohos.i18n';
import { API_BASE_URL, apiIsConfigured } from '../config/ApiConfiguration';
import { BrandMark } from '../designsystem/BrandMark';
import { DesignTokens } from '../designsystem/DesignTokens.generated';
import { ArticleReaderPage } from '../feature/articlereader/ArticleReaderPage';
import { ReaderArticle } from '../feature/reading/ArticleModels';
import { loadArticles } from '../feature/reading/ArticleService';

/**
 * The launch screen. Deliberately one page and no router: the shell should grow
 * a navigation stack with the first feature that needs one, not before.
 */
@Entry
@Component
struct Index {
  private isConfigured: boolean = apiIsConfigured();
  @State private articles: ReaderArticle[] = [];
  @State private loading: boolean = false;
  @State private loadFailed: boolean = false;
  @State private hasLoaded: boolean = false;
  @State private selectedArticle?: ReaderArticle = undefined;

  private async openReading(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    this.loadFailed = false;
    try {
      this.articles = await loadArticles(i18n.System.getSystemLanguage());
      this.hasLoaded = true;
    } catch (_) {
      this.loadFailed = true;
    } finally {
      this.loading = false;
    }
  }

  build() {
    if (this.selectedArticle !== undefined) {
      ArticleReaderPage({
        article: this.selectedArticle,
        locale: i18n.System.getSystemLanguage(),
        onClose: () => { this.selectedArticle = undefined; }
      })
    } else {
      Scroll() {
      Column({ space: DesignTokens.spacingXxxl }) {
        BrandMark()

        Column({ space: DesignTokens.spacingMd }) {
          Text($r('app.string.home_eyebrow'))
            .fontSize(14)
            .fontWeight(FontWeight.Medium)
            .fontColor($r('app.color.text_accent'))

          Text($r('app.string.home_title'))
            .fontSize(32)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.text_primary'))
            .id('home.title')

          Text($r('app.string.home_body'))
            .fontSize(16)
            .lineHeight(24)
            .fontColor($r('app.color.text_secondary'))
        }
        .alignItems(HorizontalAlign.Start)
        .width('100%')

        // Which server this build talks to is the one thing that differs between
        // a debug and a release install, so the shell shows it rather than
        // failing opaquely later.
        Column({ space: 4 }) {
          Text($r('app.string.home_api_label'))
            .fontSize(12)
            .fontWeight(FontWeight.Medium)
            .fontColor($r('app.color.text_secondary'))

          Text(this.isConfigured ? API_BASE_URL : $r('app.string.home_api_missing'))
            .fontSize(15)
            .fontColor($r('app.color.text_primary'))
            .id('home.api')
        }
        .alignItems(HorizontalAlign.Start)
        .width('100%')
        .padding(DesignTokens.spacingLg)
        .backgroundColor($r('app.color.surface'))
        .borderRadius(DesignTokens.radiusBrandMark)
        .borderWidth(1)
        .borderColor($r('app.color.border'))

        Button($r('app.string.home_open_reader'))
          .onClick(() => { this.openReading(); })
          .id('home.openReader')

        if (this.loading) {
          LoadingProgress()
          Text($r('app.string.reading_loading'))
            .fontColor($r('app.color.text_secondary'))
        } else if (this.loadFailed) {
          Text($r('app.string.reading_error'))
            .fontColor($r('app.color.text_secondary'))
          Button($r('app.string.reading_retry'))
            .onClick(() => { this.openReading(); })
        } else if (this.hasLoaded && this.articles.length === 0) {
          Text($r('app.string.reading_empty'))
            .fontColor($r('app.color.text_secondary'))
        } else {
          Column({ space: DesignTokens.spacingMd }) {
            ForEach(this.articles, (article: ReaderArticle) => {
              Button(article.title)
                .onClick(() => { this.selectedArticle = article; })
                .width('100%')
            }, (article: ReaderArticle) => article.id)
          }
          .width('100%')
        }
      }
      .alignItems(HorizontalAlign.Start)
      .constraintSize({ maxWidth: DesignTokens.sizeContentMaximumWidth })
      .padding({
        left: DesignTokens.spacingXxl,
        right: DesignTokens.spacingXxl,
        top: DesignTokens.spacingXxxxl,
        bottom: DesignTokens.spacingXxxxl
      })
    }
    .width('100%')
    .height('100%')
      .backgroundColor($r('app.color.page_background'))
    }
  }
}
