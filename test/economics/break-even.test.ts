import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateTier, findBreakEven, preorderMinimum,
  type CommercialAssumptions, type FixedCosts, type QuantityTier,
} from '../../src/economics/break-even.ts';

const fixed: FixedCosts = { pattern: 30000, grading: 15000, sample: 25000 };
const assumptions: CommercialAssumptions = {
  sellingPrice: 68000, paymentRate: 0.029, paymentFlatFee: 50,
  shippingSubsidy: 1500, returnProvisionRate: 0.05,
};
const tier = (quantity: number, cmt: number): QuantityTier => ({
  quantity, cmt, fabric: 8000, trims: 2000, labels: 300, packaging: 500,
});

test('UNKNOWN is not zero — a missing cost line makes the tier uncomputable', () => {
  const t: QuantityTier = { quantity: 10, cmt: null, fabric: 8000, trims: 2000, labels: 300, packaging: 500 };
  const out = evaluateTier(t, fixed, assumptions);
  assert.equal(out.computable, false);
  if (out.computable) return;
  assert.deepEqual(out.missing, ['cmt']);
});

test('every unknown input is named, not silently defaulted', () => {
  const out = evaluateTier(
    { quantity: 10, cmt: null, fabric: null, trims: 2000, labels: 300, packaging: 500 },
    { pattern: null, grading: 15000, sample: 25000 },
    { ...assumptions, sellingPrice: null },
  );
  assert.equal(out.computable, false);
  if (out.computable) return;
  assert.deepEqual([...out.missing].sort(), ['cmt', 'fabric', 'pattern', 'sellingPrice'].sort());
});

test('fixed costs amortise — real unit cost falls as quantity rises', () => {
  const a = evaluateTier(tier(10, 12000), fixed, assumptions);
  const b = evaluateTier(tier(100, 12000), fixed, assumptions);
  assert.ok(a.computable && b.computable);
  if (!a.computable || !b.computable) return;
  assert.equal(a.result.fixedCostPerUnit, 7000);
  assert.equal(b.result.fixedCostPerUnit, 700);
  assert.ok(b.result.realUnitCost < a.result.realUnitCost);
  assert.ok(b.result.contribution > a.result.contribution);
});

test('contribution subtracts every stated deduction', () => {
  const out = evaluateTier(tier(10, 12000), fixed, assumptions);
  assert.ok(out.computable);
  if (!out.computable) return;
  const r = out.result;
  assert.equal(r.variableCost, 22800);
  assert.equal(r.realUnitCost, 29800);
  assert.equal(r.paymentFee, 68000 * 0.029 + 50);
  assert.equal(r.returnProvision, 3400);
  assert.equal(r.contribution, 68000 - 29800 - (68000 * 0.029 + 50) - 1500 - 3400);
  assert.ok(r.profitable);
});

test('break-even is the smallest profitable tier', () => {
  // cmt chosen so tier 10 is under water and tier 20 clears:
  //   t20 variable 50,800 + fixed/unit 3,500 = 54,300 real
  //   68,000 - 54,300 - 2,022 - 1,500 - 3,400 = +6,778
  const tiers = [tier(10, 60000), tier(20, 40000), tier(30, 20000), tier(50, 12000)];
  const out = findBreakEven(tiers, fixed, assumptions);
  assert.equal(out.computable, true);
  if (!out.computable) return;
  assert.equal(out.breakEvenQuantity, 20);

  // The break-even must be a boundary, not merely a profitable tier:
  // everything below it is unprofitable, everything from it up is profitable.
  for (const t of out.tiers) {
    if (!t.computable) continue;
    assert.equal(
      t.result.profitable,
      t.result.quantity >= out.breakEvenQuantity,
      `tier ${t.result.quantity} sits on the wrong side of break-even`,
    );
  }
});

test('tiers supplied out of order are still evaluated ascending', () => {
  const tiers = [tier(50, 12000), tier(10, 60000), tier(30, 20000), tier(20, 40000)];
  const out = findBreakEven(tiers, fixed, assumptions);
  assert.ok(out.computable);
  if (!out.computable) return;
  assert.equal(out.breakEvenQuantity, 20);
  assert.deepEqual(out.tiers.map((t) => (t.computable ? t.result.quantity : t.quantity)), [10, 20, 30, 50]);
});

test('no profitable tier is reported as such, never as break-even zero', () => {
  const tiers = [tier(10, 90000), tier(20, 90000)];
  const out = findBreakEven(tiers, fixed, assumptions);
  assert.equal(out.computable, false);
  if (out.computable) return;
  assert.equal(out.reason, 'no-profitable-tier');
});

test('missing data is distinguished from unprofitability', () => {
  const tiers: QuantityTier[] = [
    { quantity: 10, cmt: null, fabric: null, trims: null, labels: null, packaging: null },
  ];
  const out = findBreakEven(tiers, fixed, assumptions);
  assert.equal(out.computable, false);
  if (out.computable) return;
  assert.equal(out.reason, 'insufficient-data');
});

test('empty tier list is insufficient data, not zero', () => {
  const out = findBreakEven([], fixed, assumptions);
  assert.equal(out.computable, false);
  if (out.computable) return;
  assert.equal(out.reason, 'insufficient-data');
});

test('pre-order minimum binds to MOQ when MOQ exceeds break-even', () => {
  const be = findBreakEven([tier(10, 12000), tier(30, 12000)], fixed, assumptions);
  assert.ok(be.computable);
  const withHighMoq = preorderMinimum(be, 100);
  assert.deepEqual(withHighMoq, { computable: true, minimum: 100, bindingConstraint: 'moq' });
  const withLowMoq = preorderMinimum(be, 5);
  assert.ok(withLowMoq.computable);
  if (!withLowMoq.computable) return;
  assert.equal(withLowMoq.bindingConstraint, 'break-even');
});

test('unknown MOQ does not produce a minimum', () => {
  const be = findBreakEven([tier(10, 12000)], fixed, assumptions);
  const out = preorderMinimum(be, null);
  assert.equal(out.computable, false);
  if (out.computable) return;
  assert.equal(out.reason, 'supplier-moq-unknown');
});

test('uncomputable break-even cannot yield a pre-order minimum', () => {
  const be = findBreakEven([tier(10, 90000)], fixed, assumptions);
  const out = preorderMinimum(be, 50);
  assert.equal(out.computable, false);
});

test('invalid quantity is rejected outright', () => {
  assert.throws(() => evaluateTier(tier(0, 1000), fixed, assumptions), RangeError);
  assert.throws(() => evaluateTier(tier(-5, 1000), fixed, assumptions), RangeError);
});
