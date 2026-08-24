/**
 * The motion language, and the checks that keep it honest.
 *
 * ## Why these checks exist rather than a review checklist
 *
 * `docs/website/04_MOTION_LANGUAGE.md` §5 says "Lint the curve set" and "Lint"
 * for two of its prohibitions, and §7 is a six-question gate written as a
 * pull-request checklist. A checklist is a promise; a failing build is a fact.
 *
 * The specific defect these exist to prevent already shipped once: a staggered
 * reveal using `animation-delay` with `animation-fill-mode: both` holds every
 * element at its first keyframe throughout its delay, and the first keyframe of
 * a reveal is invisible. The page rendered nearly blank. Every unit test
 * passed, because nothing looked at motion.
 *
 * So each check here is fed known-bad input and required to notice, and fed the
 * real stylesheet and required to stay quiet. A checker that only ever sees
 * correct input is not known to discriminate — the same argument that made the
 * deployment auditor untrustworthy until it was shown 20 false deployments.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  contrastRatio,
  declarations,
  findInlineMotionValues,
  findLoadBearingMotion,
  findMotionProhibitions,
  resolveRoles,
  stylesheet,
} from '../../src/site/styles.ts';
import { SECURITY_HEADERS } from '../../src/http/router.ts';

// --- the real stylesheet -------------------------------------------------

test('the stylesheet stages no content behind motion', () => {
  assert.deepEqual(findLoadBearingMotion(stylesheet), []);
});

test('the stylesheet breaks none of the §5 prohibitions', () => {
  assert.deepEqual(findMotionProhibitions(stylesheet), []);
});

test('every motion value in the stylesheet comes from a token', () => {
  // §10, first acceptance criterion. Without this the tokens are documentation:
  // §2 marks every value provisional precisely so a later field measurement
  // changes one line, which it cannot if durations are scattered through rules.
  assert.deepEqual(findInlineMotionValues(stylesheet), []);
});

test('all five motion tokens are defined, and each is actually used', () => {
  // §3 defines five. A token nobody references is a value that will drift out
  // of agreement with the page without anything noticing.
  for (const token of ['river', 'stone', 'forest', 'light', 'wind']) {
    assert.match(stylesheet, new RegExp(`--motion-${token}-duration:`), `motion.${token} is not defined`);
    const uses = [...stylesheet.matchAll(new RegExp(`var\\(--motion-${token}-`, 'g'))];
    assert.ok(uses.length > 0, `motion.${token} is defined but never used`);
  }
});

test('every reveal is gated on support AND on the reader not asking for less motion', () => {
  // §6 and §8. Either guard alone is insufficient: without @supports the
  // animation runs on a timer where the timeline is unavailable, and without
  // the media query it runs for a reader who asked for stillness.
  const reveals = declarations(stylesheet).filter((d) => d.property === 'animation-name');
  assert.ok(reveals.length > 0, 'no motion is declared at all');

  for (const reveal of reveals) {
    const guards = reveal.atRules.join(' ');
    assert.match(guards, /@supports[^@]*animation-timeline/, `${reveal.selector} is not support-gated`);
    assert.match(guards, /prefers-reduced-motion\s*:\s*no-preference/, `${reveal.selector} ignores reduced motion`);
  }
});

test('reduced motion removes movement without removing information', () => {
  // §6. The mapping is explicit rather than a global disable, and motion.light
  // is RETAINED because opacity and colour carry no vestibular trigger — it is
  // shortened, not deleted.
  assert.match(stylesheet, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(stylesheet, /animation-duration: 0\.01ms !important/);
  assert.match(stylesheet, /body \{ transition-duration: 300ms/);
});

test('the checkout carries zero brand motion, structurally and not by promise', () => {
  // §9 gives Checkout "Zero — disabled at provider level". The router renders
  // its own pages and never links the site stylesheet, so brand motion cannot
  // reach them: there is no rule to disable and nothing to remember.
  assert.ok(!/olibana|stylesheet|\.css/i.test(SECURITY_HEADERS['content-security-policy'] ?? ''));
  const routerSource = stylesheet.includes('form.order');
  assert.ok(routerSource, 'the purchase form is styled by the site stylesheet');
  // The checkout RESPONSE pages are built by `page()` in the router with inline
  // styles only. Asserted where it is observable: the site stylesheet has no
  // rule that could apply to them, because they carry none of its classes.
  for (const selector of ['.index', '.statement', 'dl.facts']) {
    assert.ok(stylesheet.includes(selector), `${selector} is a site-only class`);
  }
});

// --- the checks are fed known-bad input ----------------------------------

test('LOAD-BEARING: the exact defect that shipped is caught', () => {
  // A staggered reveal on a timer. This is what rendered a near-blank page.
  const bad = `
    main > * {
      opacity: 0;
      animation-name: fade-in;
      animation-delay: 100ms;
      animation-fill-mode: both;
    }`;
  const offences = findLoadBearingMotion(bad);
  assert.ok(offences.some((o) => o.includes('animation-delay')), `delay not caught: ${offences}`);
  assert.ok(offences.some((o) => o.includes('opacity 0')), `resting opacity 0 not caught: ${offences}`);
});

test('LOAD-BEARING: an ungated reveal is caught', () => {
  const bad = '@media (prefers-reduced-motion: no-preference) { .card { animation-name: forest-enter; } }';
  assert.match(findLoadBearingMotion(bad).join(' '), /not inside @supports/);
});

test('LOAD-BEARING: a resting rule that clips content away is caught', () => {
  const bad = '.panel { clip-path: inset(0 0 100% 0); }';
  assert.match(findLoadBearingMotion(bad).join(' '), /clips content away/);
});

test('LOAD-BEARING: a fade-in or clip-in keyframe is caught, guards or not', () => {
  // This test asserted the opposite until a browser run contradicted it. The
  // first version treated @keyframes as the one place a hidden state belongs,
  // reasoning that the guards made it safe. Chromium then held headings and
  // list items below the fold at opacity 0 — the scroll timeline's fill —
  // which is §10's "content revealed only by animation" exactly. The guards
  // protect a reader whose browser does not run the animation; they do nothing
  // for the reader whose browser does.
  const bad = `
    @keyframes reveal { from { opacity: 0; clip-path: inset(0 0 100% 0); } to { opacity: 1; } }
    @supports (animation-timeline: view()) {
      @media (prefers-reduced-motion: no-preference) {
        .card { animation-name: reveal; animation-timeline: view(); }
      }
    }`;
  const offences = findLoadBearingMotion(bad).join(' ');
  assert.match(offences, /opacity 0 in a keyframe hides content/);
  assert.match(offences, /clip-path .* in a keyframe hides content/);
});

test('LOAD-BEARING CONTROL: a transform-only keyframe is not an offence', () => {
  // Movement is permitted; hiding is not. Without this the check would forbid
  // all motion, and an auditor that rejects everything discriminates no better
  // than one that accepts everything.
  const good = `
    @keyframes settle { from { transform: translateY(12px) scale(0.985); } to { transform: translateY(0) scale(1); } }
    @supports (animation-timeline: view()) {
      @media (prefers-reduced-motion: no-preference) {
        .card { animation-name: settle; animation-timeline: view(); }
      }
    }`;
  assert.deepEqual(findLoadBearingMotion(good), []);
});

test('PROHIBITION: an easing that overshoots is caught', () => {
  // §1: "Olibana does not bounce." 1.56 on the output axis is the classic
  // back-ease; it passes the target and returns.
  const bad = '.card { animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }';
  assert.match(findMotionProhibitions(bad).join(' '), /overshoots/);
});

test('PROHIBITION: an easing that undershoots is caught too', () => {
  // Anticipation — pulling back before moving forward — is the same
  // exclamation mark facing the other way.
  assert.match(
    findMotionProhibitions('.c { animation-timing-function: cubic-bezier(0.5, -0.5, 0.5, 1); }').join(' '),
    /overshoots/,
  );
});

test('PROHIBITION: a duration below the 300ms floor is caught', () => {
  assert.match(findMotionProhibitions('.c { animation-duration: 120ms; }').join(' '), /below the 300ms floor/);
  // Seconds as well as milliseconds — 0.2s is the same defect in other units.
  assert.match(findMotionProhibitions('.c { transition-duration: 0.2s; }').join(' '), /below the 300ms floor/);
});

test('PROHIBITION CONTROL: the reduced-motion reset may go below the floor', () => {
  // §6 mandates it. It removes motion rather than hurrying it, which is the
  // thing the floor exists to prevent — so flagging it would invert the rule.
  const good = '@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; } }';
  assert.deepEqual(findMotionProhibitions(good), []);
});

test('PROHIBITION: an infinite loop outside motion.wind is caught', () => {
  const bad = '.badge { animation-name: pulse; animation-iteration-count: infinite; }';
  assert.match(findMotionProhibitions(bad).join(' '), /infinite iteration outside motion.wind/);
});

test('PROHIBITION: glassmorphism and animated gradients are caught', () => {
  assert.match(findMotionProhibitions('.c { backdrop-filter: blur(8px); }').join(' '), /glassmorphism/);
  assert.match(
    findMotionProhibitions('.c { animation-name: shift; } @keyframes shift { to { background: linear-gradient(red, blue); } }').join(' '),
    /glassmorphism|gradient/,
  );
});

test('INLINE: a literal duration is caught, a token reference is not', () => {
  assert.match(findInlineMotionValues('.c { animation-duration: 900ms; }').join(' '), /is a literal/);
  assert.deepEqual(findInlineMotionValues('.c { animation-duration: var(--motion-river-duration); }'), []);
});

// --- the parser the checks stand on --------------------------------------

test('PARSER: nested at-rules are reported outermost first', () => {
  const found = declarations('@supports (x: y) { @media (a) { .c { color: red; } } }');
  assert.equal(found.length, 1);
  assert.equal(found[0]?.selector, '.c');
  assert.deepEqual(found[0]?.atRules, ['@supports (x: y)', '@media (a)']);
});

test('PARSER: a declaration without a trailing semicolon is not lost', () => {
  // The last declaration in a block legally omits it. A parser that misses it
  // would silently skip whichever rule happened to be written last, which is a
  // false negative that looks exactly like a clean result.
  const found = declarations('.c { color: red }');
  assert.equal(found.length, 1);
  assert.equal(found[0]?.property, 'color');
});

test('PARSER: braces inside comments and strings do not shift the block stack', () => {
  // A previous checker in this repository counted a brace inside a regex
  // literal and reported a defect that did not exist. A checker that cannot
  // parse is worse than none, because its output gets trusted.
  const found = declarations('.c { /* } */ content: "}"; color: red; }');
  assert.deepEqual(found.map((d) => d.selector), ['.c', '.c']);
  assert.equal(found[1]?.property, 'color');
});

// --- the light states, validated per state ------------------------------
//
// 05_VISUAL_SYSTEM.md §4 constraint 3: "All three states pass WCAG AA.
// Validated per state in CI. A state that fails is corrected, not shipped with
// an exception."
//
// It had never been validated in any state but one, and could not have been:
// nothing in the system ever set `data-light`, so dawn and dusk were
// unreachable code. The browser check now renders both colour schemes, and this
// is the same property held at unit level, where it fails in a second rather
// than needing a browser to be installed.

const STATES: ReadonlyArray<readonly [string, string]> = [
  ['daylight', ''],
  ['dawn', '[data-light="dawn"]'],
  ['dusk', '[data-light="dusk"]'],
  ['dark (prefers-color-scheme)', 'prefers-color-scheme: dark'],
];

test('every light state defines a complete palette, not a partial one', () => {
  // §4 constraint 1. A role whose only definition lives in a state block leaves
  // any other state with an undefined variable — which does not fail loudly, it
  // falls back to the inherited colour. That is exactly how the purchase button
  // came to paint its label in its own background.
  const daylight = resolveRoles(stylesheet, '');
  for (const role of ['--surface-base', '--content-primary', '--content-secondary', '--content-tertiary', '--line-hairline']) {
    assert.ok(daylight[role] !== undefined, `${role} is not defined on bare :root`);
  }
  for (const [name, selector] of STATES) {
    const state = { ...daylight, ...resolveRoles(stylesheet, selector) };
    for (const role of Object.keys(daylight)) {
      assert.ok(state[role] !== undefined, `${name} leaves ${role} undefined`);
    }
  }
});

test('every light state meets WCAG 1.4.3 AA for body text', () => {
  const daylight = resolveRoles(stylesheet, '');
  const failures: string[] = [];

  for (const [name, selector] of STATES) {
    const roles = { ...daylight, ...resolveRoles(stylesheet, selector) };
    const surface = roles['--surface-base'] as string;
    for (const role of ['--content-primary', '--content-secondary', '--content-tertiary']) {
      const ratio = contrastRatio(roles[role] as string, surface);
      if (ratio < 4.5) failures.push(`${name}: ${role} on --surface-base is ${ratio}:1, below 4.5:1`);
    }
    // The purchase button inverts the ground; it is the one control that
    // completes a sale, so it is checked in every state too.
    const inverse = contrastRatio(roles['--content-inverse'] as string, roles['--surface-inverse'] as string);
    if (inverse < 4.5) failures.push(`${name}: the purchase button is ${inverse}:1, below 4.5:1`);
  }

  assert.deepEqual(failures, []);
});

test('CONTRAST CONTROL: the ratio calculation is right, and catches the value that shipped', () => {
  // Known pairs, so a bug in the calculator cannot make the check above pass by
  // computing nonsense. The third is the defect this cycle found: #8A8A8A on
  // white carried the footer, every list note and every form hint on every page
  // since the site was built.
  assert.equal(contrastRatio('#000000', '#FFFFFF'), 21);
  assert.equal(contrastRatio('#FFFFFF', '#FFFFFF'), 1);
  assert.ok(contrastRatio('#8A8A8A', '#FFFFFF') < 4.5, 'the value that shipped must fail');
  assert.ok(contrastRatio('#767676', '#FFFFFF') >= 4.5, 'the replacement must pass');
});

test('the dark state is ACTIVATED, not merely defined', () => {
  // Found by mutation M2, and it is this cycle's own premise recurring one
  // level up. Deleting the whole `@media (prefers-color-scheme: dark)` block
  // left all 25 tests green: with no activation the state resolves to daylight,
  // daylight passes AA, and the suite is satisfied by the feature not existing.
  //
  // That is exactly how dusk survived from the day the stylesheet was written —
  // defined, never entered, never rendered, never checked. A test that passes
  // when the thing under test is absent is not a test of it.
  const daylight = resolveRoles(stylesheet, '');
  const dark = resolveRoles(stylesheet, 'prefers-color-scheme: dark');

  assert.notEqual(
    dark['--surface-base'], daylight['--surface-base'],
    'a reader who prefers dark gets the daylight ground: the state is defined but not activated',
  );
  assert.notEqual(dark['--content-primary'], daylight['--content-primary']);
  // §4's own sketch: an explicit choice of daylight must win over the
  // preference, which is what makes constraint 4's override possible later.
  assert.match(stylesheet, /:root:not\(\[data-light="daylight"\]\)/);
});
