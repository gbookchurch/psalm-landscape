/* 主程式：路由、頁首、首頁、答題、結果、經文閱讀、關於 */
(function () {
  const C = window.CONFIG, T = window.COPY, Q = window.QUESTIONS, P = window.PSALMS;
  const byNum = Object.fromEntries(P.map((p) => [p.psalm, p]));
  const DIMS = Scoring.DIMS;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => (n > 0 ? '+' : '') + (Math.round(n * 10) / 10).toFixed(1).replace('-0.0', '0.0').replace('+0.0', '0.0');
  const stageName = (s) => s.replace(/^\d\s*/, '');
  const icon = (id, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;

  /* ---------- 狀態與本機暫存 ---------- */
  const KEY = 'psalm-quiz-v1';
  const state = { answers: {}, step: 0, done: false, altPsalm: null };
  const visibleQ = Q.filter((q) => q.id !== 'Q19' || C.q19.show);
  function save() {
    if (!C.saveProgress) return;
    try { localStorage.setItem(KEY, JSON.stringify({ answers: state.answers, step: state.step, done: state.done })); } catch (e) { /* 私密模式等情況下略過 */ }
  }
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.answers) Object.assign(state, s); } catch (e) { /* 忽略 */ }
  }
  function clear() {
    state.answers = {}; state.step = 0; state.done = false; state.altPsalm = null;
    try { localStorage.removeItem(KEY); } catch (e) { /* 忽略 */ }
  }
  const answeredCount = () => visibleQ.filter((q) => q.id in state.answers).length;

  /* ---------- 路由 ---------- */
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  function show(name) {
    document.querySelectorAll('.view').forEach((v) => (v.hidden = v.dataset.view !== name));
    closeMenu();
    window.scrollTo(0, 0);
  }
  function route() {
    const h = location.hash || '#/';
    let m;
    if (h.startsWith('#/quiz')) return renderQuiz();
    if (h.startsWith('#/result')) return renderResult(state.altPsalm);
    if (h.startsWith('#/about')) return renderAbout();
    if ((m = h.match(/^#\/read\/(\d{1,3})/))) return renderReader(+m[1]);
    if (h !== '#/' && h !== '#' && !h.startsWith('#/')) return; // 頁內錨點，維持目前畫面
    return renderHome();
  }

  /* ---------- 頁首 ---------- */
  function closeMenu() { $('nav').classList.remove('open'); $('menu-btn').setAttribute('aria-expanded', 'false'); }
  $('menu-btn').onclick = () => {
    const open = !$('nav').classList.contains('open');
    $('nav').classList.toggle('open', open);
    $('menu-btn').setAttribute('aria-expanded', String(open));
  };
  document.addEventListener('click', (e) => { if (!e.target.closest('#nav') && !e.target.closest('#menu-btn')) closeMenu(); });
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2400);
  }
  $('nav-share').onclick = async () => {
    closeMenu();
    const url = location.href.split('#')[0];
    const data = { title: T.siteTitle, text: T.homeSub, url };
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(url); toast('網址已複製，可以貼給朋友');
    } catch (e) { if (e && e.name !== 'AbortError') toast('請直接複製網址列分享'); }
  };

  /* ---------- 首頁 ---------- */
  function renderHome() {
    show('home');
    const n = answeredCount();
    $('btn-resume').hidden = !(n > 0 && !state.done);
    $('btn-resume').textContent = `${T.resume}（已答 ${n} 題）`;
    $('start-label').textContent = n > 0 ? '重新開始' : T.start;
    const lowPower = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) || (navigator.connection && navigator.connection.saveData);
    if (lowPower) $('hero').classList.add('static');
  }
  document.querySelectorAll('[data-copy]').forEach((el) => (el.textContent = T[el.dataset.copy]));
  $('btn-start').onclick = () => { clear(); go('#/quiz'); };
  $('btn-resume').onclick = () => go('#/quiz');

  /* ---------- 答題 ---------- */
  function renderQuiz() {
    show('quiz');
    if (state.step >= visibleQ.length) state.step = visibleQ.length - 1;
    const q = visibleQ[state.step];
    const total = visibleQ.length;
    const cur = state.answers[q.id];
    $('quiz-count').textContent = `第 ${state.step + 1} / ${total} 題`;
    $('progress').setAttribute('aria-valuemax', total);
    $('progress').setAttribute('aria-valuenow', state.step + 1);
    $('progress-bar').style.width = `${((state.step + 1) / total) * 100}%`;
    $('btn-prev').disabled = state.step === 0;
    $('btn-next').disabled = false;
    $('btn-next').firstChild.textContent = state.step === total - 1 ? '看結果' : '下一題';
    $('q-text').textContent = q.text;
    $('options').innerHTML = q.options.map((o, i) => `
      <button class="opt" type="button" role="radio" aria-checked="${cur === i}" data-i="${i}">
        <span class="radio" aria-hidden="true"></span><span class="txt">${esc(o.text)}</span>
      </button>`).join('');
    $('btn-skip').textContent = q.skip_text || '略過這題';
    $('btn-skip').setAttribute('aria-pressed', cur === null);
    $('options').querySelectorAll('.opt').forEach((b) => (b.onclick = () => answer(+b.dataset.i)));
    $('q-text').focus({ preventScroll: true });
  }
  let advancing = false;
  function answer(i) {
    if (advancing) return;
    const q = visibleQ[state.step];
    state.answers[q.id] = i; // null 代表略過
    save();
    $('options').querySelectorAll('.opt').forEach((b) => b.setAttribute('aria-checked', +b.dataset.i === i));
    $('btn-skip').setAttribute('aria-pressed', i === null);
    $('btn-next').disabled = false;
    advancing = true;
    setTimeout(() => { advancing = false; next(); }, 320);
  }
  function next() {
    if (state.step < visibleQ.length - 1) { state.step++; save(); renderQuiz(); }
    else { state.done = true; save(); go('#/result'); }
  }
  $('btn-skip').onclick = () => answer(null);
  $('btn-next').onclick = () => {
    const id = visibleQ[state.step].id;
    if (!(id in state.answers)) { state.answers[id] = null; save(); } // 沒選就前進，視為略過
    next();
  };
  $('btn-prev').onclick = () => { if (state.step > 0) { state.step--; save(); renderQuiz(); } };
  document.addEventListener('keydown', (e) => {
    if ($('view-quiz').hidden || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[1-4]$/.test(e.key)) { e.preventDefault(); answer(+e.key - 1); }
    else if (e.key === '0') { e.preventDefault(); answer(null); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); $('btn-prev').click(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); $('btn-next').click(); }
  });

  /* ---------- 經文工具 ---------- */
  /** 解析經文錨點，例如 "17:1-9,13-15"、"3:1–3,6–8"、"51:1-17；參撒母耳記下11–12章"。 */
  function anchorVerses(anchor, n) {
    const set = new Set();
    const main = String(anchor).split(/[；;]/)[0].replace(/–|—/g, '-');
    const m = main.match(/^(\d+):(.*)$/);
    if (!m || +m[1] !== n) return set;
    for (const part of m[2].split(/[,、，]/)) {
      const r = part.trim().match(/^(\d+)(?:-(\d+))?/);
      if (!r) continue;
      for (let v = +r[1]; v <= +(r[2] || r[1]); v++) set.add(v);
    }
    return set;
  }
  /**
   * 結果卡上的引用經文。優先用 CONFIG.keyVerse 指定的節；
   * 未指定時，取經文錨點內第一節長度適中的經文（暫行，建議主編逐篇指定）。
   */
  function keyVerse(n) {
    const S = window.SCRIPTURE && window.SCRIPTURE[n];
    if (!S) return null;
    const join = (v) => v.lines.filter((l) => l).join('');
    const pick = (C.keyVerse || {})[n];
    if (pick) { const v = S.verses.find((x) => x.v === String(pick)); if (v) return { text: join(v), ref: `詩篇 ${n}:${v.v}` }; }
    const hits = anchorVerses(byNum[n].anchor, n);
    const pool = S.verses.filter((v) => hits.has(+v.v.split('-')[0]));
    const list = pool.length ? pool : S.verses;
    const good = list.find((v) => { const t = join(v).length; return t >= 10 && t <= 46; });
    const v = good || list[0];
    let text = join(v);
    if (!good && text.length > 46) text = v.lines.filter((l) => l).slice(0, 2).join('') + '……';
    text = text.replace(/[，；：、]$/, '……'); // 句子還沒結束時用刪節號
    return { text, ref: `詩篇 ${n}:${v.v}` };
  }

  /* ---------- 結果 ---------- */
  let lastResult = null;
  function moodTags(scores) {
    return DIMS.filter((d) => scores[d] !== undefined && Math.abs(scores[d]) >= 0.75)
      .map((d) => ({ d, w: C.weights[d] * Math.abs(scores[d]), text: T.moodTags[d][scores[d] > 0 ? 1 : 0] }))
      .filter((t) => t.text).sort((a, b) => b.w - a.w).slice(0, 3);
  }
  /** 推薦理由：使用者與該篇落在同一側、且差距不大的維度（待主編審文案）。 */
  function reasons(scores, p) {
    return DIMS.filter((d) => scores[d] !== undefined)
      .map((d) => ({ d, x: scores[d], y: p[d] }))
      .filter((r) => Math.abs(r.x) >= 0.75 && Math.sign(r.x) === Math.sign(r.y) && Math.abs(r.x - r.y) <= 1)
      .sort((a, b) => C.weights[b.d] * Math.abs(b.x) - C.weights[a.d] * Math.abs(a.x)).slice(0, 3)
      .map((r) => `${T.dimNames[r.d]}：你最近偏向「${T.dimEnds[r.d][r.x > 0 ? 1 : 0]}」，這篇詩篇也落在這一側。`);
  }
  /** 繪本式插畫：圖片填滿容器，以紙張邊緣遮罩融入奶油色背景，不改動原圖。 */
  function storybook(box, img, n, stage) {
    const real = C.illustration(n);
    // web-0.5：以 CSS 漸層融入奶油色紙底，保留原圖，不再套用硬邊紙張遮罩。

    const placeholder = () => { img.onerror = null; img.alt = '品牌色抽象裝飾；此篇正式插畫尚待完成'; box.classList.remove('real'); box.classList.add('placeholder'); img.src = 'assets/pending-illustration.svg'; };
    if (!real) return placeholder();
    box.classList.remove('placeholder'); box.classList.add('real');
    img.alt = `詩篇第 ${n} 篇插畫`;
    img.onerror = placeholder;
    img.src = real.src;
  }

  function renderResult(forcePsalm) {
    try { return renderResultInner(forcePsalm); } catch (e) { showError(e); }
  }
  function renderResultInner(forcePsalm) {
    const res = Scoring.rank(state.answers, Q, P, C);
    if (res.status === 'insufficient') { show('insufficient'); document.querySelector('#view-insufficient .section-title').focus(); return; }
    show('result');
    lastResult = res;
    const n = forcePsalm || res.best.psalm;
    const p = byNum[n];
    const st = T.stages[p.stage] || { line: '', color: '#FF8A1F' };
    const tags = moodTags(res.scores);
    const rs = reasons(res.scores, p);
    const deep = p.stage.startsWith('7');
    const isAlt = forcePsalm && forcePsalm !== res.best.psalm;
    state.altPsalm = isAlt ? forcePsalm : null;
    const kv = keyVerse(n);
    const near = (isAlt ? [res.best, ...res.near.filter((r) => r.psalm !== n)] : res.near).slice(0, C.tieRule.maxNear);
    const rows = DIMS.map((d) => `<tr><td>${d} ${T.dimNames[d]}</td><td>${res.scores[d] === undefined ? '未作答' : fmt(res.scores[d])}</td><td>${fmt(p[d])}</td></tr>`).join('');

    $('result-root').innerHTML = `
      <header class="r-hello">
        <p class="kicker r-kicker"><span>我的生命光景</span></p>
        <h1 class="r-stage" id="r-stage" tabindex="-1">${esc(stageName(p.stage))}<span class="swoosh-line" aria-hidden="true"></span></h1>
        ${tags.length ? `<ul class="tags" aria-label="心境標籤">${tags.map((t) => `<li>${esc(t.text)}</li>`).join('')}</ul>` : ''}
        <p class="r-line">${esc(st.line)}</p>
      </header>
      ${isAlt ? `<p class="note">你正在看「也可能共鳴」的詩篇。<button class="btn-text" id="back-main" type="button">回到主要結果：詩篇第 ${res.best.psalm} 篇</button></p>` : ''}

      <figure class="storybook" id="r-book">
        <span class="paper-back" aria-hidden="true"></span>
        <span class="ill"><img id="r-img" alt="" decoding="async"></span>
      </figure>

      ${!C.illustration(n) ? '<p class="fine" style="text-align:center;margin:0 auto 12px">插畫製作中・目前顯示品牌裝飾圖</p>' : ''}
      <section class="psalm-card" aria-labelledby="pc-num">
        <p class="pc-label">${icon('i-book')}推薦你閱讀的詩篇</p>
        <h2 class="pc-num" id="pc-num"><span class="u-mark">詩篇 第 ${n} 篇</span></h2>
        <p class="pc-title">${esc(p.title)}</p>
        ${kv ? `<p class="pc-quote">「${esc(kv.text)}」</p><p class="pc-ref">— ${esc(kv.ref)}</p>` : ''}
      </section>

      ${deep ? supportBlock(true) : ''}

      <section class="block" aria-labelledby="h-now">
        <h2 class="section-title" id="h-now">${icon('i-heart')}給此刻的你</h2>
        <div class="card soft">
          <p class="now-body">${esc(p.body)}</p>
          <p class="reflect">${icon('i-quote')}<span>${esc(p.reflection)}</span></p>
        </div>
      </section>

      <section class="block" aria-labelledby="h-chart">
        <h2 class="section-title" id="h-chart">${icon('i-bars')}我的八維圖譜</h2>
        <div class="card soft chart-wrap">
          ${Art.radarSVG([
            { values: res.scores, color: '#4EBB48', fill: 'rgba(140,194,99,.38)', width: 2.6 },
            { values: Object.fromEntries(DIMS.map((d) => [d, p[d]])), color: '#F26B00', dashed: true, width: 2, dot: 2.6 },
          ], T.dimNames, { label: `八維圖譜：你的分數與詩篇第 ${n} 篇的座標`, showValues: true })}
          <ul class="legend"><li><i style="background:#4EBB48"></i>你最近的位置</li><li><i style="background:#F26B00"></i>詩篇第 ${n} 篇</li></ul>
          ${rs.length ? `<h3 class="sub-title">這篇和你相近的地方</h3><ul class="reasons">${rs.map((r) => `<li><span class="tick" aria-hidden="true">${icon('i-check')}</span><span>${esc(r)}</span></li>`).join('')}</ul>` : ''}
          <p class="fine chart-note">數字依你的作答，用正式計分方式算出，範圍 −2 到 +2，中間虛線為 0。這是相似程度的參考，不是心理測量。</p>
          <details class="more"><summary>查看八個維度的分數</summary>
            <table class="dim-table"><thead><tr><th scope="col">維度</th><th scope="col">你</th><th scope="col">這篇</th></tr></thead><tbody>${rows}</tbody></table>
          </details>
        </div>
      </section>

      <section class="block read-entry" aria-labelledby="h-read">
        <h2 class="section-title" id="h-read">${icon('i-book', 'ic-o')}完整經文</h2>
        <div class="card soft">
          <p>讀一讀詩篇第 ${n} 篇全文。這次推薦的段落是詩篇 ${esc(p.anchor)}，會用底色標示出來。</p>
          <div class="r-actions">
            <button class="btn btn-primary" id="btn-read" type="button">${icon('i-book', 'ic')}閱讀詩篇第 ${n} 篇${icon('i-chev-r', 'ic')}</button>
            <button class="btn btn-green" id="btn-share" type="button">${icon('i-share', 'ic')}產生分享圖片</button>
          </div>
        </div>
      </section>

      ${near.length || res.tied.length > 1 ? `<section class="block" aria-labelledby="h-near">
        <h2 class="section-title" id="h-near">${icon('i-leaf')}也可能和你共鳴的詩篇</h2>
        ${res.tied.length > 1 ? `<p class="note">有 ${res.tied.length} 篇詩篇和你的距離完全相同，排列順序不代表哪一篇比較準。</p>` : ''}
        <ul class="near-list">${near.map((r) => `<li><button type="button" data-psalm="${r.psalm}"><span class="n">詩篇 ${r.psalm}</span><span class="t">${esc(byNum[r.psalm].title)}<span>${esc(stageName(byNum[r.psalm].stage))}</span></span>${icon('i-chev-r')}</button></li>`).join('')}</ul>
      </section>` : ''}

      ${deep ? '' : `<section class="block">${supportBlock(false)}</section>`}
      <p class="fine block">${esc(T.disclaimer)}</p>
      <div class="end-actions">
        <button class="btn btn-outline" id="btn-again" type="button">重新作答</button>
        <button class="btn btn-outline" id="btn-edit" type="button">回去修改答案</button>
      </div>`;

    storybook($('r-book'), $('r-img'), n, p.stage);
    $('btn-read').onclick = () => go(`#/read/${n}`);
    $('btn-share').onclick = () => Share.open({ psalm: p, stage: p.stage, stageLine: st.line, stageColor: st.color, scores: res.scores, tags: tags.map((t) => t.text), verse: kv, img: C.illustration(n) });
    $('btn-again').onclick = () => { clear(); lastResult = null; go('#/'); };
    $('btn-edit').onclick = () => { state.step = 0; state.done = false; save(); go('#/quiz'); };
    if ($('back-main')) $('back-main').onclick = () => renderResult();
    document.querySelectorAll('.near-list button').forEach((b) => (b.onclick = () => renderResult(+b.dataset.psalm)));
    $('r-stage').focus({ preventScroll: true });
  }

  function showError(e) {
    show('result');
    $('result-root').innerHTML = `<div class="pad-top"><h2 class="section-title big">結果暫時無法顯示</h2>
      <p>很抱歉，產生結果時發生問題。請截圖這個畫面回報給我們，或重新整理後再試一次。</p>
      <p class="note">${esc((e && (e.stack || e.message)) || e)}<br>${esc(navigator.userAgent)}</p>
      <div class="btn-row"><button class="btn btn-primary" type="button" onclick="location.reload()">重新整理</button></div></div>`;
  }
  window.addEventListener('error', (ev) => { if (!$('view-result').hidden || location.hash.startsWith('#/result')) showError(ev.error || ev.message); });

  function supportBlock(prominent) {
    const s = T.support;
    const inner = `<p>${esc(s.body)}</p>
      <ul>${s.lines.map((l) => `<li><a href="tel:${l.tel}">${esc(l.name)} ${l.tel}</a></li>`).join('')}</ul>
      <p class="fine">${esc(s.urgent)}</p>`;
    if (!prominent) return `<details class="more"><summary>${esc(s.title)}</summary><div class="support">${inner}</div></details>`;
    return `<div class="support prominent" role="note"><h3>${esc(s.title)}</h3>${inner}</div>`;
  }
  $('btn-back-fill').onclick = () => {
    const firstSkip = visibleQ.findIndex((q) => !Number.isInteger(state.answers[q.id]));
    state.step = Math.max(0, firstSkip); state.done = false; save(); go('#/quiz');
  };
  $('btn-restart-ins').onclick = () => { clear(); go('#/'); };

  /* ---------- 經文閱讀 ---------- */
  function renderReader(n) {
    if (!byNum[n]) return go('#/');
    show('read');
    const S = window.SCRIPTURE && window.SCRIPTURE[n];
    const p = byNum[n];
    $('btn-read-back').querySelector('span').textContent = lastResult || state.done ? '返回結果' : '回到首頁';
    if (!S) { $('reader').innerHTML = '<p>經文資料載入中，請稍候再試。</p>'; return; }
    let hits = anchorVerses(p.anchor, n);
    const last = S.verses.reduce((m, v) => Math.max(m, +v.v.split('-').pop()), 0);
    if (hits.size >= last) hits = new Set(); // 錨點涵蓋整篇時不必標示
    const vhtml = S.verses.map((v) => {
      const [a, b] = v.v.split('-').map(Number);
      let isAnchor = false;
      for (let k = a; k <= (b || a); k++) if (hits.has(k)) isAnchor = true;
      const gap = v.lines.includes('') ? ' gap' : '';
      const lines = v.lines.filter((l) => l !== '').map((l) => `<span class="ln">${esc(l)}</span>`).join('');
      return `<p class="verse${isAnchor ? ' anchor' : ''}${gap}"><span class="vn${v.v.length > 2 ? ' wide' : ''}">${v.v}</span>${lines}</p>`;
    }).join('');
    $('reader').innerHTML = `
      <figure class="storybook reader-book" id="read-book"><span class="paper-back" aria-hidden="true"></span><span class="ill"><img id="read-img" alt="" decoding="async"></span></figure>
      <h1 tabindex="-1" id="read-title">${icon('i-book')}詩篇 第 ${n} 篇</h1>
      <span class="swoosh-line" aria-hidden="true"></span>
      ${S.title ? `<p class="sup">${esc(S.title)}</p>` : ''}
      ${hits.size ? `<p class="anchor-note">底色標示的是這次推薦的<mark>經文錨點</mark>：詩篇 ${esc(p.anchor)}</p>` : ''}
      <div class="verses">${vhtml}</div>
      ${S.notes.length ? `<div class="footnotes">${S.notes.map((f) => `<p>${esc(f.ref)}　${esc(f.text)}</p>`).join('')}</div>` : ''}
      <p class="source">經文：《新標點和合本》詩篇。</p>`;
    storybook($('read-book'), $('read-img'), n, p.stage);
    applyReadPrefs();
    $('read-title').focus({ preventScroll: true });
  }
  const readPrefs = { size: 19, vnum: true };
  try { Object.assign(readPrefs, JSON.parse(localStorage.getItem('psalm-read') || '{}')); } catch (e) { /* 忽略 */ }
  function applyReadPrefs() {
    document.documentElement.style.setProperty('--read-size', readPrefs.size + 'px');
    $('reader').classList.toggle('no-vnum', !readPrefs.vnum);
    $('toggle-vnum').setAttribute('aria-pressed', readPrefs.vnum);
    $('font-dec').disabled = readPrefs.size <= 15;
    $('font-inc').disabled = readPrefs.size >= 30;
    try { localStorage.setItem('psalm-read', JSON.stringify(readPrefs)); } catch (e) { /* 忽略 */ }
  }
  $('font-dec').onclick = () => { readPrefs.size = Math.max(15, readPrefs.size - 2); applyReadPrefs(); };
  $('font-inc').onclick = () => { readPrefs.size = Math.min(30, readPrefs.size + 2); applyReadPrefs(); };
  $('toggle-vnum').onclick = () => { readPrefs.vnum = !readPrefs.vnum; applyReadPrefs(); };
  $('btn-read-back').onclick = () => go(lastResult || state.done ? '#/result' : '#/');

  /* ---------- 關於 ---------- */
  function renderAbout() {
    show('about');
    $('about-dims').textContent = DIMS.map((d) => `${d} ${T.dimNames[d]}`).join('、') + '。每個面向都從 −2 到 +2，代表你最近偏向哪一端，沒有好壞之分。';
    document.querySelector('#view-about .section-title').focus({ preventScroll: true });
  }

  /* ---------- 啟動 ---------- */
  load();
  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', route);
})();
