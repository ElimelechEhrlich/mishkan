// Draws the icons of the app's shortcuts: Mishkan's own look (its cream and the green roof of
// its logo), with the symbol of each shortcut, from Icon.tsx, under the roof.
// node scripts/dev/shortcut-icons.cjs src/components/ui/Icon.tsx public/icons
const { chromium } = (() => { try { return require('playwright'); } catch { return require('/opt/node22/lib/node_modules/playwright'); } })();
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
const out = process.argv[3];
function paths(name) {
  const m = new RegExp(`\\b${name}: \\[([\\s\\S]*?)\\]`).exec(src);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}
const icons = { shopping: 'cart', new: 'plus', incomplete: 'alert', today: 'calendar' };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 192, height: 192 } });
  for (const [file, name] of Object.entries(icons)) {
    const d = paths(name).map((x) => `<path d="${x}"/>`).join('');
    await p.setContent(`<html><body style="margin:0;background:transparent">
<svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" rx="44" fill="#f6f1e7"/>
  <path d="M42 84 L96 42 L150 84" fill="none" stroke="#1f5c52" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
  <svg x="60" y="82" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#1f5c52" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>
</svg></body></html>`);
    await p.screenshot({ path: `${out}/shortcut-${file}.png`, omitBackground: true });
  }
  await b.close();
})();
