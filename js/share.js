/*
 * 分享卡：「我的生命光景」風景版／數據版 × 限時動態 9:16／貼文 4:5（依視覺設計稿排版）。
 * 只畫出光景、詩篇與（數據版的）八維位置，不包含任何題目或選項內容。
 * 繪製前先等字體載入，避免分享圖用到備用字體。
 */
(function (root) {
  const T = () => window.COPY;
  const SIZES = { story: [1080, 1920], post: [1080, 1350] };
  const FONT = '"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
  const INK = '#3B2A1E', SOFT = '#6B5747', BRAND = '#F26B00', CREAM = '#FFF8EA', YELLOW = '#FFD978', GREEN = '#4EBB48';
  let opts = { style: 'scene', ratio: 'story' }, lastBlob = null, lastFocus = null, data = null, drawing = 0;
  const $ = (id) => document.getElementById(id);

  async function fontsReady(text) {
    if (!document.fonts || !document.fonts.load) return;
    const t = text.replace(/\s/g, '');
    const jobs = ['500', '700', '900'].map((w) => document.fonts.load(`${w} 40px "Noto Sans TC"`, t));
    await Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, 3500))]);
  }
  const loadImage = (src) => new Promise((res) => { if (!src) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });

  function wrap(c, text, maxW) {
    const lines = []; let line = '';
    for (const ch of text) {
      if (c.measureText(line + ch).width > maxW && line) {
        if (/[，。、；：！？」』）…]/.test(ch)) { line += ch; continue; } // 標點不放行首，先接在本行
        lines.push(line); line = ch;
      } else line += ch;
    }
    if (line) lines.push(line);
    return lines;
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  const font = (c, w, s) => (c.font = `${w} ${s}px ${FONT}`);

  function bookIcon(c, x, y, s, color) {
    c.save(); c.translate(x, y); c.scale(s / 32, s / 32); c.strokeStyle = color; c.lineWidth = 2.8; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(16, 9); c.bezierCurveTo(13, 6.6, 8.6, 6, 4, 6.6); c.lineTo(4, 23.6); c.bezierCurveTo(8.6, 23, 13, 23.6, 16, 26); c.bezierCurveTo(19, 23.6, 23.4, 23, 28, 23.6); c.lineTo(28, 6.6); c.bezierCurveTo(23.4, 6, 19, 6.6, 16, 9); c.closePath(); c.stroke();
    c.beginPath(); c.moveTo(16, 9); c.lineTo(16, 26); c.stroke(); c.restore();
  }
  function logo(c, x, y, s) { bookIcon(c, x, y - s * 0.82, s, BRAND); c.fillStyle = INK; font(c, 900, s * 0.72); c.textAlign = 'left'; c.fillText('教會小本本', x + s * 1.18, y); }
  function kicker(c, x, y, s, text) {
    font(c, 700, s); c.fillStyle = INK; c.textAlign = 'left';
    const w = c.measureText(text).width, dash = s * 1.2;
    c.fillRect(x, y - s * 0.36, dash, 3); c.fillText(text, x + dash + s * 0.5, y); c.fillRect(x + dash + s + w, y - s * 0.36, dash, 3);
  }
  function swoosh(c, x, y, w, t) {
    c.save(); c.strokeStyle = '#FFC93C'; c.lineWidth = t; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + w * 0.3, y - t * 1.1, x + w * 0.7, y - t * 1.3, x + w, y - t * 0.4); c.stroke(); c.restore();
  }
  function mark(c, text, x, y, size) {
    const w = c.measureText(text).width;
    c.fillStyle = YELLOW; c.fillRect(x - 6, y - size * 0.32, w + 12, size * 0.34);
    c.fillStyle = INK; c.fillText(text, x, y);
  }

  async function drawArt(c, d, x, y, w, h, r) {
    c.save(); rr(c, x, y, w, h, r); c.clip();
    let ok = false;
    const real = d.img ? await loadImage(d.img.src) : null;
    const im = real || await loadImage(Art.landscapeURL(d.psalm.psalm, d.stage, 1200, 900));
    if (im) {
      // 正式插畫完整顯示不裁切（圖內可能有篇號）；佔位圖則填滿
      const s = real ? Math.min(w / im.width, h / im.height) : Math.max(w / im.width, h / im.height);
      c.drawImage(im, x + (w - im.width * s) / 2, y + (h - im.height * s) / 2, im.width * s, im.height * s);
      try { c.getImageData(x, y, 1, 1); ok = true; } catch (e) { ok = false; }
    }
    if (!ok) { const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#FFF0C4'); g.addColorStop(1, '#B5DC72'); c.fillStyle = g; c.fillRect(x, y, w, h); }
    c.restore();
  }

  function card(c, d, x, y, w, sc, withQuote, dry) {
    // 先量高度
    const pad = 40 * sc;
    font(c, 900, 76 * sc); const numH = 92 * sc;
    font(c, 700, 38 * sc); const tLines = wrap(c, d.psalm.title, w - pad * 2).slice(0, 2);
    font(c, 500, 34 * sc); const qLines = withQuote && d.verse ? wrap(c, `「${d.verse.text}」`, w - pad * 2).slice(0, 3) : [];
    const h = pad + 44 * sc + numH + tLines.length * 54 * sc + (qLines.length ? 20 * sc + qLines.length * 50 * sc + 46 * sc : 0) + pad * 0.7;
    if (dry) return h;
    c.save(); c.shadowColor = 'rgba(150,100,40,.10)'; c.shadowBlur = 36 * sc; c.shadowOffsetY = 8 * sc;
    rr(c, x, y, w, h, 34 * sc); c.fillStyle = '#FFFDF8'; c.fill(); c.restore();
    let yy = y + pad + 30 * sc; const cx = x + w / 2;
    font(c, 700, 34 * sc); c.textAlign = 'left';
    const label = '推薦你閱讀的詩篇', lw = c.measureText(label).width + 52 * sc;
    bookIcon(c, cx - lw / 2, yy - 34 * sc, 40 * sc, BRAND); c.fillStyle = INK; c.fillText(label, cx - lw / 2 + 52 * sc, yy);
    yy += numH;
    font(c, 900, 76 * sc); const num = `詩篇 第 ${d.psalm.psalm} 篇`; mark(c, num, cx - c.measureText(num).width / 2, yy, 76 * sc);
    yy += 58 * sc; font(c, 700, 38 * sc); c.fillStyle = INK;
    for (const l of tLines) { c.fillText(l, cx - c.measureText(l).width / 2, yy); yy += 54 * sc; }
    if (qLines.length) {
      yy += 14 * sc; font(c, 500, 34 * sc); c.fillStyle = SOFT;
      for (const l of qLines) { c.fillText(l, cx - c.measureText(l).width / 2, yy); yy += 50 * sc; }
      font(c, 500, 28 * sc); c.fillStyle = '#9C8775'; c.textAlign = 'right'; c.fillText(`— ${d.verse.ref}`, x + w - pad, yy + 4 * sc); c.textAlign = 'left';
    }
    return h;
  }

  function radar(c, scores, cx, cy, R, fs) {
    const dims = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], names = T().dimNames;
    const pt = (i, v) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 8, r = R * ((v + 2) / 4); return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
    const fmt = (n) => (n === undefined ? '未答' : (n > 0 ? '+' : '') + (Math.round(n * 10) / 10).toFixed(1).replace('-0.0', '0.0').replace('+0.0', '0.0'));
    c.save();
    for (const lv of [2, 1, 0, -1]) {
      c.beginPath(); dims.forEach((_, i) => { const [x, y] = pt(i, lv); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath();
      if (lv === 2) { c.fillStyle = '#F7FBF0'; c.fill(); }
      c.strokeStyle = lv === 0 ? '#C9DDB0' : '#E3EDD5'; c.lineWidth = lv === 0 ? 3 : 2; c.setLineDash(lv === 0 ? [8, 10] : []); c.stroke();
    }
    c.setLineDash([]);
    dims.forEach((d, i) => {
      const [x, y] = pt(i, 2); c.strokeStyle = '#E3EDD5'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(x, y); c.stroke();
      const [lx, ly] = pt(i, 3.05);
      c.textAlign = Math.abs(lx - cx) < 10 ? 'center' : lx > cx ? 'left' : 'right';
      font(c, 700, fs); c.fillStyle = INK; c.fillText(`${d} ${names[d]}`, lx, ly - 4);
      c.fillStyle = '#2F8A2B'; c.fillText(fmt(scores[d]), lx, ly + fs + 2);
    });
    c.beginPath(); dims.forEach((d, i) => { const [x, y] = pt(i, scores[d] ?? 0); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath();
    c.fillStyle = 'rgba(140,194,99,.42)'; c.fill(); c.strokeStyle = GREEN; c.lineWidth = 5; c.lineJoin = 'round'; c.stroke();
    dims.forEach((d, i) => { if (scores[d] === undefined) return; const [x, y] = pt(i, scores[d]); c.beginPath(); c.arc(x, y, 8, 0, 7); c.fillStyle = GREEN; c.fill(); });
    c.restore();
  }

  function pills(c, tags, x, y, s) {
    font(c, 700, s); let xx = x;
    for (const t of tags) {
      const w = c.measureText(t).width + s * 1.3;
      rr(c, xx, y - s * 1.05, w, s * 1.55, s * 0.78); c.fillStyle = '#FFEDB8'; c.fill();
      c.fillStyle = '#7A4A12'; c.textAlign = 'left'; c.fillText(t, xx + s * 0.65, y); xx += w + s * 0.5;
    }
  }

  /** 繪本式插畫：米色紙底＋紙張邊緣遮罩融入背景（與結果頁同一套遮罩）。 */
  async function storybook(c, d, x, y, w, h) {
    const real = d.img ? await loadImage(d.img.src) : null;
    const im = real || await loadImage(Art.landscapeURL(d.psalm.psalm, d.stage, 1200, 1200));
    if (!im) return;
    // web-0.5：分享卡也使用柔和羽化；不修改原圖像素檔。
    const o = document.createElement('canvas');
    o.width = Math.max(1, Math.round(w)); o.height = Math.max(1, Math.round(h));
    const oc = o.getContext('2d');
    const s = Math.max(o.width / im.width, o.height / im.height);
    const dw = im.width * s, dh = im.height * s;
    oc.drawImage(im, (o.width - dw) / 2, (o.height - dh) * .39, dw, dh);
    oc.globalCompositeOperation = 'destination-in';
    const fade = oc.createRadialGradient(o.width*.5,o.height*.48,o.width*.29,o.width*.5,o.height*.48,o.width*.67);
    fade.addColorStop(0,'rgba(0,0,0,1)');
    fade.addColorStop(.48,'rgba(0,0,0,1)');
    fade.addColorStop(.73,'rgba(0,0,0,.90)');
    fade.addColorStop(.90,'rgba(0,0,0,.40)');
    fade.addColorStop(1,'rgba(0,0,0,0)');
    oc.fillStyle = fade; oc.fillRect(0,0,o.width,o.height);
    c.drawImage(o,x,y,w,h);
  }

  function pillsCenter(c, tags, cx, y, s) {
    font(c, 700, s);
    const ws = tags.map((t) => c.measureText(t).width + s * 1.3), gap = s * 0.5;
    let xx = cx - (ws.reduce((a, b) => a + b, 0) + gap * (tags.length - 1)) / 2;
    tags.forEach((t, i) => {
      rr(c, xx, y - s * 1.05, ws[i], s * 1.55, s * 0.78); c.fillStyle = '#FFEDB8'; c.fill();
      c.fillStyle = '#7A4A12'; c.textAlign = 'left'; c.fillText(t, xx + s * 0.65, y); xx += ws[i] + gap;
    });
  }
  function kickerCenter(c, cx, y, s, text) {
    font(c, 700, s); const w = c.measureText(text).width, dash = s * 1.2, total = w + dash * 2 + s;
    const x = cx - total / 2; c.fillStyle = INK; c.textAlign = 'left';
    c.fillRect(x, y - s * 0.36, dash, 3); c.fillText(text, x + dash + s * 0.5, y); c.fillRect(x + dash + s + w, y - s * 0.36, dash, 3);
  }

  async function draw(d) {
    const my = ++drawing;
    const [W, H] = SIZES[opts.ratio];
    const off = document.createElement('canvas'); off.width = W; off.height = H;
    const c = off.getContext('2d');
    const name = d.stage.replace(/^\d\s*/, '');
    const allText = T().shareTitle + name + d.stageLine + d.psalm.title + '詩篇第篇推薦你閱讀的教會小本本給此刻的你' + (d.verse ? d.verse.text + d.verse.ref : '') + d.tags.join('') + T().shareFooter + Object.values(T().dimNames).join('') + '0123456789+-.ABCDEFGH未答—「」…';
    await fontsReady(allText);
    const story = opts.ratio === 'story', M = 72, cx = W / 2;
    Art.paintPaper(c, W, H, d.psalm.psalm);
    c.textBaseline = 'alphabetic';

    // 1 品牌 → 2 我的生命光景 → 3 光景名稱 → 4 標籤與簡述（與結果頁相同順序）
    logo(c, M, story ? 116 : 88, story ? 52 : 44);
    let y = story ? 232 : 168;
    kickerCenter(c, cx, y, story ? 38 : 32, T().shareTitle);
    const ns = story ? 180 : 132;
    y += story ? 196 : 146;
    font(c, 900, ns); c.fillStyle = INK; c.textAlign = 'center'; c.fillText(name, cx, y);
    const nw = Math.max(c.measureText(name).width, 240);
    swoosh(c, cx - nw / 2, y + (story ? 34 : 26), nw, story ? 15 : 12);
    const tags = d.tags.slice(0, 3);
    if (tags.length) { y += story ? 112 : 84; pillsCenter(c, tags, cx, y, story ? 34 : 28); }
    y += story ? 78 : 58;
    font(c, 500, story ? 38 : 30); c.fillStyle = SOFT; c.textAlign = 'center';
    for (const l of wrap(c, d.stageLine, W - 2 * M).slice(0, 2)) { c.fillText(l, cx, y); y += story ? 56 : 44; }

    if (opts.style === 'scene') {
      // 5 插畫 → 6 推薦詩篇
      const sc = story ? 0.92 : 0.72;
      const cardW = W - 2 * M, cardH = card(c, d, M, 0, cardW, sc, true, true);
      const footY = H - (story ? 66 : 42);
      const cardY = footY - (story ? 54 : 36) - cardH;
      const artTop = y - (story ? 10 : 8);
      const artH = Math.min(W, cardY - artTop + (story ? 70 : 54)); // 卡片只壓在插畫已淡出的下緣
      await storybook(c, d, 0, artTop, W, artH);
      c.textAlign = 'left';
      card(c, d, M, cardY, cardW, sc, true);
    } else {
      if (story) {
        await storybook(c, d, 140, y - 10, W - 280, 430);
        const cy0 = y + 360, ch = card(c, d, M, cy0, W - 2 * M, 0.78, false);
        const R = 170, ry = cy0 + ch + R * 1.3 + 60;
        radar(c, d.scores, cx, ry, R, 28);
      } else {
        radar(c, d.scores, cx, y + 210, 140, 22);
        card(c, d, M, y + 440, W - 2 * M, 0.6, false);
      }
    }
    font(c, 500, story ? 26 : 22); c.fillStyle = SOFT; c.textAlign = 'center';
    c.fillText(T().shareFooter, cx, H - (story ? 66 : 42));

    if (my !== drawing) return; // 使用者已切換樣式
    const cv = $('share-canvas'); cv.width = W; cv.height = H; cv.getContext('2d').drawImage(off, 0, 0);
    lastBlob = await new Promise((r) => off.toBlob(r, 'image/png'));
    $('share-native').hidden = !(lastBlob && navigator.canShare && navigator.canShare({ files: [new File([lastBlob], 'a.png', { type: 'image/png' })] }));
  }

  function open(d) { data = d; lastFocus = document.activeElement; $('share-sheet').hidden = false; $('share-close').focus(); draw(d); }
  function close() { $('share-sheet').hidden = true; if (lastFocus) lastFocus.focus(); }
  function setRadio(group, key, val) { group.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', b.dataset[key] === val)); }
  document.querySelectorAll('#share-sheet [data-style]').forEach((b) => (b.onclick = () => {
    opts.style = b.dataset.style; setRadio(b.parentElement, 'style', opts.style);
    $('share-note').textContent = opts.style === 'data' ? '數據版會顯示你在八個面向的大致位置，但不會出現題目或你的選項。' : '分享圖只包含詩篇與光景，不會出現你的作答內容。';
    draw(data);
  }));
  document.querySelectorAll('#share-sheet [data-ratio]').forEach((b) => (b.onclick = () => { opts.ratio = b.dataset.ratio; setRadio(b.parentElement, 'ratio', opts.ratio); draw(data); }));
  $('share-close').onclick = close;
  $('share-sheet').addEventListener('click', (e) => { if (e.target.id === 'share-sheet') close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('share-sheet').hidden) close(); });
  const fname = () => `我的生命光景-詩篇${data.psalm.psalm}-${opts.style === 'data' ? '數據' : '風景'}-${opts.ratio === 'story' ? '9x16' : '4x5'}.png`;
  $('share-save').onclick = () => {
    if (!lastBlob) return;
    const a = document.createElement('a'); a.href = URL.createObjectURL(lastBlob); a.download = fname();
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  $('share-native').onclick = async () => { try { await navigator.share({ files: [new File([lastBlob], fname(), { type: 'image/png' })], title: T().shareTitle }); } catch (e) { /* 使用者取消 */ } };

  root.Share = { open };
})(window);
