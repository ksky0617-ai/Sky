/**
 * Checkout intents — append-only.
 *
 * SPEC: docs/business/02_FIRST_GARMENT_EXECUTION.md Part 2.2 (Payment)
 * §7 price integrity — DISPLAY = SELECTION = CHECKOUT = PAYMENT = ORDER
 *
 * ## Why an intent is written down
 *
 * The gateway takes the money and posts back later. When it does, something has
 * to say what was actually agreed: which variant, how many, at what price. Two
 * ways to answer that, and only one is safe.
 *
 *   - **Re-derive it from the catalogue.** The catalogue can have moved in the
 *     meantime, which is exactly the defect already measured once: an order
 *     recorded at 99,000 against a payment of 72,000.
 *   - **Take it from the gateway's payload.** Then whoever can post a payload
 *     decides what the order says. Signature verification makes that *hard*,
 *     not *unnecessary*: the amount would still be defined by the message
 *     rather than by the agreement.
 *
 * So the intent is recorded at the moment it is made and read back by
 * reference. The webhook's payload is then only ever *compared* against it.
 *
 * An intent is not an order. Nothing here counts toward a run, appears in a
 * customer's history, or obliges anyone. Abandoned checkouts accumulate as
 * exactly what they are: offers nobody took.
 */

import { AppendLog, LogCorruptError } from '../persistence/append-log.ts';
import type { CheckoutIntent } from './checkout.ts';

export { LogCorruptError };

export class IntentInvalid extends Error {}

const DESCRIBE = 'checkout intent log';

export interface RecordedIntent extends CheckoutIntent {
  readonly recordedAt: string;
}

export class IntentStore {
  readonly #log: AppendLog<RecordedIntent>;

  constructor(path: string) {
    this.#log = new AppendLog<RecordedIntent>(path);
  }

  get path(): string {
    return this.#log.path;
  }

  all(): readonly RecordedIntent[] {
    return this.#log.read(DESCRIBE).records;
  }

  /**
   * The intent a returning payment refers to.
   *
   * The reference is unguessable, so possession of one is the only way to name
   * an intent. No guard against an empty reference is needed here because
   * `record` refuses to store one — an invariant enforced at the write is worth
   * more than a check at every read, and there is only ever one of the former.
   */
  byReference(reference: string): RecordedIntent | null {
    return this.all().find((intent) => intent.reference === reference) ?? null;
  }

  /**
   * Records an intent. Re-recording the same reference is a no-op rather than a
   * second line: an intent is what was agreed once, and a second copy of it
   * could differ from the first.
   */
  record(intent: CheckoutIntent): RecordedIntent {
    if (intent.reference.trim() === '') {
      throw new IntentInvalid(
        'an intent with no reference can never be found again, and an empty one would match ' +
          'every lookup that also had nothing to go on.',
      );
    }
    return this.#log.withLock<RecordedIntent>(DESCRIBE, (existing) => {
      const already = existing.find((i) => i.reference === intent.reference);
      if (already !== undefined) return { record: null, result: already };

      const recorded: RecordedIntent = { ...intent, recordedAt: new Date().toISOString() };
      return { record: recorded, result: recorded };
    });
  }
}
