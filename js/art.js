/*
 * 圖像工具：
 *  1. landscapeSVG：正式插畫未到位時的佔位地景（依篇號固定變化、依光景換色，不含文字）。
 *  2. radarSVG：八維圖譜（-2 到 +2 原始分數，不換算百分比）。
 */
(function (root) {
  function rng(seed) {
    let s = (seed * 7919 + 104729) % 2147483647;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }
  const PAL = {
    or: ['#FFB547', '#FF8A1F'], ye: ['#FFE596', '#FFC74E'], gr: ['#B5DC72', '#6DB443'], gr2: ['#9ACF5E', '#4EAA3E'],
    rust: ['#F3A06A', '#D9673A'], sand: ['#F6DCA0', '#E3B862'],
  };
  /* 每種光景偏好的色層（由遠到近）；只用暖橙、黃、綠，不使用藍紫粉 */
  const STAGE_LAYERS = {
    1: ['ye', 'gr', 'gr2'], 2: ['or', 'ye', 'gr'], 3: ['or', 'gr', 'gr2'], 4: ['sand', 'or', 'gr'],
    5: ['sand', 'ye', 'gr'], 6: ['rust', 'or', 'gr2'], 7: ['rust', 'sand', 'gr2'], 8: ['ye', 'gr2', 'gr'], 9: ['ye', 'or', 'gr'],
  };

  function hill(r, baseY, amp, w, h) {
    const n = 3 + Math.floor(r() * 2);
    let d = `M0 ${h} L0 ${baseY + (r() - 0.5) * amp}`;
    for (let i = 1; i <= n; i++) {
      const x = (w * i) / n, cx = x - w / n / 2;
      d += ` Q${cx.toFixed(0)} ${(baseY - amp * (0.4 + r() * 0.8)).toFixed(0)} ${x.toFixed(0)} ${(baseY + (r() - 0.5) * amp * 0.6).toFixed(0)}`;
    }
    return d + ` L${w} ${h}Z`;
  }

  /** 佔位地景 SVG 字串（帶 width/height，可直接當圖片或畫進 canvas）。 */
  function landscapeSVG(psalm, stage, w = 800, h = 600) {
    const r = rng(psalm);
    const st = parseInt(stage, 10) || 1;
    const layers = STAGE_LAYERS[st] || STAGE_LAYERS[1];
    const id = 'p' + psalm;
    const deep = st === 7;
    const sunX = w * (0.25 + r() * 0.5), sunY = h * (0.18 + r() * 0.12), sunR = w * (deep ? 0.07 : 0.11 + r() * 0.05);
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
    s += `<defs><radialGradient id="${id}s" cx="${(sunX / w * 100).toFixed(0)}%" cy="${(sunY / h * 100).toFixed(0)}%" r="80%"><stop offset="0" stop-color="${deep ? '#F6E2C4' : '#FFF0C4'}"/><stop offset="1" stop-color="#FFF8EA"/></radialGradient>`;
    s += `<radialGradient id="${id}u" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#FFE48A"/><stop offset="1" stop-color="${deep ? '#E9A86A' : '#FFAA22'}"/></radialGradient>`;
    layers.forEach((k, i) => { s += `<linearGradient id="${id}h${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PAL[k][0]}"/><stop offset="1" stop-color="${PAL[k][1]}"/></linearGradient>`; });
    s += `<pattern id="${id}t" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(${-20 - r() * 20})"><rect width="5" height="14" fill="#fff" opacity=".16"/></pattern></defs>`;
    s += `<rect width="${w}" height="${h}" fill="url(#${id}s)"/>`;
    s += `<circle cx="${sunX.toFixed(0)}" cy="${sunY.toFixed(0)}" r="${(sunR * 1.8).toFixed(0)}" fill="#FFE7A0" opacity="${deep ? 0.25 : 0.45}"/>`;
    s += `<circle cx="${sunX.toFixed(0)}" cy="${sunY.toFixed(0)}" r="${sunR.toFixed(0)}" fill="url(#${id}u)"/>`;
    // 雲
    for (let i = 0; i < 2; i++) {
      const cx = w * (0.1 + r() * 0.8), cy = h * (0.3 + r() * 0.15), cw = w * (0.12 + r() * 0.08);
      s += `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${cw.toFixed(0)}" ry="${(cw * 0.28).toFixed(0)}" fill="#FFFDF6"/><ellipse cx="${(cx - cw * 0.35).toFixed(0)}" cy="${(cy - cw * 0.12).toFixed(0)}" rx="${(cw * 0.45).toFixed(0)}" ry="${(cw * 0.3).toFixed(0)}" fill="#FFFDF6"/>`;
    }
    // 山丘三層
    const bases = [0.52, 0.66, 0.8];
    layers.forEach((k, i) => {
      const d = hill(r, h * bases[i], h * (0.18 - i * 0.03), w, h);
      s += `<path d="${d}" fill="url(#${id}h${i})"/><path d="${d}" fill="url(#${id}t)"/>`;
      if (i === 1) {
        // 一條彎曲的小路或溪流，穿過中景
        const x0 = w * (0.35 + r() * 0.3);
        s += `<path d="M${x0.toFixed(0)} ${(h * 0.6).toFixed(0)} C${(x0 - w * 0.15).toFixed(0)} ${(h * 0.72).toFixed(0)} ${(x0 + w * 0.18).toFixed(0)} ${(h * 0.82).toFixed(0)} ${(w * 0.5).toFixed(0)} ${h}" fill="none" stroke="#FFF4D8" stroke-width="${(w * 0.035).toFixed(0)}" stroke-linecap="round" opacity=".9"/>`;
      }
    });
    // 一棵樹（位置與大小隨篇號）
    if (r() > 0.25) {
      const tx = w * (r() > 0.5 ? 0.18 + r() * 0.15 : 0.67 + r() * 0.15), ty = h * (0.58 + r() * 0.08), ts = w * (0.05 + r() * 0.03);
      s += `<path d="M${tx.toFixed(0)} ${(ty + ts * 1.6).toFixed(0)} L${tx.toFixed(0)} ${(ty - ts * 0.2).toFixed(0)}" stroke="#9A5B2E" stroke-width="${(ts * 0.22).toFixed(1)}" stroke-linecap="round"/>`;
      s += `<circle cx="${(tx - ts * 0.6).toFixed(0)}" cy="${(ty - ts * 0.1).toFixed(0)}" r="${(ts * 0.75).toFixed(0)}" fill="#8CC263"/><circle cx="${(tx + ts * 0.5).toFixed(0)}" cy="${(ty - ts * 0.2).toFixed(0)}" r="${(ts * 0.8).toFixed(0)}" fill="#7CBB4F"/><circle cx="${tx.toFixed(0)}" cy="${(ty - ts * 0.75).toFixed(0)}" r="${(ts * 0.9).toFixed(0)}" fill="#A9D86E"/>`;
    }
    s += `</svg>`;
    return s;
  }
  const landscapeURL = (psalm, stage, w, h) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(landscapeSVG(psalm, stage, w, h));

  /**
   * 八維雷達圖。series: [{values:{A..H}, color, fill, dashed}]。
   * 半徑以 -2 為中心、+2 為外圈作線性位置對應，只是作圖位置，不是百分比。
   * showValues：在標籤下方顯示第一組資料的原始分數。
   */
  function radarSVG(series, names, opts = {}) {
    const dims = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const size = opts.size || 440, cx = size / 2, cy = size / 2, R = size * 0.28;
    const pt = (i, v) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / dims.length;
      const rr = R * ((v + 2) / 4);
      return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
    };
    const fmt = (n) => (n === undefined ? '未答' : (n > 0 ? '+' : '') + (Math.round(n * 10) / 10).toFixed(1).replace('-0.0', '0.0').replace('+0.0', '0.0'));
    let s = `<svg class="radar" viewBox="0 0 ${size} ${size}" role="img" aria-label="${opts.label || '八維圖譜'}" xmlns="http://www.w3.org/2000/svg">`;
    for (const lv of [2, 1, 0, -1]) {
      const poly = dims.map((_, i) => pt(i, lv).map((n) => n.toFixed(1)).join(',')).join(' ');
      s += `<polygon points="${poly}" fill="${lv === 2 ? '#F7FBF0' : 'none'}" stroke="${lv === 0 ? '#C9DDB0' : '#E3EDD5'}" stroke-width="${lv === 0 ? 1.5 : 1}" ${lv === 0 ? 'stroke-dasharray="3 4"' : ''}/>`;
    }
    dims.forEach((d, i) => {
      const [x, y] = pt(i, 2);
      s += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#E3EDD5"/>`;
      const [lx, ly] = pt(i, 3.0);
      const anchor = Math.abs(lx - cx) < 8 ? 'middle' : lx > cx ? 'start' : 'end';
      const fs = opts.fontSize || 13;
      s += `<text x="${lx.toFixed(1)}" y="${(ly - (opts.showValues ? 2 : -4)).toFixed(1)}" text-anchor="${anchor}" font-size="${fs}" font-weight="700" fill="#3B2A1E" font-family="Noto Sans TC, sans-serif">${d} ${names[d]}</text>`;
      if (opts.showValues) s += `<text x="${lx.toFixed(1)}" y="${(ly + fs + 2).toFixed(1)}" text-anchor="${anchor}" font-size="${fs}" font-weight="700" fill="#2F8A2B" font-family="Noto Sans TC, sans-serif">${fmt(series[0].values[d])}</text>`;
    });
    for (const se of [...series].reverse()) {
      const known = dims.map((d, i) => (se.values[d] === undefined ? null : pt(i, se.values[d])));
      const poly = known.map((p, i) => (p || pt(i, 0)).map((n) => n.toFixed(1)).join(',')).join(' ');
      s += `<polygon points="${poly}" fill="${se.fill || 'none'}" stroke="${se.color}" stroke-width="${se.width || 2.4}" stroke-linejoin="round" ${se.dashed ? 'stroke-dasharray="6 5"' : ''}/>`;
      known.forEach((p) => { if (p) s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${se.dot || 3.6}" fill="${se.color}"/>`; });
    }
    return s + `</svg>`;
  }

  root.Art = { landscapeSVG, landscapeURL, radarSVG };
})(window);
