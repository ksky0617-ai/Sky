/**
 * Where an append-only log physically lives.
 *
 * ## Why this interface exists
 *
 * `AppendLog` used to call `node:fs` directly. That put `node:fs` into the
 * import graph of every module above it — the catalogue, the order store, the
 * checkout, the router — which meant the Cloudflare Pages adapter imported it
 * too. Cloudflare Workers have no `node:fs` and no writable filesystem, so the
 * deployed function **could not serve a single request in any mode**, including
 * the `closed` mode that writes nothing at all. That was not a future concern
 * about production storage; it was committed code that could not run where it
 * was aimed.
 *
 * So the physical operations are named here and implemented per runtime. The
 * domain above `AppendLog` now knows nothing about files.
 *
 * ## What a durable implementation must provide
 *
 * These are the guarantees `AppendLog` depends on, and any new backing store has
 * to meet all of them or the invariants above it stop holding:
 *
 *   1. `append` adds bytes to the end and never rewrites what is already there.
 *   2. `withLock` is mutually exclusive **across processes**, not just within
 *      one, because the racing writers are separate processes.
 *   3. `read` returns every committed byte, including a partial final line left
 *      by a crash — discarding it is a decision `AppendLog` makes, not the
 *      store.
 *   4. `truncate` removes exactly the trailing bytes it is given.
 *
 * Eventually-consistent key-value stores do not satisfy (1) or (2). That is why
 * PCQ-004 is open rather than quietly solved with the nearest available store.
 */

export interface LogStorage {
  /** The log's address, for error messages. Not necessarily a path. */
  readonly location: string;
  /** Every committed byte, or null when nothing has ever been written. */
  read(): Uint8Array | null;
  /** Adds bytes at the end. Never rewrites what is there. */
  append(bytes: Uint8Array): void;
  /** Removes everything after `byteLength`. */
  truncate(byteLength: number): void;
  /** Runs `work` under exclusive access across processes. */
  withLock<R>(work: () => R): R;
}

/**
 * A store held entirely in memory.
 *
 * Real enough for tests that are about the log's own logic rather than its
 * durability, and honest about what it is not: exclusion here is only within
 * one process, and nothing survives it. The durability tests deliberately use
 * the filesystem instead, with spawned processes.
 */
export class MemoryStorage implements LogStorage {
  #bytes: Uint8Array | null = null;
  #locked = false;
  readonly location: string;

  constructor(location = 'memory') {
    this.location = location;
  }

  read(): Uint8Array | null {
    return this.#bytes;
  }

  append(bytes: Uint8Array): void {
    const existing = this.#bytes ?? new Uint8Array(0);
    const combined = new Uint8Array(existing.length + bytes.length);
    combined.set(existing);
    combined.set(bytes, existing.length);
    this.#bytes = combined;
  }

  truncate(byteLength: number): void {
    this.#bytes = (this.#bytes ?? new Uint8Array(0)).slice(0, byteLength);
  }

  withLock<R>(work: () => R): R {
    if (this.#locked) {
      // Re-entering would mean a caller believed it held exclusive access while
      // something else did. Failing loudly beats corrupting the log quietly.
      throw new Error(`${this.location}: the log is already locked by this process`);
    }
    this.#locked = true;
    try {
      return work();
    } finally {
      this.#locked = false;
    }
  }
}

/**
 * A store that holds nothing and refuses to hold anything.
 *
 * For a deployment that is configured to take no orders. Reads succeed and
 * return nothing, because "no orders exist" is the truth and a confirmation
 * page asking about one should say so rather than fail. Writes throw, because a
 * write that silently went nowhere would be an order the customer believes was
 * placed.
 */
export class UnavailableStorage implements LogStorage {
  readonly location: string;

  constructor(location = 'no configured storage') {
    this.location = location;
  }

  read(): null {
    return null;
  }

  append(): never {
    throw new Error(
      `${this.location}: this deployment has no durable storage configured, so nothing can be ` +
        'recorded. Refusing rather than accepting a write that would go nowhere (PCQ-004).',
    );
  }

  truncate(): never {
    return this.append();
  }

  withLock<R>(work: () => R): R {
    // The work itself may only read. If it tries to write, `append` refuses.
    return work();
  }
}
