import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { ProductionGuardError, build } from '../../src/site/build.ts';
import { buildRoutes, countAtlasDataRows, navigation } from '../../src/site/routes.ts';
import { escapeHtml, extractSection, renderMarkdown } from '../../src/site/markdown.ts';
import { findConstructionTokens, stylesheet } from '../../src/site/styles.ts';

const outDir = mkdtempSync(resolve(tmpdir(), 'olibana-site-'));
const result = build({ outDir });
const html = (relativePath: string): string => readFileSync(resolve(outDir, relativePath), 'utf8');
const pages = result.files.filter((f) => f.endsWith('.html'));

test.after(() => rmSync(outDir, { recursive: true, force: true }));

test('build emits every route declared by the manifest', () => {
  const expected = buildRoutes().map((r) => r.file).sort();
  assert.deepEqual(pages.slice().sort(), expected);
  assert.ok(result.files.includes('styles.css'));
  assert.ok(result.files.includes('sitemap.xml'));
  assert.ok(result.files.includes('robots.txt'));
});

test('no JavaScript is shipped — the site works with scripting disabled', () => {
  for (const page of pages) {
    const source = html(page);
    assert.ok(!/<script/i.test(source), `${page} contains a script tag`);
    assert.ok(!/\son\w+=/i.test(source), `${page} contains an inline event handler`);
  }
});

test('every page is a well-formed document with one main landmark and one h1', () => {
  for (const page of pages) {
    const source = html(page);
    assert.match(source, /^<!doctype html>/i, `${page} lacks a doctype`);
    assert.match(source, /<html lang="en">/, `${page} lacks a language`);
    assert.equal((source.match(/<h1[ >]/g) ?? []).length, 1, `${page} must have exactly one h1`);
    assert.equal((source.match(/<main[ >]/g) ?? []).length, 1, `${page} must have exactly one main`);
    assert.match(source, /<title>[^<]+<\/title>/, `${page} lacks a title`);
    assert.match(source, /<meta name="description" content="[^"]+"/, `${page} lacks a description`);
  }
});

test('the skip link is the first focusable element on every page', () => {
  for (const page of pages) {
    const source = html(page);
    const firstAnchor = source.indexOf('<a ');
    const skipLink = source.indexOf('<a class="skip-link"');
    assert.equal(firstAnchor, skipLink, `${page}: skip link is not the first focusable element`);
  }
});

test('every internal link resolves to a file the build emitted', () => {
  const emitted = new Set(result.files.map((f) => '/' + f.replace(/index\.html$/, '').replace(/\/$/, '')));
  emitted.add('/');
  const broken: string[] = [];
  for (const page of pages) {
    for (const match of html(page).matchAll(/href="(\/[^"#]*)"/g)) {
      const href = match[1] as string;
      if (href.endsWith('.css') || href.endsWith('.xml') || href.endsWith('.txt')) continue;
      const normalised = href === '/' ? '/' : href.replace(/\/$/, '');
      if (!emitted.has(normalised)) broken.push(`${page} -> ${href}`);
    }
  }
  assert.deepEqual(broken, [], 'broken internal links');
});

test('routes without content are absent, not empty', () => {
  // 03_INFORMATION_ARCHITECTURE.md §1 — a route that cannot be truthfully
  // filled is not built. No article, no contact address, no product exist.
  const paths = new Set(result.routes);
  for (const absent of ['/journal', '/contact', '/shop', '/products', '/cart', '/checkout']) {
    assert.ok(!paths.has(absent), `${absent} was built without content to fill it`);
  }
});

test('Atlas pages disclose the absence of measurements instead of showing an empty table', () => {
  for (const atlas of ['river', 'stone', 'forest', 'light']) {
    const source = html(`nature/${atlas}/index.html`);
    const rows = countAtlasDataRows(readFileSync(
      resolve(import.meta.dirname, `../../${atlas[0]!.toUpperCase()}${atlas.slice(1)}_Atlas.md`), 'utf8',
    ));
    assert.equal(rows, 0, 'test assumes no field data yet — update this test when readings arrive');
    assert.match(source, /No field measurements have been recorded/, `${atlas} hides the gap`);
    assert.ok(!/<h2>Measurements<\/h2>/.test(source), `${atlas} shows an empty measurements table`);
  }
});

test('an Atlas with real readings would render them', () => {
  const withRows = `## Data Log\n\n| ID | Site |\n| --- | --- |\n| R-01 | Kamo |\n`;
  assert.equal(countAtlasDataRows(withRows), 1);
  const placeholderOnly = `## Data Log\n\n| ID | Site |\n| --- | --- |\n| | |\n`;
  assert.equal(countAtlasDataRows(placeholderOnly), 0);
});

test('production build refuses to ship the construction palette', () => {
  assert.throws(
    () => build({ outDir, production: true }),
    ProductionGuardError,
    'production build must refuse while the palette is undetermined',
  );
  assert.ok(findConstructionTokens(stylesheet).length > 0);
});

test('navigation is generated from the manifest and stays within the silence budget', () => {
  const nav = navigation(buildRoutes());
  assert.ok(nav.length > 0);
  assert.ok(nav.length <= 8, '02_BRAND_EXPERIENCE_SYSTEM.md §5 caps navigation at 8 items');
  assert.deepEqual(nav.map((n) => n.label), ['Olibana', 'Nature', 'Philosophy', 'Design Language']);
  assert.ok(!nav.some((n) => n.path === '/404'));
});

test('no page triggers an automatic favicon request', () => {
  // A missing favicon is a 404 on every page load. No brand mark exists yet,
  // so the request is suppressed rather than filled with an invented identity.
  for (const page of pages) {
    assert.match(html(page), /<link rel="icon" href="data:,">/, `${page} would request a favicon`);
  }
});

test('the 404 page declares no canonical URL', () => {
  // It is served for addresses that do not exist, so it has no canonical
  // address of its own. A self-canonical alongside noindex is contradictory.
  assert.ok(!/rel="canonical"/.test(html('404.html')), '404 must not declare a canonical');
  assert.match(html('index.html'), /<link rel="canonical" href="\/">/);
});

test('the sitemap lists indexable pages only, and 404 is marked noindex', () => {
  const sitemap = readFileSync(resolve(outDir, 'sitemap.xml'), 'utf8');
  assert.ok(!sitemap.includes('/404'), '404 must not be in the sitemap');
  assert.equal((sitemap.match(/<url>/g) ?? []).length, result.routes.length - 1);
  assert.match(html('404.html'), /<meta name="robots" content="noindex">/);
});

test('reduced motion is honoured, and no content is animated at all', () => {
  const css = readFileSync(resolve(outDir, 'styles.css'), 'utf8');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);

  // Asserting that a fill mode exists is not the same as asserting content is
  // visible. An earlier version checked for `animation-fill-mode: both` and
  // concluded the page was safe; a browser screenshot showed it blank, because
  // `both` holds an element at its FROM state through its delay.
  //
  // The property that actually matters: nothing inside main animates opacity.
  assert.ok(!/@keyframes\s+forest-enter/.test(css), 'content entry animation must not return');
  assert.ok(!/opacity:\s*0/.test(css), 'no rule may start content at opacity 0');
  assert.ok(!/\.enter/.test(css), 'the staggered entry class must not return');

  for (const page of pages) {
    assert.ok(!/class="enter"/.test(html(page)), `${page} still stages content behind animation`);
  }
});

test('markdown escapes document text before formatting it', () => {
  assert.equal(escapeHtml('<script>x</script>'), '&lt;script&gt;x&lt;/script&gt;');
  const rendered = renderMarkdown('A <b>raw</b> tag and **bold**.');
  assert.ok(!rendered.includes('<b>'), 'raw markup must not survive');
  assert.ok(rendered.includes('<strong>bold</strong>'));
});

test('markdown renders the constructs the source documents use', () => {
  assert.match(renderMarkdown('# Title'), /<h1 id="title">Title<\/h1>/);
  assert.match(renderMarkdown('- one\n- two'), /<ul><li>one<\/li><li>two<\/li><\/ul>/);
  assert.match(renderMarkdown('1. one\n2. two'), /<ol><li>one<\/li><li>two<\/li><\/ol>/);
  assert.match(renderMarkdown('> quoted'), /<blockquote>.*quoted.*<\/blockquote>/s);
  assert.match(renderMarkdown('```\ncode\n```'), /<pre><code>code<\/code><\/pre>/);
  assert.match(renderMarkdown('| a | b |\n| --- | --- |\n| 1 | 2 |'), /<table>/);
  assert.match(renderMarkdown('[label](/path)'), /<a href="\/path">label<\/a>/);
  assert.match(renderMarkdown('`inline`'), /<code>inline<\/code>/);
});

test('wide tables scroll inside their own container, never the page', () => {
  assert.match(renderMarkdown('| a |\n| --- |\n| 1 |'), /<div class="table-scroll">/);
  assert.match(stylesheet, /\.table-scroll \{ overflow-x: auto;/);
});

test('no page states the same sentence twice', () => {
  // The home page once carried a hand-written statement that repeated the
  // opening line of the philosophy text directly beneath it.
  for (const page of pages) {
    const text = html(page)
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, "'")
      .replace(/\s+/g, ' ');
    const sentences = text
      .split(/(?<=\.)\s+/)
      .map((x) => x.trim().toLowerCase())
      .filter((x) => x.split(' ').length >= 8);
    const seen = new Set<string>();
    for (const sentence of sentences) {
      assert.ok(!seen.has(sentence), `${page} repeats: "${sentence.slice(0, 70)}..."`);
      seen.add(sentence);
    }
  }
});

test('page copy is read from the source documents, not duplicated', () => {
  const readme = readFileSync(resolve(import.meta.dirname, '../../README.md'), 'utf8');
  const philosophy = extractSection(readme, 'Core Philosophy');
  assert.ok(philosophy && philosophy.length > 0);
  // A distinctive phrase from the document must appear on the rendered page.
  assert.match(html('index.html'), /traceable to a measurable structure found in nature/);
  assert.match(html('olibana/philosophy/index.html'), /Structural Logic/);
});

test('the build is deterministic', () => {
  const a = mkdtempSync(resolve(tmpdir(), 'olibana-a-'));
  const b = mkdtempSync(resolve(tmpdir(), 'olibana-b-'));
  try {
    build({ outDir: a });
    build({ outDir: b });
    for (const page of pages) {
      assert.equal(
        readFileSync(resolve(a, page), 'utf8'),
        readFileSync(resolve(b, page), 'utf8'),
        `${page} differs between builds`,
      );
    }
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});
