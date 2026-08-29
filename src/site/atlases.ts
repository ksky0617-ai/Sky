/**
 * The four Atlases, as a registry both directions of the hierarchy can read.
 *
 * ## Why this is its own module
 *
 * 03_INFORMATION_ARCHITECTURE.md §6 names two connections that run in opposite
 * directions:
 *
 *   Atlas → Product   `/nature/river` → the garments derived from that rule
 *   Product → Atlas   the product's Natural Rule block → `/nature/river`
 *
 * The route manifest builds the Atlas pages and the product page renderer
 * builds the products, and the manifest already imports the renderer. Putting
 * the registry in either of them would make the other import it back. So it
 * lives here, and neither owns it.
 *
 * ## The join is a title, and that is a decision
 *
 * A product records its rule as `{ atlas, observation, translation }`, where
 * `atlas` is a display title — "River Atlas". The connection is made by
 * matching that title against this registry, and **a title that matches nothing
 * produces no link.** The alternative would be to guess a slug from the string,
 * which would manufacture `/nature/material` from a Material Atlas that does
 * not exist and send a reader to a 404 — the same failure as the two dead `.md`
 * links, arrived at more cleverly.
 */

export interface AtlasSpec {
  readonly slug: string;
  /** The source document, read for the page body and the measurement count. */
  readonly file: string;
  /** Display title. Also the value a product's `naturalRule.atlas` carries. */
  readonly title: string;
  readonly description: string;
}

export const ATLASES: readonly AtlasSpec[] = [
  { slug: 'river', file: 'River_Atlas.md', title: 'River Atlas', description: 'Flow, curvature and reflection — what is studied, how it is measured, and what it yields.' },
  { slug: 'stone', file: 'Stone_Atlas.md', title: 'Stone Atlas', description: 'Fracture, strata and edge geometry — the surface grammar of Olibana.' },
  { slug: 'forest', file: 'Forest_Atlas.md', title: 'Forest Atlas', description: 'Branching, bark and canopy — hierarchical proportion drawn from growth.' },
  { slug: 'light', file: 'Light_Atlas.md', title: 'Light Atlas', description: 'Time of day, season, shadow and atmosphere — the source of colour and material choice.' },
];

/** The unprefixed path of an Atlas page. */
export function atlasPath(atlas: AtlasSpec): string {
  return `/nature/${atlas.slug}`;
}

/**
 * The Atlas a product's rule cites, or null when it cites something this site
 * does not publish.
 *
 * Null is the important return. `Design_System.md` already records a Material
 * Atlas as "a planned expansion", so a product citing one is a real
 * possibility — and it must render as text, not as a link to a page that has
 * never existed.
 */
export function atlasByTitle(title: string): AtlasSpec | null {
  return ATLASES.find((atlas) => atlas.title === title) ?? null;
}
