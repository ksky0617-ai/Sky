/**
 * Identifier generation and parsing.
 *
 * SPEC: docs/business/02_FIRST_GARMENT_EXECUTION.md Part 4
 *
 * Pure except for `crypto.getRandomValues` and an injectable clock.
 * No dependencies.
 *
 * Two families, deliberately different:
 *  - Internal ids are ULIDs: time-sortable, which is useful for ordering records.
 *  - Customer ids are UUIDv4: NOT sortable, because sortability is enumerability
 *    and customer records must not be walkable from one id to the next.
 */

/** Crockford base32 — excludes I, L, O, U to avoid transcription errors. */
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const TIME_LEN = 10;
const RANDOM_LEN = 16;
export const ULID_LEN = TIME_LEN + RANDOM_LEN;

/** Max time a 48-bit ULID timestamp can express. */
const MAX_TIME = 281474976710655; // 2^48 - 1

function encodeTime(ms: number, length: number): string {
  if (!Number.isInteger(ms) || ms < 0) {
    throw new RangeError(`ULID time must be a non-negative integer, received ${ms}`);
  }
  if (ms > MAX_TIME) {
    throw new RangeError(`ULID time exceeds 48 bits: ${ms}`);
  }
  let out = '';
  let rest = ms;
  for (let i = length - 1; i >= 0; i -= 1) {
    out = CROCKFORD[rest % 32] + out;
    rest = Math.floor(rest / 32);
  }
  return out;
}

function encodeRandom(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CROCKFORD[(bytes[i] as number) % 32];
  }
  return out;
}

/** 26-character ULID. Lexicographic order matches chronological order. */
export function newUlid(now: number = Date.now()): string {
  return encodeTime(now, TIME_LEN) + encodeRandom(RANDOM_LEN);
}

export function isUlid(value: string): boolean {
  if (value.length !== ULID_LEN) return false;
  for (const ch of value) {
    if (!CROCKFORD.includes(ch)) return false;
  }
  return true;
}

/** Entity prefixes. Customer is absent on purpose — see `newCustomerId`. */
export const PREFIX = {
  product: 'PRD',
  order: 'ORD',
  preorderRun: 'RUN',
  payment: 'PAY',
  shipment: 'SHP',
  event: 'EVT',
} as const;

export type PrefixedEntity = keyof typeof PREFIX;

export function newId(entity: PrefixedEntity, now?: number): string {
  return `${PREFIX[entity]}_${newUlid(now)}`;
}

export function isId(entity: PrefixedEntity, value: string): boolean {
  const head = `${PREFIX[entity]}_`;
  return value.startsWith(head) && isUlid(value.slice(head.length));
}

/**
 * Customer identifier — UUIDv4, never sequential and never time-sortable.
 * A sortable customer id lets anyone holding one walk to its neighbours.
 */
export function newCustomerId(): string {
  return `CUS_${crypto.randomUUID()}`;
}

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isCustomerId(value: string): boolean {
  return value.startsWith('CUS_') && UUID_V4.test(value.slice(4));
}

/** Product category codes (SPEC Part 4). */
export const CATEGORY_CODES = {
  CT: 'coat',
  JK: 'jacket',
  KN: 'knit',
  TR: 'trouser',
  AC: 'accessory',
} as const;

export type CategoryCode = keyof typeof CATEGORY_CODES;

export interface ProductCode {
  readonly category: CategoryCode;
  readonly sequence: number;
}

/** Public product code, e.g. `OLB-CT-001`. */
export function formatProductCode({ category, sequence }: ProductCode): string {
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 999) {
    throw new RangeError(`product sequence must be 1-999, received ${sequence}`);
  }
  return `OLB-${category}-${String(sequence).padStart(3, '0')}`;
}

const PRODUCT_CODE = /^OLB-([A-Z]{2})-(\d{3})$/;

export function parseProductCode(value: string): ProductCode | null {
  const m = PRODUCT_CODE.exec(value);
  if (!m) return null;
  const category = m[1] as CategoryCode;
  if (!(category in CATEGORY_CODES)) return null;
  const sequence = Number(m[2]);
  return sequence >= 1 ? { category, sequence } : null;
}

export interface Sku extends ProductCode {
  /** Stable colour code, e.g. `STN`. Never a season or campaign name. */
  readonly colour: string;
  readonly size: string;
}

/**
 * Variant SKU, e.g. `OLB-CT-001-STN-M`.
 *
 * Carries only immutable facts. Price, season, and stock never appear in a SKU:
 * they change, and an identifier that encodes a changing value breaks when it does.
 */
export function formatSku({ category, sequence, colour, size }: Sku): string {
  if (!/^[A-Z]{3}$/.test(colour)) {
    throw new RangeError(`colour code must be 3 uppercase letters, received "${colour}"`);
  }
  if (!/^[A-Z0-9]{1,4}$/.test(size)) {
    throw new RangeError(`size code must be 1-4 uppercase alphanumerics, received "${size}"`);
  }
  return `${formatProductCode({ category, sequence })}-${colour}-${size}`;
}

const SKU = /^OLB-([A-Z]{2})-(\d{3})-([A-Z]{3})-([A-Z0-9]{1,4})$/;

export function parseSku(value: string): Sku | null {
  const m = SKU.exec(value);
  if (!m) return null;
  const category = m[1] as CategoryCode;
  if (!(category in CATEGORY_CODES)) return null;
  return {
    category,
    sequence: Number(m[2]),
    colour: m[3] as string,
    size: m[4] as string,
  };
}

/**
 * Customer-facing order number, e.g. `OLB-2608-0001`.
 * Readable aloud on a support call; the internal `ORD_{ulid}` is not.
 */
export function formatOrderNumber(date: Date, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 9999) {
    throw new RangeError(`order sequence must be 1-9999, received ${sequence}`);
  }
  const yy = String(date.getUTCFullYear() % 100).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `OLB-${yy}${mm}-${String(sequence).padStart(4, '0')}`;
}

const ORDER_NUMBER = /^OLB-(\d{2})(\d{2})-(\d{4})$/;

export interface ParsedOrderNumber {
  readonly year: number;
  readonly month: number;
  readonly sequence: number;
}

export function parseOrderNumber(value: string): ParsedOrderNumber | null {
  const m = ORDER_NUMBER.exec(value);
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year: 2000 + Number(m[1]), month, sequence: Number(m[3]) };
}
