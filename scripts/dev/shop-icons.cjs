// Draws the icons of the shopping app: Mishkan's look (its cream and the green roof of its
// logo) with the cart under the roof, at 192 and 512, and a maskable 512 with room around it.
// node scripts/dev/shop-icons.cjs src/components/ui/Icon.tsx public/icons
const { chromium } = (() => { try { return require('playwright'); } catch { return require('/opt/node22/lib/node_modules/playwright'); } })();
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
const out = process.argv[3];
const m = /\bcart: \[([\s\S]*?)\]/.exec(src);
const cart = [...m[1].matchAll(/'([^']+)'/g)].map((x) => `<path d="${x[1]}"/>`).join('');
// The drawing on a 192 square; `inset` leaves room for a maskable icon's safe zone.
const drawing = (inset) => `
  <rect width="192" height="192" rx="${inset > 0 ? 0 : 44}" fill="#f6f1e7"/>
  <g transform="translate(${inset} ${inset}) scale(${(192 - 2 * inset) / 192})">
    <path d="M42 84 L96 42 L150 84" fill="none" stroke="#1f5c52" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
    <svg x="60" y="82" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#b08433" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${cart}</svg>
  </g>`;
(async () => {
  const b = await chromium.launch();
  for (const [file, size, inset] of [['shop-192', 192, 0], ['shop-512', 512, 0], ['shop-maskable-512', 512, 28]]) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    await p.setContent(`<html><body style="margin:0;background:transparent"><svg width="${size}" height="${size}" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">${drawing(inset)}</svg></body></html>`);
    await p.screenshot({ path: `${out}/${file}.png`, omitBackground: true });
    await p.close();
  }
  await b.close();
})();
