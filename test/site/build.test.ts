import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { ProductionGuardError, build } from '../../src/site/build.ts';
import { buildRoutes, countAtlasDataRows, navigation } from '../../src/site/routes.ts';
import { ATLASES } from '../../src/site/atlases.ts';
import { escapeHtml, extractSection, renderMarkdown } from '../../src/site/markdown.ts';
import {
  declarations,
  findConstructionTokens,
  findLoadBearingMotion,
  findUndefinedTokens,
  stylesheet,
} from '../../src/site/styles.ts';
import { SECURITY_HEADERS } from '../../src/http/router.ts';
import { FileStorage } from '../../src/persistence/file-storage.ts';

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
    const source = html(`en/nature/${atlas}/index.html`);
    const rows = countAtlasDataRows(readFileSync(
      resolve(import.meta.dirname, `../../${atlas[0]!.toUpperCase()}${atlas.slice(1)}_Atlas.md`), 'utf8',
    ));
    assert.equal(rows, 0, 'test assumes no field data yet — update this test when readings arrive');
    // The disclosure, not one contiguous string: `awaiting()` wraps the subject
    // in <strong>, so the sentence is split in the markup while saying exactly
    // the same thing. Checked as "an awaiting state naming field measurements".
    assert.match(source, /class="state state-awaiting"/, `${atlas} does not mark the gap as an absence`);
    assert.match(source, /No field measurements/, `${atlas} hides the gap`);
    assert.match(source, /have been recorded for this Atlas/, `${atlas} does not say what is missing`);
    // The heading is unconditional now, so its absence is no longer the signal.
    // What must not exist is a TABLE under it: an empty measurements table
    // implies readings were taken and came back blank. Checked on the section
    // itself rather than on the page, which carries the method's own table.
    const start = source.indexOf('<h2>Field measurements</h2>');
    assert.notEqual(start, -1, `${atlas} has no field-measurements section`);
    const end = source.indexOf('<h2>', start + 4);
    const section = end === -1 ? source.slice(start) : source.slice(start, end);
    assert.ok(!/<table/.test(section), `${atlas} shows an empty measurements table`);
  }
});

test('an Atlas opens with the sentence that describes it, from one source', () => {
  // The page opened on a bullet list: the title sat directly on five bullets
  // with no sentence saying what the reader had arrived at. Every other page
  // has an opening; this one had an inventory.
  //
  // The sentence is the Atlas's own description — already the entry on /nature,
  // already the entry on the home page, already this page's meta description.
  // Pinned to that one source so the opening cannot drift into separate copy.
  for (const atlas of ATLASES) {
    const source = html(`en/nature/${atlas.slug}/index.html`);
    const opening = source.indexOf('<div class="lede">');
    const firstHeading = source.indexOf('<h2>');

    assert.notEqual(opening, -1, `${atlas.slug} has no opening`);
    assert.ok(opening < firstHeading, `${atlas.slug} opens on a section rather than on a sentence`);
    assert.ok(
      source.slice(opening, firstHeading).includes(atlas.description),
      `${atlas.slug} opens with copy that is not its own description`,
    );
    assert.match(
      source, new RegExp(`<meta name="description" content="${atlas.description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">`),
      `${atlas.slug} describes itself differently to a crawler than to a reader`,
    );
    assert.match(source, /<h2>What is studied<\/h2>/, `${atlas.slug} lost the section naming what it examines`);
  }
});

test('the absence names a method the page actually contains', () => {
  // The absence state says "The method above is the work; the readings follow
  // it" — and for the whole life of these pages there was no method above it.
  // A page that refers to something it does not contain is making a claim about
  // itself that a reader can check and find false.
  for (const atlas of ['river', 'stone', 'forest', 'light']) {
    const source = html(`en/nature/${atlas}/index.html`);
    const method = source.indexOf('<h2>How it is measured</h2>');
    const absence = source.indexOf('The method above is the work');

    assert.notEqual(method, -1, `${atlas} has no measurement method on the page`);
    assert.notEqual(absence, -1, `${atlas} no longer refers to the method — update this test with it`);
    assert.ok(method < absence, `${atlas} puts the method BELOW the sentence calling it "above"`);

    // The method is the parameter table, not a sentence about one: every Atlas
    // states what is measured, in what unit, and how it is taken.
    const end = source.indexOf('<h2>', method + 4);
    const section = source.slice(method, end === -1 ? undefined : end);
    assert.match(section, /<table/, `${atlas} names a method with no parameters in it`);
    assert.match(section, /<th>Parameter<\/th>/, `${atlas} lost the parameter column`);
    assert.match(section, /<th>Unit<\/th>/, `${atlas} states parameters with no units`);
    assert.match(section, /<th>Method<\/th>/, `${atlas} states parameters with no way to take them`);
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
  assert.deepEqual(nav.map((n) => n.label), ['Nature', 'Philosophy', 'Design Language']);
  assert.ok(!nav.some((n) => n.path === '/404'));
});

test('the navigation does not repeat a destination the header already links to', () => {
  // The wordmark links home. A nav item that also links home is two controls
  // for one destination — visible in a screenshot, invisible in the manifest.
  const nav = navigation(buildRoutes());
  assert.ok(!nav.some((n) => n.path === '/en/'), 'the navigation duplicates the wordmark');
  for (const page of pages) {
    const header = /<header class="site">[\s\S]*?<\/header>/.exec(html(page))?.[0] ?? '';
    // ADR-010 moved the home address to `/en/`; the wordmark follows the page's
    // own locale, so the count is of links to THIS page's home, not to `/`.
    const homeLinks = [...header.matchAll(/href="\/en\/"/g)].length;
    assert.equal(homeLinks, 1, `${page} has ${homeLinks} links home in its header`);
  }
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
  assert.ok(!/rel="canonical"/.test(html('en/404.html')), 'the locale 404 must not declare a canonical either');
  // ADR-010: the locale-prefixed address is canonical; the root points at it.
  assert.match(html('index.html'), /<link rel="canonical" href="\/en\/">/);
});

test('the sitemap lists indexable pages only, and 404 is marked noindex', () => {
  const sitemap = readFileSync(resolve(outDir, 'sitemap.xml'), 'utf8');
  assert.ok(!sitemap.includes('/404'), '404 must not be in the sitemap');
  // ADR-010: the sitemap lists locale addresses only, so the two locale-neutral
  // routes (`/` and `/404`) and the locale 404 are all absent from it.
  assert.equal((sitemap.match(/<url>/g) ?? []).length, result.routes.length - 3);
  assert.match(html('404.html'), /<meta name="robots" content="noindex">/);
});

test('reduced motion is honoured, and motion never hides content', () => {
  const css = readFileSync(resolve(outDir, 'styles.css'), 'utf8');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);

  // Asserting that a fill mode exists is not the same as asserting content is
  // visible. An earlier version checked for `animation-fill-mode: both` and
  // concluded the page was safe; a browser screenshot showed it blank, because
  // `both` holds an element at its FROM state through its delay.
  //
  // This test then banned the animation BY NAME — `@keyframes forest-enter`
  // must not exist. That is a proxy for the safety property, not the property:
  // it forbids one spelling of the defect and permits every other, while also
  // forbidding motion that hides nothing. The motion language (§3) requires
  // forest-enter to exist; what it forbids is content revealed only by
  // animation (§10).
  //
  // So the assertions here are now the property itself, checked structurally by
  // findLoadBearingMotion and measured in a real browser by
  // scripts/visual-check.mjs, which reads the computed opacity of every element
  // carrying text at rest — the only check that can see an inactive timeline.
  assert.deepEqual(findLoadBearingMotion(css), [], 'the built stylesheet stages content behind motion');
  assert.ok(!/opacity:\s*0/.test(css), 'no rule may start content at opacity 0');
  assert.ok(!/\.enter/.test(css), 'the staggered entry class must not return');

  // The delay is what stranded content. With a view() timeline the stagger is
  // positional, so there is no delay to get wrong.
  //
  // Read through the parser rather than with a regex over the text: the
  // stylesheet's own comments explain the defect by name, and a raw
  // /animation-delay/ matched the explanation. That is the third time in this
  // repository a checker has been fooled by prose describing the thing it
  // looks for — findUndefinedTokens strips comments for exactly this reason.
  const delays = declarations(css).filter((d) => d.property === 'animation-delay');
  assert.deepEqual(delays, [], 'animation-delay reintroduces the stranding failure');

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
  assert.match(html('en/olibana/philosophy/index.html'), /Structural Logic/);
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

test('no stylesheet rule references a token that does not exist', () => {
  // An undefined var() is silent: it falls back to the inherited value. The
  // purchase button's label was written as var(--surface-page), which is not a
  // token here, so it inherited #1A1A1A and rendered on a #1A1A1A background.
  // Nothing in this suite could see it; a screenshot could.
  assert.deepEqual(findUndefinedTokens(stylesheet), []);
});

test('the purchase button states a colour and a background, and they differ', () => {
  const rule = /form\.order button \{[^}]*\}/.exec(stylesheet)?.[0] ?? '';
  const colour = /(?:^|[^-])color:\s*var\((--[a-z0-9-]+)\)/.exec(rule)?.[1];
  const background = /background:\s*var\((--[a-z0-9-]+)\)/.exec(rule)?.[1];
  assert.ok(colour, 'the button sets no text colour');
  assert.ok(background, 'the button sets no background');
  assert.notEqual(colour, background, 'the button paints its label in its own background colour');
});

test('every router response carries the security headers, including the redirects', async () => {
  // The confirmation URL carries the order's access token in its query string.
  // A Referer sent to any other origin would hand that token away, so
  // no-referrer is load-bearing rather than decorative.
  const { CHECKOUT_PATH, handleRequest, SECURITY_HEADERS } = await import('../../src/http/router.ts');
  const { UnconfiguredGateway } = await import('../../src/checkout/checkout.ts');
  const { UnconfiguredVerifier } = await import('../../src/http/router.ts');
  const { Catalog } = await import('../../src/catalog/catalog.ts');
  const { PreorderRunStore } = await import('../../src/preorder/run.ts');
  const { OrderStore } = await import('../../src/order/store.ts');
  const { IntentStore } = await import('../../src/checkout/intents.ts');

  const stamp = Math.random().toString(36).slice(2);
  const options = {
    stores: {
      catalog: new Catalog(new FileStorage(resolve(outDir, `hdr-cat-${stamp}.jsonl`))),
      runs: new PreorderRunStore(new FileStorage(resolve(outDir, `hdr-runs-${stamp}.jsonl`))),
      orders: new OrderStore(new FileStorage(resolve(outDir, `hdr-orders-${stamp}.jsonl`))),
      intents: new IntentStore(new FileStorage(resolve(outDir, `hdr-intents-${stamp}.jsonl`))),
    },
    gateway: new UnconfiguredGateway(),
    verifier: new UnconfiguredVerifier(),
  };

  const requests = [
    new Request(`https://olibana.test${CHECKOUT_PATH}`),                       // 303 home
    new Request(`https://olibana.test${CHECKOUT_PATH}`, { method: 'POST', body: '' }),  // 422
    new Request('https://olibana.test/order/confirmation?ref=nothing'),        // 202
    new Request('https://olibana.test/webhooks/payment', { method: 'POST', body: '{}' }), // 400
    new Request('https://olibana.test/webhooks/payment'),                      // 405
  ];

  for (const request of requests) {
    const response = await handleRequest(options, request);
    assert.ok(response !== null, `${request.method} ${request.url} was not routed`);
    const where = `${request.method} ${new URL(request.url).pathname} (${response.status})`;
    for (const name of Object.keys(SECURITY_HEADERS)) {
      assert.equal(response.headers.get(name), SECURITY_HEADERS[name], `${where} is missing ${name}`);
    }
  }
});

test('the security headers assert properties, not whatever they currently say', () => {
  // Comparing the headers to themselves passes however they are weakened. These
  // assert the three things they exist for.
  assert.ok(
    ['no-referrer', 'same-origin'].includes(SECURITY_HEADERS['referrer-policy']),
    `referrer-policy is "${SECURITY_HEADERS['referrer-policy']}", which can send the confirmation ` +
      'URL — and with it the order access token — to another origin',
  );
  const csp = SECURITY_HEADERS['content-security-policy'];
  assert.match(csp, /script-src 'none'/, 'the CSP permits script on a site that ships none');
  assert.match(csp, /frame-ancestors 'none'/, 'the purchase form can be framed');
  assert.match(csp, /form-action 'self'/, 'a form could post somewhere else');
  assert.equal(SECURITY_HEADERS['x-content-type-options'], 'nosniff');
});

test('the static build ships the same headers the router sets', () => {
  // Two halves answer requests for this site. A header set on one and not the
  // other is a gap that depends on which half a customer happened to reach.
  const stamp = Math.random().toString(36).slice(2);
  const out = resolve(tmpdir(), `olibana-hdrs-${stamp}`);
  build({ outDir: out });
  const file = readFileSync(resolve(out, '_headers'), 'utf8');
  assert.match(file, /^\/\*$/m, 'the _headers file matches no paths');
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    assert.ok(file.includes(`${name}: ${value}`), `_headers is missing ${name}`);
  }
});

test('every page carries a build marker', () => {
  // Without it a deployment serving a stale build is indistinguishable from one
  // serving the current commit: every other check passes either way.
  for (const page of pages) {
    assert.match(
      html(page),
      /<meta name="olibana-build" content="[^"]+">/,
      `${page} carries no build marker`,
    );
  }
});

test('the build marker refuses to invent a value it does not have', async () => {
  // `unknown` is a real answer. A marker that guesses would be believed.
  const { buildId, UNKNOWN_BUILD } = await import('../../src/site/build-id.ts');

  assert.equal(buildId({}, () => null), UNKNOWN_BUILD);
  assert.equal(buildId({}, () => '   '), UNKNOWN_BUILD);
  assert.equal(buildId({ CF_PAGES_COMMIT_SHA: '' }, () => null), UNKNOWN_BUILD);

  // The platform's own record wins over the working tree, because the platform
  // is what actually built the thing being served.
  assert.equal(buildId({ CF_PAGES_COMMIT_SHA: 'abcdef1234567890' }, () => 'ffff'), 'abcdef123456');
  assert.equal(buildId({}, () => '0123456789abcdef\n'), '0123456789ab');
});
