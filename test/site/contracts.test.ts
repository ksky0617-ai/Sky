/**
 * Cross-layer contracts.
 *
 * Every test here spans two layers that must agree, and each exists because
 * agreement between layers is the thing no single-layer test can see. A route
 * test proves the route is right. A search test proves the entry is right.
 * Neither notices when a page says an Atlas has measurements and the index says
 * it does not — and that particular disagreement would surface as a search
 * result promising a garment derived from a measurement nobody took, which is
 * the one failure this brand cannot have.
 *
 * The pattern these enforce: **one derivation, not two that agree today.**
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { build } from '../../src/site/build.ts';
import { buildRoutes, countAtlasDataRows, type Route } from '../../src/site/routes.ts';
import { disabledLocales, enabledLocales, isEnabled } from '../../src/site/locales.ts';
import { assertSearchDocument, indexAtlas } from '../../src/site/search.ts';
import { Catalog, variant } from '../../src/catalog/catalog.ts';
import { FileStorage } from '../../src/persistence/file-storage.ts';
import { renderProductBody } from '../../src/site/product-page.ts';

const outDir = mkdtempSync(resolve(tmpdir(), 'olibana-contracts-'));
const result = build({ outDir });
const routes = buildRoutes();
const read = (relativePath: string): string => readFileSync(resolve(outDir, relativePath), 'utf8');
const sitemap = read('sitemap.xml');

test.after(() => rmSync(outDir, { recursive: true, force: true }));

const atlasRoutes = routes.filter((r) => /\/nature\/[a-z]+$/.test(r.path));
const showsMeasurements = (route: Route): boolean => /<h2>Measurements<\/h2>/.test(route.body);
const claimsSource = (route: Route): boolean => route.search?.atlasSource != null;

// --- 1. SEARCH <-> PAGE ATLAS INVARIANT ---------------------------------

test('CONTRACT: a page and its search entry agree about whether an Atlas has data', () => {
  // The invariant, stated once: what the page renders and what the index claims
  // are the same fact, so they are read from the same count of the same source.
  assert.ok(atlasRoutes.length > 0, 'no Atlas routes exist to check');

  for (const route of atlasRoutes) {
    assert.equal(
      showsMeasurements(route), claimsSource(route),
      `${route.path}: the page ${showsMeasurements(route) ? 'shows' : 'hides'} measurements ` +
      `while the index ${claimsSource(route) ? 'claims' : 'denies'} an Atlas source`,
    );
  }
});

test('CONTRACT: the built HTML agrees with the index, not just the route object', () => {
  // The route object is what the index is derived from. This asks the different
  // question — whether the FILE that ships says the same thing — because a
  // renderer could drop the section after the entry was computed.
  for (const route of atlasRoutes) {
    const file = result.files.find((f) => f === `${route.locale}/nature/${route.path.split('/').pop()}/index.html`);
    assert.ok(file !== undefined, `${route.path} emitted no file`);
    assert.equal(
      /<h2>Measurements<\/h2>/.test(read(file)), claimsSource(route),
      `${file}: the shipped page and the index disagree about Atlas data`,
    );
  }
});

test('CONTRACT: the index is derived per build, so it cannot go stale', () => {
  // M3 and M4 in shape: a rule changes, or an Atlas loses its rows, and the
  // index still carries the old answer. It cannot here — there is no stored
  // index to go stale, only a projection of the route that is rebuilt with it.
  //
  // Demonstrated rather than asserted about: the same Atlas indexed from two
  // different source texts yields two different answers.
  const spec = { title: 'River Atlas', description: 'Flow.', file: 'River_Atlas.md', slug: 'river' };
  const empty = indexAtlas({ ...spec, source: '## Data Log\n\n| ID |\n| --- |\n| | |\n' }, '/en/nature/river');
  const filled = indexAtlas({ ...spec, source: '## Data Log\n\n| ID | Site |\n| --- | --- |\n| R-01 | Kamo |\n' }, '/en/nature/river');

  assert.equal(empty.atlasSource, null);
  assert.equal(filled.atlasSource, 'River Atlas');
  assert.notEqual(empty.atlasSource, filled.atlasSource, 'the index ignored a change in the source');
});

test('CONTRACT: naturalRule and atlasSource are one fact, on every indexed route', () => {
  // The invariant the cycle names: naturalRule !== null <-> atlasSource !== null.
  // Checked over the real manifest, not only over hand-made fixtures.
  for (const route of routes) {
    if (route.search == null) continue;
    assertSearchDocument(route.search);
    assert.equal(
      route.search.naturalRule !== null, route.search.atlasSource !== null,
      `${route.path}: a rule with no Atlas behind it, or an Atlas citing no rule`,
    );
  }
});

test('CONTRACT: every route carries an indexing decision, none is silently absent', () => {
  // `undefined` would mean nobody decided. `null` means indexed: no.
  for (const route of routes) {
    assert.notEqual(route.search, undefined, `${route.path} has no indexing decision`);
  }
  const indexed = routes.filter((r) => r.search != null);
  assert.ok(indexed.length > 0, 'nothing is indexed at all');
  for (const route of indexed) {
    assert.equal(route.search?.url, route.path, `${route.path}: its entry points elsewhere`);
  }
});

// --- 2. DISABLED LOCALE INVARIANT ---------------------------------------

test('CONTRACT: a disabled locale is absent from every layer at once', () => {
  // Five layers, one loop. Checking them separately is how a locale ends up
  // gone from the routes and still present in the sitemap.
  assert.ok(disabledLocales().length > 0, 'this test assumes ja and ko are still untranslated');

  for (const locale of disabledLocales()) {
    const prefix = `/${locale.code}/`;
    const residue: string[] = [];

    if (routes.some((r) => r.path.startsWith(prefix))) residue.push('route');
    if (result.files.some((f) => f.startsWith(`${locale.code}/`))) residue.push('generated file');
    if (sitemap.includes(prefix)) residue.push('sitemap');
    if (result.files.filter((f) => f.endsWith('.html')).some((f) => read(f).includes(`hreflang="${locale.lang}"`))) {
      residue.push('hreflang');
    }
    if (routes.some((r) => r.search?.url.startsWith(prefix))) residue.push('search index');

    assert.deepEqual(residue, [], `${locale.code} survives in: ${residue.join(', ')}`);
  }
});

test('CONTRACT: an enabled locale IS present in every layer', () => {
  // Without this the test above passes against a build that emits nothing.
  for (const locale of enabledLocales()) {
    const prefix = `/${locale.code}/`;
    assert.ok(routes.some((r) => r.path.startsWith(prefix)), `${locale.code} has no routes`);
    assert.ok(result.files.some((f) => f.startsWith(`${locale.code}/`)), `${locale.code} emitted no files`);
    assert.ok(sitemap.includes(prefix), `${locale.code} is missing from the sitemap`);
    assert.ok(read('en/index.html').includes(`hreflang="${locale.lang}"`), `${locale.code} has no hreflang`);
    assert.ok(routes.some((r) => r.search?.url.startsWith(prefix)), `${locale.code} is missing from the index`);
  }
});

// --- 3. CONTENT DELETION INVARIANT --------------------------------------

test('CONTRACT: removing a locale content source disables the locale', () => {
  // source !== null -> enabled, and nothing else can produce enabled. Fed both
  // directions, including the direction that matters: content taken away.
  const withContent = { code: 'ja', name: '日本語', lang: 'ja', source: 'content/ja' };
  assert.equal(isEnabled(withContent), true);

  const contentDeleted = { ...withContent, source: null };
  assert.equal(isEnabled(contentDeleted), false, 'a locale stayed enabled after its content was removed');
});

test('CONTRACT: removing content from the locale that IS enabled disables it', () => {
  // The gap a mutation exposed. The test above uses a hypothetical `ja`, which
  // a `locale.code === 'en' || ...` shortcut would sail straight past — and
  // that shortcut is exactly how a locale comes to be enabled by its name
  // rather than by its content. So the check is run against the real enabled
  // locale, with its content taken away.
  for (const locale of enabledLocales()) {
    assert.equal(
      isEnabled({ ...locale, source: null }), false,
      `${locale.code} stayed enabled after its content was removed — enabled is keyed on something other than content`,
    );
  }
});

test('CONTRACT: there is no path to enabled that does not go through content', () => {
  // A declared flag is the failure mode: someone adds `enabled: true` next to a
  // locale with no translation and the site starts serving English from /ja/.
  // The guarantee is structural — `enabled` is not a field on the type, so
  // there is nothing to set.
  for (const locale of [...enabledLocales(), ...disabledLocales()]) {
    assert.ok(!('enabled' in locale), `${locale.code} carries a settable enabled flag`);
    assert.equal(isEnabled(locale), locale.source !== null, `${locale.code}: enabled disagrees with content`);
  }
});

// --- 5. ADR INDEX INVARIANT ---------------------------------------------

test('CONTRACT: the ADR index and the ADR files are the same set, both ways', () => {
  // ADR-009 was absent from the index for three cycles. The index is how a
  // resuming session learns which decisions bind it, so a decision missing from
  // it gets re-litigated — and an index entry with no file behind it sends a
  // reader to a document that does not exist.
  const dir = resolve(import.meta.dirname, '../../docs/adr');
  const index = readFileSync(resolve(dir, 'README.md'), 'utf8');
  const files = readdirSync(dir).filter((f) => /^ADR-\d+.*\.md$/.test(f));

  const missingFromIndex = files.filter((f) => !index.includes(f));
  assert.deepEqual(missingFromIndex, [], 'ADR files the index does not list');

  const linked = [...index.matchAll(/\(\.\/(ADR-[^)]+\.md)\)/g)].map((m) => m[1] as string);
  const danglingLinks = [...new Set(linked)].filter((f) => !files.includes(f));
  assert.deepEqual(danglingLinks, [], 'index entries pointing at ADR files that do not exist');

  assert.ok(files.length > 0, 'no ADRs found — this test would pass vacuously');
});

// --- GATE-004: still blocked, and the block is checked ------------------

test('CONTRACT: no Atlas carries field data, so §4.1 stays BLOCKED_EXTERNAL', () => {
  // Not a reminder — a trigger. The day real rows arrive with their provenance,
  // this fails and GATE-004 is re-examined instead of staying blocked by habit.
  // 03 §3's threshold is 3 records per Atlas, 12 total.
  const rows = ['River', 'Stone', 'Forest', 'Light'].map((name) => ({
    name,
    count: countAtlasDataRows(readFileSync(resolve(import.meta.dirname, `../../${name}_Atlas.md`), 'utf8')),
  }));
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  assert.equal(
    total, 0,
    `${total} Atlas rows now exist (${rows.map((r) => `${r.name}=${r.count}`).join(' ')}) — ` +
    're-examine GATE-004 against 03 §3\'s 12-row threshold',
  );

  // And while it is zero, nothing in the index may claim an Atlas source.
  for (const route of routes) {
    assert.equal(route.search?.atlasSource ?? null, null, `${route.path} cites an Atlas that holds no rows`);
  }
});

// --- 03 §6: the cross-layer connections ---------------------------------
//
// "The directive's central UX claim (§25) is that philosophy and commerce must
// connect." Two of the five connections are now built, both DERIVED from the
// rule a garment records rather than from a list anyone maintains — which is
// the only version that cannot go stale, and the only version that lights up
// on its own the day a garment exists.

test('§6 Atlas -> Product: each Atlas shows the garments derived from its rule', () => {
  // Empty today, and empty for a stated reason rather than because the section
  // was never built. The next test proves it is not empty *by construction*.
  for (const route of atlasRoutes) {
    assert.match(route.body, /<h2>Garments from this rule<\/h2>/, `${route.path} does not connect to product`);
    assert.match(route.body, /state-awaiting/, `${route.path} shows no absence for its garments`);
    assert.match(route.body, /No garment/, `${route.path} does not say what is missing`);
  }
});

test('§6 Atlas -> Product POPULATES when a garment cites the Atlas', () => {
  // The test that matters. A section that is always empty is indistinguishable
  // from a section wired to nothing, and this repository has shipped that exact
  // thing five times. So a garment is published against a temporary catalogue
  // and the Atlas page is required to find it.
  const work = mkdtempSync(resolve(tmpdir(), 'olibana-atlas-link-'));
  const catalogPath = resolve(work, 'catalog.jsonl');
  const runsPath = resolve(work, 'runs.jsonl');

  new Catalog(new FileStorage(catalogPath)).record({
    productId: 'PRD_link', code: 'OLB-CT-002', name: 'Meander Coat', category: 'CT',
    status: 'PUBLISHED', summary: 'A fixture for the Atlas connection.',
    variants: [variant('OLB-CT-002', 'STN', 'M', { amount: 72000, currency: 'JPY' })],
    measurements: [],
    naturalRule: { atlas: 'River Atlas', observation: 'meander curvature', translation: 'the hem follows a continuous curve' },
    materials: ['Wool'], productionLeadDays: 60, actor: 'test',
  });

  try {
    const withProduct = buildRoutes(catalogPath, runsPath);
    const river = withProduct.find((r) => r.path === '/en/nature/river');
    const stone = withProduct.find((r) => r.path === '/en/nature/stone');

    assert.match(river?.body ?? '', /Meander Coat/, 'the River Atlas did not find the garment citing it');
    assert.match(river?.body ?? '', /the hem follows a continuous curve/, 'the rule translation is not shown');
    assert.ok(!(river?.body ?? '').includes('No garment'), 'the River Atlas still claims no garment derives from it');

    // And only the Atlas that was cited. A section that lists every product
    // regardless of its rule would connect nothing.
    assert.ok(!(stone?.body ?? '').includes('Meander Coat'), 'the Stone Atlas claimed a garment citing the River');
    assert.match(stone?.body ?? '', /No garment/, 'the Stone Atlas lost its absence state');
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

test('§6 Product -> Atlas: the rule source is a link, and never a guessed one', () => {
  // It was plain text: a reader told the garment comes from the River Atlas had
  // no way to go and read it. Philosophy and product were on the same page and
  // still not connected.
  const linked = renderProductBody(
    {
      productId: 'PRD_x', code: 'OLB-CT-001', name: 'Coat', category: 'CT', summary: 'A fixture.',
      variants: [], measurements: [], materials: [], productionLeadDays: 60,
      naturalRule: { atlas: 'River Atlas', observation: 'o', translation: 't' },
    } as never,
    null,
  );
  assert.match(linked, /<a href="\/nature\/river">River Atlas<\/a>/);

  // An Atlas this site does not publish renders as TEXT. Design_System.md
  // records a Material Atlas as a planned expansion, so a product citing one is
  // a real possibility — and a guessed `/nature/material` would be a 404 with a
  // plausible name, the same failure as the two dead .md links arrived at more
  // cleverly.
  const unpublished = renderProductBody(
    {
      productId: 'PRD_y', code: 'OLB-CT-001', name: 'Coat', category: 'CT', summary: 'A fixture.',
      variants: [], measurements: [], materials: [], productionLeadDays: 60,
      naturalRule: { atlas: 'Material Atlas', observation: 'o', translation: 't' },
    } as never,
    null,
  );
  assert.match(unpublished, /<dd>Material Atlas<\/dd>/, 'an unpublished Atlas was not rendered as plain text');
  assert.ok(!/href="[^"]*material/.test(unpublished), 'a link was guessed for an Atlas that does not exist');
});

test('§6: the three connections that remain blocked are not faked', () => {
  // Article -> Product, Collection -> Atlas, and the Rule Layer overlay all
  // depend on inputs that do not exist (journal articles, collections, Atlas
  // field data). None of them is stubbed, and none of the built pages pretends
  // otherwise.
  const built = new Set(routes.map((r) => r.basePath));
  for (const absent of ['/journal', '/collections', '/lookbook']) {
    assert.ok(!built.has(absent), `${absent} was built without content to fill it`);
  }
  for (const route of routes) {
    assert.ok(!/rule-layer|ruleLayer/i.test(route.body), `${route.path} ships a Rule Layer with no Atlas data`);
  }
});
