/**
 * A log stored as a file, locked with a lockfile.
 *
 * The only module in the persistence layer that touches `node:fs`. Everything
 * above `AppendLog` reaches storage through `LogStorage`, so importing the
 * domain no longer drags a filesystem into runtimes that do not have one.
 *
 * ## Why a lockfile
 *
 * `O_APPEND` keeps a single line intact, but the check-then-write sequence
 * spans two syscalls and nothing serialises them. Exclusive file creation
 * (`wx`) is atomic on every platform this runs on, needs no dependency, and is
 * visible to any process on the same filesystem — which is what a lock has to
 * be, since the racing writers are separate processes.
 *
 * The lock is filesystem-scoped. It holds for writers sharing a filesystem; it
 * would not hold across machines writing to different mounts of the same data.
 */

import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  truncateSync,
  unlinkSync,
  writeSync,
} from 'node:fs';
import { dirname } from 'node:path';

import type { LogStorage } from './storage.ts';

/** A lock older than this is treated as abandoned by a dead process. */
export const STALE_LOCK_MS = 10_000;
/** Total time to wait for a lock before giving up. */
export const LOCK_TIMEOUT_MS = 5_000;

export class LockTimeoutError extends Error {}

/** Blocks the thread without burning CPU. Node has no synchronous sleep. */
function sleepSync(ms: number): void {
  const shared = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(shared, 0, 0, ms);
}

export class FileStorage implements LogStorage {
  readonly #path: string;
  readonly #lockPath: string;

  constructor(path: string) {
    this.#path = path;
    this.#lockPath = `${path}.lock`;
    const directory = dirname(path);
    if (!existsSync(directory)) mkdirSync(directory, { recursive: true });
  }

  get location(): string {
    return this.#path;
  }

  read(): Uint8Array | null {
    if (!existsSync(this.#path)) return null;
    return readFileSync(this.#path);
  }

  append(bytes: Uint8Array): void {
    // Opened and closed inside the caller's critical section, so the write is
    // part of it rather than merely adjacent to it.
    const fd = openSync(this.#path, 'a');
    try {
      writeSync(fd, bytes);
    } finally {
      closeSync(fd);
    }
  }

  truncate(byteLength: number): void {
    truncateSync(this.#path, byteLength);
  }

  withLock<R>(work: () => R): R {
    this.#acquire();
    try {
      return work();
    } finally {
      this.#release();
    }
  }

  #acquire(): void {
    const deadline = Date.now() + LOCK_TIMEOUT_MS;
    for (;;) {
      try {
        closeSync(openSync(this.#lockPath, 'wx'));
        return;
      } catch {
        // Held by someone. Reclaim it only if its holder is plainly gone.
        try {
          if (Date.now() - statSync(this.#lockPath).mtimeMs > STALE_LOCK_MS) {
            unlinkSync(this.#lockPath);
            continue;
          }
        } catch {
          // Released between our failure and our stat; retry immediately.
          continue;
        }
        if (Date.now() > deadline) {
          throw new LockTimeoutError(
            `${this.#path}: could not acquire the write lock within ${LOCK_TIMEOUT_MS}ms. ` +
              `If no writer is running, remove ${this.#lockPath}.`,
          );
        }
        sleepSync(5);
      }
    }
  }

  #release(): void {
    try {
      unlinkSync(this.#lockPath);
    } catch {
      // Already gone — a stale-lock reclaim removed it. Nothing to undo.
    }
  }
}
