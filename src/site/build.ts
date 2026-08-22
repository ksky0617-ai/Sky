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

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

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

  emit('styles.css', stylesheet);
  for (const route of routes) {
    emit(route.file, renderDocument({ route, nav, stylesheetHref: '/styles.css' }));
  }
  emit('sitemap.xml', renderSitemap(routes, origin));
  emit('robots.txt', renderRobots(origin));

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
    throw error;
  }
}
