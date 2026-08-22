/**
 * Product catalogue — append-only.
 *
 * SPEC: docs/business/02_FIRST_GARMENT_EXECUTION.md Part 2 (Product, Variant,
 *       PreorderRun), Part 4 (identifiers), §2.3 (what is deliberately absent)
 * ADR-003 — pre-order: the production window is stated before payment.
 *
 * Same discipline as the order store, for the same reason: revisions are
 * appended, current state is derived by replay, and nothing is mutated in
 * place. A catalogue that can be edited silently is a catalogue whose past
 * prices and measurements cannot be trusted.
 *
 * Two integrity rules are enforced here rather than left to callers, because
 * both are commitments the brand documents make and both fail quietly:
 *
 *   1. A PUBLISHED product must have at least one variant with a price. A
 *      published product without a price is a page that asks for a purchase
 *      decision while withholding the only number that decides it.
 *
 *   2. A PUBLISHED product must carry a production window. ADR-003 requires the
 *      lead time to be disclosed at the point of purchase, not after it.
 *
 * Absent by design (SPEC §2.3): inventory — pre-order holds no stock.
 */

import { formatSku, isId, newId, parseSku, type CategoryCode } from '../identity/ids.ts';
import { AppendLog, LogCorruptError } from '../persistence/append-log.ts';

export type ProductStatus = 'DRAFT' | 'READY' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';

/** Statuses whose products are offered publicly. */
const PUBLIC_STATUSES: ReadonlySet<ProductStatus> = new Set<ProductStatus>(['PUBLISHED']);

/**
 * A garment measurement, in centimetres, for one size.
 * Absent sizes are absent — never zero, and never estimated.
 */
export interface Measurement {
  readonly label: string;
  readonly bySize: Readonly<Record<string, number>>;
}

export interface Variant {
  readonly sku: string;
  readonly size: string;
  readonly colour: string;
  /** Minor units. Integer. Null means the price is not yet set. */
  readonly priceAmount: number | null;
  readonly priceCurrency: string | null;
}

/** The rule this garment is derived from. Null until Atlas measurement exists. */
export interface NaturalRule {
  readonly atlas: string;
  readonly observation: string;
  readonly translation: string;
}

export interface ProductRevision {
  readonly eventId: string;
  readonly productId: string;
  readonly code: string;
  readonly name: string;
  readonly category: CategoryCode;
  readonly status: ProductStatus;
  readonly summary: string;
  readonly variants: readonly Variant[];
  readonly measurements: readonly Measurement[];
  readonly naturalRule: NaturalRule | null;
  readonly materials: readonly string[];
  /** Days from order close to dispatch. Null until a supplier quotes it. */
  readonly productionLeadDays: number | null;
  readonly recordedAt: string;
  readonly actor: string;
}

export type ProductInput = Omit<ProductRevision, 'eventId' | 'recordedAt'>;

export class CatalogIntegrityError extends Error {}

/** Re-exported so callers need not know where the log lives. */
export { LogCorruptError };

const DESCRIBE = 'product catalogue';

function assertPublishable(product: ProductInput): void {
  if (!PUBLIC_STATUSES.has(product.status)) return;

  const priced = product.variants.filter((v) => v.priceAmount !== null && v.priceCurrency !== null);
  if (priced.length === 0) {
    throw new CatalogIntegrityError(
      `${product.code} cannot be PUBLISHED: no variant has a price. A published product ` +
        'asks for a purchase decision, and the price is the number that decides it.',
    );
  }
  for (const variant of priced) {
    if (!Number.isInteger(variant.priceAmount)) {
      throw new CatalogIntegrityError(
        `${variant.sku}: price must be an integer in minor units, received ${variant.priceAmount}`,
      );
    }
    if ((variant.priceAmount as number) <= 0) {
      throw new CatalogIntegrityError(`${variant.sku}: price must be positive`);
    }
  }
  if (product.productionLeadDays === null) {
    throw new CatalogIntegrityError(
      `${product.code} cannot be PUBLISHED: no production lead time. ADR-003 requires the ` +
        'production window to be stated before payment, so it must exist before the page does.',
    );
  }
}

function assertWellFormed(product: ProductInput): void {
  if (parseSku(`${product.code}-XXX-M`) === null) {
    throw new CatalogIntegrityError(`${product.code} is not a valid product code`);
  }
  const seen = new Set<string>();
  for (const variant of product.variants) {
    const parsed = parseSku(variant.sku);
    if (parsed === null) {
      throw new CatalogIntegrityError(`malformed SKU: ${variant.sku}`);
    }
    if (!variant.sku.startsWith(`${product.code}-`)) {
      throw new CatalogIntegrityError(
        `${variant.sku} does not belong to ${product.code}`,
      );
    }
    if (seen.has(variant.sku)) {
      throw new CatalogIntegrityError(`duplicate SKU within one product: ${variant.sku}`);
    }
    seen.add(variant.sku);
  }
  for (const measurement of product.measurements) {
    for (const [size, value] of Object.entries(measurement.bySize)) {
      if (!Number.isFinite(value) || value <= 0) {
        throw new CatalogIntegrityError(
          `${product.code}: measurement "${measurement.label}" for size ${size} is ${value}. ` +
            'An unmeasured size is omitted, never zero.',
        );
      }
    }
  }
}

export class Catalog {
  readonly #log: AppendLog<ProductRevision>;

  constructor(path: string) {
    this.#log = new AppendLog<ProductRevision>(path);
  }

  get path(): string {
    return this.#log.path;
  }

  revisions(): readonly ProductRevision[] {
    return this.#log.read(DESCRIBE).records;
  }

  /** Latest revision of every product, in first-recorded order. */
  products(): readonly ProductRevision[] {
    const latest = new Map<string, ProductRevision>();
    for (const revision of this.revisions()) {
      latest.set(revision.productId, revision);
    }
    return [...latest.values()];
  }

  product(productId: string): ProductRevision | null {
    return this.products().find((p) => p.productId === productId) ?? null;
  }

  /** Products that may be shown publicly. Everything else stays private. */
  published(): readonly ProductRevision[] {
    return this.products().filter((p) => PUBLIC_STATUSES.has(p.status));
  }

  /**
   * Records a revision. Integrity is checked BEFORE the write, so an invalid
   * product never enters the log — unlike an order rejection, which is recorded
   * because the attempt itself is evidence. A malformed product is not evidence
   * of anything; it is a caller mistake to fix.
   */
  record(input: ProductInput): ProductRevision {
    assertWellFormed(input);
    assertPublishable(input);

    // The uniqueness check and the write it authorises are one critical
    // section. Checked against the log rather than against a cached set, so it
    // holds across processes and restarts.
    return this.#log.withLock<ProductRevision>(DESCRIBE, (revisions) => {
      const clash = revisions.find(
        (r) => r.code === input.code && r.productId !== input.productId,
      );
      if (clash !== undefined) {
        throw new CatalogIntegrityError(
          `${input.code} already identifies ${clash.productId}; it cannot also identify ` +
            `${input.productId}. SPEC Part 2.2 calls code the public identifier, and every SKU ` +
            'is derived from it — two products sharing one would be two garments sold as one.',
        );
      }

      const revision: ProductRevision = {
        ...input,
        eventId: newId('event'),
        recordedAt: new Date().toISOString(),
      };
      return { record: revision, result: revision };
    });
  }
}

/** Helper for building a variant whose SKU is derived, never hand-typed. */
export function variant(
  code: string,
  colour: string,
  size: string,
  price: { amount: number; currency: string } | null,
): Variant {
  const parsed = parseSku(`${code}-${colour}-${size}`);
  if (parsed === null) {
    throw new CatalogIntegrityError(`cannot build a SKU from ${code} / ${colour} / ${size}`);
  }
  return {
    sku: formatSku(parsed),
    size,
    colour,
    priceAmount: price?.amount ?? null,
    priceCurrency: price?.currency ?? null,
  };
}

export function isProductEventId(value: string): boolean {
  return isId('event', value);
}
