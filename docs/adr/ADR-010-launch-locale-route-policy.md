# ADR-010: Launch Locale Route Policy

## Status

**Accepted** — 2026-08-24. Supersedes nothing. Resolves a conflict internal to
`docs/website/03_INFORMATION_ARCHITECTURE.md`.

## Context

03 §5 requires locale-prefixed routes `/en/`, `/ja/`, and `/ko/` from launch.

However, 03 §1 forbids routes that cannot be truthfully populated. At launch,
Japanese and Korean translations do not exist, and `16_INTERNATIONALIZATION.md`
is not present in the repository.

Serving English content from `/ja/` or `/ko/` would falsely represent the page
as localized.

This is the same class of conflict ADR-009 resolved for the cart: two rules in
the governing documents, both valid, that cannot both be satisfied by the same
implementation. It is recorded rather than silently decided.

## Decision

Only locales with available, verified content may be exposed at launch.

The application MUST NOT expose `/ja/` or `/ko/` as localized routes until
their corresponding translations exist and are verified.

`/en/` is the only locale route enabled at launch unless additional translated
content becomes available before deployment.

No fallback from `/ja/` or `/ko/` to English content will be presented as
localization.

## Consequences

- 03 §1 remains authoritative against untruthful routes.
- 03 §5 is interpreted as requiring locale-aware routing **architecture**, not
  fabricated translations.
- `/ja/` and `/ko/` remain disabled until their content exists.
- Enabling a new locale requires translated content and corresponding route and
  acceptance tests.
- No i18n architecture is invented from the missing `16_INTERNATIONALIZATION.md`.

### What this costs

Every content address gains an `/en` prefix. That is a change to every URL in
the site, and it is made **now**, before any deployment exists, precisely
because 03 §5 says "locale prefix from launch": retrofitting it later would
require a 301 for every address under §5's own stable-slug rule.

The site root `/` continues to answer, serving the English home page with its
canonical pointing at `/en/`. A static host cannot redirect without
host-specific configuration, and a redirect that exists only on Cloudflare
would make the local server and the deployment differ on the site's most
requested address — the environment drift this project has already been bitten
by twice.

Non-content routes — `/checkout`, `/order/confirmation`, `/webhooks/payment`,
`/health`, `/sandbox/pay` — are **not** locale-prefixed. They carry no
localizable prose beyond the pages the router renders, and prefixing a webhook
endpoint by locale would be architecture for its own sake.

## Acceptance

A deployment passes only when:

1. Every enabled locale has verified localized content.
2. No disabled locale is exposed as a localized route.
3. `/en/` resolves to the English content.
4. `/ja/` and `/ko/` are not presented as localized content until translations
   exist.
5. Adding a locale requires its content to be present before the route is
   enabled.

### 03 §5 — Locale Routing, as amended by this ADR

- The application uses locale-prefixed routes.
- A locale may only be enabled when its localized content exists.
- `/en/` is enabled at launch.
- `/ja/` and `/ko/` MUST NOT be exposed as localized routes until verified
  translations exist.
- **Tests MUST fail if a locale route is enabled without localized content.**

The last criterion is the one that makes the rest enforceable rather than
remembered. It is implemented in `src/site/locales.ts` and asserted in
`test/site/locale.test.ts`: a locale is `enabled` only if it declares content,
and the check runs against the locale registry rather than against a list
someone maintains alongside it.
