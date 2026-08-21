import pkg from 'playwright-core';
const { chromium } = pkg;
const port = process.argv[2], out = process.argv[3];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
const errs = [];
for (const [name, path, w, h] of [
  ['home-desktop','/',1280,900], ['home-mobile','/',390,844],
  ['atlas-desktop','/nature/river',1280,900], ['philosophy-desktop','/olibana/philosophy',1280,900],
  ['notfound','/no-such',1280,900],
]) {
  const p = await b.newPage({ viewport:{width:w,height:h} });
  p.on('pageerror', e => errs.push(`${name}: ${e.message}`));
  p.on('response', r => { if (r.status()>=400 && !r.url().includes('/no-such')) errs.push(`${name}: ${r.status()} ${r.url()}`); });
  await p.goto(`http://127.0.0.1:${port}${path}`, { waitUntil:'load' });
  // Measure what a reader actually sees: visible text length and computed opacity of main.
  const m = await p.evaluate(() => {
    const main = document.querySelector('main');
    const cs = getComputedStyle(main);
    return {
      textLen: (main.innerText||'').trim().length,
      opacity: cs.opacity,
      mainHeight: Math.round(main.getBoundingClientRect().height),
      hidden: [...main.children].filter(el => getComputedStyle(el).opacity === '0').length,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  console.log(`${name.padEnd(19)} text=${String(m.textLen).padStart(5)} opacity=${m.opacity} mainH=${m.mainHeight} hiddenChildren=${m.hidden} overflow=${m.overflow}`);
  if (m.textLen < 100) errs.push(`${name}: only ${m.textLen} visible characters`);
  if (m.hidden > 0) errs.push(`${name}: ${m.hidden} children at opacity 0`);
  if (m.overflow) errs.push(`${name}: horizontal overflow`);
  await p.screenshot({ path:`${out}/${name}.png` });
  await p.close();
}
await b.close();
console.log(errs.length ? 'ERRORS:\n'+errs.join('\n') : '\nall pages render visible content, no hidden children, no overflow, no errors');
process.exit(errs.length?1:0);
// Run with:
//   npm run build && node scripts/serve.mjs dist &   # any static server
//   npm i --no-save playwright-core && node scripts/render-check.mjs <port> <outdir>
//
// NOT part of `npm test`: it needs a browser, and the project keeps zero
// dependencies. It is run deliberately and its result recorded in
// VERIFICATION_LOG.md, rather than pretending the unit suite covers rendering.
