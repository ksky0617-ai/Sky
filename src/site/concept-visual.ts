/**
 * The concept-visual pipeline.
 *
 * ## What this is for, and what it is not for
 *
 * No garment has been made, so no garment has been photographed (GATE-005).
 * That is a fact about the world and no amount of code changes it. What code
 * CAN do is make the difference between a photograph and a generated image
 * impossible to lose — and that is this module's whole purpose.
 *
 * A concept visual depicts an INTENTION. A photograph depicts an OBJECT. The
 * media contract already refuses to publish an image that will not say which it
 * is; this module makes the generated side structurally incapable of claiming
 * the other one. `GeneratedKind` excludes `ACTUAL_PHOTOGRAPH` at the type
 * level, `receive()` re-checks it at runtime, and no path through here can
 * produce an asset that says a model held a camera.
 *
 * ## Nothing has been generated
 *
 * There is no provider adapter, no credentials, no network call, and no
 * generated image anywhere in this repository. `ConceptGenerator` is a port
 * with no implementation on purpose: the contract, the schema and the
 * validation are the parts that can be built and verified without a provider,
 * and building them now is what stops the first real generation being wired up
 * by someone in a hurry with no rules in place.
 *
 * Every fixture in the test suite is a TEST INPUT. None of it is product
 * imagery, none of it is published, and no generation call has been made.
 *
 * ## A brief cannot state a fact the record does not hold
 *
 * The dangerous failure here is not a mislabelled image. It is a prompt that
 * says "a wool coat with a hem derived from the River Atlas, 95cm back length"
 * about a garment with no recorded rule and no measurements — because the
 * resulting picture then depicts specifics nobody decided, and it looks exactly
 * as authoritative as one that does not. So `briefForProduct` DERIVES the brief
 * from recorded fields only: a product with `naturalRule: null` produces a
 * brief that cites no Atlas, and there is no field anywhere in this module in
 * which a measurement could be written.
 */

import { ATLASES, atlasByTitle } from './atlases.ts';
import { assertMediaAsset, REAL, type MediaAsset, type Provenance } from './media.ts';
import { CONSTRUCTION_PALETTE } from './specimen.ts';
import type { ProductRevision } from '../catalog/catalog.ts';

/**
 * What a generator is permitted to return.
 *
 * `ACTUAL_PHOTOGRAPH` is excluded here rather than checked for later. A model
 * did not hold a camera, and the type says so, so the mistake is not available
 * to make. The runtime check in `receive` exists for values that arrive from
 * outside TypeScript, not because this is advisory.
 */
export type GeneratedKind = Exclude<Provenance, 'ACTUAL_PHOTOGRAPH' | 'DESIGN_REFERENCE' | 'PLACEHOLDER'>;

/** Why a concept visual is being made. Governs what the prompt may say. */
export const INTENTS = [
  'silhouette-study',
  'material-study',
  'atlas-visual',
  'editorial',
  'motion-reference',
] as const;

export type Intent = (typeof INTENTS)[number];

export class ConceptBriefViolation extends Error {}

/**
 * A concept brief — the only thing this pipeline accepts.
 *
 * Deliberately absent: any field in which a measurement, a price, a
 * construction detail or a production process could be written. A schema with
 * no place to put an invented fact cannot carry one.
 */
export interface ConceptBrief {
  /** What the visual is of, in the site's own words. */
  readonly subject: string;
  /** An Atlas this site publishes, or null. Never a title that does not exist. */
  readonly atlas: string | null;
  readonly intent: Intent;
  /** Visual constraints, drawn from the design system rather than described freely. */
  readonly constraints: readonly string[];
  /** Aspect ratio as [width, height], both positive integers. */
  readonly ratio: readonly [number, number];
  readonly kind: GeneratedKind;
  /** The sentence the reader will see. Carried from here to the asset unchanged. */
  readonly disclosure: string;
  /** Where the result is intended to appear, for review. */
  readonly use: string;
}

/**
 * The construction palette, as a prompt constraint.
 *
 * Read from the palette the site is served in rather than described, for the
 * same reason the Design Language page reads its tokens: a prompt saying
 * "muted greys" would be a second, softer copy of a palette that is exact.
 */
function paletteConstraint(): string {
  return `strictly the construction palette, no hue: ${CONSTRUCTION_PALETTE.map((s) => s.value).join(', ')}`;
}

export function assertConceptBrief(brief: ConceptBrief): void {
  if (brief.subject.trim() === '') {
    throw new ConceptBriefViolation('a brief with no subject describes nothing');
  }
  if (!(INTENTS as readonly string[]).includes(brief.intent)) {
    throw new ConceptBriefViolation(
      `"${brief.intent}" is not one of ${INTENTS.join(', ')} — an image with no stated purpose ` +
        'cannot be reviewed against one',
    );
  }
  // The same rule the product page's rule block follows: a title this site does
  // not publish produces nothing, rather than a plausible invention. A brief
  // citing a Material Atlas would generate a picture derived from research that
  // has never been done.
  if (brief.atlas !== null && atlasByTitle(brief.atlas) === null) {
    throw new ConceptBriefViolation(
      `"${brief.atlas}" is not an Atlas this site publishes (${ATLASES.map((a) => a.title).join(', ')}) — ` +
        'a visual cannot be derived from research that does not exist',
    );
  }
  const [w, h] = brief.ratio;
  if (!Number.isInteger(w) || !Number.isInteger(h) || w <= 0 || h <= 0) {
    throw new ConceptBriefViolation(`ratio ${w}:${h} is not a positive integer ratio`);
  }
  if (brief.disclosure.trim() === '') {
    throw new ConceptBriefViolation(
      'a generated visual with no disclosure cannot be published, so it cannot be requested either',
    );
  }
  if (brief.use.trim() === '') {
    throw new ConceptBriefViolation('a brief with no stated use cannot be reviewed');
  }
  if (brief.constraints.some((constraint) => constraint.trim() === '')) {
    throw new ConceptBriefViolation('an empty constraint is a constraint nobody wrote');
  }
}

/**
 * A brief for a recorded product, built from what the record actually holds.
 *
 * This is the function that makes "do not encode nonexistent garment facts"
 * structural rather than a rule to remember. It reads `naturalRule` and
 * `materials` off the revision and writes nothing else: a product with no
 * recorded rule produces a brief that cites no Atlas, and a product with no
 * recorded materials produces a brief that names none.
 *
 * It cannot state a measurement because `ConceptBrief` has nowhere to put one.
 */
export function briefForProduct(
  product: ProductRevision,
  intent: Intent,
  ratio: readonly [number, number] = [4, 5],
): ConceptBrief {
  const rule = product.naturalRule;
  const constraints = [
    paletteConstraint(),
    // Only what the record holds. `materials` is free text written for a spec
    // sheet, so it is quoted as recorded rather than interpreted.
    ...(product.materials.length > 0 ? [`materials as recorded: ${product.materials.join(', ')}`] : []),
    ...(rule === null ? [] : [`derived from the recorded rule: ${rule.translation}`]),
    'no fabricated construction detail, no depicted production process',
  ];

  const brief: ConceptBrief = {
    subject: product.name,
    atlas: rule === null ? null : rule.atlas,
    intent,
    constraints,
    ratio,
    kind: 'CONCEPT_RENDER',
    disclosure: `Concept visual. No such garment has been made, and this is not a photograph of ${product.name}.`,
    use: `Design exploration for ${product.code}. Not for the product page while GATE-005 is open.`,
  };
  assertConceptBrief(brief);
  return brief;
}

/** A generation request. Deterministic: the same brief always produces this. */
export interface GenerationRequest {
  readonly prompt: string;
  readonly ratio: readonly [number, number];
  readonly kind: GeneratedKind;
  readonly disclosure: string;
  readonly subject: string;
}

/**
 * The prompt, assembled in a fixed order from the brief.
 *
 * Deterministic by construction — no date, no random seed, no set iteration,
 * no environment. The same brief produces byte-identical text, which is what
 * makes a prompt reviewable at all: a prompt that varies between runs cannot be
 * approved once.
 */
export function promptFor(brief: ConceptBrief): string {
  assertConceptBrief(brief);
  const lines = [
    `SUBJECT: ${brief.subject}`,
    `INTENT: ${brief.intent}`,
    `SOURCE: ${brief.atlas === null ? 'no Atlas rule is recorded for this subject' : brief.atlas}`,
    `RATIO: ${brief.ratio[0]}:${brief.ratio[1]}`,
    ...brief.constraints.map((constraint) => `CONSTRAINT: ${constraint}`),
    // Carried into the prompt as well as onto the page. A model asked for a
    // photograph produces something that looks like one, and the disclosure
    // underneath then argues with the picture.
    'CONSTRAINT: not photographic; this must not read as a photograph of a real object',
    `DISCLOSURE: ${brief.disclosure}`,
    `USE: ${brief.use}`,
  ];
  return lines.join('\n');
}

export function requestFor(brief: ConceptBrief): GenerationRequest {
  assertConceptBrief(brief);
  return {
    prompt: promptFor(brief),
    ratio: brief.ratio,
    kind: brief.kind,
    disclosure: brief.disclosure,
    subject: brief.subject,
  };
}

/** What a provider returns. Deliberately minimal: nothing here is trusted. */
export interface GeneratorResult {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
}

/**
 * The port. No implementation exists in this repository.
 *
 * Not an oversight and not a stub waiting to be filled in by whoever gets
 * there first: a provider needs credentials, and credentials are an external
 * dependency. What can be built without one is the contract that the result has
 * to satisfy, and it is built.
 */
export interface ConceptGenerator {
  generate(request: GenerationRequest): Promise<GeneratorResult>;
}

export class GenerationResultViolation extends Error {}

/**
 * Turns a provider's answer into a publishable asset, or refuses.
 *
 * The result is UNTRUSTED input. It arrives from outside this program, from a
 * system with no interest in this brand's rules, and it is validated like any
 * other external payload: shape, types, and then the media contract itself.
 *
 * The provenance is taken from the REQUEST, never from the result. A provider
 * cannot label its own output, which is the single most important line in this
 * module — it is the mutation M24 taught, applied structurally instead of
 * caught afterwards.
 */
export function receive(request: GenerationRequest, result: unknown): MediaAsset {
  if (typeof result !== 'object' || result === null) {
    throw new GenerationResultViolation('the generator returned no object');
  }
  const candidate = result as Partial<GeneratorResult>;
  for (const field of ['src', 'alt'] as const) {
    if (typeof candidate[field] !== 'string' || candidate[field].trim() === '') {
      throw new GenerationResultViolation(`the generator returned no ${field}`);
    }
  }
  for (const field of ['width', 'height'] as const) {
    if (!Number.isInteger(candidate[field]) || (candidate[field] as number) <= 0) {
      throw new GenerationResultViolation(
        `the generator returned ${field}=${String(candidate[field])}, which is not a positive integer`,
      );
    }
  }

  // A generator that returns a different crop returned something other than
  // what was reviewed. The ratio is the one dimension of the request a picture
  // can silently disagree with while still looking correct.
  const [rw, rh] = request.ratio;
  const returned = (candidate.width as number) / (candidate.height as number);
  if (Math.abs(returned - rw / rh) > 0.01) {
    throw new GenerationResultViolation(
      `the generator returned ${candidate.width}x${candidate.height}, which is not the ${rw}:${rh} ` +
        'that was requested — the image reviewed and the image returned are different pictures',
    );
  }

  // Defensive, and deliberately not reachable through the type. A request whose
  // kind was tampered with between review and receipt is exactly the path M24
  // proved is invisible once an asset claims to be a photograph.
  if ((request.kind as Provenance) === REAL) {
    throw new GenerationResultViolation(
      'a generation request claims to produce a photograph — a model did not hold a camera, ' +
        'and no path through this module may produce ACTUAL_PHOTOGRAPH',
    );
  }

  const asset: MediaAsset = {
    src: candidate.src as string,
    alt: candidate.alt as string,
    width: candidate.width as number,
    height: candidate.height as number,
    provenance: request.kind,
    disclosure: request.disclosure,
    caption: null,
  };
  assertMediaAsset(asset);
  return asset;
}
