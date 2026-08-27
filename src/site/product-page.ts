/**
 * Product page rendering.
 *
 * SPEC: docs/business/02_FIRST_GARMENT_EXECUTION.md Part 2
 *       docs/website/01_SITE_AUDIT.md §14, §15 — the ten questions a product
 *       page must answer, and the Natural Rule block that distinguishes it
 * ADR-003 — the production window is stated BEFORE the purchase action.
 *
 * Two rules shape the order of this page:
 *
 *   1. The decision layer precedes the meaning layer. Price, size, delivery and
 *      returns sit above the Natural Rule, not below it. That resolution comes
 *      from 21_UX_PERFORMANCE_COST_AUDIT.md §13: the brand story and the facts
 *      a buyer needs were competing for the same vertical space, and the facts
 *      won.
 *
 *   2. An absent fact is shown as absent. No measurement is estimated, no
 *      delivery date is implied, and a missing Natural Rule leaves the section
 *      out rather than filling it with prose.
 */

import { escapeHtml } from './markdown.ts';
import { absentPhotography, awaiting, note } from './states.ts';
import type { Measurement, ProductRevision, Variant } from '../catalog/catalog.ts';
import type { PreorderWindow } from '../preorder/run.ts';

export function formatPrice(amount: number, currency: string): string {
  // Minor units to major. Zero-decimal currencies keep their integer form.
  const zeroDecimal = new Set(['JPY', 'KRW']);
  const value = zeroDecimal.has(currency) ? amount : amount / 100;
  return `${new Intl.NumberFormat('en', {
    minimumFractionDigits: zeroDecimal.has(currency) ? 0 : 2,
    maximumFractionDigits: zeroDecimal.has(currency) ? 0 : 2,
  }).format(value)} ${currency}`;
}

function priceRange(variants: readonly Variant[]): string | null {
  const priced = variants.filter(
    (v): v is Variant & { priceAmount: number; priceCurrency: string } =>
      v.priceAmount !== null && v.priceCurrency !== null,
  );
  if (priced.length === 0) return null;
  const currency = priced[0]!.priceCurrency;
  if (priced.some((v) => v.priceCurrency !== currency)) return null;
  const amounts = priced.map((v) => v.priceAmount);
  const low = Math.min(...amounts);
  const high = Math.max(...amounts);
  return low === high
    ? formatPrice(low, currency)
    : `${formatPrice(low, currency)} – ${formatPrice(high, currency)}`;
}

function measurementsTable(measurements: readonly Measurement[], sizes: readonly string[]): string {
  if (measurements.length === 0) {
    return awaiting(
      'No measurements',
      'have been recorded for this garment. They are taken from the approved sample, never estimated.',
    );
  }
  const head = ['', ...sizes].map((s) => `<th>${escapeHtml(s)}</th>`).join('');
  const rows = measurements
    .map((m) => {
      const cells = sizes
        .map((size) => {
          const value = m.bySize[size];
          // An unmeasured size shows an em dash, never a number.
          return `<td>${value === undefined ? '—' : `${value} cm`}</td>`;
        })
        .join('');
      return `<tr><th>${escapeHtml(m.label)}</th>${cells}</tr>`;
    })
    .join('');
  return `<div class="table-scroll"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

/**
 * The purchase form.
 *
 * A plain HTML form, no JavaScript: it works before any script would have
 * loaded, and this site ships none. The SKU is derived from the variant the
 * customer picks, so the value posted is one the catalogue already holds rather
 * than one assembled in the browser.
 *
 * The email field is here because ADR-004's hosted checkout needs somewhere to
 * send the confirmation. The address is NOT here — the gateway collects it, and
 * asking twice for something we then ignore is a form that lies about what it
 * does with an answer.
 */
function orderForm(product: ProductRevision, sizes: readonly string[]): string {
  const sellable = product.variants.filter((v) => v.priceAmount !== null);
  if (sellable.length === 0) return '';

  const options = sellable
    .map((v) => {
      const label = sizes.length > 1 ? `${v.size} — ${formatVariantPrice(v)}` : formatVariantPrice(v);
      return `<option value="${escapeHtml(v.sku)}">${escapeHtml(label)}</option>`;
    })
    .join('');

  return [
    '<h2>Reserve</h2>',
    '<form class="order" method="post" action="/checkout">',
    `<input type="hidden" name="productId" value="${escapeHtml(product.productId)}">`,
    '<div class="row">',
    '<div class="field">',
    '<label for="sku">Size</label>',
    `<select id="sku" name="sku" required>${options}</select>`,
    '</div>',
    '<div class="field">',
    '<label for="quantity">Quantity</label>',
    '<input id="quantity" name="quantity" type="number" inputmode="numeric" min="1" max="10" value="1" required>',
    '</div>',
    '</div>',
    '<div class="field">',
    '<label for="email">Email</label>',
    '<input id="email" name="email" type="email" autocomplete="email" required>',
    '<span class="hint">Where the order confirmation goes. Your address is collected at payment.</span>',
    '</div>',
    '<button type="submit">Continue to payment</button>',
    '</form>',
  ].join('\n');
}

function formatVariantPrice(variant: Variant): string {
  return formatPrice(variant.priceAmount as number, variant.priceCurrency as string);
}

/** A date the customer can act on, not a timestamp. */
function stateDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

/**
 * Renders a product page.
 *
 * `run` is the open pre-order run for this garment, or null when none is open.
 * With a run the page states two real dates — when the window closes and when
 * the garment is promised — instead of an approximate number of days. Both come
 * from the recorded run, which cannot be opened without them (ADR-003), so this
 * page cannot state a window that nobody committed to.
 */
export function renderProductBody(
  product: ProductRevision,
  run: PreorderWindow | null = null,
): string {
  const sizes = [...new Set(product.variants.map((v) => v.size))];
  const price = priceRange(product.variants);
  const lead = product.productionLeadDays;

  const parts: string[] = [
    `<h1>${escapeHtml(product.name)}</h1>`,
    `<div class="lede"><p>${escapeHtml(product.summary)}</p></div>`,
  ];

  // --- decision layer -----------------------------------------------------
  parts.push('<dl class="facts">');
  parts.push(`<dt>Price</dt><dd>${price ?? 'Not yet set'}</dd>`);
  parts.push(`<dt>Sizes</dt><dd>${sizes.map((s) => escapeHtml(s)).join(' · ')}</dd>`);
  if (product.materials.length > 0) {
    parts.push(`<dt>Material</dt><dd>${product.materials.map((m) => escapeHtml(m)).join(', ')}</dd>`);
  }
  const approximate = lead === null ? '' : ` — dispatched about ${lead} days after the order window closes`;
  parts.push(
    run === null
      ? `<dt>Availability</dt><dd>Pre-order${approximate}</dd>`
      : `<dt>Order window</dt><dd>Closes ${escapeHtml(stateDate(run.closesAt))}</dd>` +
        `<dt>Dispatched by</dt><dd>${escapeHtml(stateDate(run.promisedShipBy))}</dd>`,
  );
  parts.push('</dl>');

  // Where the garment's photograph goes. GATE-005: none exists, because no
  // garment has been made. The box is reserved at the 4:5 portrait crop a
  // garment is shot in, so this layout is the one the photograph lands in
  // rather than one that shifts when it arrives — and it holds no picture,
  // because a generated or stock stand-in would depict a product that does not
  // exist (02 §7).
  parts.push(absentPhotography(product.name));

  // ADR-003: the window is disclosed before the purchase action, not after.
  const window =
    run === null
      ? `the garment is made afterwards${approximate === '' ? '' : `, and dispatched about ${lead} days after the order window closes`}`
      : `the garment is made afterwards, and dispatched by ${escapeHtml(stateDate(run.promisedShipBy))}`;
  // A note, not an absence: the pre-order model is how this works, and it is
  // true now. Sharing one box with "no measurements have been recorded" made
  // an explanation and a gap look identical.
  parts.push(
    note(
      `<p><strong>This is a pre-order.</strong> Payment is taken when you order; ${window}. ` +
        'If the run does not reach its minimum, every order is refunded in full.</p>',
    ),
  );

  // The purchase action. Present only when a run is open, because only then is
  // there a window to promise — a button that cannot complete is worse than no
  // button, and the checkout would refuse it anyway (ADR-009).
  if (run !== null) {
    parts.push(orderForm(product, sizes));
  }

  parts.push('<h2>Measurements</h2>');
  parts.push('<div class="lede"><p>Garment measurements, taken flat, in centimetres.</p></div>');
  parts.push(measurementsTable(product.measurements, sizes));

  // --- meaning layer ------------------------------------------------------
  if (product.naturalRule !== null) {
    const rule = product.naturalRule;
    parts.push('<h2>The natural rule</h2>');
    parts.push(
      '<dl class="facts">' +
        `<dt>Source</dt><dd>${escapeHtml(rule.atlas)}</dd>` +
        `<dt>Observation</dt><dd>${escapeHtml(rule.observation)}</dd>` +
        `<dt>Translation</dt><dd>${escapeHtml(rule.translation)}</dd>` +
        '</dl>',
    );
  }

  return parts.join('\n');
}
