/**
 * HTML document shell.
 *
 * Ships zero JavaScript. Everything the page does — layout, motion, light
 * state defaults — is CSS. That is not minimalism for its own sake: it is the
 * simplest way to guarantee the page works with JavaScript disabled, which
 * docs/website/21_UX_PERFORMANCE_COST_AUDIT.md §23 requires.
 */

import { escapeHtml } from './markdown.ts';
import type { Route } from './routes.ts';

export const SITE_NAME = 'Olibana';

export interface RenderOptions {
  readonly route: Route;
  readonly nav: ReadonlyArray<{ path: string; label: string }>;
  readonly stylesheetHref: string;
  /** Which build produced this page. `unknown` when it cannot be determined. */
  readonly build?: string;
}

export function renderDocument({ route, nav, stylesheetHref, build = 'unknown' }: RenderOptions): string {
  const title = route.path === '/' ? SITE_NAME : `${route.title} — ${SITE_NAME}`;

  const navItems = nav
    .map((item) => {
      const current = item.path === route.path ? ' aria-current="page"' : '';
      return `<li><a href="${item.path}"${current}>${escapeHtml(item.label)}</a></li>`;
    })
    .join('');

  const robots = route.indexable === false ? '\n  <meta name="robots" content="noindex">' : '';

  // Which build is serving. Without it a stale deployment is indistinguishable
  // from a fresh one: every other check passes either way.
  const buildMarker = `\n  <meta name="olibana-build" content="${escapeHtml(build)}">`;

  // A non-indexable page declares no canonical URL. The 404 document is served
  // for addresses that do not exist, so it has no canonical address of its own,
  // and pairing `noindex` with a self-canonical is contradictory.
  const canonical = route.indexable === false
    ? ''
    : `\n  <link rel="canonical" href="${route.path}">`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(route.description)}">${robots}${buildMarker}
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(route.description)}">
  <meta property="og:type" content="website">${canonical}
  <!-- No brand mark exists yet; the visual system is deferred pending field
       measurement. An empty data URI suppresses the automatic /favicon.ico
       request rather than inventing an identity to fill it. -->
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="${stylesheetHref}">
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="shell">
    <header class="site">
      <a class="wordmark" href="/">${SITE_NAME}</a>
      <nav class="primary" aria-label="Primary">
        <ul>${navItems}</ul>
      </nav>
    </header>
    <main id="main">
${route.body}
    </main>
    <footer class="site">
      <ul>
        <li><a href="/nature">Nature</a></li>
        <li><a href="/olibana/philosophy">Philosophy</a></li>
        <li><a href="/olibana/design-language">Design Language</a></li>
        <li><a href="/legal/accessibility">Accessibility</a></li>
      </ul>
      <p>${SITE_NAME}</p>
    </footer>
  </div>
</body>
</html>`;
}

export function renderSitemap(routes: readonly Route[], origin: string): string {
  const urls = routes
    .filter((r) => r.indexable !== false)
    .map((r) => `  <url><loc>${origin}${r.path}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export function renderRobots(origin: string): string {
  return `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`;
}
