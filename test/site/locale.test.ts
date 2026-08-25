/**
 * ADR-010 — launch locale route policy, and 03 §7's search schema.
 *
 * The decision these enforce is not a preference. 03 §5 wants locale-prefixed
 * routes from launch; 03 §1 forbids routes that cannot be truthfully filled; no
 * Japanese or Korean translation exists. Serving English from `/ja/` would
 * represent the page as localized when it is not.
 *
 * ADR-010's fifth acceptance criterion is the one that makes the other four
 * enforceable rather than remembered: **tests must fail if a locale route is
 * enabled without localized content.**
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { build } from '../../src/site/build.ts';
import { buildRoutes, countAtlasDataRows } from '../../src/site/routes.ts';
import {
  DEFAULT_LOCALE,
  disabledLocales,
  enabledLocales,
  isEnabled,
  localePath,
  LOCALES,
  splitLocale,
} from '../../src/site/locales.ts';
import {
  assertSearchDocument,
  indexAtlas,
  indexPage,
  indexProduct,
  SEARCH_FIELDS,
  SEARCH_TYPES,
  SearchSchemaViolation,
} from '../../src/site/search.ts';
import { declarations } from '../../src/site/styles.ts';

const outDir = mkdtempSync(resolve(tmpdir(), 'olibana-locale-'));
const result = build({ outDir });
const routes = buildRoutes();
const html = (relativePath: string): string => readFileSync(resolve(outDir, relativePath), 'utf8');

test.after(() => rmSync(outDir, { recursive: true, force: true }));

// --- ADR-010 acceptance ---------------------------------------------------

test('ADR-010/1: every enabled locale has content', () => {
  // The criterion that makes the policy real. A locale is enabled if and only
  // if it declares content, so this cannot be satisfied by a flag.
  for (const locale of enabledLocales()) {
    assert.notEqual(locale.source, null, `${locale.code} is enabled with no content`);
  }
  assert.ok(enabledLocales().length > 0, 'no locale is enabled at all');
});

test('ADR-010/5: a locale cannot be enabled without content', () => {
  // Fed the exact mistake the ADR exists to prevent: someone switches ja on
  // without supplying Japanese. `isEnabled` is derived, so the answer is no.
  const wishfulJapanese = { code: 'ja', name: '日本語', lang: 'ja', source: null };
  assert.equal(isEnabled(wishfulJapanese), false, 'a locale with no content was enabled');

  const realJapanese = { ...wishfulJapanese, source: 'content/ja' };
  assert.equal(isEnabled(realJapanese), true, 'a locale WITH content was refused');
});

test('ADR-010/2 and /4: no disabled locale is exposed as a route', () => {
  assert.ok(disabledLocales().length > 0, 'this test assumes ja and ko are still untranslated');

  for (const locale of disabledLocales()) {
    const prefix = `/${locale.code}/`;
    const exposed = routes.filter((r) => r.path.startsWith(prefix) || r.path === `/${locale.code}`);
    assert.deepEqual(exposed.map((r) => r.path), [], `${locale.code} is exposed as a route`);

    // And no file is emitted under it, so a static host answers 404 rather
    // than serving English from a Japanese address.
    const files = result.files.filter((f) => f.startsWith(`${locale.code}/`));
    assert.deepEqual(files, [], `${locale.code} has built files`);

    // Nor is it advertised anywhere a crawler would read it.
    const sitemap = readFileSync(resolve(outDir, 'sitemap.xml'), 'utf8');
    assert.ok(!sitemap.includes(prefix), `${locale.code} appears in the sitemap`);
    assert.ok(!html('index.html').includes(`hreflang="${locale.lang}"`), `${locale.code} is advertised as an alternate`);
  }
});

test('ADR-010/4: a disabled locale resolves to nothing, never to English', () => {
  // "No fallback from /ja/ or /ko/ to English content will be presented as
  // localization." A fallback is the tempting implementation and the forbidden
  // one, so the resolver returns null rather than the default.
  for (const path of ['/ja/', '/ja/nature', '/ko/', '/ko/olibana/philosophy']) {
    assert.equal(splitLocale(path), null, `${path} resolved to something`);
  }
  // A locale that IS enabled resolves.
  assert.deepEqual(splitLocale('/en/nature')?.rest, '/nature');
  assert.equal(splitLocale('/en/')?.locale.code, 'en');
});

test('ADR-010/3: /en/ resolves to the English content', () => {
  const home = routes.find((r) => r.path === '/en/');
  assert.ok(home !== undefined, '/en/ does not exist');
  assert.equal(home.locale, 'en');
  assert.match(html('en/index.html'), /<html lang="en">/);
  assert.match(html('en/index.html'), /Olibana/);

  // Every content route carries the prefix. 03 §5: "locale prefix from launch".
  for (const route of routes) {
    if (route.path === '/' || route.path === '/404') continue;
    assert.match(route.path, /^\/en(\/|$)/, `${route.path} is not locale-prefixed`);
  }
});

test('the site root answers, and declares the locale address as canonical', () => {
  // A static host cannot redirect without host-specific configuration, and a
  // redirect present only on Cloudflare would make local and deployed disagree
  // about the site's most requested address. So `/` serves, and says which
  // address is the real one rather than leaving a crawler to guess.
  assert.ok(result.files.includes('index.html'));
  assert.match(html('index.html'), /<link rel="canonical" href="\/en\/">/);
  assert.match(html('en/index.html'), /<link rel="canonical" href="\/en\/">/);
});

test('a static host has a 404 document at its root, so /ja/ reaches this site', () => {
  // Without it, an address under a disabled locale reaches the HOST's error
  // page. ADR-010/4 would then hold by accident rather than by design.
  assert.ok(result.files.includes('404.html'), 'no root 404 document');
  assert.match(html('404.html'), /<meta name="robots" content="noindex">/);
});

test('every link on every built page points inside an enabled locale or outside locales entirely', () => {
  // The build already refuses to emit a dead link. This is the different
  // question: a link that resolves but crosses into a locale nobody enabled.
  const disabled = disabledLocales().map((l) => `/${l.code}/`);
  for (const file of result.files.filter((f) => f.endsWith('.html'))) {
    for (const [, href] of html(file).matchAll(/href="(\/[^"]*)"/g)) {
      for (const prefix of disabled) {
        assert.ok(!href.startsWith(prefix), `${file} links into a disabled locale: ${href}`);
      }
    }
  }
});

test('the locale registry declares the locales the architecture is for', () => {
  // 03 §5 asks for locale-aware routing, not a hardcoded language. A registry
  // listing only the locale that works would be the latter.
  assert.deepEqual(LOCALES.map((l) => l.code).sort(), ['en', 'ja', 'ko']);
  assert.equal(DEFAULT_LOCALE, 'en');
  assert.equal(localePath('ja', '/nature'), '/ja/nature');
  assert.equal(localePath('en', '/'), '/en/', 'a locale root keeps its trailing slash');
});

// --- 03 §7 search schema --------------------------------------------------

test('§7: the schema carries exactly the fields and types the document names', () => {
  assert.deepEqual([...SEARCH_TYPES], ['product', 'collection', 'article', 'material', 'atlas-entry', 'page']);
  assert.deepEqual(
    [...SEARCH_FIELDS],
    ['title', 'type', 'summary', 'naturalRule', 'atlasSource', 'category', 'colour', 'material', 'url'],
  );
});

test('§7: an entry built from a page conforms', () => {
  const entry = indexPage({ title: 'Philosophy', description: 'Core philosophy.' }, '/en/olibana/philosophy');
  assertSearchDocument(entry);
  assert.equal(entry.type, 'page');
  assert.equal(entry.naturalRule, null);
});

test('§7: an Atlas with no field data claims no measurement', () => {
  // The whole premise: a form comes from a MEASURED natural rule. An Atlas that
  // has recorded nothing must not appear in the index as a source, or search
  // starts answering "which garments come from stone?" from nothing.
  const unmeasured = indexAtlas(
    { title: 'River Atlas', description: 'Flow.', source: '## Data Log\n\n| ID |\n| --- |\n| | |\n' },
    '/en/nature/river',
  );
  assertSearchDocument(unmeasured);
  assert.equal(unmeasured.atlasSource, null, 'an unmeasured Atlas was indexed as a source');

  const measured = indexAtlas(
    { title: 'River Atlas', description: 'Flow.', source: '## Data Log\n\n| ID | Site |\n| --- | --- |\n| R-01 | Kamo |\n' },
    '/en/nature/river',
  );
  assert.equal(measured.atlasSource, 'River Atlas');
});

test('§7: a product with no recorded rule carries null, not a guess', () => {
  const entry = indexProduct(
    {
      productId: 'PRD_x', code: 'OLB-CT-001', name: 'Coat', category: 'CT',
      summary: 'A coat.', naturalRule: null,
    } as never,
    '/en/products/olb-ct-001',
  );
  assertSearchDocument(entry);
  assert.equal(entry.naturalRule, null);
  assert.equal(entry.atlasSource, null);
  assert.equal(entry.category, 'CT');
});

test('§7 SCHEMA CONTROL: the checker rejects what it must', () => {
  // Without this the conformance tests above would also pass against a checker
  // that accepts anything.
  const valid = indexPage({ title: 'A', description: 'B' }, '/en/a');

  const { naturalRule, ...missingField } = valid;
  assert.throws(() => assertSearchDocument(missingField), SearchSchemaViolation, 'a missing field was accepted');

  assert.throws(
    () => assertSearchDocument({ ...valid, extra: 'x' }),
    SearchSchemaViolation, 'an undefined field was accepted',
  );
  assert.throws(
    () => assertSearchDocument({ ...valid, type: 'lookbook' }),
    SearchSchemaViolation, 'an entity type §7 does not name was accepted',
  );
  assert.throws(
    () => assertSearchDocument({ ...valid, url: '' }),
    SearchSchemaViolation, 'an entry with no url was accepted',
  );
  // The one that matters most: a rule with no Atlas behind it.
  assert.throws(
    () => assertSearchDocument({ ...valid, naturalRule: 'derived from stone fracture' }),
    SearchSchemaViolation, 'a natural rule with no measurement behind it was accepted',
  );
  assert.throws(
    () => assertSearchDocument({ ...valid, atlasSource: 'Stone Atlas' }),
    SearchSchemaViolation, 'a citation of nothing was accepted',
  );
});

// --- the parser regression that motivated all of this ---------------------

test('declarations preserves attribute-selector values', () => {
  // It did not. Strings were blanked wholesale to stop a brace inside one from
  // shifting the block stack, which turned every `[data-layer="1"]` into
  // `[data-layer=""]` — four distinctly scoped rules collapsing into one
  // indistinguishable selector, in a parser that had been in use for two
  // cycles. A checker that destroys the thing it checks reports agreement it
  // never verified.
  const input = `
    [data-layer="1"] { opacity: 1; }
    [data-layer="2"] { opacity: .5; }
    [data-mode="frictionless"] { transition: none; }
  `;
  const selectors = declarations(input).map((d) => d.selector);

  assert.ok(selectors.includes('[data-layer="1"]'));
  assert.ok(selectors.includes('[data-layer="2"]'));
  assert.ok(selectors.includes('[data-mode="frictionless"]'));

  assert.ok(!selectors.includes('[data-layer=""]'));
  assert.ok(!selectors.includes('[data-mode=""]'));
});

test('declarations preserves compound attribute selectors', () => {
  const input = `
    [data-layer="3"][data-mode="frictionless"] {
      animation: none;
    }
  `;
  const selectors = declarations(input).map((d) => d.selector);
  assert.ok(selectors.includes('[data-layer="3"][data-mode="frictionless"]'));
});

test('declarations still survives a brace inside a string, which is why it masked them', () => {
  // The behaviour the blanking existed to provide, kept while the values are
  // preserved: only `{`, `}` and `;` are masked inside a string now.
  const found = declarations('.c { content: "}"; color: red; }');
  assert.deepEqual(found.map((d) => d.selector), ['.c', '.c']);
  assert.equal(found[1]?.property, 'color');
});

// --- 02 §4.1 The Rule Layer: BLOCKED_EXTERNAL ---------------------------
//
// GATE-004. §4.1 is the brand's primary signature and it renders only from real
// Atlas rows; all four Atlases hold zero. Its own failure condition: "if it
// renders invented numbers, it must be removed entirely. A false drawing is
// worse than no drawing."
//
// Recorded as a test rather than a note, because the risk is not that someone
// forgets to build it — it is that someone builds it against plausible numbers.

test('§4.1 is blocked, and the block is a property of the data rather than a promise', () => {
  // The honesty is structural: the same function decides whether the page shows
  // measurements and whether the index claims an Atlas as a source, so a page
  // and an index cannot disagree about whether data exists.
  const unmeasured = indexAtlas(
    { title: 'Stone Atlas', description: 'Fracture.', source: '## Data Log\n\n| ID |\n| --- |\n| | |\n' },
    '/en/nature/stone',
  );
  assert.equal(unmeasured.atlasSource, null);

  // And the schema refuses a rule with nothing behind it, which is the exact
  // shape an invented Rule Layer entry would take.
  assert.throws(
    () => assertSearchDocument({ ...unmeasured, naturalRule: 'radius 3.2m, measured at the Kamo' }),
    SearchSchemaViolation,
    'a drawn rule with no Atlas row behind it was accepted',
  );
});

test('§4.1 re-entry: 12 field records is the threshold, and none exist yet', () => {
  // 03 §3: "Minimum for the Atlas pages to carry their full intent: 3 field
  // records per Atlas, 12 total." Asserted so the day rows arrive, this test
  // fails and the gate is re-examined rather than staying blocked by habit.
  const atlases = ['River', 'Stone', 'Forest', 'Light'];
  const total = atlases.reduce((sum, name) => sum + countAtlasDataRows(
    readFileSync(resolve(import.meta.dirname, `../../${name}_Atlas.md`), 'utf8'),
  ), 0);
  assert.equal(total, 0, `${total} Atlas rows now exist — re-examine GATE-004 against the 12-row threshold`);
});
