/**
 * The media contract, and the one asset that can honestly ship.
 *
 * The subject here is as much what is ABSENT as what is present. There is no
 * product photography, because no garment exists to photograph; 02 §7 rejects
 * "any production process depicted that does not occur", and a generated or
 * stock image standing in for a coat is the same class of claim as an invented
 * measurement. So these tests check two things: that the media system refuses
 * an image that would be inaccessible or would move the page, and that the only
 * image on the site is one whose subject actually exists.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { build, productionArtifacts, ProductionGuardError } from '../../src/site/build.ts';
import { buildRoutes } from '../../src/site/routes.ts';
import {
  assertMediaAsset, MediaContractViolation, PROVENANCE, REAL, renderFigure, type MediaAsset,
} from '../../src/site/media.ts';
import { Catalog, variant } from '../../src/catalog/catalog.ts';
import { FileStorage } from '../../src/persistence/file-storage.ts';
import {
  CONSTRUCTION_PALETTE,
  SPECIMEN_HEIGHT,
  SPECIMEN_PATH,
  SPECIMEN_WIDTH,
  specimenAsset,
  specimenSvg,
  TEXT_ON_DARK,
  TEXT_ON_LIGHT,
  TYPE_STEPS,
} from '../../src/site/specimen.ts';
import { contrastRatio, CONSTRUCTION_PREFIX, findConstructionTokens, stylesheet } from '../../src/site/styles.ts';

const outDir = mkdtempSync(resolve(tmpdir(), 'olibana-media-'));
const result = build({ outDir });
const read = (relativePath: string): string => readFileSync(resolve(outDir, relativePath), 'utf8');

test.after(() => rmSync(outDir, { recursive: true, force: true }));

const valid: MediaAsset = {
  // A raster path: the contract refuses an SVG that claims to be a photograph,
  // and this fixture is the photograph case.
  src: '/media/example.jpg', alt: 'A description.', width: 800, height: 400, caption: null,
  // A photograph carries no disclosure: it has nothing to disclose. Everything
  // else must say what it is, and the contract enforces the asymmetry.
  provenance: 'ACTUAL_PHOTOGRAPH', disclosure: null,
};

// --- the contract refuses what it must -----------------------------------

test('an image with no alt text is refused, not silently given alt=""', () => {
  // The failure mode this prevents is quiet: `alt=""` ships, passes any scan
  // that only checks the attribute is present, and reaches a screen-reader
  // user as silence.
  assert.throws(() => assertMediaAsset({ ...valid, alt: '' }), MediaContractViolation);
  assert.throws(() => assertMediaAsset({ ...valid, alt: '   ' }), MediaContractViolation);
});

test('an image with no intrinsic dimensions is refused', () => {
  // Without them the page reflows around the image as it arrives, which is
  // the single largest source of CLS on a content site.
  for (const bad of [{ width: 0 }, { height: 0 }, { width: -1 }, { width: 800.5 }]) {
    assert.throws(() => assertMediaAsset({ ...valid, ...bad }), MediaContractViolation, JSON.stringify(bad));
  }
});

test('a relative image source is refused', () => {
  // Where it resolves would depend on the directory the page happens to sit
  // in — the same defect that put two dead .md links on published pages.
  assert.throws(() => assertMediaAsset({ ...valid, src: 'media/x.svg' }), MediaContractViolation);
  assert.throws(() => assertMediaAsset({ ...valid, src: './x.svg' }), MediaContractViolation);
});

test('CONTROL: a complete asset is accepted and rendered with everything it needs', () => {
  // Without this the checks above would also pass against a contract that
  // refuses everything.
  const html = renderFigure({ ...valid, caption: 'A caption.' });
  assert.match(html, /width="800"/);
  assert.match(html, /height="400"/);
  assert.match(html, /alt="A description\."/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /decoding="async"/);
  assert.match(html, /<figcaption>A caption\.<\/figcaption>/);
});

test('an above-the-fold image is not lazy-loaded', () => {
  // Lazy-loading the image a reader is already looking at delays the thing
  // they came for and can cost LCP.
  assert.match(renderFigure(valid, { lazy: false }), /loading="eager"/);
});

test('alt text and captions are escaped', () => {
  const html = renderFigure({ ...valid, alt: '"><script>x</script>', caption: '<b>c</b>' });
  assert.ok(!html.includes('<script>'), 'markup survived into an alt attribute');
  assert.ok(!html.includes('<b>'), 'markup survived into a caption');
});

// --- the specimen is generated, not drawn alongside the tokens -----------

test('the specimen shows the palette the site is actually served in', () => {
  // A hand-drawn SVG carrying the same hex values would be a second copy that
  // agrees today — the failure this repository has now hit with motion tokens,
  // with the search index, and with the router's own type scale.
  const svg = specimenSvg();
  for (const { step, value } of CONSTRUCTION_PALETTE) {
    assert.ok(svg.includes(value), `the specimen omits ${value}`);
    assert.ok(svg.includes(`${CONSTRUCTION_PREFIX}${step}`), `the specimen omits the ${step} label`);
    assert.ok(
      stylesheet.includes(`${CONSTRUCTION_PREFIX}${step}: ${value};`),
      `the specimen shows ${value} for ${step}, the stylesheet does not`,
    );
  }
  for (const { name } of TYPE_STEPS) {
    assert.ok(svg.includes(`--text-${name}`) || svg.includes(`>${name}<`), `the specimen omits type step ${name}`);
    assert.ok(stylesheet.includes(`--text-${name}:`), `the specimen shows a type step the system lacks: ${name}`);
  }
});

test('the specimen carries no baked ground, so it works in both light states', () => {
  // 05 §4 constraint 2 excludes media from the light-state swap. A white
  // rectangle behind the swatches would be a white rectangle on the dusk page.
  const svg = specimenSvg();
  assert.ok(!/<rect[^>]*x="0"[^>]*y="0"/.test(svg), 'the specimen paints a full-bleed background');

  // This test used to require `fill="currentColor"`, on the reasoning that an
  // SVG should follow the page's text colour. A dark-mode screenshot disproved
  // it: an <img>-loaded SVG is an independent document and inherits nothing, so
  // currentColor resolved to black on a #1A1A1A ground. The assertion was
  // wrong, not the code — it is inverted here and the property it was reaching
  // for is checked properly two tests below.
  assert.ok(!svg.includes('currentColor'), 'the specimen relies on a colour it cannot inherit');
});

test('the specimen is a real emitted file at the address the page requests', () => {
  assert.ok(result.files.includes(SPECIMEN_PATH.replace(/^\//, '')), 'the specimen was not emitted');
  const page = read('en/olibana/design-language/index.html');
  assert.ok(page.includes(`src="${SPECIMEN_PATH}"`), 'the page does not reference the specimen');
  assert.ok(page.includes(`width="${SPECIMEN_WIDTH}" height="${SPECIMEN_HEIGHT}"`), 'no intrinsic dimensions in the page');
  // The alt text says the thing that matters: these are construction values.
  assert.match(specimenAsset().alt, /construction palette/i);
});

test('a production build refuses the specimen, not only the stylesheet', () => {
  // The specimen DISPLAYS the construction palette. A guard that checked only
  // the stylesheet would have let the palette ship as a picture of itself.
  assert.throws(() => build({ outDir, production: true }), ProductionGuardError);
  assert.ok(
    specimenSvg().includes(CONSTRUCTION_PREFIX),
    'the specimen no longer carries the marker the production guard looks for',
  );
});

// --- what is deliberately absent -----------------------------------------

test('no page claims a photograph, because none exists', () => {
  // GATE-005. Recorded as a test rather than a note: the risk is not that
  // someone forgets to add photography, it is that someone adds a generated
  // or stock image of a garment that has never been made.
  const images = result.files
    .filter((f) => f.endsWith('.html'))
    .flatMap((f) => [...read(f).matchAll(/<img[^>]*src="([^"]*)"/g)].map((m) => m[1] as string));

  assert.deepEqual(
    [...new Set(images)], [SPECIMEN_PATH],
    'an image other than the design-system specimen is being served — if a real photograph now ' +
      'exists, record its provenance and update GATE-005; if it does not, this is a fabrication',
  );
});

test('every route that renders an image renders a complete one', () => {
  // The contract applied to what actually ships, not only to fixtures.
  for (const route of buildRoutes()) {
    for (const [, tag] of [...route.body.matchAll(/(<img[^>]*>)/g)]) {
      assert.match(tag as string, /alt="[^"]+"/, `${route.path} has an image with no alt text`);
      assert.match(tag as string, /width="\d+" height="\d+"/, `${route.path} has an image with no dimensions`);
    }
  }
});

// --- the specimen's own colours, which no page-level check can see --------

test('the specimen carries its own colours, because an <img> SVG inherits none', () => {
  // An SVG loaded through <img> is an independent document. `currentColor`
  // resolves to ITS default — black — in both light states, and the first
  // version used it: on the dusk page the labels rendered black on #1A1A1A.
  // Every automated check passed. The file loaded, and contrast measurement
  // does not look inside an image. A screenshot in dark mode found it.
  const svg = specimenSvg();
  assert.ok(!svg.includes('currentColor'), 'the specimen relies on a colour it cannot inherit');
  assert.match(svg, /@media \(prefers-color-scheme: dark\)/, 'the specimen has no dark variant');
});

test('the specimen text passes AA against BOTH grounds it is drawn on', () => {
  // 05 §4 constraint 3 — "All three states pass WCAG AA" — applied to the one
  // image on the site, which the page-level contrast sweep cannot reach.
  const daylight = contrastRatio(TEXT_ON_LIGHT, '#FFFFFF');
  const dusk = contrastRatio(TEXT_ON_DARK, '#1A1A1A');
  assert.ok(daylight >= 4.5, `specimen text is ${daylight}:1 on the daylight ground`);
  assert.ok(dusk >= 4.5, `specimen text is ${dusk}:1 on the dusk ground`);
});

test('every swatch stays visible against both grounds', () => {
  // Two of the six ARE a ground colour: #FFFFFF vanishes on daylight, #1A1A1A
  // vanishes on dusk. The hairline is what keeps the palette six swatches wide
  // in both states, so it must itself be visible against both.
  const svg = specimenSvg();
  const outlined = [...svg.matchAll(/<rect[^>]*fill="(#[0-9A-F]{6})"[^>]*stroke="(#[0-9A-F]{6})"/g)];
  assert.equal(outlined.length, CONSTRUCTION_PALETTE.length, 'not every swatch carries a hairline');

  for (const [, , stroke] of outlined) {
    for (const ground of ['#FFFFFF', '#1A1A1A']) {
      const ratio = contrastRatio(stroke as string, ground);
      assert.ok(ratio >= 3, `the swatch hairline is ${ratio}:1 against ${ground} — a swatch would disappear`);
    }
  }
});

test('the production guard is fed every artifact, not only the stylesheet', () => {
  // Found by a mutation that SURVIVED. Dropping the specimen from the guard's
  // input still threw, because the stylesheet also carries construction tokens
  // — an equivalent mutant today, and a hole the day the brand palette lands
  // and the stylesheet is cleaned. At that point the specimen becomes the only
  // artifact carrying them, and a stylesheet-only guard ships the palette as a
  // picture of itself.
  //
  // So the coupling is asserted directly rather than through the build's
  // outcome, which the stylesheet can satisfy on the specimen's behalf.
  const artifacts = productionArtifacts();
  assert.ok(SPECIMEN_PATH in artifacts, 'the specimen is not checked by the production guard');
  assert.ok('styles.css' in artifacts, 'the stylesheet is not checked by the production guard');

  for (const [name, source] of Object.entries(artifacts)) {
    assert.ok(
      findConstructionTokens(source).length > 0,
      `${name} carries no construction token — either it is clean (update this test and the ` +
        'gate) or the guard is now looking at the wrong thing',
    );
  }
});

// --- provenance: what an image IS ----------------------------------------
//
// The contract enforced alt text and intrinsic dimensions and was silent on the
// one property this brand's honesty rests on. An AI-generated garment render
// and a photograph of a finished coat were the same type, rendered by the same
// function, into the same markup — nothing in the system could tell them apart.

test('an image whose kind is unknown cannot be published', () => {
  for (const bogus of ['', 'PHOTO', 'photograph', 'RENDER', 'true']) {
    assert.throws(
      () => assertMediaAsset({ ...valid, provenance: bogus as never, disclosure: 'x' }),
      MediaContractViolation,
      `"${bogus}" was accepted as a kind of image`,
    );
  }
});

test('anything that is not a photograph must say so, and a photograph must not', () => {
  // The asymmetry is the whole mechanism. If a disclosure were merely optional,
  // the dangerous case would be the one you get by forgetting.
  for (const provenance of PROVENANCE) {
    if (provenance === REAL) continue;
    assert.throws(
      () => assertMediaAsset({ ...valid, provenance, disclosure: null }),
      MediaContractViolation,
      `${provenance} rendered with nothing telling the reader what it is`,
    );
    assert.throws(
      () => assertMediaAsset({ ...valid, provenance, disclosure: '   ' }),
      MediaContractViolation,
      `${provenance} passed with a blank disclosure`,
    );
    // And with one, it is accepted.
    assertMediaAsset({ ...valid, provenance, disclosure: 'Not a photograph.' });
  }

  assert.throws(
    () => assertMediaAsset({ ...valid, provenance: REAL, disclosure: 'Not a photograph.' }),
    MediaContractViolation,
    'a photograph was allowed to carry a disclosure, which makes the disclosure mean nothing',
  );
});

test('a vector drawing cannot claim to be a photograph', () => {
  // The one machine-checkable half of the claim. A mutation flipped this site's
  // only image — a generated specimen — to ACTUAL_PHOTOGRAPH, and the browser
  // check passed completely: a declared photograph is exempt from the
  // disclosure rule, so lying about the kind removed the evidence of the lie.
  assert.throws(
    () => assertMediaAsset({ ...valid, src: '/media/construction-specimen.svg', provenance: REAL, disclosure: null }),
    MediaContractViolation,
    'an SVG was accepted as a photograph',
  );
  // A raster file is accepted, which is the honest boundary: a generated PNG
  // labelled as a photograph is indistinguishable from a real one to every
  // check in this repository, and that is human review, not a gap being hidden.
  assertMediaAsset({ ...valid, src: '/media/coat.jpg', provenance: REAL, disclosure: null });
});

test('the disclosure is rendered where a reader can read it, not only where the type can', () => {
  const html = renderFigure({
    ...valid,
    provenance: 'AI_GENERATED',
    disclosure: 'Generated image. No such garment exists.',
    caption: 'A study.',
  });
  assert.match(html, /data-provenance="AI_GENERATED"/, 'the kind is not in the markup');
  assert.match(html, /<figcaption><strong class="provenance">Generated image\. No such garment exists\.<\/strong>/);
  // Leading the caption, not trailing it: a disclosure a reader reaches after
  // the description has already done its work is a footnote.
  assert.ok(
    html.indexOf('Generated image') < html.indexOf('A study.'),
    'the disclosure follows the caption instead of leading it',
  );
});

test('a caption is optional; a disclosure still produces one', () => {
  const html = renderFigure({
    ...valid, provenance: 'PLACEHOLDER', disclosure: 'Space held for an image that does not exist.',
    caption: null,
  });
  assert.match(html, /<figcaption>/, 'the disclosure was dropped with the caption');
  assert.match(html, /Space held for an image/);
});

test('THE ONE IMAGE THIS SITE PUBLISHES declares itself as not a photograph', () => {
  const page = read('en/olibana/design-language/index.html');
  assert.match(page, /data-provenance="DESIGN_REFERENCE"/, 'the specimen does not say what it is');
  assert.match(page, /<strong class="provenance">Not a photograph\.<\/strong>/);
});

test('GATE-005: no product page publishes an image of any kind', () => {
  // The gate is about photography, and the reason it stays shut is that no
  // garment exists. Until it opens, a product page renders NO image — not a
  // render, not a concept, not a generated study. Asserted on the built page
  // rather than on the renderer, because the renderer is not what ships.
  const outProduct = mkdtempSync(resolve(tmpdir(), 'olibana-gate005-'));
  try {
    const catalogPath = resolve(outProduct, 'catalog.jsonl');
    const catalog = new Catalog(new FileStorage(catalogPath));
    catalog.record({
      productId: 'PRD_g5', code: 'OLB-CT-001', name: 'Fixture Coat', category: 'CT',
      status: 'PUBLISHED', summary: 'A fixture.', variants: [variant('OLB-CT-001', 'STN', 'M', { amount: 68000, currency: 'JPY' })],
      measurements: [], naturalRule: null, materials: [], productionLeadDays: 60, actor: 'test',
    });
    const out = resolve(outProduct, 'site');
    build({ outDir: out, catalogPath });
    const page = readFileSync(resolve(out, 'en/products/olb-ct-001/index.html'), 'utf8');

    assert.ok(!/<img/.test(page), 'a product page published an image while GATE-005 is open');
    assert.match(page, /media-absent/, 'the reserved slot is gone');
    assert.match(page, /No photograph of Fixture Coat exists yet/);
  } finally {
    rmSync(outProduct, { recursive: true, force: true });
  }
});
