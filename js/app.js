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
  let prevView = '';
  function show(name) {
    prevView = document.body.dataset.view || '';
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
    if (h.startsWith('#/mine')) return renderMine();
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
    const got = new Set(loadCol().map((x) => x.n)).size;
    $('home-mine').hidden = !got;
    $('home-mine').textContent = `我的詩篇（已集 ${got} 篇）`;
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
  /* 題目插畫：放在題目上方、盡量放大，換題時淡入，並先載好下一題的圖 */
  const qArtSrc = (q) => {
    const A = C.questionArt;
    const m = q && /^Q(\d+)$/.exec(q.id);
    if (!A || !m || (A.hide || []).includes(q.id)) return null;
    return `${A.dir}question-${m[1].padStart(2, '0')}.webp?v=${(document.querySelector('script[src*="app.js"]').src.split('v=')[1] || '')}`;
  };
  let qArtFor = null;
  function questionArt(q) {
    const fig = $('quiz-art'), img = $('quiz-art-img'), src = qArtSrc(q);
    if (qArtFor === q.id) return;
    qArtFor = q.id;
    const view = $('view-quiz');
    const off = () => { fig.hidden = true; view.classList.remove('has-art'); };
    if (!src) { off(); return; }
    fig.classList.remove('in');
    const pre = new Image();
    pre.onload = () => {
      if (qArtFor !== q.id) return;
      img.src = src; fig.hidden = false; view.classList.add('has-art');
      requestAnimationFrame(() => fig.classList.add('in'));
    };
    pre.onerror = () => { if (qArtFor === q.id) off(); };
    pre.src = src;
    const nx = qArtSrc(visibleQ[state.step + 1]);
    if (nx) new Image().src = nx;
  }
  function renderQuiz() {
    show('quiz');
    if (state.step >= visibleQ.length) state.step = visibleQ.length - 1;
    const q = visibleQ[state.step];
    const total = visibleQ.length;
    const cur = state.answers[q.id];
    $('quiz-sr').textContent = `第 ${state.step + 1} 題，共 ${total} 題`;
    $('quiz-num').textContent = state.step + 1;
    $('quiz-of').textContent = `/ ${total}`;
    $('progress').setAttribute('aria-valuemax', total);
    $('progress').setAttribute('aria-valuenow', state.step + 1);
    $('progress').innerHTML = Array.from({ length: total }, (_, i) => `<i${i <= state.step ? ' class="on"' : ''}></i>`).join('');
    $('quiz-cheer').textContent = cheerOf(state.step + 1, total);
    const topic = topicOf(q);
    $('quiz-topic').textContent = topic; $('quiz-topic').hidden = !topic;
    $('btn-prev').disabled = state.step === 0;
    $('next-label').textContent = state.step === total - 1 ? '看結果' : '下一題';
    $('q-text').textContent = q.text;
    questionArt(q);
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
    return { text, ref: `詩篇 ${n}:${v.v}`, ex: excerpt(n, S, v) };
  }

  /**
   * 結果頁節錄：以主要經文為中心，取連續 2–3 節（分享圖仍只用一節，版面才放得下）。
   * 主要經文如果是接著上一節的半句話，就從上一節開始；總字數盡量不超過 100 字。
   */
  function excerpt(n, S, key) {
    const join = (v) => v.lines.filter((l) => l).join('');
    const ends = (v) => /[。！？」』]$/.test(join(v));
    const vs = S.verses;
    let a = vs.indexOf(key);
    if (a > 0 && !ends(vs[a - 1]) && join(vs[a - 1]).length + join(key).length <= 70) a -= 1;
    let b = a, len = join(vs[a]).length;
    while (b - a < 2 && b + 1 < vs.length && len + join(vs[b + 1]).length <= 100) { b += 1; len += join(vs[b]).length; }
    // 三節卻停在半句話時，退回兩節（若兩節剛好是完整句子）
    if (b - a === 2 && !ends(vs[b]) && ends(vs[b - 1])) b -= 1;
    const pick = vs.slice(a, b + 1);
    const lines = pick.map((v) => v.lines.filter((l) => l));
    const lastLine = lines[lines.length - 1];
    lastLine[lastLine.length - 1] = lastLine[lastLine.length - 1].replace(/[，；：、]$/, '……');
    const first = pick[0].v.split('-')[0], last = pick[pick.length - 1].v.split('-').pop();
    return { verses: pick.map((v, i) => ({ v: v.v, lines: lines[i] })), ref: `詩篇 ${n}:${first === last ? first : `${first}-${last}`}`, len };
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
    img.onerror = real.m ? () => { img.onerror = placeholder; img.src = real.src; } : placeholder; // 中圖載不到就改用原圖
    img.src = real.m || real.src;
  }

  /** 依使用者自己的作答判斷要不要把求助專線放在醒目位置（門檻在 CONFIG.supportProminent）。 */
  function needsCare(scores) {
    const r = C.supportProminent;
    if (!r) return false;
    const g = scores.G, a = scores.A;
    if (g === undefined) return false;
    return g <= r.hopeAlone || (a !== undefined && g <= r.hopeAndMood && a <= r.hopeAndMood);
  }

  /** 插畫的創作意義：有正式插畫、而且 data/illustration-notes.js 有寫的篇章才回傳 { title, text }。 */
  function artNote(n) {
    const v = C.illustration(n) && window.ILLUSTRATION_NOTES && window.ILLUSTRATION_NOTES[n];
    if (!v) return null;
    const o = typeof v === 'string' ? { title: '', text: v } : { title: v.title || '', text: v.text || '' };
    return o.text.trim() ? { title: o.title.trim(), text: o.text.trim() } : null;
  }
  /** 創作意義的抽屜：點開才顯示文字。 */
  function artDrawer(n, cls = '') {
    const a = artNote(n);
    if (!a) return '';
    return `<details class="art-drawer ${cls}"><summary><span class="art-k">這張插畫的創作意義</span>${a.title ? `<span class="art-t">${esc(a.title)}</span>` : ''}</summary><p>${esc(a.text)}</p></details>`;
  }

  function journeySay(stage) {
    const keys = Object.keys(T.stages), i = keys.indexOf(stage);
    const next = keys[(i + 1) % keys.length];
    return T.journey.say.replace('{stage}', stageName(stage)).replace('{next}', stageName(next));
  }
  /** 結果頁下半部的插畫卡片：小圖＋插畫名稱，點開看創作意義。 */
  function artCard(n) {
    const a = artNote(n), img = C.illustration(n);
    if (!a || !img) return '';
    return `<section class="r-block r-art" aria-label="這張插畫的創作意義"><details>
        <summary>${smallImg(img)}<span class="r-art-text"><span class="k">這張插畫的創作意義</span><span class="t">${esc(a.title || '')}</span></span>${icon('i-chev-d', 'ic chev')}</summary>
        <p>${esc(a.text)}</p>
      </details></section>`;
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
    const saved = record(n, isAlt ? 'near' : 'result');

    $('result-root').innerHTML = `
      <header class="r-hero">
        <div class="r-hero-text">
          <p class="r-kicker">你現在的生命光景</p>
          <div>
            <p class="r-line">${PsalmText.stageLines(st.line).map(esc).join('<br>')}</p>
            ${tags.length ? `<ul class="tags" aria-label="心境標籤">${tags.map((t) => `<li>${esc(t.text)}</li>`).join('')}</ul>` : ''}
          </div>
        </div>
        <h1 class="r-stage${[...name].length >= 3 ? ' long' : ''}" id="r-stage" tabindex="-1">${esc(name)}</h1>
      </header>
      ${isAlt ? `<p class="note">你正在看「也可能共鳴」的詩篇。<button class="btn-link" id="back-main" type="button">回到主要結果：詩篇第 ${res.best.psalm} 篇</button></p>` : ''}

      <figure class="illus" id="r-book"><img id="r-img" alt="" decoding="async" width="1254" height="1254"></figure>
      ${!C.illustration(n) ? '<p class="fine illus-note">插畫製作中・目前顯示品牌裝飾圖</p>' : ''}

      <section class="psalm" aria-labelledby="pc-num">
        <p class="psalm-label">推薦你現在讀</p>
        <h2 class="psalm-num" id="pc-num"><span>詩篇 第</span><span class="n${String(n).length >= 3 ? ' n3' : ''}">${n}</span><span>篇</span></h2>
        ${kv ? `<blockquote class="psalm-verse${kv.ex.len > 40 ? ' long' : ''}">${kv.ex.verses.map((v) => `<p>${v.lines.map(esc).join('<br>')}</p>`).join('')}<span class="psalm-ref">${esc(kv.ex.ref)}</span></blockquote>
` : ''}
      </section>

      ${deep ? supportBlock(true) : ''}

      <div class="r-cta" id="r-cta">
        <div class="cta-row">
          <button class="btn btn-primary" id="btn-share" type="button">${icon('i-image')}製作分享圖</button>
          <button class="btn btn-ink" id="btn-read" type="button">${icon('i-book')}讀第 ${n} 篇全文</button>
        </div>
        ${saved ? `<p class="fine saved-note">這篇已收進<a href="#/mine">我的詩篇</a>，之後可以回來再讀</p>` : ''}
      </div>

      <div class="r-details">
      <section class="journey">
        <h2 class="journey-title">${esc(T.journey.title)}</h2>
        <div class="journey-track">
          <ol aria-label="九種生命光景，你目前在${esc(name)}">${Object.keys(T.stages).map((k) => `<li${k === p.stage ? ' class="on" aria-current="true"' : ''}>${esc(stageName(k))}</li>`).join('')}</ol>
        </div>
        ${st.about ? `<p class="journey-about">${esc(st.about)}</p>` : ''}
        <p class="journey-say">${esc(journeySay(p.stage))}</p>
      </section>

      <section class="r-block r-say" aria-labelledby="h-now">
        <div class="r-head"><span class="no" aria-hidden="true">壹</span><h2 id="h-now">這篇詩想對你說</h2></div>
        <p class="r-body">${esc(p.body)}</p>
      </section>

      ${artCard(n)}

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
      </div>

      ${pod ? `<aside class="podcast" aria-labelledby="h-pod">
        <p class="kicker">${esc(pod.kicker)}</p>
        <h2 id="h-pod">${pod.title.map(esc).join('<br>')}</h2>
        <a class="btn" href="${esc(pod.url)}" target="_blank" rel="noopener">${esc(pod.cta)}${icon('i-arrow-r')}</a>
      </aside>` : ''}
      <div class="r-sticky" id="r-sticky" aria-hidden="true"><button class="btn btn-primary" id="btn-share-2" type="button" tabindex="-1">${icon('i-image')}製作分享圖</button></div>`;

    illus($('r-book'), $('r-img'), n);
    $('btn-read').onclick = () => go(`#/read/${n}`);
    const openShare = () => Share.open({ psalm: p, stage: p.stage, stageLine: st.line, stageColor: st.color, scores: res.scores, tags: tags.map((t) => t.text), verse: kv, img: C.illustration(n) });
    $('btn-share').onclick = openShare;
    $('btn-share-2').onclick = openShare;
    stickyShare();
    $('btn-again').onclick = () => { clear(); lastResult = null; go('#/'); };
    $('btn-edit').onclick = () => { state.step = 0; state.done = false; save(); go('#/quiz'); };
    if ($('back-main')) $('back-main').onclick = () => renderResult();
    document.querySelectorAll('.near-list button').forEach((b) => (b.onclick = () => renderResult(+b.dataset.psalm)));
    $('r-stage').focus({ preventScroll: true });
  }

  // 看不到「製作分享圖／讀全文」那排按鈕時（還沒捲到或已經捲過），底部浮出「製作分享圖」；捲到最底的 Podcast 區就收起來
  let stickyTick = false;
  function stickyUpdate() {
    stickyTick = false;
    const bar = $('r-sticky'), cta = $('r-cta');
    if (!bar || !cta || $('view-result').hidden) return;
    const pod = document.querySelector('#result-root .podcast');
    const vh = window.innerHeight;
    const r = cta.getBoundingClientRect();
    const ctaSeen = r.bottom > 0 && r.top < vh - 60; // 上方兩顆按鈕在畫面裡
    const on = !ctaSeen && !(pod && pod.getBoundingClientRect().top < vh - 40);
    if (bar.classList.contains('on') === on) return;
    bar.classList.toggle('on', on);
    bar.setAttribute('aria-hidden', on ? 'false' : 'true');
    $('btn-share-2').tabIndex = on ? 0 : -1;
  }
  function stickyShare() { stickyUpdate(); }
  const stickyQueue = () => { if (!stickyTick) { stickyTick = true; requestAnimationFrame(stickyUpdate); } };
  window.addEventListener('scroll', stickyQueue, { passive: true });
  window.addEventListener('resize', stickyQueue);

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
    if (prevView !== 'read') readFrom = prevView;
    $('btn-read-back').querySelector('span').textContent = readFrom === 'mine' ? '回到我的詩篇' : lastResult || state.done ? '返回結果' : '回到首頁';
    record(n, 'read');
    // 「選到」指的是測驗結果或從共鳴點開，單純讀全文不算；依日期由新到舊
    const picked = [...new Set(loadCol().filter((x) => x.n === n && (x.how || []).some((h) => h === 'result' || h === 'near')).map((x) => x.day))].sort().reverse();
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
      ${artDrawer(n)}
      <h1 tabindex="-1" id="read-title">詩篇 第 ${n} 篇</h1>
      ${S.title ? `<p class="sup">${esc(S.title)}</p>` : ''}
      ${picked.length ? `<p class="read-dates">${picked.length === 1 ? `你在 <b>${esc(dayLabel(picked[0]))}</b> 選到這一篇` : `你選到這一篇的日子<br>${picked.map((d) => `<b>${esc(dayLabel(d))}</b>`).join('、')}`}</p>` : ''}
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
  let readFrom = '';
  $('btn-read-back').onclick = () => go(readFrom === 'mine' ? '#/mine' : lastResult || state.done ? '#/result' : '#/');

  /* ---------- 我的詩篇：開過的詩篇紀錄（只存在這台裝置的瀏覽器） ---------- */
  const CKEY = 'psalm-collection-v1';
  const HOW = { result: '測驗結果', near: '也可能共鳴', read: '讀過全文' };
  const IN_APP = /\bLine\/|FBAN|FBAV|Instagram|Barcelona|MicroMessenger|KAKAOTALK/i.test(navigator.userAgent);
  function loadCol() {
    try { const a = JSON.parse(localStorage.getItem(CKEY) || '[]'); return Array.isArray(a) ? a.filter((x) => x && byNum[x.n]) : []; } catch (e) { return []; }
  }
  function saveCol(a) {
    try { localStorage.setItem(CKEY, JSON.stringify(a.slice(0, 500))); return true; } catch (e) { return false; }
  }
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dayLabel = (k) => { const [y, m, d] = k.split('-').map(Number); const now = new Date(); return (y === now.getFullYear() ? '' : `${y} 年 `) + `${m} 月 ${d} 日` + (k === dayKey() ? '（今天）' : ''); };
  /** 記錄開過的詩篇。同一天同一篇只留一筆，會合併「怎麼開到的」並移到最前面。回傳是否存成功。 */
  function record(n, how) {
    const a = loadCol(), day = dayKey();
    const i = a.findIndex((x) => x.n === n && x.day === day);
    if (i >= 0) { const x = a.splice(i, 1)[0]; x.how = [...new Set([...(x.how || []), how])]; x.t = Date.now(); a.unshift(x); }
    else a.unshift({ n, day, t: Date.now(), how: [how] });
    return saveCol(a);
  }
  /** 小圖（我的詩篇用）：有縮圖就用縮圖，載不到再改用原圖。 */
  const smallImg = (img) => `<img src="${esc(img.s || img.src)}" alt="" loading="lazy" decoding="async"${img.s ? ` onerror="this.onerror=null;this.src='${esc(img.src)}'"` : ''}>`;
  /** 我的詩篇：每筆紀錄下方的插畫小圖與創作意義（點開才顯示）。 */
  function recMeaning(n) {
    const a = artNote(n), img = C.illustration(n);
    if (!a) return '';
    return `<details class="rec-art"><summary>${smallImg(img)}<span>插畫｜${esc(a.title || '創作意義')}</span></summary><p>${esc(a.text)}</p></details>`;
  }
  /*
   * 備份代碼：PSALM1: 加上 base64 的 [[篇號, 日期 YYYYMMDD, 方式]]，方式用位元表示（1 測驗結果、2 共鳴、4 讀全文）。
   * 只有篇號和日期，沒有任何作答內容。
   */
  const HOW_BIT = { result: 1, near: 2, read: 4 };
  function backupCode() {
    const rows = loadCol().map((x) => [x.n, +x.day.replace(/-/g, ''), (x.how || []).reduce((m, h) => m | (HOW_BIT[h] || 0), 0)]);
    return 'PSALM1:' + btoa(JSON.stringify(rows));
  }
  function restoreCode(text) {
    const m = String(text || '').replace(/\s+/g, '').match(/PSALM1:([A-Za-z0-9+/=]+)/);
    if (!m) return { ok: false, msg: '看不懂這段代碼，請確認有完整複製（PSALM1: 開頭）' };
    let rows;
    try { rows = JSON.parse(atob(m[1])); } catch (e) { return { ok: false, msg: '代碼不完整，請重新複製一次' }; }
    if (!Array.isArray(rows)) return { ok: false, msg: '代碼格式不對' };
    const a = loadCol(); let added = 0;
    for (const r of rows) {
      if (!Array.isArray(r)) continue;
      const [n, d, bits] = r, ds = String(d);
      if (!byNum[n] || !/^\d{8}$/.test(ds)) continue;
      const day = `${ds.slice(0, 4)}-${ds.slice(4, 6)}-${ds.slice(6, 8)}`;
      const how = Object.keys(HOW_BIT).filter((h) => bits & HOW_BIT[h]);
      const ex = a.find((x) => x.n === n && x.day === day);
      if (ex) ex.how = [...new Set([...(ex.how || []), ...how])];
      else { a.push({ n, day, t: new Date(`${day}T12:00:00`).getTime() - n, how: how.length ? how : ['result'] }); added++; }
    }
    a.sort((x, y) => (y.day > x.day ? 1 : y.day < x.day ? -1 : y.t - x.t));
    if (!saveCol(a)) return { ok: false, msg: '這個瀏覽器目前無法保存紀錄' };
    return { ok: true, added };
  }
  let backupOpen = false;
  let confirmClear = false;
  function renderMine() {
    show('mine');
    const a = loadCol();
    const got = new Set(a.map((x) => x.n));
    let ok = true; try { localStorage.setItem('psalm-ls-test', '1'); localStorage.removeItem('psalm-ls-test'); } catch (e) { ok = false; }
    const days = [];
    for (const x of a) { let g = days.find((d) => d.day === x.day); if (!g) days.push((g = { day: x.day, items: [] })); g.items.push(x); }
    const cells = Array.from({ length: 150 }, (_, i) => {
      const n = i + 1, p = byNum[n], img = C.illustration(n);
      if (!got.has(n)) return `<li class="stamp" aria-hidden="true"><span>${n}</span></li>`;
      return `<li><a class="stamp got${img ? ' has-img' : ''}" href="#/read/${n}" aria-label="詩篇第 ${n} 篇：${esc(p.title)}（${esc(stageName(p.stage))}）">${img ? smallImg(img) : ''}<span>${n}</span></a></li>`;
    }).join('');
    $('mine-root').innerHTML = `
      <h1 class="page-title" tabindex="-1" id="mine-title">我的詩篇</h1>
      ${!ok ? '<p class="note">這個瀏覽器目前無法保存紀錄（可能是無痕模式），所以這裡不會留下你開過的詩篇。</p>' : ''}
      ${IN_APP ? '<p class="note">你現在是在 App 裡開啟這個網頁。App 內建的瀏覽器有時會自動清除資料，而且跟手機的 Safari、Chrome 是分開的。想長期保存，建議改用 Safari 或 Chrome 打開；這裡已有的紀錄，可以用頁面最下方的「備份與還原」帶過去。</p>' : ''}
      <section aria-labelledby="h-stamps">
        <div class="mine-count"><h2 id="h-stamps">詩篇集章</h2><p><b>${got.size}</b> ／ 150</p></div>
        <p class="fine">做測驗、點開共鳴的詩篇、讀全文，開過的詩篇就會在這裡亮起來。點亮起來的格子可以再讀一次。</p>
        <ol class="stamps" aria-label="150 篇詩篇集章，已收集 ${got.size} 篇">${cells}</ol>
      </section>
      <section class="r-block mine-list" aria-labelledby="h-log">
        <div class="r-head"><h2 id="h-log">開過的詩篇</h2></div>
        ${a.length ? days.map((g) => `<h3 class="day">${esc(dayLabel(g.day))}</h3>
          <ul class="recs">${g.items.map((x) => { const p = byNum[x.n]; return `<li>
            <a class="rec" href="#/read/${x.n}"><span class="n">${x.n}</span><span class="t">${esc(p.shortTitle || p.title)}<small>${esc(stageName(p.stage))}・${(x.how || []).map((h) => HOW[h] || '').filter(Boolean).join('・')}</small></span></a>
            <button class="icon-btn rec-del" type="button" data-t="${x.t}" aria-label="刪除這筆紀錄：詩篇第 ${x.n} 篇，${esc(dayLabel(x.day))}"><svg aria-hidden="true"><use href="#i-close"/></svg></button>
            ${recMeaning(x.n)}
          </li>`; }).join('')}</ul>`).join('')
        : `<p class="why-intro">還沒有紀錄。做完一次測驗，結果的詩篇就會收進這裡。</p><div class="btn-row"><a class="btn btn-primary" href="#/">去做測驗</a></div>`}
      </section>
      <div class="mine-end">
        <p class="fine">紀錄只存在這台裝置的這個瀏覽器，不會上傳。清除瀏覽資料、換手機或換瀏覽器，就看不到這些紀錄。要帶到別的地方，請用下面的「備份與還原」。</p>
        <details class="more backup"${backupOpen ? ' open' : ''}><summary>備份與還原</summary>
          <div class="backup-body">
            ${a.length ? `<p class="fine">複製這串備份代碼，傳給自己（例如 LINE 的記事本或 Email），到新的手機或瀏覽器打開這一頁，貼上後按「還原」就好。</p>
            <div class="btn-row"><button class="btn btn-outline" id="bk-copy" type="button">複製備份代碼</button><button class="btn-link" id="bk-file" type="button">下載備份檔</button></div>` : ''}
            <label class="fine" for="bk-in">貼上備份代碼</label>
            <textarea id="bk-in" rows="3" placeholder="PSALM1: 開頭的一串文字" spellcheck="false" autocomplete="off"></textarea>
            <div class="btn-row"><button class="btn btn-outline" id="bk-restore" type="button">還原</button></div>
            <p class="fine">還原會跟這裡現有的紀錄合併，不會刪掉任何一筆。</p>
          </div>
        </details>
        ${a.length ? `<button class="btn-link" id="mine-clear" type="button">${confirmClear ? '確定要全部清除嗎？再按一次就會清除' : '全部清除'}</button>` : ''}
      </div>`;
    document.querySelectorAll('.rec-del').forEach((b) => (b.onclick = () => {
      saveCol(loadCol().filter((x) => String(x.t) !== b.dataset.t));
      confirmClear = false; renderMineKeepScroll(); toast('已刪除這筆紀錄');
    }));
    $('mine-root').querySelector('details.backup').ontoggle = (e) => { backupOpen = e.target.open; };
    if ($('bk-copy')) $('bk-copy').onclick = async () => {
      const code = backupCode();
      try { await navigator.clipboard.writeText(code); toast('備份代碼已複製'); }
      catch (e) { $('bk-in').value = code; $('bk-in').select(); toast('請長按上方的代碼自行複製'); }
    };
    if ($('bk-file')) $('bk-file').onclick = () => {
      const blob = new Blob([backupCode() + '\n'], { type: 'text/plain' });
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `我的詩篇備份-${dayKey()}.txt`;
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    };
    $('bk-restore').onclick = () => {
      const r = restoreCode($('bk-in').value);
      if (!r.ok) { toast(r.msg); $('bk-in').focus(); return; }
      renderMine(); toast(r.added ? `已還原，新增 ${r.added} 筆紀錄` : '這些紀錄這裡都已經有了');
    };
    if ($('mine-clear')) $('mine-clear').onclick = () => {
      if (!confirmClear) { confirmClear = true; renderMineKeepScroll(); $('mine-clear').focus(); return; }
      confirmClear = false; saveCol([]); renderMine(); toast('紀錄已全部清除');
    };
    $('mine-title').focus({ preventScroll: true });
  }
  function renderMineKeepScroll() { const y = window.scrollY; renderMine(); window.scrollTo(0, y); }

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
