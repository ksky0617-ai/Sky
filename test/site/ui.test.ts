/**
 * The UI states added for depth, and the rules each of them has to keep.
 *
 * Two of these are the interesting ones. The trail and the sibling links are
 * DERIVED — from the path and from the manifest — so the test that matters is
 * not "does a breadcrumb appear" but "does it stay right when the hierarchy
 * changes", which is the thing a hand-written breadcrumb fails at silently.
 *
 * The other is the absence states. This site has a lot of gaps on purpose, and
 * before this cycle every gap looked exactly like every footnote.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { build } from '../../src/site/build.ts';
import { buildRoutes } from '../../src/site/routes.ts';
import { awaiting, absentPhotography, note } from '../../src/site/states.ts';
import { renderSiblings, renderTrail, siblings, trail } from '../../src/site/wayfinding.ts';
import { declarations, rootTokens, stylesheet } from '../../src/site/styles.ts';

const outDir = mkdtempSync(resolve(tmpdir(), 'olibana-ui-'));
const result = build({ outDir });
const routes = buildRoutes();
const html = (relativePath: string): string => readFileSync(resolve(outDir, relativePath), 'utf8');

test.after(() => rmSync(outDir, { recursive: true, force: true }));

// --- wayfinding: derived, not written ------------------------------------

const labels = new Map([['/', 'Olibana'], ['/nature', 'Nature'], ['/olibana/philosophy', 'Philosophy']]);

test('the trail follows the hierarchy, and stops where the hierarchy stops', () => {
  assert.deepEqual(trail('/', labels), []);
  assert.deepEqual(trail('/nature', labels).map((s) => s.path), ['/']);
  assert.deepEqual(trail('/nature/river', labels).map((s) => s.path), ['/', '/nature']);
});

test('a path segment that is not a page contributes no crumb', () => {
  // `/legal/accessibility` has no `/legal` page. A breadcrumb linking to one
  // would be a dead link with a plausible name, which is worse than no
  // breadcrumb — the reader trusts it and lands on a 404.
  const steps = trail('/legal/accessibility', labels);
  assert.deepEqual(steps.map((s) => s.path), ['/'], 'an invented ancestor appeared in the trail');
});

test('the current page is named in the trail but is not a link', () => {
  // A link to the page you are on is a control that does nothing.
  const rendered = renderTrail(trail('/nature/river', labels), 'River Atlas', 'en');
  assert.match(rendered, /<span aria-current="page">River Atlas<\/span>/);
  assert.ok(!/<a[^>]*>River Atlas</.test(rendered), 'the current page is a link to itself');
  assert.match(rendered, /aria-label="Breadcrumb"/);
});

test('the trail stays inside the locale', () => {
  // ADR-010. A breadcrumb to `/nature` from a page at `/en/nature/river` walks
  // the reader out of their locale, which is the class of bug the ADR exists
  // to prevent.
  const rendered = renderTrail(trail('/nature/river', labels), 'River Atlas', 'en');
  for (const [, href] of rendered.matchAll(/href="([^"]*)"/g)) {
    assert.match(href as string, /^\/en\//, `${href} leaves the locale`);
  }
});

test('siblings come from the manifest order, and the ends have one side', () => {
  const section = [
    { basePath: '/nature/river', title: 'River Atlas' },
    { basePath: '/nature/stone', title: 'Stone Atlas' },
    { basePath: '/nature/forest', title: 'Forest Atlas' },
  ];
  assert.equal(siblings(section, '/nature/river').previous, null, 'the first has a previous');
  assert.equal(siblings(section, '/nature/river').next?.title, 'Stone Atlas');
  assert.equal(siblings(section, '/nature/forest').next, null, 'the last has a next');
  assert.equal(siblings(section, '/nature/stone').previous?.title, 'River Atlas');
  // A path outside the section gets neither, rather than the first two.
  assert.deepEqual(siblings(section, '/olibana/philosophy'), { previous: null, next: null });
});

test('sibling navigation does not spend the motion budget', () => {
  // Deliberately not `.index` markup: that class carries the forest reveal on
  // layers 1 and 2, so reusing it would add two animations to every Atlas page
  // and raise the Layer 1 budget for navigation furniture. 04 §5's "one primary
  // motion at a time" is the reason.
  const rendered = renderSiblings(
    { basePath: '/nature/river', title: 'River Atlas' },
    { basePath: '/nature/forest', title: 'Forest Atlas' },
    'en',
  );
  assert.ok(!rendered.includes('class="index'), 'sibling navigation reuses an animated class');

  const animated = declarations(stylesheet)
    .filter((d) => d.property === 'animation-name' && !d.value.includes('none'))
    .map((d) => d.selector)
    .join(' ');
  assert.ok(!animated.includes('.siblings'), 'sibling navigation is animated');
  assert.ok(!animated.includes('.trail'), 'the breadcrumb is animated');
});

// --- the built pages -----------------------------------------------------

test('every nested page shows where it is; the home page does not', () => {
  // 03 §4 "Current location always indicated". The nav marks a section and says
  // nothing on a nested page, which was every nested route on the site.
  for (const route of routes) {
    const isNested = route.basePath !== '/' && route.basePath.split('/').filter(Boolean).length > 1;
    const shown = route.body.includes('class="trail"');
    if (isNested) assert.ok(shown, `${route.path} does not say where it is`);
  }
  const home = routes.find((r) => r.path === '/en/');
  assert.ok(!(home?.body ?? '').includes('class="trail"'), 'the home page has a breadcrumb to itself');
});

test('the Atlases are traversable without going back to the index', () => {
  const river = html('en/nature/river/index.html');
  const stone = html('en/nature/stone/index.html');
  assert.match(river, /rel="next" href="\/en\/nature\/stone"/);
  assert.match(stone, /rel="prev" href="\/en\/nature\/river"/);
  assert.match(stone, /rel="next" href="\/en\/nature\/forest"/);
  // The first has no previous and the last no next — rendered as an empty
  // holder so the remaining link stays on its own side of the grid.
  assert.ok(!/rel="prev"/.test(river), 'the first Atlas claims a previous');
});

test('the 404 lists what the site actually holds', () => {
  // It named three addresses by hand and had already missed Design Language and
  // all four Atlases — the one page a reader reaches when an address is wrong
  // was the page guaranteed to go stale.
  const page = html('404.html');
  for (const route of routes.filter((r) => r.indexable !== false && r.locale === 'en')) {
    if (route.basePath === '/') continue;
    assert.ok(page.includes(route.title), `the 404 omits ${route.title}`);
  }
});

// --- absence states ------------------------------------------------------

test('an absence names what is missing and never says when', () => {
  const state = awaiting('No field measurements', 'have been recorded for this Atlas.');
  assert.match(state, /state-awaiting/);
  assert.match(state, /<strong>No field measurements<\/strong>/);
  // "Coming soon" and "expected in spring" are the two most common lies on an
  // unfinished site. There is no parameter that could carry one.
  assert.equal(awaiting.length, 2, 'awaiting() gained a parameter — check it cannot carry a date');
});

test('an absence and a note are visually distinguishable, not just semantically', () => {
  // They shared one box, which made this site's gaps indistinguishable from its
  // footnotes on a site that has a lot of both.
  assert.notEqual(
    awaiting('A', 'B').match(/class="([^"]*)"/)?.[1],
    note('<p>C</p>').match(/class="([^"]*)"/)?.[1],
  );
  assert.ok(stylesheet.includes('.state-awaiting'), 'the absence state has no distinct styling');
});

test('a photography absence reserves the box and holds no picture', () => {
  // GATE-005. The container is real so the layout is the one the photograph
  // will land in; it holds no image because no garment has been made.
  const absent = absentPhotography('the first garment');
  assert.ok(!absent.includes('<img'), 'the absence state contains an image');
  assert.match(absent, /media-absent-box/);
  assert.match(absent, /No photograph of the first garment exists yet/);
  assert.match(absent, /nothing here stands in for it/);
  // The reserved ratio is a layout decision, and it is in the stylesheet where
  // the box is, not inline where it would drift.
  assert.match(stylesheet, /\.media-absent-box \{[^}]*aspect-ratio: 4 \/ 5/s);
});

test('states escape what they are given', () => {
  const state = awaiting('<script>x</script>', '<b>y</b>');
  assert.ok(!state.includes('<script>'), 'markup survived into an absence state');
  assert.ok(!state.includes('<b>'), 'markup survived into an absence state');
});

// --- what did not change -------------------------------------------------

test('the new states carry no invented fact', () => {
  // The whole point of this cycle: more UI, no more claims. Nothing added here
  // may assert a measurement, a date, or a product that does not exist.
  const forbidden = [/coming soon/i, /expected (in|by)/i, /\b20\d\d\b(?![^<]*Atlas)/];
  for (const route of routes) {
    for (const [, block] of route.body.matchAll(/<div class="state state-awaiting"[^>]*>(.*?)<\/div>/gs)) {
      for (const pattern of forbidden) {
        assert.ok(!pattern.test(block as string), `${route.path}: an absence state claims "${pattern}"`);
      }
    }
  }
});

test('a recovery surface reduces motion below what its layer allows', () => {
  // §3's mode table gives Reassuring "Low", which the layer alone cannot
  // express: the 404 and the confirmation sit on layers 2 and 3 beside pages
  // meant to move. Found by measurement — rebuilding the 404 from the manifest
  // took it from three hand-written links to nine real ones, the list reveal
  // took Layer 2 to 11 animations against Layer 1's 9, and the descending
  // budget broke on the run that introduced it.
  const reducers = declarations(stylesheet).filter(
    (d) => d.selector.includes('[data-mode="reassuring"]') && d.property === 'animation-name',
  );
  assert.ok(reducers.length > 0, 'nothing reduces motion on a reassuring surface');
  assert.ok(reducers.every((d) => d.value.includes('none')), 'the reducer adds motion instead of removing it');
  assert.ok(reducers.every((d) => d.value.includes('!important')), 'a component could out-specify the reducer');

  // The mode may only REDUCE. A reassuring rule that started an animation
  // would be the mode adding motion, which inverts §3's budget.
  const adders = declarations(stylesheet).filter(
    (d) => d.selector.includes('[data-mode=') && d.property === 'animation-name' && !d.value.includes('none'),
  );
  assert.deepEqual(adders.map((d) => d.selector), [], 'a mode rule starts an animation');
});

// --- the accessibility page's claims must be true ------------------------

test('every measurement the accessibility page claims is one that actually runs', () => {
  // Found by a mutation that SURVIVED. The page makes factual claims about what
  // has been checked, and nothing verified those claims — which is exactly how
  // "no colour-contrast validation has been run against this build" stayed on a
  // live page for eight cycles after it became false.
  //
  // Each claim is tied to the evidence that makes it true. Adding a claim with
  // no evidence fails here, which is the only thing that stops this page
  // drifting back into fiction.
  const page = html('en/legal/accessibility/index.html');
  const visualCheck = readFileSync(resolve(import.meta.dirname, '../../scripts/visual-check.mjs'), 'utf8');

  assert.match(page, /<h2>What has been measured<\/h2>/, 'the measured section is gone or renamed');

  const claims: ReadonlyArray<{ readonly claim: RegExp; readonly evidence: RegExp; readonly where: string }> = [
    {
      claim: /Colour contrast, for every element that paints its own text/,
      evidence: /lowContrast/,
      where: 'the per-element contrast sweep in scripts/visual-check.mjs',
    },
    {
      claim: /in both light states/,
      evidence: /colorScheme: scheme/,
      where: 'the dual colour-scheme viewport matrix',
    },
    {
      claim: /24x24 CSS pixel minimum/,
      evidence: /MIN_TARGET_PX = 24/,
      where: 'the target-size floor',
    },
    {
      claim: /no content is revealed only by animation, measured at rest/,
      evidence: /are not fully painted at rest/,
      where: 'the resting-opacity sweep',
    },
  ];

  for (const { claim, evidence, where } of claims) {
    assert.match(page, claim, `the page no longer makes a claim this test pins: ${claim}`);
    assert.match(
      visualCheck, evidence,
      `the page claims "${claim}" but ${where} is gone — the claim is now false`,
    );
  }

  // And the specific correction this cycle made: the page must NOT say contrast
  // is unvalidated, because it is.
  assert.ok(
    !/no colour-contrast validation\s+has been run/i.test(page),
    'the page reinstated a claim that has been false since the contrast sweep was built',
  );
});

// --- content depth: the pages that document the system -------------------
//
// The Design Language page publishes the spacing and motion tokens, and the
// Philosophy page publishes where the rules come from and what happens to one
// afterwards. Both are new, and both have the same failure mode: a page that
// documents a system it cannot see will eventually describe a different one.

test('the spacing scale on the page is the spacing scale in the stylesheet', () => {
  const page = html('en/olibana/design-language/index.html');
  const tokens = rootTokens('--space-');

  assert.ok(tokens.length >= 10, 'the spacing scale vanished from the stylesheet');
  for (const { name, value } of tokens) {
    assert.ok(
      page.includes(`<code>${name}</code></th><td>${value}</td>`),
      `${name}: ${value} is in the stylesheet and not on the page that documents it`,
    );
  }
});

test('the motion tokens on the page are the motion tokens in the stylesheet', () => {
  const page = html('en/olibana/design-language/index.html');
  const tokens = rootTokens('--motion-');

  assert.ok(tokens.length >= 10, 'the motion tokens vanished from the stylesheet');
  for (const { name, value } of tokens) {
    // Values carry commas and parentheses (cubic-bezier), so compare escaped.
    const escaped = value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    assert.ok(
      page.includes(`<code>${name}</code></th><td>${escaped}</td>`),
      `${name}: ${value} is in the stylesheet and not on the page that documents it`,
    );
  }
});

test('a light-state redefinition is not published as if it were the scale', () => {
  // `rootTokens` reads BARE :root only. The palette roles are redefined under
  // [data-light="dusk"] and under prefers-color-scheme, and a page that listed
  // every match would show the same token twice with two different values and
  // no way to tell which one it is served in.
  const dusk = declarations(stylesheet).filter(
    (d) => d.selector.includes('data-light') || d.atRules.some((a) => a.includes('prefers-color-scheme')),
  );
  assert.ok(dusk.length > 0, 'no light-state redefinitions exist — this test is measuring nothing');

  // Every entry returned is the value BARE :root gives it — never a state's.
  for (const { name, value } of rootTokens('--')) {
    const bare = declarations(stylesheet).filter(
      (d) => d.property === name && d.selector === ':root' && d.atRules.length === 0,
    );
    assert.ok(bare.length > 0, `${name} was returned but is not declared on bare :root`);
    assert.equal(value, bare[bare.length - 1]?.value, `${name} was returned with a state's value`);
  }
});

test('the measure the page states is the measure the stylesheet applies', () => {
  const page = html('en/olibana/design-language/index.html');
  const measure = rootTokens('--measure')[0];
  assert.ok(measure !== undefined, '--measure is gone and the page still describes it');
  const stated = measure.value.replace(/ch$/, ' characters');
  assert.ok(
    page.includes(stated),
    `the page describes a measure other than ${measure.value}`,
  );
});

test('every check the Design Language page claims is one that actually runs', () => {
  // Same discipline as the accessibility page. This section makes assertions
  // about enforcement, and an unenforced assertion about enforcement is the
  // worst kind of copy this site can carry.
  const page = html('en/olibana/design-language/index.html');
  const visualCheck = readFileSync(resolve(import.meta.dirname, '../../scripts/visual-check.mjs'), 'utf8');
  const styles = readFileSync(resolve(import.meta.dirname, '../../src/site/styles.ts'), 'utf8');

  assert.match(page, /<h2>How this serves the writing<\/h2>/, 'the section is gone or renamed');

  assert.match(page, /findLoadBearingMotion/, 'the page stopped naming the check behind its motion claim');
  assert.match(styles, /export function findLoadBearingMotion/, 'the page names a check that no longer exists');

  assert.match(page, /opacity of every element at rest/, 'the resting-opacity claim is gone');
  assert.match(visualCheck, /are not fully painted at rest/, 'the page claims a sweep that no longer runs');

  assert.match(page, /Every rendered size sits on the scale/, 'the type-scale claim is gone');
  assert.match(visualCheck, /are not on the scale/, 'the page claims an off-scale check that no longer runs');
});

test('Philosophy reaches the Atlases it says every form traces to', () => {
  const page = html('en/olibana/philosophy/index.html');
  assert.match(page, /<h2>Where the rules come from<\/h2>/);
  for (const slug of ['river', 'stone', 'forest', 'light']) {
    assert.match(
      page, new RegExp(`href="/en/nature/${slug}"`),
      `the page names the ${slug} Atlas and gives the reader no way to reach it`,
    );
  }
});

test('Philosophy says what stands between a rule and a garment', () => {
  const page = html('en/olibana/philosophy/index.html');
  assert.match(page, /<h2>From a rule to a garment<\/h2>/);
  // The seven steps, read from Design_System.md rather than retyped: the first
  // and the last are the load-bearing ones for this site's honesty, because the
  // reason nothing is for sale is that step seven has not happened.
  assert.match(page, /Research &amp; Inspiration/);
  assert.match(page, /Finalize &amp; Approve/);
  assert.match(page, /Nothing has passed step seven yet/);
});

test('a document reference resolves to the page that publishes it, or to no link', () => {
  // README's Design Principles ends "see Design_System.md for the full
  // evaluation criteria", and that page exists. The reference was rendering
  // unlinked — honest, but it left the sentence pointing at a file the reader
  // cannot open.
  const page = html('en/olibana/philosophy/index.html');
  assert.match(page, /href="\/en\/olibana\/design-language"><code>Design_System\.md<\/code>/);
  // And no .md address survives onto a published page, which is the rule that
  // reference was obeying in the first place.
  assert.ok(!/href="[^"]*\.md"/.test(page), 'a .md link shipped');
});
