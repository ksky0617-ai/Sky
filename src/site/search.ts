/**
 * The search index schema — 03_INFORMATION_ARCHITECTURE.md §7.
 *
 * §7 does not ask for search. It says the opposite: "Not built in MVP-0
 * (nothing to search). **Designed now so the index is not retrofitted.**" §8's
 * acceptance criterion is "Search schema defined before search is built", and
 * the reason is in §7's own justification:
 *
 *   > `naturalRule` and `atlasSource` are indexed from the start because
 *   > Olibana's search should answer *"which garments come from stone?"* — a
 *   > question no other fashion retailer's search can answer.
 *
 * That question is answerable only if the link between a garment and the Atlas
 * it came from is recorded at the moment the garment is recorded. Adding the
 * field later means going back to every product and asking someone to remember.
 * So the schema exists now, entries are built from what the system already
 * holds, and search itself waits for something to search.
 *
 * ## Every unknown stays unknown
 *
 * `naturalRule`, `atlasSource`, `colour` and `material` are `null` wherever the
 * system does not hold them. They are NOT filled with a plausible value, and
 * they are not omitted either — an absent field and a field known to be empty
 * are different facts, and the whole premise of this brand is that a form comes
 * from a measured natural rule. Inventing one in a search index is inventing
 * one.
 */

import { countAtlasDataRows } from './routes.ts';
import type { ProductRevision } from '../catalog/catalog.ts';

/** §7: the entity types the index holds. */
export const SEARCH_TYPES = [
  'product',
  'collection',
  'article',
  'material',
  'atlas-entry',
  'page',
] as const;

export type SearchType = (typeof SEARCH_TYPES)[number];

/**
 * One indexed entity. §7 names the nine fields; all nine are here.
 *
 * Every field that can be unknown is `| null` rather than optional. An optional
 * field lets a producer forget it; a nullable one makes the producer say
 * whether it knows.
 */
export interface SearchDocument {
  readonly title: string;
  readonly type: SearchType;
  readonly summary: string;
  /** The measured natural rule a form derives from. Null when none is recorded. */
  readonly naturalRule: string | null;
  /** Which Atlas the rule came from. Null when no rule is recorded. */
  readonly atlasSource: string | null;
  readonly category: string | null;
  readonly colour: string | null;
  readonly material: string | null;
  readonly url: string;
}

/** Every field §7 requires, so conformance is checked against the document. */
export const SEARCH_FIELDS = [
  'title', 'type', 'summary', 'naturalRule', 'atlasSource',
  'category', 'colour', 'material', 'url',
] as const;

export class SearchSchemaViolation extends Error {}

/**
 * Checks one entry against the schema.
 *
 * Deliberately strict about the difference between "absent" and "null": a
 * missing key is a producer that forgot, and a null is a producer that knows it
 * does not know. Only the second is acceptable.
 */
export function assertSearchDocument(entry: unknown): asserts entry is SearchDocument {
  if (typeof entry !== 'object' || entry === null) {
    throw new SearchSchemaViolation('a search entry must be an object');
  }
  const record = entry as Record<string, unknown>;

  for (const field of SEARCH_FIELDS) {
    if (!(field in record)) {
      throw new SearchSchemaViolation(`search entry is missing "${field}" — absent is not the same as null`);
    }
  }
  const extra = Object.keys(record).filter((key) => !(SEARCH_FIELDS as readonly string[]).includes(key));
  if (extra.length > 0) {
    throw new SearchSchemaViolation(`search entry carries fields §7 does not define: ${extra.join(', ')}`);
  }

  for (const required of ['title', 'summary', 'url'] as const) {
    const value = record[required];
    if (typeof value !== 'string' || value.trim() === '') {
      throw new SearchSchemaViolation(`search entry has no ${required}`);
    }
  }
  if (!(SEARCH_TYPES as readonly string[]).includes(record.type as string)) {
    throw new SearchSchemaViolation(`"${String(record.type)}" is not one of §7's entity types`);
  }
  for (const nullable of ['naturalRule', 'atlasSource', 'category', 'colour', 'material'] as const) {
    const value = record[nullable];
    if (value !== null && typeof value !== 'string') {
      throw new SearchSchemaViolation(`"${nullable}" must be a string or null, not ${typeof value}`);
    }
  }
  // The rule and its source travel together. A rule with no Atlas behind it is
  // exactly the marketing narration §4.1 of 02 exists to replace with a
  // drawing, and a source with no rule is a citation of nothing.
  const hasRule = record.naturalRule !== null;
  const hasSource = record.atlasSource !== null;
  if (hasRule !== hasSource) {
    throw new SearchSchemaViolation(
      'naturalRule and atlasSource must both be present or both be null — ' +
        'a rule with no Atlas behind it is a claim with no measurement behind it',
    );
  }
}

/** A product, as §7 would index it. */
export function indexProduct(product: ProductRevision, url: string): SearchDocument {
  // `naturalRule` is a recorded field on the product, null until a Fashion
  // Specification supplies one. It is passed through, never derived: deriving
  // "this coat comes from stone" from a category code would be inventing the
  // brand's central claim from a string.
  const rule = product.naturalRule ?? null;
  return {
    title: product.name,
    type: 'product',
    summary: product.summary,
    naturalRule: rule === null ? null : rule.translation,
    atlasSource: rule === null ? null : rule.atlas,
    category: product.category,
    // No colour or material vocabulary exists yet. `materials` is free text
    // written for a spec sheet, not an indexable term, so it is not laundered
    // into one.
    colour: null,
    material: null,
    url,
  };
}

/** An Atlas page, as §7 would index it. */
export function indexAtlas(
  atlas: { readonly title: string; readonly description: string; readonly source: string },
  url: string,
): SearchDocument {
  // An Atlas with no field rows is a method, not a measurement. Its entry says
  // so by carrying no rule: `countAtlasDataRows` is the same function the page
  // uses to decide whether to render a measurements table, so the index and the
  // page cannot disagree about whether data exists.
  const measured = countAtlasDataRows(atlas.source) > 0;
  return {
    title: atlas.title,
    type: 'atlas-entry',
    summary: atlas.description,
    naturalRule: null,
    atlasSource: measured ? atlas.title : null,
    category: null,
    colour: null,
    material: null,
    url,
  };
}

/** Any other page. */
export function indexPage(page: { readonly title: string; readonly description: string }, url: string): SearchDocument {
  return {
    title: page.title,
    type: 'page',
    summary: page.description,
    naturalRule: null,
    atlasSource: null,
    category: null,
    colour: null,
    material: null,
    url,
  };
}
