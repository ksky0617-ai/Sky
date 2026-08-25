/**
 * Which locales exist, and which of them may be served.
 *
 * ADR-010 resolves a conflict inside 03_INFORMATION_ARCHITECTURE.md: §5 wants
 * locale-prefixed routes from launch, §1 forbids routes that cannot be
 * truthfully filled, and no Japanese or Korean translation exists. Serving
 * English from `/ja/` would represent the page as localized when it is not.
 *
 * The resolution is architectural: locale-aware routing ships, fabricated
 * translations do not.
 *
 * ## Why `enabled` is derived and not declared
 *
 * The single failure this file exists to prevent is a locale being switched on
 * by someone who has not supplied its content — which is exactly how `/ja/`
 * would come to serve English. So `enabled` is not a field anyone can set. It
 * is computed from whether the locale actually declares content, and a locale
 * with no content cannot be enabled by editing this file. Adding Japanese means
 * supplying Japanese, in the same commit, or the route does not appear.
 */

/** A locale's content, or the absence of it. */
export interface LocaleContent {
  /** `<html lang>`. */
  readonly lang: string;
  /**
   * Where this locale's page copy is read from, relative to the repository
   * root. `null` means no translation exists — the locale is declared so the
   * architecture is real, and disabled so the site does not lie.
   */
  readonly source: string | null;
}

export interface Locale extends LocaleContent {
  /** URL segment: `/en/…`. */
  readonly code: string;
  /** Display name, in the locale's own language. */
  readonly name: string;
}

/**
 * Every locale this site knows about, enabled or not.
 *
 * Japanese and Korean are here rather than absent on purpose: 03 §5 asks for
 * the architecture, and a registry that lists only the locale that works is not
 * architecture, it is a hardcoded language. They carry `source: null`, which is
 * what disables them.
 */
export const LOCALES: readonly Locale[] = [
  { code: 'en', name: 'English', lang: 'en', source: '.' },
  { code: 'ja', name: '日本語', lang: 'ja', source: null },
  { code: 'ko', name: '한국어', lang: 'ko', source: null },
];

/** The locale a request falls to when none is named. `/` serves this one. */
export const DEFAULT_LOCALE = 'en';

/**
 * Whether a locale may be served.
 *
 * ADR-010 acceptance 1 and 5, as a function rather than a promise: a locale is
 * enabled if and only if it has content. There is no flag to forget to unset.
 */
export function isEnabled(locale: Locale): boolean {
  return locale.source !== null;
}

/** The locales that may be served. */
export function enabledLocales(): readonly Locale[] {
  return LOCALES.filter(isEnabled);
}

/** The locales that are declared but must not appear as routes. */
export function disabledLocales(): readonly Locale[] {
  return LOCALES.filter((locale) => !isEnabled(locale));
}

export function localeByCode(code: string): Locale | null {
  return LOCALES.find((locale) => locale.code === code) ?? null;
}

/**
 * Prefixes a site-absolute path with a locale.
 *
 * `localePath('en', '/')` is `/en/` — a locale root keeps its trailing slash,
 * because `/en` and `/en/` are different addresses and the one that reads as a
 * directory is the one people link to. Every other path loses it, per 03 §5's
 * "no trailing slash".
 */
export function localePath(code: string, path: string): string {
  return path === '/' ? `/${code}/` : `/${code}${path}`;
}

/**
 * The locale a path names, and what remains of the path.
 *
 * Returns `null` for a path that names no locale — including one that names a
 * DISABLED locale, which is the case that matters. `/ja/nature` must not
 * resolve to English content; it resolves to nothing, and the site answers 404.
 * ADR-010: "No fallback from /ja/ or /ko/ to English content will be presented
 * as localization."
 */
export function splitLocale(path: string): { locale: Locale; rest: string } | null {
  const match = /^\/([a-z]{2})(\/.*)?$/.exec(path);
  if (match === null) return null;

  const locale = localeByCode(match[1] as string);
  if (locale === null || !isEnabled(locale)) return null;

  const rest = match[2] ?? '/';
  return { locale, rest: rest === '' ? '/' : rest };
}
