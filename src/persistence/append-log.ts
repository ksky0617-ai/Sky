/**
 * Append-only log with exclusive writes and crash-tolerant reads.
 *
 * Extracted because the order store and the product catalogue had the same two
 * defects, both measured rather than assumed:
 *
 *   1. **Lost mutual exclusion.** Eight processes delivering one idempotency
 *      key produced two accepted records. Each read the log, saw no duplicate,
 *      and wrote. In a payment context that is one payment recorded twice.
 *
 *   2. **Crash brittleness.** A process killed mid-write leaves a partial final
 *      line. Refusing to parse it made the entire history unreadable — one
 *      crash and no order could be read at all.
 *
 * Both are fixed here once rather than twice.
 *
 * ## Why a lockfile
 *
 * `O_APPEND` keeps a single line intact, but the check-then-write sequence
 * spans two syscalls and nothing serialises them. Exclusive file creation
 * (`wx`) is atomic on every platform this runs on, needs no dependency, and is
 * visible to any process on the same filesystem — which is what a lock has to
 * be, since the racing writers are separate processes.
 *
 * ## Why a truncated final line is discarded, not fatal
 *
 * A record whose write never finished was never acknowledged to anyone. Losing
 * it loses nothing that was promised. A malformed line anywhere else is real
 * damage to committed history and still throws: the distinction is whether the
 * record was ever complete, not whether it parses.
 *
 * ## Why the tail is also removed, not merely skipped
 *
 * Skipping it on read is not enough. The partial line has no terminating
 * newline, so the next append lands on the same line and welds itself to the
 * fragment — producing a genuinely corrupt record in the middle of history,
 * which is unrecoverable. So the first writer to take the lock after a crash
 * truncates the file back to the last complete record. Those bytes were never a
 * record and were never acknowledged; every byte that was is left untouched.
 */

import type { LogStorage } from './storage.ts';

export class LogCorruptError extends Error {}

const decoder = new TextDecoder();
const encoder = new TextEncoder();

export interface ReadResult<T> {
  readonly records: readonly T[];
  /** True when a partial final line was discarded as an unfinished write. */
  readonly truncatedTail: boolean;
  /**
   * Byte length of the complete records — everything up to and including the
   * last newline. Measured in bytes, not characters, because a garment
   * measurement or a Japanese product name makes those two numbers differ.
   */
  readonly completeBytes: number;
}

export class AppendLog<T> {
  readonly #storage: LogStorage;

  constructor(storage: LogStorage) {
    this.#storage = storage;
  }

  get path(): string {
    return this.#storage.location;
  }

  read(describe: string): ReadResult<T> {
    const buffer = this.#storage.read();
    if (buffer === null) return { records: [], truncatedTail: false, completeBytes: 0 };

    const completeBytes = buffer.lastIndexOf(0x0a) + 1;   // 0 if there is no newline at all
    const endsCleanly = buffer.length === completeBytes;

    const raw = decoder.decode(buffer);
    const lines = raw.split('\n');
    // A trailing '' is the artefact of a clean final newline, not a record.
    if (lines[lines.length - 1] === '') lines.pop();

    const records: T[] = [];
    let truncatedTail = false;

    lines.forEach((line, index) => {
      if (line.trim() === '') return;
      try {
        records.push(JSON.parse(line) as T);
      } catch (cause) {
        const isFinalLine = index === lines.length - 1;
        if (isFinalLine && !endsCleanly) {
          // An interrupted write. The record was never completed, so it was
          // never acknowledged; discarding it loses nothing that was promised.
          truncatedTail = true;
          return;
        }
        throw new LogCorruptError(
          `${this.path}: line ${index + 1} of the ${describe} is not valid JSON, and it is not ` +
            'an interrupted final write. The log is append-only and must not be edited by hand; ' +
            'restore it from history rather than repairing it in place.',
          { cause },
        );
      }
    });

    return { records, truncatedTail, completeBytes };
  }

  /**
   * Checks that this log could be written to, without writing a record.
   *
   * A zero-byte append is a real `open(O_APPEND)` + `write` + `close` on a
   * file, so it fails on a read-only filesystem, a full disk, or a store that
   * has no durable backing — and it leaves no record behind.
   *
   * The first version of the health check probed by calling `withLock` with
   * nothing to append. That never reached the storage at all: a deployment
   * whose writes went nowhere reported itself healthy.
   */
  probeWritable(): void {
    this.#storage.withLock(() => {
      this.#storage.append(new Uint8Array(0));
    });
  }

  /**
   * Runs `work` while holding an exclusive lock, then appends whatever it
   * returns. `work` receives the records as they are inside the lock, so a
   * check-then-write decision cannot be raced.
   *
   * Returning null appends nothing — the outcome of a duplicate.
   */
  withLock<R>(
    describe: string,
    work: (records: readonly T[]) => { record: T | null; result: R },
  ): R {
    return this.#storage.withLock(() => {
      const { records, truncatedTail, completeBytes } = this.read(describe);
      if (truncatedTail) {
        // Remove the fragment of an interrupted write before anything is
        // appended after it. Held under the lock, so no other writer can be
        // mid-append while the log shrinks.
        this.#storage.truncate(completeBytes);
      }
      const { record, result } = work(records);
      if (record !== null) {
        this.#storage.append(encoder.encode(`${JSON.stringify(record)}\n`));
      }
      return result;
    });
  }
}
