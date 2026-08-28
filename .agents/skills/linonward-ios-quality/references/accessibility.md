# Accessibility

## Build accessible behavior

- Prefer native SwiftUI controls so roles, actions, focus, and disabled state are exposed automatically. Use `Button` for actions rather than tap gestures on decorative views.
- Give meaningful images and custom controls appropriate labels, values, traits, hints, and actions; hide purely decorative elements. Group or separate child elements according to how the content should be understood.
- Support Dynamic Type without clipped controls, overlapping text, or loss of actions at accessibility sizes. Avoid fixed heights around user-facing text.
- Preserve usable contrast, touch targets, keyboard and switch access, reduce-motion behavior, and differentiation without color alone.
- Keep automation identifiers stable, but do not mistake an identifier for an accessible label.

## Audit

Exercise every changed screen with Accessibility Inspector and VoiceOver, including reading order, focus after navigation or errors, form labels, validation announcements, and keyboard dismissal. Check the largest Dynamic Type sizes, light/dark appearance when supported, reduced motion, and both iPhone and iPad layouts.

Automated accessibility audits identify common failures but do not prove the journey is understandable. Report tool findings separately from manual assistive-technology results and include reproduction steps for every unresolved blocker.
