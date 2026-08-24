/**
 * Static site builder. Zero dependencies.
 *
 * Emits a directory that any static host serves as-is — Cloudflare Pages per
 * docs/adr/ADR-004-commerce-hosting-architecture.md, at no fixed cost.
 *
 * `--production` refuses to emit while the construction palette is present.
 * The brand palette is undetermined pending field measurement, so a production
 * build is expected to fail today. That failure is the point: it prevents an
 * unfinished palette from shipping by accident.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { buildId } from './build-id.ts';
import { headersFile } from './headers.ts';
import { renderDocument, renderRobots, renderSitemap } from './layout.ts';
import { buildRoutes, navigation } from './routes.ts';
import { findConstructionTokens, stylesheet } from './styles.ts';

export interface BuildOptions {
  readonly outDir: string;
  readonly production?: boolean;
  readonly origin?: string;
  /** Overridable so tests can build against a temporary catalogue. */
  readonly catalogPath?: string;
  readonly runsPath?: string;
}

export interface BuildResult {
  readonly files: readonly string[];
  readonly routes: readonly string[];
  readonly bytes: number;
}

export class ProductionGuardError extends Error {}

/** A link on a built page that points at an address the build did not emit. */
export class DeadLinkError extends Error {}

/**
 * Every internal link on every built page that resolves to nothing.
 *
 * Two shipped before this existed. The source documents link to each other the
 * way files in a repository do — `[Light_Atlas.md](./Light_Atlas.md)` — and
 * that address survived into the published HTML, where no `.md` file is served
 * at any address. Both pages were live and both links were 404s.
 *
 * Nothing caught it: the unit suite renders markdown and checks the anchor
 * exists, which it did; the deployment auditor follows navigation links, and
 * these were in body copy. It took pointing a browser at a route the visual
 * check had not covered. So the check now runs at build time, over the actual
 * emitted HTML, where an unreachable address cannot hide behind an assertion
 * that the link was rendered.
 *
 * External links (`http:`, `mailto:`) are out of scope — a build cannot verify
 * another origin, and pretending to would be the kind of claim this project
 * refuses to make. Fragments and query strings are stripped before matching:
 * `/nature#top` reaches `/nature`.
 */
export function findDeadLinks(pages: ReadonlyMap<string, string>, addresses: ReadonlySet<string>): string[] {
  const dead: string[] = [];
  for (const [page, html] of pages) {
    for (const [, href] of html.matchAll(/href="([^"]*)"/g)) {
      if (href === '' || /^(https?:|mailto:|tel:|data:|#)/.test(href)) continue;
      if (!href.startsWith('/')) {
        // A relative address on a static site depends on the directory the page
        // happens to sit in, which is exactly how the two dead links stayed
        // plausible. Site-absolute or nothing.
        dead.push(`${page}: "${href}" is relative, so where it lands depends on the page's directory`);
        continue;
      }
      const target = href.split('#')[0]?.split('?')[0] ?? '';
      if (target !== '' && !addresses.has(target) && !addresses.has(target.replace(/\/$/, ''))) {
        dead.push(`${page}: "${href}" is not an address this build emits`);
      }
    }
  }
  return dead;
}

export function build({ outDir, production = false, origin = '', catalogPath, runsPath }: BuildOptions): BuildResult {
  if (production) {
    const leaked = findConstructionTokens(stylesheet);
    if (leaked.length > 0) {
      throw new ProductionGuardError(
        `construction palette present, production build refused: ${leaked.join(', ')}\n` +
          'The brand palette is deferred pending field measurement ' +
          '(docs/website/05_VISUAL_SYSTEM.md §8). Derive it, replace these tokens, then rebuild.',
      );
    }
  }

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const routes = buildRoutes(catalogPath, runsPath);
  const nav = navigation(routes);
  const written: string[] = [];
  let bytes = 0;

  const emit = (relativePath: string, contents: string): void => {
    const target = resolve(outDir, relativePath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents, 'utf8');
    written.push(relativePath);
    bytes += Buffer.byteLength(contents, 'utf8');
  };

  // Node can ask git; the Workers runtime cannot, which is why the reader is
  // passed in rather than imported.
  const build = buildId(process.env, () => {
    try {
      return execFileSync('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
      });
    } catch {
      return null;
    }
  });

  const pages = new Map<string, string>();
  emit('styles.css', stylesheet);
  for (const route of routes) {
    const html = renderDocument({ route, nav, stylesheetHref: '/styles.css', build });
    pages.set(route.path, html);
    emit(route.file, html);
  }
  emit('sitemap.xml', renderSitemap(routes, origin));
  emit('robots.txt', renderRobots(origin));
  // Same headers the router sets in code, so a request is protected the same
  // way whichever half of the system answered it.
  emit('_headers', headersFile());

  // Every address this build serves: the routes, plus the assets it just
  // emitted. Checked after emission rather than before, so what is verified is
  // the HTML that will actually be served.
  const addresses = new Set<string>([
    ...routes.map((r) => r.path),
    '/styles.css', '/sitemap.xml', '/robots.txt', '/favicon.ico',
  ]);
  const dead = findDeadLinks(pages, addresses);
  if (dead.length > 0) {
    throw new DeadLinkError(
      `the build emits ${dead.length} link(s) that lead nowhere:\n  ${dead.join('\n  ')}\n\n` +
        'A source document linking to another document by file name is correct in the ' +
        'repository and a 404 on the site. Map it in routes.ts, or let it render unlinked.',
    );
  }

  return { files: written, routes: routes.map((r) => r.path), bytes };
}

const invokedDirectly = process.argv[1] !== undefined &&
  resolve(process.argv[1]).endsWith(resolve('src/site/build.ts').slice(-'src/site/build.ts'.length));

if (invokedDirectly) {
  const production = process.argv.includes('--production');
  const outDir = resolve(import.meta.dirname, '../../dist');
  try {
    const result = build({ outDir, production });
    process.stdout.write(
      `built ${result.files.length} files, ${result.routes.length} routes, ` +
        `${(result.bytes / 1024).toFixed(1)} KB\n` +
        result.routes.map((r) => `  ${r}\n`).join(''),
    );
  } catch (error) {
    if (error instanceof ProductionGuardError) {
      process.stderr.write(`\nPRODUCTION BUILD REFUSED\n\n${error.message}\n\n`);
      process.exit(1);
    }
    if (error instanceof DeadLinkError) {
      process.stderr.write(`\nBUILD REFUSED — BROKEN LINKS\n\n${error.message}\n\n`);
      process.exit(1);
    }
    throw error;
  }
}
