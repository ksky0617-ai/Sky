# POST-COMPLETION QUEUE

**Required by:** §31.16 · **Rule:** nothing in this file blocks the Completion Gate.

Work that is real but is not `REQUIRED_FOR_CURRENT_COMPLETION`. It is recorded
here rather than done, because §31.1 fixes the Completion Scope to the SSOT, the
approved SPEC, the LOCKED ADRs and the existing Gate — and §31.8 forbids the
loop where "it could be better" keeps the Gate open forever.

Each entry says what it is, what it would be worth, and what it would cost. None
of them is a defect. A defect goes to the Critical Path, not here.

---

## PCQ-001 · The router's pages use system type, not the brand's

- **Class:** IMPROVEMENT · **Priority:** high within this queue
- **Rationale:** The confirmation page is the first thing a customer sees after
  paying, and it currently looks like a different website — system font, no
  design tokens. It is legible, accessible and correct; it is not *Olibana*.
- **Expected value:** Brand coherence at the one moment a customer has just
  committed money.
- **Risk:** Low. The one constraint is that these pages must render correctly
  without the build having run, so tokens have to be inlined rather than linked.
- **Dependencies:** None.
- **Reversibility:** Fully reversible.

## PCQ-002 · A paid checkout that is paid twice needs a refund path

- **Class:** FUTURE_SCOPE · **Priority:** high within this queue
- **Rationale:** A customer who opens two tabs can complete two gateway sessions
  for one idempotency key. The second is correctly recognised as a duplicate and
  no second order is created — but the gateway took the money twice, and nothing
  here refunds it. Today this is unreachable: no gateway takes money at all.
- **Expected value:** Prevents a customer being charged twice with no automatic
  remedy.
- **Risk:** Refund automation touches real money and is an irreversible action
  (§31.18), so it stays behind a Human Gate even once built.
- **Dependencies:** A live gateway. Blocked by P0-7.
- **Reversibility:** N/A until a gateway exists.

## PCQ-003 · Per-session idempotency tokens

- **Class:** FUTURE_SCOPE
- **Rationale:** The submission key is derived from the selection, so one
  customer cannot place two separate orders for the same size at the same
  quantity. That is exactly right for one garment — the quantity field covers
  it — and wrong the moment a second garment ships.
- **Expected value:** Removes a real constraint at the point it starts to bite.
- **Risk:** Requires a runtime that can mint and store a token; the site
  currently ships no JavaScript and has no session store.
- **Dependencies:** A second product; a durable store.
- **Reversibility:** Reversible.

## PCQ-004 · Durable storage for `live` mode

- **Class:** BLOCKER *for live mode only* — not for the current Gate
- **Rationale:** The logs are files. Cloudflare Pages Functions have no writable
  filesystem, so `live` cannot run there as configured. `closed` has nothing to
  write and deploys as-is.
- **Expected value:** Without it, no real order can be persisted in production.
- **Risk:** Choosing the store (D1, R2, a small host with a disk) changes the
  persistence layer, which is the most heavily verified part of this system.
  **The seam now exists**: `src/persistence/storage.ts` names four operations,
  and a durable store implements them without the domain changing. The interface
  states the four guarantees an implementation must meet — append-only,
  cross-process exclusion, complete reads including a crashed tail, and exact
  truncation. An eventually-consistent key-value store meets neither the first
  nor the second, which is why this stays open rather than being closed with the
  nearest available option.
- **Dependencies:** P0-7 and a payment gateway — nothing needs this until real
  orders exist.
- **Reversibility:** Reversible while no data exists. Not afterwards.

## PCQ-005 · `fsync` before acknowledging an order

- **Class:** IMPROVEMENT (tracked as R-17)
- **Rationale:** A process kill is survived and tested. A power loss is not:
  nothing calls `fsync`, so an acknowledged record can still be in the OS page
  cache. Stripe's own record is the recovery path.
- **Expected value:** Closes the last durability gap.
- **Risk:** A sync per write costs latency. At one garment's volume that is
  irrelevant; the measurement should happen before it is assumed.
- **Dependencies:** Interacts with PCQ-004 — a different store may make it moot.
- **Reversibility:** Fully reversible.

## PCQ-008 · A durable-store implementation of `LogStorage`

- **Class:** FUTURE_SCOPE — the concrete half of PCQ-004
- **Rationale:** With the seam in place, what remains is one class: `read`,
  `append`, `truncate`, `withLock`. The hard part is not the code; it is picking
  a store that genuinely offers append-only semantics and exclusion across
  processes. D1 (SQLite, transactional) does. Workers KV does not.
- **Expected value:** Turns `live` mode from impossible into configurable.
- **Risk:** The durability tests spawn real processes against a filesystem. A new
  store needs its own equivalents, or its guarantees are assumed rather than
  measured — which is exactly how the two defects in cycle 10 got in.
- **Dependencies:** P0-7, and a decision about hosting.
- **Reversibility:** Reversible while no data exists.

## PCQ-006 · Contrast measured on every text pair, not only the purchase button

- **Class:** IMPROVEMENT
- **Rationale:** `visual-check.mjs` measures computed contrast on the one control
  that completes a purchase, because that is where a 1:1 ratio was actually
  found. Every other pair is unmeasured.
- **Expected value:** Would have caught the same defect anywhere else on the page.
- **Risk:** None; it is a wider sweep of a check that already exists.
- **Dependencies:** None.
- **Reversibility:** Fully reversible.

## PCQ-007 · Growth layer — Pinterest, media cluster, dropshipping

- **Class:** FUTURE_SCOPE, ordered by §22.19 and §31.15
- **Rationale:** The directive's own priority order is CORE → COMMERCE →
  PERSISTENCE → VERIFICATION → DEPLOYMENT → GROWTH. None of the growth
  architecture may expand the Core Completion criteria (§31.15), and the
  repository contains no existing Pinterest, media-cluster or dropshipping
  implementation to restore — checked, not assumed.
- **Expected value:** The acquisition and fulfilment halves of the business loop.
- **Risk:** Building distribution before there is a product to distribute is the
  failure Directive 3 §58 names. There is no product: the catalogue is empty and
  no run is open.
- **Dependencies:** A published product, which depends on a supplier quotation
  (P0-2), which is a user action.
- **Reversibility:** N/A — not started.

---

## What is deliberately NOT in this queue

Defects. Anything objectively broken goes to the Critical Path and is fixed in
the cycle that finds it. This file exists so that "could be better" has
somewhere to go that is not the Completion Gate.
