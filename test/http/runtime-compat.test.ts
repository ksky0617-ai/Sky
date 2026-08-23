/**
 * What the deployed function is allowed to import.
 *
 * ## Why this test exists
 *
 * The Cloudflare Pages adapter statically imported `node:fs`, through the
 * domain: adapter → catalogue → append log → `node:fs`. Cloudflare Workers do
 * not have `node:fs` and have no writable filesystem, so the deployed function
 * **could not have served a single request in any mode**, including the
 * `closed` mode that writes nothing at all.
 *
 * Every unit test passed. The deployment tests passed — they run under Node,
 * where `node:fs` exists. Nothing in the suite could see it, because the defect
 * is not in any module's behaviour: it is in the shape of the import graph.
 *
 * So this walks the graph. It is the check that would have caught it.
 *
 * A **dynamic** import is deliberately allowed: `await import(...)` executes
 * only when the branch that needs it runs, so a deployment that never
 * configures file storage never loads it. That is exactly how the adapter now
 * reaches the filesystem when it is running under Node.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');

/** Module specifiers a Workers runtime does not provide. */
const UNAVAILABLE_IN_WORKERS = /^node:(fs|path|child_process|os|worker_threads|net|tls|dns|cluster)/;

interface Edge {
  readonly from: string;
  readonly to: string;
}

/**
 * Walks static imports only.
 *
 * `from '...'` is static. `import('...')` is not, and is skipped — the point of
 * the distinction is that only static imports are resolved when the module
 * loads.
 */
function staticGraph(entry: string): { visited: Set<string>; builtins: Edge[] } {
  const visited = new Set<string>();
  const builtins: Edge[] = [];

  const walk = (file: string): void => {
    if (visited.has(file)) return;
    visited.add(file);

    let source: string;
    try {
      source = readFileSync(file, 'utf8');
    } catch {
      return;
    }

    // Strip block comments so prose about node:fs is not read as an import.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, ' ');

    for (const match of code.matchAll(/(?:^|\n)\s*import\s[^;]*?from\s+'([^']+)'/g)) {
      const specifier = match[1] as string;
      if (specifier.startsWith('.')) {
        walk(resolve(dirname(file), specifier));
      } else if (UNAVAILABLE_IN_WORKERS.test(specifier)) {
        builtins.push({ from: relative(root, file), to: specifier });
      }
    }
  };

  walk(entry);
  return { visited, builtins };
}

test('the deployed function never statically imports a Node built-in', () => {
  // The whole reason the adapter is a thin shell over `handleRequest`: it must
  // be loadable where it is deployed.
  const { builtins } = staticGraph(resolve(root, 'functions/[[path]].ts'));
  assert.deepEqual(
    builtins,
    [],
    'the Pages function cannot load on Workers — ' +
      builtins.map((e) => `${e.from} imports ${e.to}`).join('; '),
  );
});

test('the domain the function pulls in is free of the filesystem', () => {
  // Not only the adapter: anything it reaches must also be loadable, which is
  // where the original defect actually lived.
  const { visited } = staticGraph(resolve(root, 'functions/[[path]].ts'));
  const domain = [...visited].filter((f) => f.includes('/src/')).map((f) => relative(root, f));
  assert.ok(domain.length > 5, 'the graph walk found almost nothing — it is not walking');
  assert.ok(
    domain.includes('src/order/store.ts'),
    'the walk did not reach the order store, so a clean result would prove nothing',
  );
});

test('the check can actually fail', () => {
  // A graph walk that never reports anything is decoration. The file-storage
  // module is the one place `node:fs` is allowed, so it must be reported.
  const { builtins } = staticGraph(resolve(root, 'src/persistence/file-storage.ts'));
  assert.ok(
    builtins.some((e) => e.to === 'node:fs'),
    'the walker failed to notice a node:fs import that is definitely there',
  );
});

test('a dynamic import is not counted, because it does not load with the module', () => {
  const source = readFileSync(resolve(root, 'functions/[[path]].ts'), 'utf8');
  assert.match(
    source,
    /await import\('\.\.\/src\/persistence\/file-storage\.ts'\)/,
    'the adapter no longer reaches file storage dynamically — check how it does now',
  );
});
