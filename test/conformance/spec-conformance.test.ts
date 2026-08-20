/**
 * Independent conformance verification.
 *
 * SSOT v2.0 §7 requires the verifier to be logically independent of the
 * executor, and §43-2 prohibits an agent treating its own output as verified.
 *
 * Every other test in this repository was written in the same commit, by the
 * same process, from the same reading of the specification as the code it
 * tests. A misreading of the spec would propagate into both and pass.
 *
 * This file removes that shared failure mode by a different means than adding
 * agents (§43-18): it derives its expectations **mechanically from the
 * specification document itself**, and compares them against the
 * implementation. If the implementation was transcribed wrongly, the document
 * and the code disagree here regardless of what anyone believed.
 *
 * What it cannot do is judge whether the specification is itself correct.
 * That boundary is stated explicitly in the final test rather than papered over.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  ALLOWED_TRANSITIONS,
  ORDER_STATUSES,
  isTransitionAllowed,
  terminalStatuses,
  type OrderStatus,
} from '../../src/order/state-machine.ts';

const here = dirname(fileURLToPath(import.meta.url));
const SPEC_PATH = resolve(here, '../../docs/business/02_FIRST_GARMENT_EXECUTION.md');
const spec = readFileSync(SPEC_PATH, 'utf8');

/** Returns the lines between a heading and the next heading of the same level. */
function section(heading: string): string[] {
  const lines = spec.split('\n');
  const start = lines.findIndex((l) => l.trim().startsWith(heading));
  assert.notEqual(start, -1, `spec section not found: ${heading}`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^#{2,3} /.test(l));
  return end === -1 ? rest : rest.slice(0, end);
}

const TOKEN = /`([A-Z_]+)`/g;
const tokens = (cell: string): string[] => [...cell.matchAll(TOKEN)].map((m) => m[1] as string);

interface SpecRow {
  readonly sources: string[];
  readonly targets: string[];
  readonly raw: string;
}

function tableRows(lines: string[]): SpecRow[] {
  return lines
    .filter((l) => l.trim().startsWith('|') && !/^\s*\|\s*-{2,}/.test(l))
    .map((l) => {
      const cells = l.split('|').slice(1, -1);
      return {
        sources: tokens(cells[0] ?? ''),
        targets: tokens(cells[1] ?? ''),
        raw: l.trim(),
      };
    })
    .filter((r) => r.sources.length > 0 || r.targets.length > 0);
}

// ---------------------------------------------------------------------------

test('SPEC §3.2: the allowed-transition table is machine-readable', () => {
  const rows = tableRows(section('## 3.2 허용되는 전이'));
  assert.ok(rows.length > 0, 'no parsable rows — the spec table format changed');
  for (const r of rows) {
    assert.ok(r.sources.length >= 1, `row has no source state: ${r.raw}`);
    assert.equal(r.targets.length, 1, `row must have exactly one target: ${r.raw}`);
  }
});

test('SPEC §3.2 vs implementation: the edge sets are identical', () => {
  const rows = tableRows(section('## 3.2 허용되는 전이'));

  const fromSpec = new Set<string>();
  for (const row of rows) {
    for (const src of row.sources) {
      fromSpec.add(`${src}->${row.targets[0]}`);
    }
  }

  const fromCode = new Set<string>(
    ORDER_STATUSES.flatMap((s) => ALLOWED_TRANSITIONS[s].map((e) => `${s}->${e.to}`)),
  );

  const missingInCode = [...fromSpec].filter((e) => !fromCode.has(e)).sort();
  const extraInCode = [...fromCode].filter((e) => !fromSpec.has(e)).sort();

  assert.deepEqual(missingInCode, [], 'spec declares edges the implementation lacks');
  assert.deepEqual(extraInCode, [], 'implementation has edges the spec does not declare');
  assert.equal(fromSpec.size, fromCode.size);
});

test('SPEC §3.2: every state named in the table exists in the implementation', () => {
  const rows = tableRows(section('## 3.2 허용되는 전이'));
  const named = new Set(rows.flatMap((r) => [...r.sources, ...r.targets]));
  const known = new Set<string>(ORDER_STATUSES);
  const unknown = [...named].filter((s) => !known.has(s)).sort();
  assert.deepEqual(unknown, [], 'spec names states the implementation does not define');
});

test('SPEC §3.3: unambiguous forbidden transitions are rejected by the implementation', () => {
  const rows = tableRows(section('## 3.3 금지되는 전이'));

  // Classification looks at the RULE cell only. The rationale cell often names
  // a state in passing, and letting that influence the decision wrongly demoted
  // a checkable rule on the first run of this file.
  //
  // A rule is mechanically checkable when its rule cell names exactly two
  // concrete states. Rules quantified in prose ("모든 상태", "이후", "임의 상태")
  // are not, and are reported by the next test rather than silently interpreted.
  const checkable = rows.filter((r) => r.sources.length === 2);

  assert.ok(checkable.length > 0, 'no mechanically checkable forbidden rows found');

  for (const row of checkable) {
    const [from, to] = row.sources as [string, string];
    assert.ok(
      ORDER_STATUSES.includes(from as OrderStatus) && ORDER_STATUSES.includes(to as OrderStatus),
      `forbidden row names an unknown state: ${row.raw}`,
    );
    assert.equal(
      isTransitionAllowed(from as OrderStatus, to as OrderStatus),
      false,
      `spec forbids ${from} -> ${to} but the implementation permits it`,
    );
  }
});

test('SPEC §3.3: prose-quantified rows are reported as NOT machine-verified', () => {
  const rows = tableRows(section('## 3.3 금지되는 전이'));
  const checkable = rows.filter((r) => r.sources.length === 2);
  const notCheckable = rows.filter((r) => r.sources.length !== 2);

  // The partition must be exhaustive: no forbidden rule may fall outside both
  // buckets and thereby escape both verification and disclosure.
  assert.equal(
    checkable.length + notCheckable.length,
    rows.length,
    'forbidden-rule partition is not exhaustive',
  );

  // This is a boundary declaration, not a failure. These rules carry real
  // constraints that no parser here confirms; a human reading is still needed.
  // The count is pinned so a newly added prose rule cannot enter the spec
  // unnoticed and be assumed covered.
  assert.equal(
    notCheckable.length,
    4,
    `prose-quantified forbidden rules changed count — review coverage:\n${notCheckable
      .map((r) => `  ${r.raw}`)
      .join('\n')}`,
  );
  assert.equal(checkable.length, 4, 'mechanically checkable forbidden-rule count changed');
});

test('ADR-007 governs terminal states, and the implementation follows it', () => {
  const adr = readFileSync(resolve(here, '../../docs/adr/ADR-007-spec-conflict-cancelled-terminal.md'), 'utf8');

  assert.match(adr, /\*\*Status:\*\* Accepted/, 'ADR-007 is no longer Accepted — re-verify');
  assert.match(adr, /\*\*CANCELLED is not terminal\.\*\*/, 'ADR-007 decision text changed');

  const declared = [...adr.matchAll(/\*\*`([A-Z_]+)`, `([A-Z_]+)`, `([A-Z_]+)`\*\*/g)];
  assert.equal(declared.length, 1, 'could not locate the terminal-state list in ADR-007');
  const terminal = new Set(declared[0]!.slice(1));

  for (const s of ORDER_STATUSES) {
    const hasOutgoing = ALLOWED_TRANSITIONS[s].length > 0;
    assert.equal(
      hasOutgoing,
      !terminal.has(s),
      `${s}: ADR-007 terminal=${terminal.has(s)} but implementation hasOutgoing=${hasOutgoing}`,
    );
  }
});

test('terminality has exactly one encoding — no parallel list to drift', () => {
  // An adversarial audit (M14) showed that a literal TERMINAL_STATUSES set and
  // the emptiness of ALLOWED_TRANSITIONS were two independent encodings of the
  // same fact: mutating one left the other, and this file, none the wiser.
  // Terminality is now derived. This pins that, so a literal list cannot return.
  const derived = terminalStatuses();
  for (const s of ORDER_STATUSES) {
    assert.equal(
      derived.has(s),
      ALLOWED_TRANSITIONS[s].length === 0,
      `${s}: terminal set disagrees with the edge map — a second encoding has appeared`,
    );
  }
  assert.deepEqual([...derived].sort(), ['DELIVERED', 'PAYMENT_FAILED', 'REFUNDED']);
});

test('boundary: this file verifies transcription, not specification correctness', () => {
  // Stated as an executable reminder rather than a comment, so it appears in
  // the test output and cannot be overlooked when reading results.
  //
  // Confirmed here: the implementation matches the specification document.
  // NOT confirmed here: that the specification is itself right, that the
  // guards encode the correct business rule, or that any of this survives
  // persistence, concurrency, or real I/O. Those remain unverified.
  assert.ok(true);
});
