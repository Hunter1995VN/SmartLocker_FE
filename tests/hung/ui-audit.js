// Paste into the browser console (or run via javascript_tool) on any page: read-only UI measurements.
(() => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => { for (let n = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0.95) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };

  const out = { path: location.pathname, viewport: innerWidth + 'x' + innerHeight };
  out.horizontalOverflow = document.documentElement.scrollWidth > innerWidth + 1 ? document.documentElement.scrollWidth - innerWidth : 0;

  // touch targets
  const targets = [...document.querySelectorAll('a[href],button,[role=button],input:not([type=hidden]),select,textarea')].filter(vis);
  const small = targets.filter((el) => { const r = el.getBoundingClientRect(); return r.width < 44 || r.height < 44; });
  const tiny = targets.filter((el) => { const r = el.getBoundingClientRect(); return r.width < 24 || r.height < 24; });
  out.targets = targets.length; out.under44 = small.length; out.under24 = tiny.length;
  out.under24Examples = tiny.slice(0, 5).map((el) => (el.getAttribute('aria-label') || el.innerText || el.tagName).trim().slice(0, 28) + ' ' + Math.round(el.getBoundingClientRect().width) + 'x' + Math.round(el.getBoundingClientRect().height));

  // controls without an accessible name
  out.unnamedControls = targets.filter((el) => !(el.getAttribute('aria-label') || el.getAttribute('title') || (el.innerText || '').trim() || el.getAttribute('placeholder') || el.labels?.length || el.querySelector('img[alt]'))).length;
  out.imgsWithoutAlt = [...document.images].filter((i) => !i.hasAttribute('alt')).length;
  out.inputsWithoutLabel = [...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]),select,textarea')].filter(vis).filter((el) => !(el.labels?.length || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'))).length;

  // headings / landmarks
  out.h1 = document.querySelectorAll('h1').length; out.main = document.querySelectorAll('main').length;
  out.headingJumps = (() => { const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => +h.tagName[1]); let j = 0; for (let i = 1; i < hs.length; i++) if (hs[i] - hs[i - 1] > 1) j++; return j; })();

  // text contrast + tiny text
  const seen = new Map(); let tinyText = 0, textNodes = 0, low = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent.trim(); if (!t) continue; const el = n.parentElement; if (!el || !vis(el)) continue;
    const s = getComputedStyle(el); const fg = parse(s.color); if (!fg) continue;
    textNodes++; const size = parseFloat(s.fontSize); if (size < 12) tinyText++;
    const bg = bgOf(el); const eff = fg.a < 1 ? { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) } : fg;
    const cr = ratio(eff, bg); const large = size >= 24 || (size >= 18.66 && +s.fontWeight >= 700);
    if (cr < (large ? 3 : 4.5)) { low++; const key = `${s.color} on ${s.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'inherit' : s.backgroundColor} ${cr.toFixed(2)}:1 @${size}px`; seen.set(key, (seen.get(key) || 0) + 1); }
  }
  out.textNodes = textNodes; out.textUnder12px = tinyText; out.lowContrastNodes = low;
  out.lowContrastTop = [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${v}× ${k}`);

  // motion
  out.animatedElements = [...document.querySelectorAll('*')].filter((el) => { const s = getComputedStyle(el); return s.animationName !== 'none' && s.animationIterationCount === 'infinite'; }).length;
  out.reduceMotionRule = [...document.styleSheets].some((ss) => { try { return [...ss.cssRules].some((r) => r.media && /prefers-reduced-motion/.test(r.media.mediaText)); } catch { return false; } });
  return out;
})();
