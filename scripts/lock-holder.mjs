/**
 * Acquires the append-log lock, prints "acquired", holds it for a fixed
 * duration, then releases and exits.
 *
 * This exists so mutual exclusion can be tested by observation rather than by
 * timing luck: while this process holds the lock, any other writer must wait.
 *
 * argv: <logPath> <holdMs>
 */
import { AppendLog } from '../src/persistence/append-log.ts';
import { FileStorage } from '../src/persistence/file-storage.ts';

const [, , logPath, holdMs] = process.argv;

new AppendLog(new FileStorage(logPath)).withLock('held log', () => {
  process.stdout.write('acquired\n');
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Number(holdMs));
  return { record: null, result: null };
});
