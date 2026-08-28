# Localization

- Keep user-visible strings in `LinOnward/Resources/Localizable.xcstrings` with English and Simplified Chinese values. Do not assemble sentences from translated fragments or use localized display text as a programmatic identifier.
- Preserve stable keys when changing wording. Add plural, substitution, and grammatical variants through the String Catalog rather than manual branching when the UI needs them.
- Format dates, times, numbers, names, and lists with locale-aware Foundation formatters. Do not assume English word order, ASCII input, or fixed string length.
- Verify both shipped locales in previews or Simulator and in relevant UI tests. Check truncation, wrapping, button width, navigation titles, keyboard type, error copy, and VoiceOver pronunciation at large text sizes.
- Treat machine-generated translations as drafts requiring fluent human review, especially authentication, privacy, destructive actions, and support copy.

The current UI-test convention launches with `-AppleLanguages` and `-AppleLocale`; extend that matrix for user-visible flows without duplicating every logic assertion in both languages.
