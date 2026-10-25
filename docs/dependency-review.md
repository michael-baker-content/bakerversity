# Dependency review — October 24, 2026

The installed dependency audit decreased from 14 findings (1 critical, 8 high, 1 moderate, 4 low) to 4 low findings, with no critical, high, or moderate findings remaining. This is an npm advisory scan, not a complete application security assessment.

Compatible updates include Next.js 15.5.28, sharp 0.35.5, and js-yaml 4.3.2, plus transitive fixes recorded in package-lock.json. Next remains on version 15. A scoped override sets Next's PostCSS dependency to 8.5.31 because its pinned 8.4.31 version retained an advisory. Reassess/remove this override when Next's own dependency is patched.

The remaining low findings involve KaTeX and its dependent packages (Mafs, remark-math, and micromark-extension-math). The KaTeX advisory requires an existing prototype-pollution condition or control over renderer-options prototypes; KaTeX does not itself introduce prototype pollution. A coordinated math-library upgrade is deferred: the patched KaTeX line is outside the current 0.16 range, and npm's forced remediation suggests disruptive changes to dependent packages.

Sources: [Next.js image optimization advisory](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4), [js-yaml advisory](https://github.com/advisories/GHSA-2883-xcg3-v3hh), [KaTeX advisory](https://github.com/advisories/GHSA-238p-pmpm-9mq7).

Type checking, regression tests, database consistency checks, and production compilation passed after the dependency updates. Browser smoke testing remains for GitHub Actions; no local server was started. The existing Mafs/use-resize-observer React peer warning remains a separate compatibility follow-up.
