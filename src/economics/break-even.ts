/**
 * Unit economics and break-even quantity.
 *
 * SPEC: docs/business/02_FIRST_GARMENT_EXECUTION.md §1.4
 *       docs/business/UNIT_ECONOMICS.md §5 (decision rules)
 * Mirrors docs/business/tools/UNIT_ECONOMICS_CALCULATOR.xlsx
 *
 * The governing rule is UNIT_ECONOMICS.md §5.3: an unknown input is not zero.
 * A missing cost line makes contribution UNCOMPUTABLE, never optimistic. This
 * module refuses to produce a number it cannot support, because a loss-making
 * product that looks profitable is the specific failure it exists to prevent.
 *
 * All money is in minor units (integer). Never floats for currency.
 */

/** A cost line that may legitimately be unknown. */
export type Money = number | null;

export interface QuantityTier {
  readonly quantity: number;
  /** Cut-make-trim, per unit. */
  readonly cmt: Money;
  readonly fabric: Money;
  readonly trims: Money;
  readonly labels: Money;
  readonly packaging: Money;
}

export interface FixedCosts {
  readonly pattern: Money;
  readonly grading: Money;
  readonly sample: Money;
}

export interface CommercialAssumptions {
  readonly sellingPrice: Money;
  /** Payment processor rate as a fraction, e.g. 0.029. */
  readonly paymentRate: number | null;
  /** Flat per-transaction fee, minor units. */
  readonly paymentFlatFee: Money;
  readonly shippingSubsidy: Money;
  /** Provision for returns as a fraction of selling price. */
  readonly returnProvisionRate: number | null;
}

export interface TierResult {
  readonly quantity: number;
  readonly variableCost: number;
  readonly fixedCostPerUnit: number;
  readonly realUnitCost: number;
  readonly paymentFee: number;
  readonly shippingSubsidy: number;
  readonly returnProvision: number;
  readonly contribution: number;
  readonly contributionMargin: number;
  readonly profitable: boolean;
}

export type TierOutcome =
  | { readonly computable: true; readonly result: TierResult }
  | { readonly computable: false; readonly quantity: number; readonly missing: readonly string[] };

export type BreakEvenOutcome =
  | { readonly computable: true; readonly breakEvenQuantity: number; readonly tiers: readonly TierOutcome[] }
  | { readonly computable: false; readonly reason: 'no-profitable-tier'; readonly tiers: readonly TierOutcome[] }
  | { readonly computable: false; readonly reason: 'insufficient-data'; readonly missing: readonly string[]; readonly tiers: readonly TierOutcome[] };

function collectMissing(
  entries: ReadonlyArray<readonly [string, number | null]>,
): string[] {
  return entries.filter(([, v]) => v === null || v === undefined).map(([k]) => k);
}

export function evaluateTier(
  tier: QuantityTier,
  fixed: FixedCosts,
  assumptions: CommercialAssumptions,
): TierOutcome {
  if (!Number.isInteger(tier.quantity) || tier.quantity < 1) {
    throw new RangeError(`tier quantity must be a positive integer, received ${tier.quantity}`);
  }

  const missing = collectMissing([
    ['cmt', tier.cmt],
    ['fabric', tier.fabric],
    ['trims', tier.trims],
    ['labels', tier.labels],
    ['packaging', tier.packaging],
    ['pattern', fixed.pattern],
    ['grading', fixed.grading],
    ['sample', fixed.sample],
    ['sellingPrice', assumptions.sellingPrice],
    ['paymentRate', assumptions.paymentRate],
    ['paymentFlatFee', assumptions.paymentFlatFee],
    ['shippingSubsidy', assumptions.shippingSubsidy],
    ['returnProvisionRate', assumptions.returnProvisionRate],
  ]);

  if (missing.length > 0) {
    return { computable: false, quantity: tier.quantity, missing };
  }

  const variableCost =
    (tier.cmt as number) +
    (tier.fabric as number) +
    (tier.trims as number) +
    (tier.labels as number) +
    (tier.packaging as number);

  const totalFixed =
    (fixed.pattern as number) + (fixed.grading as number) + (fixed.sample as number);
  const fixedCostPerUnit = totalFixed / tier.quantity;
  const realUnitCost = variableCost + fixedCostPerUnit;

  const price = assumptions.sellingPrice as number;
  const paymentFee = price * (assumptions.paymentRate as number) + (assumptions.paymentFlatFee as number);
  const shippingSubsidy = assumptions.shippingSubsidy as number;
  const returnProvision = price * (assumptions.returnProvisionRate as number);

  const contribution = price - realUnitCost - paymentFee - shippingSubsidy - returnProvision;

  return {
    computable: true,
    result: {
      quantity: tier.quantity,
      variableCost,
      fixedCostPerUnit,
      realUnitCost,
      paymentFee,
      shippingSubsidy,
      returnProvision,
      contribution,
      contributionMargin: contribution / price,
      profitable: contribution > 0,
    },
  };
}

/**
 * Break-even quantity — the smallest tier whose contribution is positive.
 *
 * This value becomes `PreorderRun.minimumQuantity`. Below it the run must not
 * enter production: see the PREORDER_HELD guard in src/order/state-machine.ts.
 *
 * Fixed costs amortise across the tier, so contribution rises with quantity and
 * the first profitable tier is the break-even. Tiers are sorted ascending here
 * rather than assumed to be in order.
 */
export function findBreakEven(
  tiers: readonly QuantityTier[],
  fixed: FixedCosts,
  assumptions: CommercialAssumptions,
): BreakEvenOutcome {
  if (tiers.length === 0) {
    return { computable: false, reason: 'insufficient-data', missing: ['tiers'], tiers: [] };
  }

  const sorted = [...tiers].sort((a, b) => a.quantity - b.quantity);
  const outcomes = sorted.map((t) => evaluateTier(t, fixed, assumptions));

  const uncomputable = outcomes.filter((o) => !o.computable);
  if (uncomputable.length === outcomes.length) {
    const missing = [
      ...new Set(uncomputable.flatMap((o) => (o.computable ? [] : o.missing))),
    ];
    return { computable: false, reason: 'insufficient-data', missing, tiers: outcomes };
  }

  for (const outcome of outcomes) {
    if (outcome.computable && outcome.result.profitable) {
      return { computable: true, breakEvenQuantity: outcome.result.quantity, tiers: outcomes };
    }
  }

  return { computable: false, reason: 'no-profitable-tier', tiers: outcomes };
}

/**
 * The pre-order minimum is the break-even quantity, unless the supplier's MOQ
 * is higher — in which case MOQ binds, because nothing smaller can be produced.
 */
export function preorderMinimum(
  breakEven: BreakEvenOutcome,
  supplierMoq: number | null,
): { readonly computable: true; readonly minimum: number; readonly bindingConstraint: 'break-even' | 'moq' }
  | { readonly computable: false; readonly reason: string } {
  if (!breakEven.computable) {
    return { computable: false, reason: breakEven.reason };
  }
  if (supplierMoq === null || supplierMoq === undefined) {
    return { computable: false, reason: 'supplier-moq-unknown' };
  }
  return supplierMoq > breakEven.breakEvenQuantity
    ? { computable: true, minimum: supplierMoq, bindingConstraint: 'moq' }
    : { computable: true, minimum: breakEven.breakEvenQuantity, bindingConstraint: 'break-even' };
}
