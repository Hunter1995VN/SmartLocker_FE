// Read-only: snapshot computed colours of every element, then diff two snapshots.
// usage (in the page): await (0,eval)(src)  ->  window.__snap('before:/dashboard')  /  window.__diff('before:/dashboard','after:/dashboard')
(() => {
  const norm = (c) => {
    // normalise to rgb(r,g,b[,a]) with rounding so oklch/lab internals do not create false diffs
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (m) return 'rgb(' + m[1].split(',').map((x) => Math.round(parseFloat(x) * 100) / 100).join(',') + ')';
    return c;
  };
  const canvas = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const toRgb = (c) => {
    if (!c || c === 'transparent' || c === 'rgba(0, 0, 0, 0)') return 'none';
    canvas.clearRect(0, 0, 1, 1); canvas.fillStyle = '#000'; canvas.fillStyle = c; canvas.fillRect(0, 0, 1, 1);
    const d = canvas.getImageData(0, 0, 1, 1).data; return d[3] === 0 ? 'none' : `rgb(${d[0]},${d[1]},${d[2]},${(d[3] / 255).toFixed(2)})`;
  };
  window.__snap = (label) => {
    const out = [];
    document.querySelectorAll('body *').forEach((el, i) => {
      const r = el.getBoundingClientRect(); if (r.width === 0 && r.height === 0) { out.push(null); return; }
      const s = getComputedStyle(el);
      const b = (parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none') ? toRgb(s.borderTopColor) : '-';
      out.push([el.tagName, toRgb(s.color), toRgb(s.backgroundColor), b, el instanceof SVGElement ? toRgb(s.fill) + '/' + toRgb(s.stroke) : '']);
    });
    localStorage.setItem('snap:' + label, JSON.stringify(out));
    return { label, elements: out.length, visible: out.filter(Boolean).length };
  };
  window.__diff = (a, b) => {
    const A = JSON.parse(localStorage.getItem('snap:' + a) || 'null'), B = JSON.parse(localStorage.getItem('snap:' + b) || 'null');
    if (!A || !B) return { error: 'missing snapshot' };
    const n = Math.min(A.length, B.length); const diffs = {};
    let changed = 0;
    for (let i = 0; i < n; i++) {
      if (!A[i] || !B[i]) continue;
      ['color', 'background', 'border', 'svg'].forEach((k, j) => {
        const x = A[i][j + 1], y = B[i][j + 1];
        if (x !== y) { changed++; const key = `${k}: ${x} -> ${y}`; diffs[key] = (diffs[key] || 0) + 1; }
      });
    }
    return { lengthBefore: A.length, lengthAfter: B.length, comparedElements: n, changedProps: changed, kinds: Object.entries(diffs).sort((p, q) => q[1] - p[1]).slice(0, 12) };
  };
  return 'ready';
})();
