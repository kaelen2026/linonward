/**
 * The navy tile with the rising teal arrow, matching `BrandMark` in apps/ios.
 * Decorative — the headline beside it already carries the meaning, so it is
 * hidden from accessibility rather than given a label nobody needs to hear.
 */
@Component
export struct BrandMark {
  private markSize: number = 56;

  build() {
    Image($r('app.media.startIcon'))
      .width(this.markSize)
      .height(this.markSize)
      .borderRadius(14)
      .accessibilityLevel('no')
  }
}
