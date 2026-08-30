import { DesignTokens } from './DesignTokens.generated';

/**
 * The navy tile with the rising teal arrow, matching `BrandMark` in apps/ios.
 * Decorative — the headline beside it already carries the meaning, so it is
 * hidden from accessibility rather than given a label nobody needs to hear.
 */
@Component
export struct BrandMark {
  build() {
    Image($r('app.media.startIcon'))
      .width(DesignTokens.sizeBrandMark)
      .height(DesignTokens.sizeBrandMark)
      .borderRadius(DesignTokens.radiusBrandMark)
      .accessibilityLevel('no')
  }
}
