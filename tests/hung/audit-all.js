// Run in the page: audits a list of same-origin routes inside 375px / 1280px iframes using ui-audit.js.
// usage: window.__auditAll(['/login','/dashboard'], 375) -> array of compact results
(() => {
  window.__auditAll = async (paths, width = 375, height = 800, waitMs = 4500) => {
    const src = await (await fetch('/tests/hung/ui-audit.js')).text();
    const out = [];
    for (const p of paths) {
      const f = document.createElement('iframe');
      f.style.cssText = `position:fixed;left:0;top:0;width:${width}px;height:${height}px;border:0;opacity:0;pointer-events:none`;
      f.src = p; document.body.appendChild(f);
      await new Promise((r) => f.addEventListener('load', r, { once: true }));
      await new Promise((r) => setTimeout(r, waitMs));
      try {
        const a = f.contentWindow.eval(src);
        const doc = f.contentDocument;
        out.push({
          p, w: width, overflow: a.horizontalOverflow, h1: a.h1, jumps: a.headingJumps, unnamed: a.unnamedControls, noLabel: a.inputsWithoutLabel,
          noAlt: a.imgsWithoutAlt, under12: a.textUnder12px, lowContrast: a.lowContrastNodes, lowTop: a.lowContrastTop.slice(0, 2),
          u24: a.under24, u24ex: a.under24Examples.slice(0, 3), imgsNoLazy: [...doc.images].filter((i) => i.loading !== 'lazy' && i.getBoundingClientRect().top > f.clientHeight).length,
          bodyText: doc.body.innerText.length,
        });
      } catch (e) { out.push({ p, error: String(e).slice(0, 80) }); }
      f.remove();
    }
    return out;
  };
  return 'ready';
})();
