# Architecture Decision Records

Required by the *Business / System / Autonomous Loop Failure Elimination* directive §65.

Each record states Context, Problem, Options, Decision, Reason, Trade-offs, and Consequences. Records are immutable once accepted: a decision that changes is superseded by a new record rather than edited, so the reasoning behind an earlier choice stays readable.

| ID | Title | Status | Date |
| --- | --- | --- | --- |
| [ADR-001](./ADR-001-directive-priority-resolution.md) | Directive priority resolution | Accepted | 2026-08-15 |
| [ADR-002](./ADR-002-mvp-boundary.md) | MVP boundary — one product, complete loop | Accepted | 2026-08-15 |
| [ADR-003](./ADR-003-inventory-model.md) | Inventory model — pre-order | Accepted | 2026-08-15 |
| [ADR-004](./ADR-004-commerce-hosting-architecture.md) | Commerce and hosting architecture | Accepted | 2026-08-15 |
| [ADR-005](./ADR-005-garment-category.md) | First garment category — Outerwear | Accepted | 2026-08-15 |
| [ADR-006](./ADR-006-brand-direction-conflict.md) | Brand direction conflict: Vintage × Luxury × Y2K | **OPEN — conflict reported** | 2026-08-15 |
| [ADR-007](./ADR-007-spec-conflict-cancelled-terminal.md) | Spec conflict — CANCELLED is not terminal | Accepted | 2026-08-15 |
| [ADR-008](./ADR-008-idempotency-key-scope.md) | Idempotency key scope in a persistent store | Accepted | 2026-08-15 |
| [ADR-010](./ADR-010-launch-locale-route-policy.md) | Launch locale route policy | Accepted | 03 §5 wants locale prefixes from launch, 03 §1 forbids routes that cannot be truthfully filled, and no translation exists. §5 is read as requiring locale-aware architecture, not fabricated translations: `en` ships, `ja` and `ko` are declared and disabled, and a disabled locale resolves to nothing rather than falling back to English. |
