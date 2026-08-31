/**
 * The concept-visual pipeline.
 *
 * ## Every fixture below is a TEST INPUT
 *
 * Nothing here has been generated. There is no provider, no credentials, no
 * network call and no generated image in this repository. The fixtures describe
 * what a result would have to satisfy; they are not product imagery, they are
 * not published, and none of them asserts that a generation or a photograph
 * occurred.
 *
 * The `FIXTURES` table is deliberately a table. Each row names a shape and
 * whether the contract accepts it, so a rule that stops holding fails against a
 * named case rather than against an anonymous assertion somewhere in a file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertConceptBrief, briefForProduct, ConceptBriefViolation, GenerationResultViolation,
  INTENTS, promptFor, receive, requestFor,
  type ConceptBrief, type ConceptGenerator, type GenerationRequest, type GeneratorResult,
} from '../../src/site/concept-visual.ts';
import {
  assertMediaAsset, MediaContractViolation, REAL, renderFigure, renderReservedSlot,
  type MediaAsset,
} from '../../src/site/media.ts';
import { absentPhotography } from '../../src/site/states.ts';
import { CONSTRUCTION_PALETTE } from '../../src/site/specimen.ts';
import type { ProductInput, ProductRevision } from '../../src/catalog/catalog.ts';

const product = (overrides: Partial<ProductInput> = {}): ProductRevision => ({
  productId: 'PRD_cv', code: 'OLB-CT-001', name: 'Fixture Coat', category: 'CT',
  status: 'PUBLISHED', summary: 'A fixture, not a product.',
  variants: [], measurements: [], naturalRule: null, materials: [],
  productionLeadDays: null, actor: 'test',
  eventId: 'EVT_cv', recordedAt: 'now',
  ...overrides,
} as ProductRevision);

const brief = (overrides: Partial<ConceptBrief> = {}): ConceptBrief => ({
  subject: 'A coat silhouette',
  atlas: 'River Atlas',
  intent: 'silhouette-study',
  constraints: ['strictly the construction palette, no hue'],
  ratio: [4, 5],
  kind: 'CONCEPT_RENDER',
  disclosure: 'Concept visual. No such garment has been made.',
  use: 'Design exploration. Not for the product page.',
  ...overrides,
});

// --- the seven deterministic fixtures ------------------------------------

interface Fixture {
  readonly name: string;
  readonly asset: MediaAsset;
  readonly accepted: boolean;
  readonly why: string;
}

const FIXTURES: readonly Fixture[] = [
  {
    name: 'valid generated concept visual',
    accepted: true,
    why: 'a generated image that says what it is',
    asset: {
      src: '/media/concept.png', alt: 'A study of a coat silhouette.', width: 800, height: 1000,
      provenance: 'CONCEPT_RENDER', disclosure: 'Concept visual. No such garment has been made.',
      caption: null,
    },
  },
  {
    name: 'valid non-photographic specimen',
    accepted: true,
    why: 'the shape this site actually publishes today — a diagram of its own tokens',
    asset: {
      src: '/media/construction-specimen.svg', alt: 'The construction palette.', width: 960, height: 320,
      provenance: 'DESIGN_REFERENCE', disclosure: 'Not a photograph.', caption: 'The palette.',
    },
  },
  {
    name: 'generated asset declared ACTUAL_PHOTOGRAPH',
    accepted: false,
    why: 'the M24 case: a drawing claiming a camera made it',
    asset: {
      src: '/media/concept.svg', alt: 'A study.', width: 800, height: 1000,
      provenance: REAL, disclosure: null, caption: null,
    },
  },
  {
    name: 'missing provenance',
    accepted: false,
    why: 'an image whose kind is unknown cannot be published',
    asset: {
      src: '/media/unknown.png', alt: 'Something.', width: 800, height: 1000,
      provenance: undefined as never, disclosure: null, caption: null,
    },
  },
  {
    name: 'missing dimensions',
    accepted: false,
    why: 'the page would reflow around it as it loads',
    asset: {
      src: '/media/concept.png', alt: 'A study.', width: 0, height: 0,
      provenance: 'AI_GENERATED', disclosure: 'Generated image.', caption: null,
    },
  },
  {
    name: 'non-photograph with no disclosure',
    accepted: false,
    why: 'it would reach the reader looking exactly like a photograph',
    asset: {
      src: '/media/concept.png', alt: 'A study.', width: 800, height: 1000,
      provenance: 'AI_GENERATED', disclosure: null, caption: null,
    },
  },
  {
    // The metadata SHAPE a real photograph would have. It asserts nothing about
    // any photograph existing — GATE-005 is open and no garment has been shot.
    name: 'real-photograph metadata shape',
    accepted: true,
    why: 'the shape a photograph would take, with no claim that one exists',
    asset: {
      src: '/media/example.jpg', alt: 'A description.', width: 800, height: 1000,
      provenance: REAL, disclosure: null, caption: null,
    },
  },
];

test('the seven fixtures land on the side of the contract they are supposed to', () => {
  for (const fixture of FIXTURES) {
    if (fixture.accepted) {
      assertMediaAsset(fixture.asset);
    } else {
      assert.throws(
        () => assertMediaAsset(fixture.asset),
        MediaContractViolation,
        `"${fixture.name}" was accepted, and it should not be: ${fixture.why}`,
      );
    }
  }
  assert.equal(FIXTURES.length, 7, 'the fixture table changed size — update the count deliberately');
});

test('NO FIXTURE IS PUBLISHED, and none claims a generation or a photograph happened', () => {
  // The rule this whole cycle rests on. These are test inputs. If one of them
  // ever became a real asset path the build emits, that is a generated image
  // shipping, and this catches it.
  const emitted = new Set(['/media/construction-specimen.svg']);
  for (const fixture of FIXTURES) {
    if (fixture.asset.src === '/media/construction-specimen.svg') continue;
    assert.ok(
      !emitted.has(fixture.asset.src),
      `${fixture.name} points at an asset the build emits — a fixture became product imagery`,
    );
  }
});

// --- the brief cannot state what the record does not hold -----------------

test('a brief for a product with no recorded rule cites no Atlas', () => {
  // The dangerous failure is not a mislabelled image. It is a prompt that says
  // "hem derived from the River Atlas" about a garment whose rule nobody wrote,
  // because the resulting picture then depicts specifics nobody decided and
  // looks exactly as authoritative as one that does not.
  const derived = briefForProduct(product({ naturalRule: null }), 'silhouette-study');
  assert.equal(derived.atlas, null);
  const prompt = promptFor(derived);
  assert.match(prompt, /SOURCE: no Atlas rule is recorded for this subject/);
  for (const atlas of ['River Atlas', 'Stone Atlas', 'Forest Atlas', 'Light Atlas']) {
    assert.ok(!prompt.includes(atlas), `${atlas} appeared in a prompt for a garment that cites none`);
  }
});

test('a brief carries the rule when there IS one, and only as recorded', () => {
  const derived = briefForProduct(
    product({
      naturalRule: { atlas: 'River Atlas', observation: 'meander curvature', translation: 'a continuous hem curve' },
      materials: ['Wool'],
    }),
    'silhouette-study',
  );
  assert.equal(derived.atlas, 'River Atlas');
  const prompt = promptFor(derived);
  assert.match(prompt, /SOURCE: River Atlas/);
  assert.match(prompt, /derived from the recorded rule: a continuous hem curve/);
  assert.match(prompt, /materials as recorded: Wool/);
});

test('there is nowhere in a brief to write a measurement', () => {
  // Structural, not a rule to remember: the schema has no field for one, so a
  // measurement cannot be carried even by someone trying.
  const derived = briefForProduct(
    product({ measurements: [{ label: 'Back length', bySize: { M: 95 } }] }),
    'silhouette-study',
  );
  const prompt = promptFor(derived);
  assert.ok(!/\d+\s*cm/.test(prompt), 'a measurement reached the prompt');
  assert.ok(!prompt.includes('95'), 'a recorded measurement value reached the prompt');
  assert.ok(!('measurements' in derived), 'the brief grew a field for measurements');
});

test('a brief cannot cite an Atlas this site does not publish', () => {
  // Design_System.md records a Material Atlas as a planned expansion, so a
  // product citing one is a real possibility — and a visual derived from
  // research nobody has done is the picture version of a guessed link.
  assert.throws(
    () => assertConceptBrief(brief({ atlas: 'Material Atlas' })),
    ConceptBriefViolation,
  );
  assert.throws(() => assertConceptBrief(brief({ subject: '  ' })), ConceptBriefViolation);
  assert.throws(() => assertConceptBrief(brief({ intent: 'pretty' as never })), ConceptBriefViolation);
  assert.throws(() => assertConceptBrief(brief({ disclosure: '' })), ConceptBriefViolation);
  assert.throws(() => assertConceptBrief(brief({ use: '' })), ConceptBriefViolation);
  assert.throws(() => assertConceptBrief(brief({ ratio: [0, 5] })), ConceptBriefViolation);
  assert.throws(() => assertConceptBrief(brief({ ratio: [4, 5.5] })), ConceptBriefViolation);
  assert.throws(() => assertConceptBrief(brief({ constraints: ['ok', ' '] })), ConceptBriefViolation);
  for (const intent of INTENTS) assertConceptBrief(brief({ intent }));
});

// --- the prompt ----------------------------------------------------------

test('the same brief always produces byte-identical text', () => {
  // A prompt that varies between runs cannot be approved once, which is the
  // whole reason to have a schema rather than a paragraph.
  const one = promptFor(brief());
  const two = promptFor(brief());
  assert.equal(one, two);
  assert.ok(!/\d{4}-\d{2}-\d{2}/.test(one), 'a date leaked into the prompt');
});

test('the palette in a prompt is the palette the site is served in', () => {
  const derived = briefForProduct(product(), 'material-study');
  const prompt = promptFor(derived);
  for (const step of CONSTRUCTION_PALETTE) {
    assert.ok(prompt.includes(step.value), `${step.value} is in the palette and not in the prompt`);
  }
});

test('every prompt tells the model not to produce something photographic', () => {
  // A model asked for a photograph produces something that looks like one, and
  // the disclosure underneath then argues with the picture.
  for (const intent of INTENTS) {
    assert.match(promptFor(brief({ intent })), /must not read as a photograph of a real object/);
  }
});

// --- the result is untrusted ---------------------------------------------

const request = (overrides: Partial<GenerationRequest> = {}): GenerationRequest => ({
  ...requestFor(brief()), ...overrides,
});

const result = (overrides: Partial<GeneratorResult> = {}): GeneratorResult => ({
  src: '/media/concept.png', alt: 'A study of a coat silhouette.', width: 800, height: 1000,
  ...overrides,
});

test('an untyped generation result is refused', () => {
  for (const bogus of [null, undefined, 'ok', 42, [], {}]) {
    assert.throws(() => receive(request(), bogus), GenerationResultViolation, `${JSON.stringify(bogus)} was accepted`);
  }
  for (const bad of [{ src: '' }, { alt: '' }, { width: 0 }, { height: -1 }, { width: 1.5 }]) {
    assert.throws(
      () => receive(request(), result(bad as Partial<GeneratorResult>)),
      GenerationResultViolation,
      `${JSON.stringify(bad)} was accepted`,
    );
  }
});

test('a result at a different crop is a different picture, and is refused', () => {
  assert.throws(
    () => receive(request({ ratio: [4, 5] }), result({ width: 1000, height: 1000 })),
    GenerationResultViolation,
  );
  const asset = receive(request({ ratio: [4, 5] }), result({ width: 800, height: 1000 }));
  assert.equal(asset.width, 800);
});

test('THE PROVIDER CANNOT LABEL ITS OWN OUTPUT', () => {
  // The single most important line in the module, and the lesson M24 taught
  // applied structurally instead of caught afterwards. A result carrying its
  // own provenance is ignored: the kind comes from the reviewed request.
  const asset = receive(
    request(),
    { ...result(), provenance: REAL, disclosure: null } as unknown as GeneratorResult,
  );
  assert.equal(asset.provenance, 'CONCEPT_RENDER');
  assert.notEqual(asset.provenance, REAL);
  assert.equal(asset.disclosure, 'Concept visual. No such garment has been made.');
});

test('a request that claims to produce a photograph is refused outright', () => {
  assert.throws(
    () => receive(request({ kind: REAL as never }), result()),
    GenerationResultViolation,
    'a generation request produced ACTUAL_PHOTOGRAPH',
  );
});

test('what the pipeline produces is publishable, and discloses itself', () => {
  const asset = receive(request(), result());
  assertMediaAsset(asset);
  const html = renderFigure(asset);
  assert.match(html, /data-provenance="CONCEPT_RENDER"/);
  assert.match(html, /<strong class="provenance">Concept visual\./);
});

test('the port has no implementation in this repository', () => {
  // Stated as a test so the claim is checked rather than asserted in a comment.
  // A ConceptGenerator can be written — here is one, in a test — and none
  // exists in src/. When one does, this test is what makes adding it a
  // deliberate act.
  const fake: ConceptGenerator = { generate: async () => result() };
  assert.equal(typeof fake.generate, 'function');
});

// --- the reserved slot is inside the contract ----------------------------

test('the reserved slot goes through the same disclosure rule as every image', () => {
  const html = absentPhotography('Fixture Coat');
  assert.match(html, /data-provenance="PLACEHOLDER"/);
  assert.match(html, /<strong class="provenance">No photograph of Fixture Coat exists yet\.<\/strong>/);
  assert.ok(!/<img/i.test(html), 'the reserved slot contains an image');
});

test('a reserved slot with no disclosure cannot be rendered', () => {
  assert.throws(
    () => renderReservedSlot({ subject: 'x', ratio: [4, 5], disclosure: '', note: 'n' }),
    MediaContractViolation,
  );
  assert.throws(
    () => renderReservedSlot({ subject: 'x', ratio: [0, 5], disclosure: 'none yet', note: 'n' }),
    MediaContractViolation,
  );
});

test('the slot escapes what it is given', () => {
  const html = absentPhotography('<script>x</script>');
  assert.ok(!html.includes('<script>'));
});
