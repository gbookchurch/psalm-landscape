/* 主程式：路由、頁首、首頁、答題、結果、經文閱讀、關於 */
(function () {
  const C = window.CONFIG, T = window.COPY, Q = window.QUESTIONS, P = window.PSALMS;
  const byNum = Object.fromEntries(P.map((p) => [p.psalm, p]));
  const DIMS = Scoring.DIMS;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => (n > 0 ? '+' : '') + (Math.round(n * 10) / 10).toFixed(1).replace('-0.0', '0.0').replace('+0.0', '0.0');
  const stageName = (s) => s.replace(/^\d\s*/, '');
  const icon = (id, cls = 'ic') => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;

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
    document.body.dataset.view = name; // 樣式用：答題頁會收起頁首
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
  }
  document.querySelectorAll('[data-copy]').forEach((el) => (el.textContent = T[el.dataset.copy]));
  $('home-meta').innerHTML = (T.homeMetaShort || []).map((t) => `<li>${esc(t)}</li>`).join('');
  $('btn-start').onclick = () => { clear(); go('#/quiz'); };
  $('btn-resume').onclick = () => go('#/quiz');

  /* ---------- 答題 ---------- */
  const OPT_NUM = ['一', '二', '三', '四', '五', '六'];
  /** 這一題計分的面向，用來顯示題目上方的小標。 */
  function topicOf(q) {
    for (const o of q.options) { const k = Object.keys(o.scores || {}); if (k.length) return (T.quizTopics || {})[k[0]] || ''; }
    return T.quizTopicOther || '';
  }
  function cheerOf(i, total) {
    const c = T.quizCheer || {};
    if (i === total) return c.last || '';
    if (i > (total * 2) / 3) return c.twoThirds || '';
    if (i > total / 2) return c.half || '';
    if (i === 1) return c.start || '';
    return '';
  }
  function renderQuiz() {
    show('quiz');
    if (state.step >= visibleQ.length) state.step = visibleQ.length - 1;
    const q = visibleQ[state.step];
    const total = visibleQ.length;
    const cur = state.answers[q.id];
    $('quiz-sr').textContent = `第 ${state.step + 1} 題，共 ${total} 題`;
    $('quiz-num').textContent = state.step + 1;
    $('quiz-of').textContent = `／ ${total}`;
    $('progress').setAttribute('aria-valuemax', total);
    $('progress').setAttribute('aria-valuenow', state.step + 1);
    $('progress').innerHTML = Array.from({ length: total }, (_, i) => `<i${i <= state.step ? ' class="on"' : ''}></i>`).join('');
    $('quiz-cheer').textContent = cheerOf(state.step + 1, total);
    const topic = topicOf(q);
    $('quiz-topic').textContent = topic; $('quiz-topic').hidden = !topic;
    $('btn-prev').disabled = state.step === 0;
    $('next-label').textContent = state.step === total - 1 ? '看結果' : '下一題';
    $('q-text').textContent = q.text;
    $('options').innerHTML = q.options.map((o, i) => `
      <button class="opt" type="button" role="radio" aria-checked="${cur === i}" data-i="${i}">
        <span class="opt-n" aria-hidden="true">${OPT_NUM[i] || i + 1}</span><span class="opt-t">${esc(o.text)}</span>${icon('i-check', 'opt-check')}
      </button>`).join('');
    $('btn-skip').textContent = q.skip_text || '略過這題';
    $('btn-skip').setAttribute('aria-pressed', cur === null);
    $('options').querySelectorAll('.opt').forEach((b) => (b.onclick = () => select(+b.dataset.i)));
    $('q-text').focus({ preventScroll: true });
  }
  /** 選一個選項：先標示選取，停一下讓人看到，再自動到下一題。選錯可以按「上一題」回來改。 */
  let advancing = false;
  function select(i) {
    if (advancing) return;
    const q = visibleQ[state.step];
    if (!q.options[i]) return;
    state.answers[q.id] = i;
    save();
    $('options').querySelectorAll('.opt').forEach((b) => b.setAttribute('aria-checked', +b.dataset.i === i));
    $('btn-skip').setAttribute('aria-pressed', 'false');
    advancing = true;
    setTimeout(() => { advancing = false; if (!$('view-quiz').hidden && visibleQ[state.step] === q) next(); }, 350);
  }
  function next() {
    if (state.step < visibleQ.length - 1) { state.step++; save(); renderQuiz(); }
    else { state.done = true; save(); go('#/result'); }
  }
  /** 略過：記為 null 並直接到下一題。 */
  function skip() { if (advancing) return; state.answers[visibleQ[state.step].id] = null; save(); next(); }
  $('btn-skip').onclick = skip;
  $('btn-next').onclick = () => {
    if (advancing) return;
    const id = visibleQ[state.step].id;
    if (!(id in state.answers)) { state.answers[id] = null; save(); } // 沒選就前進，視為略過
    next();
  };
  $('btn-prev').onclick = () => { if (advancing) return; if (state.step > 0) { state.step--; save(); renderQuiz(); } };
  document.addEventListener('keydown', (e) => {
    if ($('view-quiz').hidden || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[1-9]$/.test(e.key)) { e.preventDefault(); select(+e.key - 1); }
    else if (e.key === '0') { e.preventDefault(); skip(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); $('btn-prev').click(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); $('btn-next').click(); }
    else if (e.key === 'Enter' && !e.target.closest('button, a')) { e.preventDefault(); $('btn-next').click(); }
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
   * 結果頁上的引用經文。優先用 CONFIG.keyVerse 指定的節；
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
  /**
   * 推薦理由（最多三項）：
   * 先找使用者與該篇落在同一側、且差距不大的面向，用 COPY.reasonSay 的白話句；
   * 不足三項時，再補上位置最接近的面向，用通用句。文案待主編審。
   */
  function reasons(scores, p) {
    const all = DIMS.filter((d) => scores[d] !== undefined).map((d) => ({ d, x: scores[d], y: p[d] }));
    const same = all
      .filter((r) => Math.abs(r.x) >= 0.75 && Math.sign(r.x) === Math.sign(r.y) && Math.abs(r.x - r.y) <= 1)
      .sort((a, b) => C.weights[b.d] * Math.abs(b.x) - C.weights[a.d] * Math.abs(a.x)).slice(0, 3)
      .map((r) => ({ ...r, say: (T.reasonSay[r.d] || [])[r.x > 0 ? 1 : 0] || T.reasonSayNear }));
    const used = new Set(same.map((r) => r.d));
    const close = all
      .filter((r) => !used.has(r.d) && Math.abs(r.x - r.y) <= 0.75)
      .sort((a, b) => Math.abs(a.x - a.y) - Math.abs(b.x - b.y))
      .slice(0, 3 - same.length)
      .map((r) => ({ ...r, say: T.reasonSayNear }));
    return [...same, ...close];
  }
  const pct = (v) => Math.max(0, Math.min(100, ((v + 2) / 4) * 100));
  /** 位置條：實心點是使用者，圓圈是這篇詩。 */
  function barHTML(d, x, y) {
    const label = `${T.dimNames[d]}：你 ${x === undefined ? '未作答' : fmt(x)}，這篇詩 ${fmt(y)}（範圍 −2 到 +2）`;
    return `<div class="bar" role="img" aria-label="${esc(label)}"><span class="tick"></span><span class="ring" style="left:${pct(y)}%"></span>${x === undefined ? '' : `<span class="dot" style="left:${pct(x)}%"></span>`}</div>
      <div class="bar-ends" aria-hidden="true"><span>${esc(T.dimEnds[d][0])}</span><span>${esc(T.dimEnds[d][1])}</span></div>`;
  }
  /** 插畫：有正式插畫就顯示，沒有就顯示中性佔位。插畫以「印在紙上」的方式融入紙底（樣式在 CSS）。 */
  function illus(box, img, n) {
    const real = C.illustration(n);
    const placeholder = () => {
      img.onerror = null; img.alt = '品牌色抽象裝飾；此篇正式插畫尚待完成';
      box.classList.add('placeholder'); img.removeAttribute('width'); img.removeAttribute('height');
      img.src = 'assets/pending-illustration.svg';
    };
    if (!real) return placeholder();
    box.classList.remove('placeholder');
    img.alt = `詩篇第 ${n} 篇插畫`;
    img.onerror = placeholder;
    img.src = real.src;
  }

  /** 依使用者自己的作答判斷要不要把求助專線放在醒目位置（門檻在 CONFIG.supportProminent）。 */
  function needsCare(scores) {
    const r = C.supportProminent;
    if (!r) return false;
    const g = scores.G, a = scores.A;
    if (g === undefined) return false;
    return g <= r.hopeAlone || (a !== undefined && g <= r.hopeAndMood && a <= r.hopeAndMood);
  }

  function renderResult(forcePsalm) {
    try { return renderResultInner(forcePsalm); } catch (e) { showError(e); }
  }
  function renderResultInner(forcePsalm) {
    const res = Scoring.rank(state.answers, Q, P, C);
    if (res.status === 'insufficient') { show('insufficient'); document.querySelector('#view-insufficient .page-title').focus(); return; }
    show('result');
    lastResult = res;
    const n = forcePsalm || res.best.psalm;
    const p = byNum[n];
    const st = T.stages[p.stage] || { line: '', color: '#FF8A1F' };
    const name = stageName(p.stage);
    const tags = moodTags(res.scores);
    const rs = reasons(res.scores, p);
    const deep = p.stage.startsWith('7') || needsCare(res.scores); // 求助專線是否放在醒目位置
    const isAlt = forcePsalm && forcePsalm !== res.best.psalm;
    state.altPsalm = isAlt ? forcePsalm : null;
    const kv = keyVerse(n);
    const near = (isAlt ? [res.best, ...res.near.filter((r) => r.psalm !== n)] : res.near).slice(0, C.tieRule.maxNear);
    const pod = T.podcast;

    $('result-root').innerHTML = `
      <header class="r-hero">
        <div class="r-hero-text">
          <p class="r-kicker">你現在的生命光景</p>
          <div>
            <p class="r-line">${PsalmText.stageLines(st.line).map(esc).join('<br>')}</p>
            ${tags.length ? `<ul class="tags" aria-label="心境標籤">${tags.map((t) => `<li>${esc(t.text)}</li>`).join('')}</ul>` : ''}
          </div>
        </div>
        <h1 class="r-stage" id="r-stage" tabindex="-1">${esc(name)}</h1>
      </header>
      ${isAlt ? `<p class="note">你正在看「也可能共鳴」的詩篇。<button class="btn-link" id="back-main" type="button">回到主要結果：詩篇第 ${res.best.psalm} 篇</button></p>` : ''}

      <figure class="illus" id="r-book"><img id="r-img" alt="" decoding="async" width="1254" height="1254"></figure>
      ${!C.illustration(n) ? '<p class="fine illus-note">插畫製作中・目前顯示品牌裝飾圖</p>' : ''}

      <section class="psalm" aria-labelledby="pc-num">
        <p class="psalm-label">適合你現在讀的詩篇</p>
        <h2 class="psalm-num" id="pc-num"><span>詩篇 第</span><span class="n${String(n).length >= 3 ? ' n3' : ''}">${n}</span><span>篇</span></h2>
        ${kv ? `<blockquote class="psalm-verse">${PsalmText.verseLines(kv.text).map(esc).join('<br>')}<span class="psalm-ref">${esc(kv.ref)}</span></blockquote>
        <div class="psalm-rule" aria-hidden="true"></div>` : ''}
        <p class="psalm-title">${esc(p.title)}</p>
      </section>

      ${deep ? supportBlock(true) : ''}

      <div class="r-cta">
        <button class="btn btn-primary btn-block" id="btn-read" type="button">讀詩篇第 ${n} 篇全文${icon('i-arrow-r')}</button>
        <button class="btn-link" id="btn-share" type="button">${icon('i-share')}做成圖片分享</button>
      </div>

      <section class="journey">
        <p class="journey-title">九種光景，一趟會循環的旅程</p>
        <div class="journey-track">
          <ol aria-label="九種生命光景，你目前在${esc(name)}">${Object.keys(T.stages).map((k) => `<li${k === p.stage ? ' class="on" aria-current="true"' : ''}>${esc(stageName(k))}</li>`).join('')}</ol>
        </div>
      </section>

      <section class="r-block" aria-labelledby="h-now">
        <div class="r-head"><span class="no" aria-hidden="true">壹</span><h2 id="h-now">這篇詩想對你說</h2></div>
        <p class="r-body">${esc(p.body)}</p>
      </section>

      <section class="r-block" aria-labelledby="h-why">
        <div class="r-head"><span class="no" aria-hidden="true">貳</span><h2 id="h-why">為什麼是這一篇</h2></div>
        ${rs.length ? `<p class="why-intro">下面是你的作答和這篇詩最接近的${rs.length === 1 ? '一' : rs.length === 2 ? '兩' : '三'}件事。實心點是你，圓圈是這篇詩，兩個靠得越近，代表越像。</p>
        ${rs.map((r) => `<div class="dimrow"><p class="dim-label">${esc((T.dimPlain || T.dimNames)[r.d])}</p><p class="dim-say">${esc(r.say)}</p>${barHTML(r.d, r.x, r.y)}</div>`).join('')}` : '<p class="why-intro">這篇詩是八個面向加總起來和你最接近的一篇。實心點是你，圓圈是這篇詩。</p>'}
        <div class="why-foot">
          <ul class="legend" aria-hidden="true"><li><span class="k-dot"></span>你</li><li><span class="k-ring"></span>詩篇 ${n}</li></ul>
        </div>
        <details class="more"><summary>看完整八個面向</summary>
          ${DIMS.map((d) => `<div class="dimrow compact"><div class="dim-head"><p class="dim-label">${esc(T.dimNames[d])}</p><span class="dim-val">你 ${res.scores[d] === undefined ? '未作答' : fmt(res.scores[d])}・這篇 ${fmt(p[d])}</span></div>${barHTML(d, res.scores[d], p[d])}</div>`).join('')}
          <p class="fine chart-note">數字依你的作答，用正式計分方式算出，範圍 −2 到 +2，中間的刻度是 0。這是相似程度的參考，不是心理測量。</p>
        </details>
      </section>

      ${near.length || res.tied.length > 1 ? `<section class="r-block" aria-labelledby="h-near">
        <div class="r-head"><span class="no" aria-hidden="true">參</span><h2 id="h-near">也可能和你共鳴</h2></div>
        ${res.tied.length > 1 ? `<p class="why-intro">有 ${res.tied.length} 篇詩篇和你的距離完全相同，排列順序不代表哪一篇比較準。</p>` : ''}
        <ul class="near-list">${near.map((r) => { const q = byNum[r.psalm]; return `<li><button type="button" data-psalm="${r.psalm}" aria-label="詩篇第 ${r.psalm} 篇：${esc(q.shortTitle || q.title)}"><span class="n">${r.psalm}</span><span class="t">${esc(q.shortTitle || q.title)}<small>${esc(stageName(q.stage))}</small></span>${icon('i-arrow-r', '')}</button></li>`; }).join('')}</ul>
      </section>` : ''}

      <div class="r-end">
        <p class="fine">${esc(T.disclaimer)}</p>
        <div class="end-actions">
          <button class="btn-link" id="btn-again" type="button">重新作答</button>
          <button class="btn-link" id="btn-edit" type="button">修改答案</button>
        </div>
      </div>

      ${pod ? `<aside class="podcast" aria-labelledby="h-pod">
        <p class="kicker">${esc(pod.kicker)}</p>
        <h2 id="h-pod">${pod.title.map(esc).join('<br>')}</h2>
        <a class="btn" href="${esc(pod.url)}" target="_blank" rel="noopener">${esc(pod.cta)}${icon('i-arrow-r')}</a>
      </aside>` : ''}`;

    illus($('r-book'), $('r-img'), n);
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
    $('result-root').innerHTML = `<div class="wrap page"><h1 class="page-title">結果暫時無法顯示</h1>
      <p>很抱歉，產生結果時發生問題。請截圖這個畫面回報給我們，或重新整理後再試一次。</p>
      <p class="fine">${esc((e && (e.stack || e.message)) || e)}<br>${esc(navigator.userAgent)}</p>
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
      return `<p class="verse${isAnchor ? ' anchor' : ''}${gap}"><span class="vn">${v.v}</span>${lines}</p>`;
    }).join('');
    $('reader').innerHTML = `
      <figure class="illus" id="read-book"><img id="read-img" alt="" decoding="async" width="1254" height="1254"></figure>
      <h1 tabindex="-1" id="read-title">詩篇 第 ${n} 篇</h1>
      ${S.title ? `<p class="sup">${esc(S.title)}</p>` : ''}
      ${hits.size ? `<p class="anchor-note">底色標示的是這次推薦的<mark>經文錨點</mark>：詩篇 ${esc(p.anchor)}</p>` : ''}
      <div class="verses">${vhtml}</div>
      ${S.notes.length ? `<div class="footnotes">${S.notes.map((f) => `<p>${esc(f.ref)}　${esc(f.text)}</p>`).join('')}</div>` : ''}
      <p class="source">經文：《新標點和合本》神版，詩篇。</p>`;
    illus($('read-book'), $('read-img'), n);
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
    document.querySelector('#view-about .page-title').focus({ preventScroll: true });
  }

  /* ---------- 啟動 ---------- */
  load();
  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', route);
})();
