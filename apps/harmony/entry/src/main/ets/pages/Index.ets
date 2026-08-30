import { API_BASE_URL, apiIsConfigured } from '../config/ApiConfiguration';
import { BrandMark } from '../designsystem/BrandMark';
import { DesignTokens } from '../designsystem/DesignTokens.generated';
import { ArticleReaderPage } from '../feature/articlereader/ArticleReaderPage';

/**
 * The launch screen. Deliberately one page and no router: the shell should grow
 * a navigation stack with the first feature that needs one, not before.
 */
@Entry
@Component
struct Index {
  private isConfigured: boolean = apiIsConfigured();
  @State private readerOpen: boolean = false;

  build() {
    if (this.readerOpen) {
      ArticleReaderPage({ onClose: () => { this.readerOpen = false; } })
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
          .onClick(() => { this.readerOpen = true; })
          .id('home.openReader')
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
