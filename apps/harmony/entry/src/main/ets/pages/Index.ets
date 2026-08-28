import { API_BASE_URL, apiIsConfigured } from '../config/ApiConfiguration';
import { BrandMark } from '../designsystem/BrandMark';

/**
 * The launch screen. Deliberately one page and no router: the shell should grow
 * a navigation stack with the first feature that needs one, not before.
 */
@Entry
@Component
struct Index {
  private isConfigured: boolean = apiIsConfigured();

  build() {
    Scroll() {
      Column({ space: 28 }) {
        BrandMark()

        Column({ space: 12 }) {
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

          if (this.isConfigured) {
            Text(API_BASE_URL)
              .fontSize(15)
              .fontColor($r('app.color.text_primary'))
              .id('home.api')
          } else {
            Text($r('app.string.home_api_missing'))
              .fontSize(15)
              .fontColor($r('app.color.text_primary'))
              .id('home.api')
          }
        }
        .alignItems(HorizontalAlign.Start)
        .width('100%')
        .padding(16)
        .backgroundColor($r('app.color.surface'))
        .borderRadius(14)
        .borderWidth(1)
        .borderColor($r('app.color.border'))
      }
      .alignItems(HorizontalAlign.Start)
      .constraintSize({ maxWidth: 560 })
      .padding({ left: 24, right: 24, top: 40, bottom: 40 })
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background'))
  }
}
