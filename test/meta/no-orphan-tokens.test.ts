/**
 * A design token that nothing uses.
 *
 * ## Why this check exists
 *
 * This repository has now shipped six things that were defined and never
 * invoked: the motion tokens, the light states, `indexAtlas`, the router's
 * second type scale, `absentPhotography`/`note`, and the photography slot's own
 * width cap. `test/meta/no-dead-surface.test.ts` covers exported functions.
 * Tokens were the other half and had no check at all.
 *
 * The failure is specific to a design system: a token is transcribed from
 * 05_VISUAL_SYSTEM.md or 04_MOTION_LANGUAGE.md, it looks like the system is
 * implemented because the value is present, and nothing ever references it. The
 * specification and the stylesheet agree; the stylesheet and the page do not.
 *
 * ## Reserved is allowed; forgotten is not
 *
 * Some tokens are deliberately unused: this site has no overlay, so the z-index
 * scale above the focus layer has nothing to sit on. That is a decision, and it
 * is recorded here against the token by name. An unlisted orphan fails, and a
 * listed token that is no longer defined fails too — otherwise a stale
 * allowance would quietly cover a token that was later added.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { declarations, rootTokens, stylesheet } from '../../src/site/styles.ts';

/**
 * Tokens defined and deliberately not referenced, each with the reason.
 *
 * A reason is a fact about this site, not an intention. "Will be used later" is
 * not one — that is precisely the sentence under which the motion tokens sat
 * unused for fifteen cycles.
 */
const RESERVED: ReadonlyMap<string, string> = new Map([
  ['--z-base', 'No stacking context is established anywhere: nothing on this site overlaps.'],
  ['--z-sticky', 'No element is sticky. The header scrolls with the page.'],
  ['--z-overlay', 'There is no overlay. No component on this site covers another.'],
  ['--z-modal', 'There is no modal, and 02 §5 rules out an interstitial as a pattern.'],
  ['--radius-sm', 'Nothing on this site is rounded. 05 §6 makes sharp the default and the exception has not arisen.'],
  ['--space-13', 'The step between 160px and 320px. The layout uses neither of its neighbours together with it.'],
  [
    '--motion-forest-stagger',
    'The stagger is POSITIONAL, not temporal: 04 §3.3 asks for a staggered reveal, and this ' +
      'implementation gets it from animation-timeline: view() — each item enters as it reaches ' +
      'the viewport. A 100ms delay token would be the time-based version, which is the exact ' +
      'construct that made an earlier reveal load-bearing and left content invisible below the ' +
      'fold. The token records the specification; the implementation deliberately does not use it.',
  ],
]);

function referenced(): ReadonlySet<string> {
  const used = new Set<string>();
  for (const declaration of declarations(stylesheet)) {
    for (const match of declaration.value.matchAll(/var\((--[a-z0-9-]+)/g)) {
      used.add(match[1] as string);
    }
  }
  return used;
}

test('every design token is used, or its non-use is a recorded decision', () => {
  const defined = rootTokens('--').map((token) => token.name);
  const used = referenced();

  assert.ok(defined.length > 40, 'the token scale vanished — this check is measuring nothing');

  const orphans = defined.filter((name) => !used.has(name) && !RESERVED.has(name));
  assert.deepEqual(
    orphans, [],
    `${orphans.length} token(s) are defined and referenced by nothing. Either use them, or record ` +
      'why this site does not — a token nobody references is a piece of the design system that ' +
      'exists in the stylesheet and not on any page.',
  );
});

test('a reserved token that is now used, or now gone, is not left reserved', () => {
  // Both directions. A stale allowance is how a check stops covering the thing
  // it was written for: the exemption stays, the token comes back into use or
  // disappears, and nobody notices the list is describing a different file.
  const defined = new Set(rootTokens('--').map((token) => token.name));
  const used = referenced();

  for (const [name, reason] of RESERVED) {
    assert.ok(defined.has(name), `${name} is reserved here but is no longer defined — drop the entry`);
    assert.ok(
      !used.has(name),
      `${name} is reserved as unused and is now referenced — drop the entry, the reason is stale: ${reason}`,
    );
    assert.ok(reason.trim().length > 20, `${name} carries no real reason`);
    assert.ok(
      !/will be|later|future|soon|planned/i.test(reason),
      `${name}'s reason is an intention, not a fact — that is the sentence the motion tokens sat ` +
        'under for fifteen cycles',
    );
  }
});

test('CONTROL: the check reports an orphan when one exists', () => {
  // Without this, a check that silently stopped parsing would pass forever.
  const used = referenced();
  const invented = '--olibana-token-that-nothing-uses';
  assert.ok(!used.has(invented));

  const defined = [...rootTokens('--').map((t) => t.name), invented];
  const orphans = defined.filter((name) => !used.has(name) && !RESERVED.has(name));
  assert.deepEqual(orphans, [invented], 'the orphan detector did not detect a planted orphan');
});
