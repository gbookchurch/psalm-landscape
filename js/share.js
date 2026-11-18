/*
 * 分享圖：「我的生命光景」風景版／數據版 × 限時動態 9:16／貼文 4:5。
 * web-0.7 折衷版：米色紙底、深綠襯線字、直排光景名稱、插畫以「印在紙上」的方式疊合。
 * 只畫出光景、詩篇與（數據版的）八個面向位置，不包含任何題目或選項內容。
 * 繪製前先等字體載入，避免分享圖用到備用字體。
 */
(function (root) {
  const T = () => window.COPY;
  const SIZES = { story: [1080, 1920], post: [1080, 1350] };
  const SERIF = '"Noto Serif TC","Noto Serif CJK TC","Songti TC","PMingLiU",serif';
  const SANS = '"Noto Sans TC","Noto Sans CJK TC","PingFang TC","Microsoft JhengHei",sans-serif';
  const INK = '#17402A', SOFT = '#45604C', ORANGE = '#EB5A0C', YELLOW = '#FFD24D', PAPER = '#FFF7E8', LINE = '#E3CFA6', TRACK = '#B9C7AE';
  const DOTS = ['#D77747', '#E6AE4B', '#C7BD85', '#91A48A'];
  const DIMS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const M = 72, W = 1080, R = W - M; // 左右邊界
  let opts = { style: 'scene', ratio: 'story' }, lastBlob = null, lastFocus = null, data = null, drawing = 0;
  const $ = (id) => document.getElementById(id);

  async function fontsReady(text) {
    if (!document.fonts || !document.fonts.load) return;
    const t = text.replace(/\s/g, '');
    const jobs = [
      ...['500', '700', '900'].map((w) => document.fonts.load(`${w} 40px "Noto Serif TC"`, t)),
      ...['500', '700'].map((w) => document.fonts.load(`${w} 40px "Noto Sans TC"`, t)),
    ];
    await Promise.race([Promise.all(jobs).catch(() => {}), new Promise((r) => setTimeout(r, 3500))]);
  }
  const loadImage = (src) => new Promise((res) => { if (!src) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });

  /* ---------- 基本繪圖工具 ---------- */
  const serif = (c, w, s) => (c.font = `${w} ${s}px ${SERIF}`);
  const sans = (c, w, s) => (c.font = `${w} ${s}px ${SANS}`);
  /** 設定字距（瀏覽器不支援時自動略過，不影響排版正確性）。 */
  const spacing = (c, px) => { try { c.letterSpacing = `${px}px`; } catch (e) { /* 略過 */ } };

  /** 依寬度斷行；標點不放行首。 */
  function wrap(c, text, maxW) {
    const lines = []; let line = '';
    for (const ch of text) {
      if (c.measureText(line + ch).width > maxW && line) {
        if (/[，。、；：！？」』）…]/.test(ch)) { line += ch; continue; }
        lines.push(line); line = ch;
      } else line += ch;
    }
    if (line) lines.push(line);
    return lines;
  }
  /** 斷行後讓各行長度接近，避免最後一行只剩一兩個字。 */
  function wrapEven(c, text, maxW) {
    const greedy = wrap(c, text, maxW);
    if (greedy.length < 2) return greedy;
    const chars = [...text], per = Math.ceil(chars.length / greedy.length);
    const lines = [];
    for (let i = 0; i < chars.length;) {
      let j = Math.min(chars.length, i + per);
      while (j < chars.length && /[，。、；：！？」』）…]/.test(chars[j])) j++; // 標點不放行首
      lines.push(chars.slice(i, j).join('')); i = j;
    }
    return lines.every((l) => c.measureText(l).width <= maxW) ? lines : greedy;
  }
  /** 經文：先依標點切短句，再確保每行不超過寬度。 */
  function verseWrap(c, text, maxW, maxLen) {
    const out = [];
    for (const l of PsalmText.verseLines(text, maxLen)) out.push(...wrapEven(c, l, maxW));
    return out;
  }

  function paper(c, H) {
    c.fillStyle = PAPER; c.fillRect(0, 0, W, H);
    const t = document.createElement('canvas'); t.width = t.height = 14;
    const tc = t.getContext('2d'); tc.fillStyle = 'rgba(23,64,42,.08)'; tc.beginPath(); tc.arc(7, 7, 2, 0, Math.PI * 2); tc.fill();
    c.fillStyle = c.createPattern(t, 'repeat'); c.fillRect(0, 0, W, H);
  }

  /** 頁首：四個品牌圈＋教會小本本（左），我的生命光景（右）。cy 是這一列的垂直中心。 */
  function header(c, cy, k) {
    const r = 9 * k; let x = M + r;
    for (const col of DOTS) { c.fillStyle = col; c.beginPath(); c.arc(x, cy, r, 0, Math.PI * 2); c.fill(); x += r * 2 + 8 * k; }
    c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillStyle = INK;
    serif(c, 900, 30 * k); spacing(c, 30 * k * 0.08); c.fillText(T().brand, x + 10 * k - r, cy + 1);
    sans(c, 700, 24 * k); spacing(c, 24 * k * 0.22); c.fillStyle = SOFT; c.textAlign = 'right';
    c.fillText(T().shareTitle, R + 24 * k * 0.22, cy + 1); // 補回最後一個字後面的字距
    spacing(c, 0); c.textBaseline = 'alphabetic';
  }

  /** 頁尾：左邊一句話、右邊網址。 */
  function footer(c, y, s) {
    c.textBaseline = 'alphabetic'; c.fillStyle = SOFT;
    serif(c, 700, s); spacing(c, s * 0.08); c.textAlign = 'left'; c.fillText(T().shareFooterLeft || '', M, y);
    sans(c, 500, s); spacing(c, 0); c.textAlign = 'right'; c.fillText(T().shareUrl || '', R, y);
  }

  /** 直排文字。xc 是這一行的水平中心，y 是第一個字的頂端。逗號、頓號、句號移到格子右上。 */
  function vText(c, text, xc, y, size, gapEm = 0) {
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const step = size * (1 + gapEm);
    let i = 0;
    for (const ch of text) {
      const cy = y + size / 2 + i * step;
      if (/[，。、]/.test(ch)) c.fillText(ch, xc + size * 0.56, cy - size * 0.56);
      else c.fillText(ch, xc, cy);
      i++;
    }
    c.textBaseline = 'alphabetic';
    return i * step;
  }

  /** 直排光景名稱＋右側的黃色螢光筆底。right 是右邊界，回傳佔用的高度。 */
  function stageName(c, name, right, y, size, maxH) {
    const n = [...name].length;
    if (maxH) size = Math.min(size, maxH / (n * 1.04));
    const h = n * size * 1.04;
    c.fillStyle = YELLOW; c.fillRect(right - size * 0.36, y, size * 0.28, h);
    c.fillStyle = INK; serif(c, 900, size);
    vText(c, name, right - size / 2, y, size, 0.04);
    return h;
  }

  /** 把光景說明排成直排的幾行（由右到左），每行最多 maxChars 個字。 */
  function vColumns(text, maxChars) {
    const cols = [];
    for (const part of PsalmText.stageLines(text)) {
      let s = part;
      while ([...s].length > maxChars) { cols.push([...s].slice(0, maxChars).join('')); s = [...s].slice(maxChars).join(''); }
      if (s) cols.push(s);
    }
    return cols;
  }

  /** 插畫：等比例放進 s×s 的方塊，邊緣淡出，再以「色彩增值」疊到紙上，讓紙的顆粒透出來。 */
  async function art(c, d, x, y, s) {
    const real = d.img ? await loadImage(d.img.src) : null;
    const im = real || await loadImage(Art.landscapeURL(d.psalm.psalm, d.stage, 1200, 1200));
    if (!im) return;
    const o = document.createElement('canvas'); o.width = o.height = Math.round(s);
    const oc = o.getContext('2d');
    const k = Math.min(s / im.width, s / im.height);
    oc.drawImage(im, (s - im.width * k) / 2, (s - im.height * k) / 2, im.width * k, im.height * k);
    oc.globalCompositeOperation = 'destination-in';
    const g = oc.createRadialGradient(s / 2, s / 2, (s / 2) * 0.78, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    oc.fillStyle = g; oc.fillRect(0, 0, s, s);
    c.save(); c.globalCompositeOperation = 'multiply'; c.drawImage(o, x, y); c.restore();
  }

  /** 「詩篇 第 N 篇」：N 是橘色大字。超過 maxW 時整組等比例縮小。回傳寬度。yb 是基線。 */
  function numeral(c, n, x, yb, big, small, maxW, dry) {
    const measure = (b, s) => {
      serif(c, 900, s); const w1 = c.measureText('詩篇 第').width, w3 = c.measureText('篇').width;
      serif(c, 900, b); const w2 = c.measureText(String(n)).width;
      const gap = b * 0.08;
      return { w1, w2, w3, gap, total: w1 + gap + w2 + gap + w3 };
    };
    let m = measure(big, small);
    if (maxW && m.total > maxW) { const k = maxW / m.total; big *= k; small *= k; m = measure(big, small); }
    if (dry) return { w: m.total, big };
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillStyle = INK; serif(c, 900, small); c.fillText('詩篇 第', x, yb);
    c.fillStyle = ORANGE; serif(c, 900, big); c.fillText(String(n), x + m.w1 + m.gap, yb);
    c.fillStyle = INK; serif(c, 900, small); c.fillText('篇', x + m.w1 + m.gap + m.w2 + m.gap, yb);
    return { w: m.total, big };
  }

  /**
   * 經文（主）＋出處＋標題（次）排成一欄，自動挑能放進 maxH 的最大字級。
   * align: 'left' | 'center'。回傳實際高度。dry 只量不畫。
   */
  function verseBlock(c, d, x, y, maxW, maxH, sizes, o = {}) {
    const refS = o.ref || 22, titleS = o.title || 26, align = o.align || 'left';
    let pick = null;
    for (const s of sizes) {
      serif(c, 700, s);
      const lines = d.verse ? verseWrap(c, d.verse.text, maxW, o.maxLen || 11) : [];
      serif(c, 500, titleS);
      const tl = wrapEven(c, d.psalm.title, maxW).slice(0, 2);
      const lh = s * 1.6;
      const h = lines.length * lh + (lines.length ? refS * 1.9 : 0) + (lines.length ? titleS * 0.6 : 0) + tl.length * titleS * 1.6;
      pick = { s, lines, tl, lh, h };
      if (h <= maxH) break;
    }
    if (o.dry) return pick.h;
    const ax = align === 'center' ? x + maxW / 2 : x;
    c.textAlign = align; c.textBaseline = 'alphabetic';
    let yy = y;
    c.fillStyle = INK; serif(c, 700, pick.s);
    for (const l of pick.lines) { yy += pick.lh; c.fillText(l, ax, yy - pick.lh * 0.28); }
    if (pick.lines.length) {
      yy += refS * 1.9; c.fillStyle = SOFT; sans(c, 500, refS); spacing(c, refS * 0.12);
      c.fillText(d.verse.ref, ax, yy - refS * 0.5); spacing(c, 0);
      yy += titleS * 0.6;
    }
    c.fillStyle = SOFT; serif(c, 500, titleS);
    for (const l of pick.tl) { yy += titleS * 1.6; c.fillText(l, ax, yy - titleS * 0.45); }
    return pick.h;
  }

  /** 粗線下方那一區：左邊「詩篇 第 N 篇」，右邊經文、出處、標題。 */
  function psalmRow(c, d, top, bottom, k) {
    const num = numeral(c, d.psalm.psalm, M, 0, 170 * k, 36 * k, 430 * k, true);
    numeral(c, d.psalm.psalm, M, top + num.big * 0.83, 170 * k, 36 * k, 430 * k);
    const x = M + num.w + 44;
    verseBlock(c, d, x, top, R - x, bottom - top, [40, 36, 32, 28, 25].map((s) => s * k), { ref: 22 * k, title: 26 * k });
  }

  /** 八個面向的位置條。實心點是使用者，圓圈是這篇詩。rowH 是每列高度。 */
  function dimRows(c, d, y, rowH, k) {
    const names = T().dimNames, ends = T().dimEnds;
    const nameW = 176 * k, endW = 90 * k, gap = 16, rr = 15 * k;
    const x0 = M + nameW + gap + endW + gap + rr, x1 = R - endW - gap - rr;
    DIMS.forEach((dim, i) => {
      const cy = y + rowH * i + rowH / 2;
      c.textBaseline = 'middle';
      c.fillStyle = INK; serif(c, 700, 26 * k); c.textAlign = 'left'; c.fillText(names[dim], M, cy);
      c.fillStyle = SOFT; sans(c, 500, 21 * k);
      c.textAlign = 'right'; c.fillText(ends[dim][0], x0 - rr - gap, cy);
      c.textAlign = 'left'; c.fillText(ends[dim][1], x1 + rr + gap, cy);
      c.fillStyle = TRACK; c.fillRect(x0 - rr, cy - 1, x1 - x0 + rr * 2, 2); c.fillRect((x0 + x1) / 2 - 1, cy - 7 * k, 2, 14 * k);
      const px = (v) => x0 + (x1 - x0) * Math.max(0, Math.min(1, (v + 2) / 4));
      c.beginPath(); c.arc(px(d.psalm[dim]), cy, rr - 2.5 * k, 0, Math.PI * 2); c.fillStyle = PAPER; c.fill(); c.lineWidth = 5 * k; c.strokeStyle = ORANGE; c.stroke();
      if (d.scores[dim] !== undefined) { c.beginPath(); c.arc(px(d.scores[dim]), cy, 10 * k, 0, Math.PI * 2); c.fillStyle = INK; c.fill(); }
      if (i < DIMS.length - 1) { c.fillStyle = LINE; c.fillRect(M, y + rowH * (i + 1) - 1, R - M, 1); }
    });
    c.textBaseline = 'alphabetic';
  }

  /** 數據區的標題列：左邊標題，右邊圖例。yb 是基線。 */
  function dataHead(c, d, yb, k) {
    c.textBaseline = 'alphabetic'; c.textAlign = 'left'; c.fillStyle = INK;
    serif(c, 900, 28 * k); spacing(c, 28 * k * 0.06); c.fillText('八個面向，我和這篇詩的位置', M, yb); spacing(c, 0);
    sans(c, 500, 22 * k); c.fillStyle = SOFT; c.textAlign = 'right';
    const t2 = `詩篇 ${d.psalm.psalm}`, w2 = c.measureText(t2).width, w1 = c.measureText('我').width;
    const cy = yb - 9 * k;
    let x = R; c.fillText(t2, x, yb); x -= w2 + 8 * k + 12 * k;
    c.beginPath(); c.arc(x, cy, 9.5 * k, 0, Math.PI * 2); c.lineWidth = 5 * k; c.strokeStyle = ORANGE; c.stroke();
    x -= 12 * k + 24 * k; c.fillStyle = SOFT; c.fillText('我', x, yb); x -= w1 + 8 * k + 10 * k;
    c.beginPath(); c.arc(x, cy, 10 * k, 0, Math.PI * 2); c.fillStyle = INK; c.fill();
  }

  /** 數據版上半部：插畫（左）、篇號與經文（中）、直排光景名稱（右）。 */
  async function dataTop(c, d, name, y, imgS, nameS, k) {
    await art(c, d, M, y, imgS);
    stageName(c, name, R, y, nameS, imgS);
    const x = M + imgS + 26, maxW = R - nameS - 26 - x;
    const num = numeral(c, d.psalm.psalm, x, 0, 112 * k, 28 * k, maxW, true);
    const o = { ref: 20 * k, title: 21 * k, maxLen: 9 };
    const sizes = [29, 26, 23, 21].map((s) => s * k);
    const vh = verseBlock(c, d, x, 0, maxW, imgS - num.big - 14, sizes, { ...o, dry: true });
    const top = y + Math.max(0, (imgS - (num.big + 14 + vh)) / 2);
    numeral(c, d.psalm.psalm, x, top + num.big * 0.83, 112 * k, 28 * k, maxW);
    verseBlock(c, d, x, top + num.big + 14, maxW, imgS - num.big - 14, sizes, o);
  }

  /* ---------- 四種版面 ---------- */

  async function postScene(c, d, name) {
    header(c, 82, 1);
    const top = 140, s = 736;
    await art(c, d, M, top, s);
    const nh = stageName(c, name, R, top, 150, 330);
    // 直排的光景說明，接在光景名稱下面
    c.fillStyle = SOFT; serif(c, 500, 28);
    const colW = 28 * 1.8, y0 = top + nh + 44, maxChars = Math.max(6, Math.floor((top + s - y0) / (28 * 1.1)));
    vColumns(d.stageLine, maxChars).slice(0, 3).forEach((col, i) => vText(c, col, R - colW / 2 - i * colW, y0, 28, 0.1));
    const rule = top + s + 30;
    c.fillStyle = INK; c.fillRect(M, rule, R - M, 3);
    psalmRow(c, d, rule + 33, 1244, 1);
    footer(c, 1288, 22);
  }

  async function storyScene(c, d, name) {
    header(c, 154, 34 / 30);
    const top = 228, rowH = 420;
    stageName(c, name, R, top, 200, 420);
    // 左欄由下往上排：心境標籤、光景說明、短線
    const maxW = R - 200 - 40 - M;
    let y = top + rowH;
    const tags = d.tags.slice(0, 3);
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    sans(c, 500, 30); c.fillStyle = SOFT;
    for (let i = tags.length - 1; i >= 0; i--) { c.fillText(tags[i], M, y - 12); y -= 54; }
    if (tags.length) y -= 20;
    serif(c, 700, 48); c.fillStyle = INK;
    const lines = PsalmText.stageLines(d.stageLine).flatMap((l) => wrap(c, l, maxW)).slice(0, 3);
    for (let i = lines.length - 1; i >= 0; i--) { c.fillText(lines[i], M, y - 22); y -= 84; }
    c.fillRect(M, y - 30, 64, 5);
    const s = 760, iy = top + rowH + 16;
    await art(c, d, (W - s) / 2, iy, s);
    const rule = iy + s + 22;
    c.fillStyle = INK; c.fillRect(M, rule, R - M, 3);
    psalmRow(c, d, rule + 33, 1752, 190 / 170);
    footer(c, 1802, 24);
  }

  async function postData(c, d, name) {
    header(c, 82, 1);
    await dataTop(c, d, name, 134, 420, 128, 1);
    const rule = 580;
    c.fillStyle = INK; c.fillRect(M, rule, R - M, 3);
    dataHead(c, d, rule + 55, 1);
    dimRows(c, d, rule + 81, 62, 1);
    footer(c, 1288, 22);
  }

  async function storyData(c, d, name) {
    header(c, 154, 34 / 30);
    await dataTop(c, d, name, 228, 440, 150, 1.12);
    const rule = 708;
    c.fillStyle = INK; c.fillRect(M, rule, R - M, 3);
    dataHead(c, d, rule + 66, 1.15);
    dimRows(c, d, rule + 100, 90, 1.15);
    // 結尾：光景說明與心境標籤
    const y = rule + 100 + 90 * 8 + 44;
    c.fillStyle = INK; c.fillRect(M, y, R - M, 3);
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    serif(c, 700, 40); c.fillStyle = INK;
    let yy = y + 78;
    for (const l of wrap(c, d.stageLine, R - M).slice(0, 2)) { c.fillText(l, W / 2, yy); yy += 62; }
    if (d.tags.length) { sans(c, 500, 28); c.fillStyle = SOFT; c.fillText(d.tags.slice(0, 3).join('・'), W / 2, yy + 2); }
    footer(c, 1802, 24);
  }

  async function draw(d) {
    const my = ++drawing;
    const [, H] = SIZES[opts.ratio];
    const off = document.createElement('canvas'); off.width = W; off.height = H;
    const c = off.getContext('2d');
    const name = d.stage.replace(/^\d\s*/, '');
    const allText = T().brand + T().shareTitle + name + d.stageLine + d.psalm.title + '詩篇第篇八個面向，我和這篇詩的位置' + (d.verse ? d.verse.text + d.verse.ref : '') + d.tags.join('') + (T().shareFooterLeft || '') + (T().shareUrl || '') + Object.values(T().dimNames).join('') + Object.values(T().dimEnds).flat().join('') + '0123456789:-・…';
    await fontsReady(allText);
    paper(c, H);
    const story = opts.ratio === 'story', scene = opts.style === 'scene';
    await (scene ? (story ? storyScene : postScene) : (story ? storyData : postData))(c, d, name);

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
    $('share-note').textContent = opts.style === 'data' ? '數據版會顯示你和這篇詩在八個面向的大致位置，但不會出現題目或你的選項。' : '分享圖只包含詩篇與光景，不會出現你的作答內容。';
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
