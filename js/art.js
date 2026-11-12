/*
 * 圖像工具：
 *  1. paintPlaceholder：正式插畫未到位時的品牌色佔位（紙張拼貼感的抽象色塊，不含文字）。
 *  2. radarSVG：八維圖譜（-2 到 +2 原始分數，不換算百分比）。
 */
(function (root) {
  const BRAND = ['#C9684B', '#DC9551', '#E8BE65', '#78945A', '#FAF4E8'];

  function rng(seed) {
    let s = seed * 9301 + 49297;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  /** 在 canvas 上畫佔位插畫。同一篇永遠畫出一樣的構圖。 */
  function paintPlaceholder(ctx, w, h, psalm, stageColor) {
    const r = rng(psalm + 11);
    const palette = [stageColor, ...BRAND.filter((c) => c !== stageColor)];
    ctx.save();
    ctx.fillStyle = '#FAF4E8';
    ctx.fillRect(0, 0, w, h);
    // 大面積主色：一張斜放的紙
    const tilt = (r() - 0.5) * 0.3;
    ctx.translate(w / 2, h * 0.42);
    ctx.rotate(tilt);
    ctx.fillStyle = palette[0];
    ctx.globalAlpha = 0.9;
    tornRect(ctx, -w * 0.38, -h * 0.26, w * 0.76, h * 0.5, r);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // 幾條撕紙色帶
    const strips = 3 + Math.floor(r() * 3);
    for (let i = 0; i < strips; i++) {
      ctx.globalAlpha = 0.55 + r() * 0.35;
      ctx.fillStyle = palette[1 + Math.floor(r() * 3)];
      const y = h * (0.12 + r() * 0.55);
      ctx.save();
      ctx.translate(w * (r() * 0.4), y);
      ctx.rotate((r() - 0.5) * 0.5);
      tornRect(ctx, 0, 0, w * (0.35 + r() * 0.5), h * (0.02 + r() * 0.05), r);
      ctx.restore();
    }
    // 一個圓形剪紙（位置隨機，不固定在天空）
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = palette[2];
    ctx.beginPath();
    ctx.arc(w * (0.2 + r() * 0.6), h * (0.15 + r() * 0.4), w * (0.06 + r() * 0.08), 0, Math.PI * 2);
    ctx.fill();
    // 紙張顆粒
    ctx.globalAlpha = 1;
    grain(ctx, w, h, r);
    ctx.restore();
  }

  function tornRect(ctx, x, y, w, h, r) {
    const steps = 14;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 1; i <= steps; i++) ctx.lineTo(x + (w * i) / steps, y + (r() - 0.5) * h * 0.08);
    for (let i = 1; i <= steps; i++) ctx.lineTo(x + w + (r() - 0.5) * 6, y + (h * i) / steps);
    for (let i = steps - 1; i >= 0; i--) ctx.lineTo(x + (w * i) / steps, y + h + (r() - 0.5) * h * 0.08);
    ctx.closePath();
    ctx.fill();
  }

  function grain(ctx, w, h, r) {
    const n = Math.floor((w * h) / 90);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(90,60,30,.06)' : 'rgba(255,255,255,.10)';
      ctx.fillRect(r() * w, r() * h, 1.4, 1.4);
    }
  }

  /** 佔位圖轉成 dataURL（給 <img> 用）。 */
  function placeholderURL(psalm, stageColor, w = 800, h = 1000) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    paintPlaceholder(c.getContext('2d'), w, h, psalm, stageColor);
    return c.toDataURL('image/png');
  }

  /**
   * 八維雷達圖。series: [{values:{A..H}, color, dashed}]。
   * 半徑以 -2 為中心點、+2 為外圈做線性位置對應，只是作圖位置，不是百分比。
   */
  function radarSVG(series, names, opts = {}) {
    const dims = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const size = opts.size || 400, cx = size / 2, cy = size / 2, R = size * 0.29;
    const pt = (i, v) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / dims.length;
      const rr = R * ((v + 2) / 4);
      return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
    };
    let s = `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="${opts.label || '八維圖譜'}" xmlns="http://www.w3.org/2000/svg">`;
    for (const lv of [-2, -1, 0, 1, 2]) {
      const poly = dims.map((_, i) => pt(i, lv).map((n) => n.toFixed(1)).join(',')).join(' ');
      s += `<polygon points="${poly}" fill="${lv === 2 ? '#FFFDF7' : 'none'}" stroke="${lv === 0 ? '#D9C9AE' : '#EADFCB'}" stroke-width="${lv === 0 ? 1.4 : 1}" ${lv === 0 ? 'stroke-dasharray="3 4"' : ''}/>`;
    }
    dims.forEach((d, i) => {
      const [x, y] = pt(i, 2);
      s += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#EADFCB"/>`;
      const [lx, ly] = pt(i, 2.85);
      const anchor = Math.abs(lx - cx) < 8 ? 'middle' : lx > cx ? 'start' : 'end';
      s += `<text x="${lx.toFixed(1)}" y="${(ly + 5).toFixed(1)}" text-anchor="${anchor}" font-size="${opts.fontSize || 13}" fill="#6E5F52" font-family="Noto Sans TC, sans-serif">${names[d]}</text>`;
    });
    for (const se of series) {
      const known = dims.map((d, i) => (se.values[d] === undefined ? null : pt(i, se.values[d])));
      const poly = known.map((p, i) => (p || pt(i, 0)).map((n) => n.toFixed(1)).join(',')).join(' ');
      s += `<polygon points="${poly}" fill="${se.fill || 'none'}" stroke="${se.color}" stroke-width="${se.width || 2.4}" stroke-linejoin="round" ${se.dashed ? 'stroke-dasharray="6 5"' : ''}/>`;
      known.forEach((p) => { if (p) s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${se.dot || 3.4}" fill="${se.color}"/>`; });
    }
    s += `</svg>`;
    return s;
  }

  root.Art = { paintPlaceholder, placeholderURL, radarSVG, BRAND };
})(window);
