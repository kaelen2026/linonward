# Sources and adaptation notes

Reviewed on 2026-08-28.

- [vercel-labs/agent-skills: web-design-guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) defines an explicit review workflow that fetches the maintained [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md). The upstream repository had about 785 GitHub stars when reviewed, and its skill showed about 584K installs on skills.sh.
- [sergiodxa/agent-skills: frontend-accessibility-best-practices](https://github.com/sergiodxa/agent-skills/tree/main/skills/frontend-accessibility-best-practices) reinforces semantic landmarks, accessible names, live regions, keyboard and focus behavior, reduced motion, and touch targets.
- [sergiodxa/agent-skills: frontend-testing-best-practices](https://github.com/sergiodxa/agent-skills/tree/main/skills/frontend-testing-best-practices) and [anthropics/skills: webapp-testing](https://github.com/anthropics/skills/tree/main/skills/webapp-testing) were reviewed but not adopted. The former defaults to E2E and discourages component tests, directly conflicting with LinOnward's Vitest-first test strategy; the latter introduces a separate Python Playwright harness despite this repository already owning TypeScript Playwright configuration and scripts.
- [sergiodxa/agent-skills: frontend-internationalization-best-practices](https://github.com/sergiodxa/agent-skills/tree/main/skills/frontend-internationalization-best-practices) was rejected because it is specific to React Router and `remix-i18next`, while LinOnward uses locale-prefixed Next.js routes and typed in-repository content.

The local checklist incorporates the compatible principles and binds them to Base UI, Tailwind v4, media-query dark mode, bilingual content, and the repository's existing test policy.
