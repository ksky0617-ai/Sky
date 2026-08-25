/**
 * The 404 contract, checked across both things that serve this site.
 *
 * There are two servers: `scripts/serve.mjs` locally and
 * `functions/[[path]].ts` on Cloudflare Pages. They share the router, and they
 * do NOT share what happens when the router declines — locally a file is read
 * off disk, on Pages the platform's asset binding answers. That is exactly
 * where a 404 contract diverges, and a divergence there is invisible to every
 * other test in this repository.
 *
 * It matters most for ADR-010. `/ja/` and `/ko/` must answer 404 with this
 * site's own document. If either server instead serves English, the policy is
 * broken; if either falls through to the host's default error page, the policy
 * holds by accident on one and by nothing on the other.
 *
 * ## What this cannot check
 *
 * A real Cloudflare deployment. There is none (GATE-001). What it checks is the
 * adapter Cloudflare calls, driven the way Cloudflare drives it, against the
 * local server — which is the strongest comparison available without
 * credentials, and is recorded as that rather than as a production result.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { build } from '../../src/site/build.ts';

const { onRequest } = await import('../../functions/[[path]].ts');

const work = mkdtempSync(resolve(tmpdir(), 'olibana-404-'));
const root = resolve(work, 'site');
build({ outDir: root });

test.after(() => rmSync(work, { recursive: true, force: true }));

/** The addresses whose behaviour the contract fixes. */
const CONTRACT = [
  { path: '/', status: 200, kind: 'page' },
  { path: '/en/', status: 200, kind: 'page' },
  { path: '/ja/', status: 404, kind: 'not-found' },
  { path: '/ja/nature', status: 404, kind: 'not-found' },
  { path: '/nonexistent', status: 404, kind: 'not-found' },
] as const;

/**
 * Serves a path the way the LOCAL server does: the router first, then a file
 * off disk, then the site's own 404 document.
 *
 * Deliberately a transcription of `scripts/serve.mjs`'s static branch rather
 * than an import — the script is a top-level program that binds a port. If the
 * two ever diverge, the divergence is the finding.
 */
function servedLocally(path: string): { status: number; body: string } {
  let file = resolve(root, '.' + decodeURIComponent(path.split('?')[0] as string));
  if (existsSync(file) && statSync(file).isDirectory()) file = resolve(file, 'index.html');
  if (!existsSync(file)) return { status: 404, body: readFileSync(resolve(root, '404.html'), 'utf8') };
  return { status: 200, body: readFileSync(file, 'utf8') };
}

/** Serves a path the way Cloudflare Pages does: `onRequest` with an ASSETS binding. */
async function servedOnPages(path: string): Promise<{ status: number; body: string }> {
  const env = {
    OLIBANA_MODE: 'closed',
    ASSETS: {
      // The platform's own static server, behaving as Pages does: a directory
      // resolves to its index, and a miss is answered with the site's 404.html
      // at status 404. That is Pages' documented behaviour for a Pages project
      // that ships a root 404.html, which this build now does.
      fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        let file = resolve(root, '.' + decodeURIComponent(url.pathname));
        if (existsSync(file) && statSync(file).isDirectory()) file = resolve(file, 'index.html');
        if (!existsSync(file)) {
          return Promise.resolve(new Response(readFileSync(resolve(root, '404.html'), 'utf8'), {
            status: 404, headers: { 'content-type': 'text/html' },
          }));
        }
        return Promise.resolve(new Response(readFileSync(file, 'utf8'), {
          status: 200, headers: { 'content-type': 'text/html' },
        }));
      },
    },
  };
  const response = await onRequest({ request: new Request(`https://olibana.test${path}`), env } as never);
  return { status: response.status, body: await response.text() };
}

const isOwn404 = (body: string): boolean =>
  body.includes('<meta name="robots" content="noindex">') && /Olibana/.test(body);
const looksEnglishContent = (body: string): boolean =>
  /The Atlases|Core Philosophy|Focus of Study/.test(body);

test('the 404 contract holds locally', async () => {
  for (const { path, status, kind } of CONTRACT) {
    const served = servedLocally(path);
    assert.equal(served.status, status, `local ${path} answered ${served.status}`);
    if (kind === 'not-found') {
      assert.ok(isOwn404(served.body), `local ${path} did not serve this site's 404 document`);
      assert.ok(!looksEnglishContent(served.body), `local ${path} served English content`);
    }
  }
});

test('the 404 contract holds on the deployment adapter', async () => {
  for (const { path, status, kind } of CONTRACT) {
    const served = await servedOnPages(path);
    assert.equal(served.status, status, `Pages ${path} answered ${served.status}`);
    if (kind === 'not-found') {
      assert.ok(isOwn404(served.body), `Pages ${path} did not serve this site's 404 document`);
      assert.ok(!looksEnglishContent(served.body), `Pages ${path} served English content`);
    }
  }
});

test('local and deployed answer the same thing — a difference is the finding', async () => {
  // The comparison, not two independent checks. Two servers that each satisfy
  // the contract separately can still differ, and the difference is what a
  // reader experiences as "it works locally".
  const differences: string[] = [];
  for (const { path } of CONTRACT) {
    const local = servedLocally(path);
    const pages = await servedOnPages(path);
    if (local.status !== pages.status) {
      differences.push(`${path}: local ${local.status} vs deployed ${pages.status}`);
    }
    if (isOwn404(local.body) !== isOwn404(pages.body)) {
      differences.push(`${path}: one served this site's 404 and the other did not`);
    }
  }
  assert.deepEqual(differences, [], 'the local and deployed 404 contracts diverge');
});

test('a disabled locale is not rescued by the router either', async () => {
  // The router owns `/checkout`, `/health` and friends. It must not decide to
  // own `/ja/anything` — a route added there would bypass the static layer
  // entirely and could answer with content.
  for (const path of ['/ja/', '/ja/nature', '/ko/']) {
    const pages = await servedOnPages(path);
    assert.equal(pages.status, 404, `${path} was answered by something`);
  }
  // And the router's own paths still work, so the check above is not passing
  // because the adapter refuses everything.
  const health = await servedOnPages('/health');
  assert.ok([200, 503].includes(health.status), `/health answered ${health.status}`);
});
