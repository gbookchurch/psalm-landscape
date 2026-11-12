/* 主程式：路由、首頁、答題、結果、經文閱讀 */
(function () {
  const C = window.CONFIG, T = window.COPY, Q = window.QUESTIONS, P = window.PSALMS;
  const byNum = Object.fromEntries(P.map((p) => [p.psalm, p]));
  const DIMS = Scoring.DIMS;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => (n > 0 ? '+' : '') + (Math.round(n * 10) / 10).toFixed(1).replace('-0.0', '0.0').replace('+0.0', '0.0');

  /* ---------- 狀態與本機暫存 ---------- */
  const KEY = 'psalm-quiz-v1';
  const state = { answers: {}, step: 0, done: false, readFrom: null };
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
    window.scrollTo(0, 0);
  }
  function route() {
    const h = location.hash || '#/';
    let m;
    if (h.startsWith('#/quiz')) return renderQuiz();
    if (h.startsWith('#/result')) return renderResult(state.altPsalm);
    if ((m = h.match(/^#\/read\/(\d{1,3})/))) return renderReader(+m[1]);
    return renderHome();
  }

  /* ---------- 首頁 ---------- */
  function renderHome() {
    show('home');
    document.querySelectorAll('[data-copy]').forEach((el) => (el.textContent = T[el.dataset.copy]));
    const n = answeredCount();
    $('btn-resume').hidden = !(n > 0 && !state.done);
    $('btn-resume').textContent = `${T.resume}（已答 ${n} 題）`;
    $('btn-start').textContent = n > 0 ? '重新開始' : T.start;
    // 低效能或省流量模式：直接顯示靜態畫面
    const lowPower = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) || (navigator.connection && navigator.connection.saveData);
    if (lowPower) $('hero').classList.add('static');
  }
  $('btn-start').onclick = () => { clear(); go('#/quiz'); };
  $('btn-resume').onclick = () => go('#/quiz');

  /* ---------- 答題 ---------- */
  function renderQuiz() {
    show('quiz');
    if (state.step >= visibleQ.length) state.step = visibleQ.length - 1;
    const q = visibleQ[state.step];
    const total = visibleQ.length;
    $('quiz-count').textContent = `第 ${state.step + 1} 題，共 ${total} 題`;
    $('progress').setAttribute('aria-valuemax', total);
    $('progress').setAttribute('aria-valuenow', answeredCount());
    $('progress-bar').style.width = `${(answeredCount() / total) * 100}%`;
    $('btn-prev').disabled = state.step === 0;
    $('btn-prev').style.visibility = state.step === 0 ? 'hidden' : 'visible';
    $('q-text').textContent = q.text;
    const cur = state.answers[q.id];
    $('options').innerHTML = q.options.map((o, i) => `
      <button class="opt" type="button" role="radio" aria-checked="${cur === i}" data-i="${i}">
        <span class="num" aria-hidden="true">${i + 1}</span>
        <span class="txt">${esc(o.text)}</span>
        <span class="tick" aria-hidden="true"><svg><use href="#i-check"/></svg></span>
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
    state.answers[q.id] = i; // i 為 null 代表略過
    save();
    // 先讓勾選狀態出現，再前往下一題
    $('options').querySelectorAll('.opt').forEach((b) => b.setAttribute('aria-checked', +b.dataset.i === i));
    $('btn-skip').setAttribute('aria-pressed', i === null);
    advancing = true;
    setTimeout(() => { advancing = false; next(); }, 260);
  }
  function next() {
    if (state.step < visibleQ.length - 1) { state.step++; save(); renderQuiz(); }
    else { state.done = true; save(); go('#/result'); }
  }
  $('btn-skip').onclick = () => answer(null);
  $('btn-prev').onclick = () => { if (state.step > 0) { state.step--; save(); renderQuiz(); } };
  $('btn-home').onclick = () => go('#/');
  document.addEventListener('keydown', (e) => {
    if ($('view-quiz').hidden || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[1-4]$/.test(e.key)) { e.preventDefault(); answer(+e.key - 1); }
    else if (e.key === '0') { e.preventDefault(); answer(null); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); $('btn-prev').click(); }
  });

  /* ---------- 結果 ---------- */
  let lastResult = null;
  function compute() { return Scoring.rank(state.answers, Q, P, C); }

  function moodTags(scores) {
    return DIMS.filter((d) => scores[d] !== undefined && Math.abs(scores[d]) >= 0.75)
      .map((d) => ({ d, w: C.weights[d] * Math.abs(scores[d]), text: T.moodTags[d][scores[d] > 0 ? 1 : 0] }))
      .filter((t) => t.text)
      .sort((a, b) => b.w - a.w)
      .slice(0, 3);
  }

  /** 推薦理由：使用者與該篇在同一側、且差距不大的維度（待主編審文案）。 */
  function reasons(scores, p) {
    return DIMS.filter((d) => scores[d] !== undefined)
      .map((d) => ({ d, x: scores[d], y: p[d] }))
      .filter((r) => Math.abs(r.x) >= 0.75 && Math.sign(r.x) === Math.sign(r.y) && Math.abs(r.x - r.y) <= 1)
      .sort((a, b) => C.weights[b.d] * Math.abs(b.x) - C.weights[a.d] * Math.abs(a.x))
      .slice(0, 3)
      .map((r) => `${T.dimNames[r.d]}：你最近偏向「${T.dimEnds[r.d][r.x > 0 ? 1 : 0]}」，這篇詩篇也落在這一側。`);
  }

  function renderResult(forcePsalm) {
    const res = compute();
    if (res.status === 'insufficient') { show('insufficient'); document.querySelector('#view-insufficient .section-title').focus(); return; }
    show('result');
    lastResult = res;
    const n = forcePsalm || res.best.psalm;
    const p = byNum[n];
    const st = T.stages[p.stage] || { line: '', color: '#DC9551' };
    const tags = moodTags(res.scores);
    const rs = reasons(res.scores, p);
    const deep = p.stage.startsWith('7');
    const isAlt = forcePsalm && forcePsalm !== res.best.psalm;
    state.altPsalm = isAlt ? forcePsalm : null;

    const rows = DIMS.map((d) => `<tr><td>${T.dimNames[d]}</td><td>${res.scores[d] === undefined ? '未作答' : fmt(res.scores[d])}</td><td>${fmt(p[d])}</td></tr>`).join('');
    const near = (isAlt ? [res.best, ...res.near.filter((r) => r.psalm !== n)] : res.near).slice(0, C.tieRule.maxNear);

    $('result-root').innerHTML = `
      <div class="r-card" id="r-card">
        <img id="r-img" alt="" decoding="async">
        <div class="veil">
          <p class="r-num"><small>詩篇第</small><strong>${n}</strong><small>篇</small></p>
          <h1 class="r-title" tabindex="-1" id="r-title">${esc(p.title)}</h1>
        </div>
      </div>
      ${isAlt ? `<p class="note">你正在看「也可能共鳴」的詩篇。<button class="btn-text" id="back-main" type="button">回到主要結果：詩篇第 ${res.best.psalm} 篇</button></p>` : ''}

      <div class="scene">
        <p class="scene-name"><span class="scene-dot" style="background:${st.color}"></span>你現在的生命光景</p>
        <p class="scene-line">${esc(st.line)}</p>
        <ul class="tags" aria-label="心境標籤">
          <li class="stage-tag" style="background:${st.color}">${esc(p.stage.replace(/^\d\s*/, ''))}</li>
          ${tags.map((t) => `<li>${esc(t.text)}</li>`).join('')}
        </ul>
      </div>

      <div class="home-actions r-actions">
        <button class="btn btn-primary" id="btn-read" type="button">閱讀詩篇第 ${n} 篇</button>
        <button class="btn btn-quiet" id="btn-share" type="button">製作分享圖</button>
      </div>

      ${deep ? supportBlock(true) : ''}

      <section class="block" aria-labelledby="h-body">
        <h2 class="section-title" id="h-body">這篇詩篇在說什麼</h2>
        <p>${esc(p.body)}</p>
        <p class="fine">經文錨點：詩篇 ${esc(p.anchor)}</p>
      </section>

      ${rs.length ? `<section class="block" aria-labelledby="h-why">
        <h2 class="section-title" id="h-why">為什麼推薦這篇</h2>
        <ul class="reasons">${rs.map((r) => `<li><span class="tick" aria-hidden="true"><svg><use href="#i-check"/></svg></span><span>${esc(r)}</span></li>`).join('')}</ul>
      </section>` : ''}

      <section class="block" aria-labelledby="h-chart">
        <h2 class="section-title" id="h-chart">你的八維圖譜</h2>
        <div class="card chart-wrap">
          ${Art.radarSVG([
            { values: Object.fromEntries(DIMS.map((d) => [d, p[d]])), color: '#78945A', dashed: true, width: 2, dot: 2.6 },
            { values: res.scores, color: '#C9684B', fill: 'rgba(201,104,75,.12)' },
          ], T.dimNames, { label: `八維圖譜：你的分數與詩篇第 ${n} 篇的座標` })}
          <ul class="legend"><li><i style="background:#C9684B"></i>你最近的位置</li><li><i style="background:#78945A"></i>詩篇第 ${n} 篇</li></ul>
          <details class="more"><summary>查看八個維度的分數</summary>
            <table class="dim-table"><caption>每個維度從 −2 到 +2；中間虛線是 0。這是相似程度的參考，不是心理測量。</caption>
              <thead><tr><th scope="col">維度</th><th scope="col">你</th><th scope="col">這篇</th></tr></thead><tbody>${rows}</tbody></table>
          </details>
        </div>
      </section>

      <section class="block" aria-labelledby="h-q">
        <h2 class="section-title" id="h-q">留給自己的一個問題</h2>
        <p class="reflect">${esc(p.reflection)}</p>
      </section>

      ${near.length || res.tied.length > 1 ? `<section class="block" aria-labelledby="h-near">
        <h2 class="section-title" id="h-near">也可能和你共鳴的詩篇</h2>
        ${res.tied.length > 1 ? `<p class="note">有 ${res.tied.length} 篇詩篇和你的距離完全相同，排列順序不代表哪一篇比較準。</p>` : ''}
        <ul class="near-list">${near.map((r) => `<li><button type="button" data-psalm="${r.psalm}"><b>詩篇第 ${r.psalm} 篇</b>${esc(byNum[r.psalm].title)}<span>${esc(byNum[r.psalm].stage.replace(/^\d\s*/, ''))}</span></button></li>`).join('')}</ul>
      </section>` : ''}

      <section class="block">${deep ? '' : supportBlock(false)}</section>

      <p class="fine block">${esc(T.disclaimer)}</p>
      <div class="end-actions">
        <button class="btn btn-quiet" id="btn-again" type="button">重新作答</button>
        <button class="btn btn-quiet" id="btn-edit" type="button">回去修改答案</button>
      </div>`;

    // 插畫：有正式圖就用，沒有就顯示品牌色佔位
    const img = $('r-img');
    const ph = () => { img.onerror = null; img.src = Art.placeholderURL(n, st.color, 640, 800); };
    img.onerror = ph;
    img.src = C.illustrationPath(n);

    $('btn-read').onclick = () => { state.readFrom = n; go(`#/read/${n}`); };
    $('btn-share').onclick = () => Share.open({ psalm: p, stage: p.stage, stageLine: st.line, stageColor: st.color, scores: res.scores, imgSrc: C.illustrationPath(n) });
    $('btn-again').onclick = () => { clear(); state.altPsalm = null; lastResult = null; go('#/'); };
    $('btn-edit').onclick = () => { state.step = 0; state.done = false; save(); go('#/quiz'); };
    if ($('back-main')) $('back-main').onclick = () => renderResult();
    document.querySelectorAll('.near-list button').forEach((b) => (b.onclick = () => renderResult(+b.dataset.psalm)));
    $('r-title').focus({ preventScroll: true });
    state.viewing = n;
  }

  function supportBlock(prominent) {
    const s = T.support;
    const inner = `<p>${esc(s.body)}</p>
      <ul>${s.lines.map((l) => `<li><a href="tel:${l.tel}">${esc(l.name)} ${l.tel}</a></li>`).join('')}</ul>
      <p class="fine">${esc(s.urgent)}</p>`;
    if (!prominent) return `<details class="more support-mini"><summary>${esc(s.title)}</summary><div class="support">${inner}</div></details>`;
    return `<div class="support prominent block" role="note">
      <h3>${esc(s.title)}</h3><p>${esc(s.body)}</p>
      <ul>${s.lines.map((l) => `<li><a href="tel:${l.tel}">${esc(l.name)} ${l.tel}</a></li>`).join('')}</ul>
      <p class="fine">${esc(s.urgent)}</p></div>`;
  }
  $('btn-back-fill').onclick = () => {
    const firstSkip = visibleQ.findIndex((q) => !Number.isInteger(state.answers[q.id]));
    state.step = Math.max(0, firstSkip); state.done = false; save(); go('#/quiz');
  };
  $('btn-restart-ins').onclick = () => { clear(); go('#/'); };

  /* ---------- 經文閱讀 ---------- */
  /** 解析經文錨點，例如 "17:1-9,13-15"、"3:1–3,6–8"、"51:1-17；參撒母耳記下11–12章"。 */
  function anchorVerses(anchor, n) {
    const set = new Set();
    const main = String(anchor).split(/[；;]/)[0].replace(/–|—/g, '-');
    const m = main.match(/^(\d+):(.*)$/);
    if (!m || +m[1] !== n) return set;
    for (const part of m[2].split(/[,、，]/)) {
      const r = part.trim().match(/^(\d+)(?:-(\d+))?/);
      if (!r) continue;
      const a = +r[1], b = +(r[2] || r[1]);
      for (let v = a; v <= b; v++) set.add(v);
    }
    return set;
  }

  function renderReader(n) {
    if (!byNum[n]) return go('#/');
    show('read');
    const S = window.SCRIPTURE && window.SCRIPTURE[n];
    const p = byNum[n];
    let hits = anchorVerses(p.anchor, n);
    // 錨點涵蓋整篇時不必標示
    if (S && hits.size >= S.verses.reduce((m, v) => Math.max(m, +v.v.split('-').pop()), 0)) hits = new Set();
    $('btn-read-back').textContent = lastResult || state.done ? '返回結果' : '回到首頁';
    if (!S) { $('reader').innerHTML = '<p>經文資料載入中，請稍候再試。</p>'; return; }
    const vhtml = S.verses.map((v) => {
      const [a, b] = v.v.split('-').map(Number);
      let isAnchor = false;
      for (let k = a; k <= (b || a); k++) if (hits.has(k)) isAnchor = true;
      const gap = v.lines.includes('') ? ' gap' : '';
      const lines = v.lines.filter((l) => l !== '').map((l, i) => `<span class="ln${i ? ' cont' : ''}">${esc(l)}</span>`).join('');
      return `<p class="verse${isAnchor ? ' anchor' : ''}${gap}"><span class="vn">${v.v}</span>${lines}</p>`;
    }).join('');
    $('reader').innerHTML = `
      <h1 tabindex="-1" id="read-title">詩篇第 ${n} 篇</h1>
      ${S.title ? `<p class="sup">${esc(S.title)}</p>` : ''}
      ${hits.size ? `<p class="anchor-note">底色標示的是這次推薦的<mark>經文錨點</mark>：詩篇 ${esc(p.anchor)}</p>` : ''}
      <div class="verses">${vhtml}</div>
      ${S.notes.length ? `<div class="footnotes">${S.notes.map((f) => `<p>${esc(f.ref)}　${esc(f.text)}</p>`).join('')}</div>` : ''}
      <p class="source">經文：《新標點和合本》詩篇。</p>`;
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
  $('btn-read-back').onclick = () => {
    if (lastResult || state.done) {
      go('#/result');
    } else go('#/');
  };

  /* ---------- 啟動 ---------- */
  load();
  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', route);
  if (document.readyState !== 'loading') route();
})();
