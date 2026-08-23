/**
 * The test suite auditing itself.
 *
 * ## Why this exists
 *
 * "296 tests passed" is not evidence. A test that asserts nothing passes. A
 * test that asserts `ok(true)` passes. A test skipped by a condition passes
 * without running. Every VERIFIED claim in this repository rests on the suite,
 * so an unexamined suite is an unexamined foundation — the highest propagation
 * risk here, because it silently invalidates everything above it rather than
 * failing.
 *
 * The first version of this scan reported a false positive: it counted braces
 * without skipping string and regex literals, so a regex containing `}` ended
 * the body early. A checker that cannot parse is worse than no checker, because
 * its output gets trusted. Hence `strip()` below, and hence the tests at the
 * bottom that check the checker against known-bad input.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const testRoot = resolve(import.meta.dirname, '..');

function testFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = resolve(dir, entry);
    if (statSync(path).isDirectory()) return testFiles(path);
    return entry.endsWith('.test.ts') ? [path] : [];
  });
}

/**
 * Blanks out comments and literals, keeping length and line structure.
 *
 * Brace counting has to ignore braces inside strings, template literals and
 * regexes — the reason the first version of this audit was wrong.
 */
export function strip(source: string): string {
  let out = '';
  let i = 0;
  const isRegexPosition = (): string => {
    // A '/' starts a regex only where a value may begin. Look back past spaces.
    let j = out.length - 1;
    while (j >= 0 && /\s/.test(out[j] as string)) j -= 1;
    const previous = j >= 0 ? (out[j] as string) : '';
    return '=(,:[!&|?{};+*%~^'.includes(previous) || previous === '' ? 'regex' : 'divide';
  };

  while (i < source.length) {
    const two = source.slice(i, i + 2);

    if (two === '//') {
      while (i < source.length && source[i] !== '\n') { out += ' '; i += 1; }
      continue;
    }
    if (two === '/*') {
      while (i < source.length && source.slice(i, i + 2) !== '*/') {
        out += source[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      out += '  '; i += 2;
      continue;
    }

    const char = source[i] as string;

    if (char === '"' || char === "'" || char === '`') {
      const quote = char;
      out += ' '; i += 1;
      while (i < source.length && source[i] !== quote) {
        if (source[i] === '\\') { out += '  '; i += 2; continue; }
        out += source[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      out += ' '; i += 1;
      continue;
    }

    if (char === '/' && isRegexPosition() === 'regex') {
      out += ' '; i += 1;
      let inClass = false;
      while (i < source.length) {
        const c = source[i] as string;
        if (c === '\\') { out += '  '; i += 2; continue; }
        if (c === '[') inClass = true;
        else if (c === ']') inClass = false;
        else if (c === '/' && !inClass) break;
        else if (c === '\n') break;                    // not a regex after all
        out += ' '; i += 1;
      }
      out += ' '; i += 1;
      continue;
    }

    out += char;
    i += 1;
  }
  return out;
}

export interface TestCase {
  readonly file: string;
  readonly name: string;
  readonly body: string;
}

/** Every `test('name', ...)` body in a file, with literals blanked out. */
export function testCases(file: string, source: string): TestCase[] {
  const stripped = strip(source);
  const cases: TestCase[] = [];

  for (const match of stripped.matchAll(/(^|\n)\s*test\s*\(/g)) {
    const open = (match.index as number) + match[0].length;
    // The name lives in the original text; the stripped copy blanked it out.
    const nameMatch = /^\s*(['"`])(.*?)\1/.exec(source.slice(open));
    let depth = 1;
    let i = open;
    while (i < stripped.length && depth > 0) {
      if (stripped[i] === '(') depth += 1;
      else if (stripped[i] === ')') depth -= 1;
      i += 1;
    }
    cases.push({
      file,
      name: nameMatch?.[2] ?? '(unnamed)',
      body: stripped.slice(open, i),
    });
  }
  return cases;
}

const files = testFiles(testRoot);
const all = files.flatMap((file) => testCases(file, readFileSync(file, 'utf8')));

const describe = (t: TestCase): string => `${t.file.replace(testRoot, 'test')} — "${t.name}"`;

// --- the audit -----------------------------------------------------------

test('the audit actually found the suite', () => {
  // A scan that matches nothing reports nothing wrong. That is the failure mode
  // this whole file exists to prevent, so it is checked first.
  assert.ok(files.length >= 15, `only ${files.length} test files found`);
  assert.ok(all.length >= 250, `only ${all.length} test cases parsed — the parser is not working`);
});

test('no test is skipped, todoed, or narrowed to itself', () => {
  // A skipped test passes without running, and `.only` silently disables every
  // other test in its file.
  const offenders = files.flatMap((file) => {
    const stripped = strip(readFileSync(file, 'utf8'));
    return [...stripped.matchAll(/\b(test|it|describe)\s*\.\s*(skip|todo|only)\b/g)]
      .map((m) => `${file.replace(testRoot, 'test')} uses ${m[1]}.${m[2]}`);
  });
  assert.deepEqual(offenders, []);
});

test('every test asserts something', () => {
  const silent = all.filter((t) => !/\bassert\b/.test(t.body));
  assert.deepEqual(silent.map(describe), []);
});

test('no test asserts something that is true by construction', () => {
  // assert.ok(true) and its relatives pass regardless of the system under test.
  const vacuous = all.filter((t) =>
    /assert\.ok\(\s*(true|1)\s*[,)]/.test(t.body) ||
    /assert\.equal\(\s*(true\s*,\s*true|1\s*,\s*1)\s*[,)]/.test(t.body),
  );
  assert.deepEqual(vacuous.map(describe), []);
});

test('no HTTP test checks only the status code', () => {
  // A 200 with an empty body, a 303 to nowhere, or a 422 for the wrong reason
  // all pass a status-only assertion. Every one of those has been a real defect
  // in this repository.
  const httpTests = all.filter((t) => /\bhandleRequest\b|\bonRequest\b/.test(t.body));
  assert.ok(httpTests.length >= 10, `only ${httpTests.length} HTTP tests found — check the filter`);

  const statusOnly = httpTests.filter((t) => {
    const assertions = [...t.body.matchAll(/assert\.\w+\(([^;]*)/g)].map((m) => m[1] as string);
    const substantive = assertions.filter(
      (a) => !/\.status\b/.test(a) && !/response\s*!==\s*null/.test(a),
    );
    return substantive.length === 0;
  });
  assert.deepEqual(statusOnly.map(describe), []);
});

// --- the checker checking itself ----------------------------------------

test('the parser is not confused by braces inside literals', () => {
  // The first version of this audit reported a false positive because a regex
  // containing `}` ended the body early.
  const source = [
    "test('with a regex', () => {",
    "  const rule = /form\\.order button \\{[^}]*\\}/.exec(css);",
    "  assert.ok(rule);",
    '});',
  ].join('\n');
  const [parsed] = testCases('x.ts', `\n${source}`);
  assert.equal(parsed?.name, 'with a regex');
  assert.match(parsed?.body ?? '', /assert\.ok/, 'the body was cut short at a brace inside a regex');
});

test('the parser is not confused by braces inside strings or templates', () => {
  const source = [
    "test('with strings', () => {",
    '  const a = "} not a brace";',
    '  const b = `${x} also } not a brace`;',
    '  assert.equal(a.length, b.length);',
    '});',
  ].join('\n');
  const [parsed] = testCases('x.ts', `\n${source}`);
  assert.match(parsed?.body ?? '', /assert\.equal/);
});

test('the audit detects a test that asserts nothing', () => {
  // If it cannot fail on known-bad input it is decoration.
  const bad = testCases('x.ts', "\ntest('proves nothing', () => {\n  const x = 1;\n});\n");
  assert.equal(bad.length, 1);
  assert.ok(!/\bassert\b/.test(bad[0]?.body ?? 'assert'), 'the audit would not flag an empty test');
});

test('the audit detects a vacuous assertion', () => {
  const bad = testCases('x.ts', "\ntest('always true', () => {\n  assert.ok(true);\n});\n");
  assert.match(bad[0]?.body ?? '', /assert\.ok\(\s*true\s*\)/);
});
