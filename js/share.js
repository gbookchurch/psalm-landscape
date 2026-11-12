/*
 * 分享卡：「我的生命光景」風景版／數據版，限時動態 9:16 與貼文 4:5。
 * 只畫出詩篇、光景與（數據版的）八維位置，不包含任何題目或選項內容。
 * 繪製前先等字體載入，避免分享圖用到備用字體。
 */
(function (root) {
  const T = () => window.COPY;
  const SIZES = { story: [1080, 1920], post: [1080, 1350] };
  const FONT = '"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
  const INK = '#3A2E26', SOFT = '#6E5F52', TERRA = '#C9684B', CREAM = '#FAF4E8';
  let ctx = null, opts = { style: 'scene', ratio: 'story' }, lastBlob = null, lastFocus = null;

  const $ = (id) => document.getElementById(id);

  async function fontsReady(text) {
    if (!document.fonts || !document.fonts.load) return;
    const t = text.replace(/\s/g, '');
    const jobs = ['400', '700', '900'].map((w) => document.fonts.load(`${w} 40px "Noto Sans TC"`, t));
    await Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, 3500))]);
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = src;
    });
  }

  function wrap(c, text, maxW) {
    const lines = []; let line = '';
    for (const ch of text) {
      if (c.measureText(line + ch).width > maxW && line) {
        // 避免標點落在行首
        if (/[，。、；：！？」』）]/.test(ch)) { line += ch; lines.push(line); line = ''; continue; }
        lines.push(line); line = ch;
      } else line += ch;
    }
    if (line) lines.push(line);
    return lines;
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  /** 畫插畫區（正式圖或佔位），回傳是否成功使用正式圖。 */
  function drawArt(c, img, d, x, y, w, h) {
    c.save(); roundRect(c, x, y, w, h, 36); c.clip();
    let used = false;
    if (img) {
      const s = Math.max(w / img.width, h / img.height);
      c.drawImage(img, x + (w - img.width * s) / 2, y + (h - img.height * s) / 2, img.width * s, img.height * s);
      try { c.getImageData(x, y, 1, 1); used = true; } catch (e) { used = false; } // 本機檔案可能無法輸出，改用佔位
    }
    if (!used) {
      c.translate(x, y);
      Art.paintPlaceholder(c, w, h, d.psalm.psalm, d.stageColor);
    }
    c.restore();
    return used;
  }

  function drawRadar(c, scores, cx, cy, R) {
    const dims = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const names = T().dimNames;
    const pt = (i, v) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 8, rr = R * ((v + 2) / 4); return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; };
    c.save();
    for (const lv of [-2, -1, 0, 1, 2]) {
      c.beginPath(); dims.forEach((_, i) => { const [x, y] = pt(i, lv); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath();
      if (lv === 2) { c.fillStyle = '#FFFDF7'; c.fill(); }
      c.strokeStyle = lv === 0 ? '#D9C9AE' : '#EADFCB'; c.lineWidth = lv === 0 ? 3 : 2;
      c.setLineDash(lv === 0 ? [8, 10] : []); c.stroke();
    }
    c.setLineDash([]);
    c.font = `500 30px ${FONT}`; c.fillStyle = SOFT; c.textBaseline = 'middle';
    dims.forEach((d, i) => {
      const [x, y] = pt(i, 2); c.strokeStyle = '#EADFCB'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(x, y); c.stroke();
      const [lx, ly] = pt(i, 3.15);
      c.textAlign = Math.abs(lx - cx) < 10 ? 'center' : lx > cx ? 'left' : 'right';
      c.fillText(names[d], lx, ly);
    });
    c.beginPath();
    dims.forEach((d, i) => { const [x, y] = pt(i, scores[d] ?? 0); i ? c.lineTo(x, y) : c.moveTo(x, y); });
    c.closePath(); c.fillStyle = 'rgba(201,104,75,.16)'; c.fill(); c.strokeStyle = TERRA; c.lineWidth = 6; c.lineJoin = 'round'; c.stroke();
    dims.forEach((d, i) => { if (scores[d] === undefined) return; const [x, y] = pt(i, scores[d]); c.beginPath(); c.arc(x, y, 9, 0, 7); c.fillStyle = TERRA; c.fill(); });
    c.restore();
  }

  async function draw(d) {
    const [W, H] = SIZES[opts.ratio];
    const cv = $('share-canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d'); ctx = c;
    const stageName = d.stage.replace(/^\d\s*/, '');
    const allText = T().shareTitle + stageName + d.stageLine + d.psalm.title + '詩篇第篇' + d.psalm.psalm + T().shareFooter + Object.values(T().dimNames).join('');
    await fontsReady(allText);
    const img = await loadImage(d.imgSrc);

    c.fillStyle = CREAM; c.fillRect(0, 0, W, H);
    const M = 72, story = opts.ratio === 'story', data = opts.style === 'data';
    let y = story ? 140 : 84;

    // 標題
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    c.fillStyle = TERRA; c.font = `900 ${story ? 64 : 54}px ${FONT}`;
    c.fillText(T().shareTitle, M, y);
    y += story ? 46 : 34;

    // 先決定底部文字區，再讓插畫／圖譜填滿中間
    const footY = H - (story ? 90 : 56);
    c.font = `700 ${story ? 50 : 42}px ${FONT}`;
    const titleLines = wrap(c, d.psalm.title, W - 2 * M).slice(0, 2);
    const lineH = story ? 70 : 58;
    const textH = (story ? 110 : 84) + (story ? 78 : 62) + titleLines.length * lineH;
    let ty = footY - (story ? 90 : 60) - textH + (story ? 44 : 40); // 光景標籤的基線
    const top = y, bottom = ty - (story ? 44 : 40) - (story ? 70 : 48);

    if (data) {
      const band = story ? 300 : 0;
      if (band) drawArt(c, img, d, M, top, W - 2 * M, band);
      const areaTop = top + (band ? band + 40 : 0), areaH = bottom - areaTop;
      const R = Math.min((W - 2 * M) * 0.3, (areaH - 120) / 2);
      drawRadar(c, d.scores, W / 2, areaTop + areaH / 2, R);
    } else {
      drawArt(c, img, d, M, top, W - 2 * M, bottom - top);
    }
    y = ty;

    // 光景
    c.font = `700 ${story ? 34 : 30}px ${FONT}`;
    const chipW = c.measureText(stageName).width + 48;
    roundRect(c, M, y - (story ? 44 : 40), chipW, story ? 62 : 56, 31); c.fillStyle = d.stageColor; c.fill();
    c.fillStyle = '#fff'; c.fillText(stageName, M + 24, y);
    c.fillStyle = SOFT; c.font = `500 ${story ? 32 : 28}px ${FONT}`;
    const lineX = M + chipW + 22;
    c.fillText(d.stageLine, lineX, y - 2);
    y += story ? 110 : 84;

    // 詩篇篇號與標題
    c.fillStyle = TERRA; c.font = `700 ${story ? 40 : 34}px ${FONT}`;
    c.fillText('詩篇第', M, y);
    let x = M + c.measureText('詩篇第').width + 12;
    c.font = `900 ${story ? 120 : 96}px ${FONT}`; c.fillText(String(d.psalm.psalm), x, y + 6);
    x += c.measureText(String(d.psalm.psalm)).width + 12;
    c.font = `700 ${story ? 40 : 34}px ${FONT}`; c.fillText('篇', x, y);
    y += story ? 78 : 62;
    c.fillStyle = INK; c.font = `700 ${story ? 50 : 42}px ${FONT}`;
    for (const ln of titleLines) { c.fillText(ln, M, y); y += lineH; }

    // 頁尾
    c.fillStyle = SOFT; c.font = `500 ${story ? 28 : 24}px ${FONT}`;
    c.fillText(T().shareFooter, M, footY);

    lastBlob = await new Promise((r) => cv.toBlob(r, 'image/png'));
    $('share-native').hidden = !(lastBlob && navigator.canShare && navigator.canShare({ files: [new File([lastBlob], 'a.png', { type: 'image/png' })] }));
  }

  let data = null;
  function open(d) {
    data = d; lastFocus = document.activeElement;
    $('share-sheet').hidden = false;
    $('share-close').focus();
    draw(d);
  }
  function close() { $('share-sheet').hidden = true; if (lastFocus) lastFocus.focus(); }

  function setRadio(group, key, val) {
    group.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', b.dataset[key] === val));
  }
  document.querySelectorAll('#share-sheet [data-style]').forEach((b) => (b.onclick = () => { opts.style = b.dataset.style; setRadio(b.parentElement, 'style', opts.style); $('share-note').textContent = opts.style === 'data' ? '數據版會顯示你在八個維度的大致位置，但不會出現題目或你的選項。' : '分享圖只包含詩篇與光景，不會出現你的作答內容。'; draw(data); }));
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
  $('share-native').onclick = async () => {
    try { await navigator.share({ files: [new File([lastBlob], fname(), { type: 'image/png' })], title: T().shareTitle }); } catch (e) { /* 使用者取消 */ }
  };

  root.Share = { open };
})(window);
