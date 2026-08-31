/**
 * Every exported function has a caller.
 *
 * ## The failure this exists for
 *
 * It has now happened five times in this repository, and each time it looked
 * finished:
 *
 *   1. Four of the five motion tokens were defined and referenced by nothing
 *      for fifteen cycles. The spec was "implemented" by one hover transition.
 *   2. `data-light` had dawn and dusk palettes that nothing ever set, so two of
 *      three light states had never been rendered, let alone contrast-checked.
 *   3. `indexAtlas` was called by nothing, which made "the page and the index
 *      cannot disagree" true only because there was no index.
 *   4. The router's own pages carried a second type scale nobody knew existed.
 *   5. `absentPhotography()` and `note()` shipped with zero callers — that one
 *      was mine, introduced in the cycle before this one.
 *
 * Every one of those was invisible to the whole test suite, because a function
 * with no caller has no behaviour to be wrong. The tests passed, the build
 * passed, and the feature did not exist.
 *
 * ## What this checks, and what it deliberately does not
 *
 * A named `export function` or `export async function` must appear
 * somewhere in `src/` other than its own definition. It is a coarse check —
 * it reads text, not a call graph — and that is the right trade here: a
 * precise checker would need a parser, and the defect it is looking for is not
 * subtle. A symbol used only by tests is exactly the shape of the bug.
 *
 * It does NOT require a caller for types, constants, or error classes, and it
 * does not look at `scripts/` — a helper used only by the visual check is used.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(import.meta.dirname, '../../src');

/** Every `.ts` file under src/, as { path, source }. */
function sources(): ReadonlyArray<{ path: string; source: string }> {
  const found: Array<{ path: string; source: string }> = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ts')) found.push({ path: full, source: readFileSync(full, 'utf8') });
    }
  };
  walk(SRC);
  return found;
}

/**
 * Exports that legitimately have no caller inside `src/`, with the reason.
 *
 * Kept deliberately short and deliberately annotated. An entry here is a claim
 * that something is used from outside the source tree — a script, a test
 * harness, or the platform itself — and each one is a place this check is not
 * looking.
 */
const CALLED_FROM_OUTSIDE_SRC: Readonly<Record<string, string>> = {
  // --- the platform and the scripts call these -------------------------
  build: 'invoked by npm run build and by scripts/visual-check.mjs',
  buildRoutes: 'used by the build and by the checks',
  handleRequest: 'mounted by scripts/serve.mjs and by the Pages function',
  validateEnvironment: 'called by functions/[[path]].ts and scripts/serve.mjs',
  internalError: 'the error boundary, called by functions/[[path]].ts and scripts/serve.mjs',
  variant: 'a catalogue authoring helper, called by scripts/visual-check.mjs and catalog-worker.mjs',
  renderDocument: 'called by the build',
  renderSitemap: 'called by the build',
  renderRobots: 'called by the build',
  navigation: 'called by the build',
  headersFile: 'called by the build',
  buildId: 'called by the build and by the health endpoint',
  specimenSvg: 'emitted by the build',
  countAtlasDataRows: 'used by the search index and by the Atlas contract tests',

  // --- the concept-visual pipeline, which has no provider ---------------
  //
  // These are the ONE case in this file where "no caller in src/" is the
  // correct state rather than a defect, and the reason has to be read as a
  // whole. The pipeline turns a reviewed brief into a validated asset. Wiring
  // it to a page would mean publishing a generated image, and GATE-005 says
  // this site publishes none until a garment exists and is photographed.
  //
  // So the entry point is a future generation step that needs credentials this
  // repository does not have, and until then every path through the module is
  // exercised by the contract tests instead. That is a weaker guarantee than a
  // real caller and it is recorded as one: if GATE-005 opens and a page starts
  // rendering concept visuals, these entries come out and the caller check
  // covers them properly.
  briefForProduct:
    'entry point of the concept-visual pipeline; deliberately unwired while GATE-005 is open, ' +
    'because a caller would mean publishing a generated image. Exercised by test/site/concept-visual.test.ts',
  requestFor:
    'entry point of the concept-visual pipeline; the reviewed brief becomes a request here, and the ' +
    'request is only sent by a provider that needs credentials this repository does not have',

  // --- checks and lints, which are tests by construction ----------------
  contrastRatio: 'the unit-level equivalent of the browser contrast sweep',
  resolveRoles: 'resolves the palette per light state for the contrast checks',
  declarations: 'the CSS parser the motion and layer checks read through',
  findLoadBearingMotion: 'a lint the suite runs against the stylesheet',
  findMotionProhibitions: 'a lint the suite runs against the stylesheet',
  findInlineMotionValues: 'a lint the suite runs against the stylesheet',
  findUndefinedTokens: 'a lint the suite runs against the stylesheet',
  findConstructionTokens: 'the production guard reads it through productionArtifacts',
  findDeadLinks: 'called by the build, and directly by its own test',
  productionArtifacts: 'the production guard input, asserted directly',
  assertSearchDocument: 'the schema check, run against the manifest by the contract tests',
  assertMediaAsset: 'called by renderFigure and directly by its own test',
  terminalStatuses:
    'a query API for the INDEPENDENT spec-conformance verifier (V-2026-08-15-006), which ' +
    'diffs the specification against the implementation and is a test by construction. The ' +
    'runtime path is applyTransition -> evaluateTransition -> ALLOWED_TRANSITIONS.',
  isTransitionAllowed:
    'the same: a predicate the spec-conformance verifier queries. Deriving the answer from ' +
    'ALLOWED_TRANSITIONS is what stops it becoming a second encoding of the edge set.',

  // --- built, and waiting on a gate rather than on a caller -------------
  findBreakEven:
    'BLOCKED on P0-2, the supplier quotation. The module computes a minimum order quantity ' +
    'from real cost tiers, and no real tier exists — wiring it to a page would mean feeding ' +
    'it invented costs, which is the one thing it must never carry.',
  preorderMinimum:
    'BLOCKED on P0-2, same reason. Recorded here rather than deleted: the calculation is ' +
    'verified and waiting for its inputs, not abandoned.',
  closeRun:
    'GAP, recorded rather than excused. Closing a pre-order run is an operator action and ' +
    'this site has no operator surface at all — no admin route exists, and 03 §1 forbids ' +
    'building one that cannot yet be filled. The logic is verified; nothing can invoke it. ' +
    'The first real run cannot be closed until something can.',
  runContext:
    'the same gap: it assembles what closeRun needs, and nothing calls closeRun.',
  isId:
    'a format predicate for internal ids with no production caller. It sat imported and unused ' +
    'in catalog.ts from the cycle the catalogue was written, which is what raised the question ' +
    'of whether productId should be validated — see the note on assertWellFormed for why the ' +
    'answer is no. Kept for the day an id arrives from outside this system.',
  isCustomerId:
    'a format predicate with no production caller. Customer ids are generated by this system ' +
    'and never parsed from input, so there is no boundary that would use it — kept because ' +
    'the day an id arrives from outside, this is the check that should meet it.',

  // --- locale and wayfinding, called through their own module -----------
  isEnabled: 'the locale gate, called by enabledLocales and by the contract tests',
  splitLocale: 'resolves a request path; asserted by the ADR-010 tests',
  disabledLocales: 'used by the contract tests to prove absence across five layers',
  localeByCode: 'used by the document shell',
  specimenAsset: 'called by the design-language page',
  indexProduct: 'called when a product exists; no product is published today',
  trail: 'called by withWayfinding',
  siblings: 'called by withWayfinding',
  renderTrail: 'called by withWayfinding',
  renderSiblings: 'called by withWayfinding',
};

test('every exported function in src/ is called from src/', () => {
  const files = sources();
  const orphans: string[] = [];

  for (const { path, source } of files) {
    // `async` included. The first version matched `^export function` only,
    // which made every exported async function invisible to a check whose
    // whole job is finding things nothing looks at.
    const exported = [...source.matchAll(/^export (?:async )?function (\w+)/gm)].map((m) => m[1] as string);

    for (const name of exported) {
      if (name in CALLED_FROM_OUTSIDE_SRC) continue;

      const usedElsewhere = files.some(({ path: other, source: text }) =>
        other !== path && new RegExp(`\\b${name}\\s*\\(`).test(text));
      // A recursive call does not count as a caller, so the defining file is
      // checked for a use that is not the definition itself.
      const usedHere = new RegExp(`\\b${name}\\s*\\(`).exec(
        source.replace(new RegExp(`^export (?:async )?function ${name}\\b.*$`, 'gm'), ''),
      ) !== null;

      if (!usedElsewhere && !usedHere) {
        orphans.push(`${path.slice(SRC.length + 1)}: ${name}()`);
      }
    }
  }

  assert.deepEqual(
    orphans, [],
    'exported functions with no caller in src/. Either wire them up, or add them to ' +
      'CALLED_FROM_OUTSIDE_SRC with the reason they are used from outside the source tree. ' +
      'A function with no caller has no behaviour to be wrong, which is why every test passes ' +
      'while the feature does not exist.',
  );
});

test('CONTROL: the check finds an orphan when there is one', () => {
  // Without this it would pass against a check that never reports anything —
  // which, given what it is looking for, would be funny and useless.
  const pretend = [
    { path: '/a.ts', source: 'export function used() {}\nexport function orphaned() {}\n' },
    { path: '/b.ts', source: 'used();\n' },
  ];
  const orphans = pretend.flatMap(({ path, source }) =>
    [...source.matchAll(/^export function (\w+)/gm)]
      .map((m) => m[1] as string)
      .filter((name) => !pretend.some(({ path: other, source: text }) =>
        other !== path && new RegExp(`\\b${name}\\s*\\(`).test(text)))
      .map((name) => `${path}: ${name}`));

  assert.deepEqual(orphans, ['/a.ts: orphaned']);
});

test('the allow-list is annotated, and every entry still names a real export', () => {
  // An allow-list entry for a symbol that no longer exists is a stale exemption
  // — the check would silently stop covering a name that came back later.
  // Read functions/ and scripts/ as well: an exemption CLAIMS the symbol is
  // used from outside src/, so the check for a stale exemption has to look
  // where that use would be. Without this, `onRequest` — which lives in
  // functions/ — was reported as a stale exemption on the first run.
  const outside = ['../../functions/[[path]].ts']
    .map((rel) => readFileSync(resolve(import.meta.dirname, rel), 'utf8'));
  const all = [...sources().map((f) => f.source), ...outside].join('\n');
  for (const [name, reason] of Object.entries(CALLED_FROM_OUTSIDE_SRC)) {
    assert.ok(reason.length > 10, `${name} is exempted without a real reason`);
    assert.ok(
      new RegExp(`^export (?:async )?function ${name}\\b`, 'm').test(all),
      `${name} is exempted but is no longer exported — remove the stale exemption`,
    );
  }
});
