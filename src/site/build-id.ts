/**
 * Which build is this.
 *
 * Without it there is no way to tell whether a deployment is serving the commit
 * that was pushed or one from a week ago — every other check passes either way.
 * A stale deploy is indistinguishable from a fresh one to anything that only
 * asks whether the site answers.
 *
 * Order of trust: the platform's own record of what it built, then the working
 * tree, then nothing. `unknown` is a real answer and must stay one — a marker
 * that invents a value when it cannot know is worse than absent, because it
 * would be believed.
 */

/** Cloudflare Pages sets this for every build it runs. */
const PLATFORM_VARIABLES = ['CF_PAGES_COMMIT_SHA', 'GITHUB_SHA', 'VERCEL_GIT_COMMIT_SHA'];

export const UNKNOWN_BUILD = 'unknown';

/**
 * Reads the build identifier from the environment, or from whatever `readGit`
 * returns. Returns `unknown` rather than guessing.
 *
 * `readGit` is injected rather than imported because this module is read by the
 * Workers runtime, which has neither `child_process` nor a repository to ask.
 * Only the Node build supplies one — see `src/site/build.ts`. It also means the
 * "nothing is available" path is exercised in tests rather than assumed.
 */
export function buildId(
  env: Readonly<Record<string, string | undefined>> = {},
  readGit: () => string | null = () => null,
): string {
  for (const name of PLATFORM_VARIABLES) {
    const value = (env[name] ?? '').trim();
    if (value !== '') return value.slice(0, 12);
  }
  const fromGit = readGit();
  return fromGit === null || fromGit.trim() === '' ? UNKNOWN_BUILD : fromGit.trim().slice(0, 12);
}
