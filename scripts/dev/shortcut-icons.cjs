const { chromium } = (() => { try { return require('playwright'); } catch { return require('/opt/node22/lib/node_modules/playwright'); } })();
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
const out = process.argv[3];
function paths(name) {
  const m = new RegExp(`\\b${name}: \\[([\\s\\S]*?)\\]`).exec(src);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}
const icons = { new: 'plus', shopping: 'cart', incomplete: 'alert', goals: 'target', debts: 'wallet' };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 192, height: 192 } });
  for (const [file, name] of Object.entries(icons)) {
    const d = paths(name).map((x) => `<path d="${x}"/>`).join('');
    await p.setContent(`<html><body style="margin:0;background:transparent"><div style="width:192px;height:192px;border-radius:44px;background:#1f5c52;display:flex;align-items:center;justify-content:center"><svg width="112" height="112" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${d}</svg></div></body></html>`);
    await p.screenshot({ path: `${out}/shortcut-${file}.png`, omitBackground: true });
  }
  await b.close();
})();
