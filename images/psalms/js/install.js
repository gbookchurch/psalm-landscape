/* 加到手機桌面（web-0.45）
   - 註冊 service worker（sw.js），讓網站可以像 App 一樣安裝，斷網時也打得開讀過的頁面
   - #/app 頁：依照手機和瀏覽器，顯示對應的步驟；Android 的 Chrome 可以直接按按鈕安裝
   - 已經從桌面打開的人，首頁和選單就不再出現提醒 */
(function () {
  const $ = (id) => document.getElementById(id);
  const ua = navigator.userAgent;
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isLine = /\bLine\//i.test(ua);
  const inApp = /\bLine\/|FBAN|FBAV|Instagram|Barcelona|MicroMessenger|KAKAOTALK/i.test(ua);
  const isSamsung = /SamsungBrowser/.test(ua);
  const tr = (n, p) => { try { window.track && window.track(n, p); } catch (e) {} };

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  let prompt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); prompt = e; if (location.hash.startsWith('#/app')) render(); });
  window.addEventListener('appinstalled', () => { prompt = null; tr('app_installed'); if (location.hash.startsWith('#/app')) render(); });

  function hideEntries() {
    const on = standalone();
    document.body.classList.toggle('is-app', on);
    if ($('home-app')) $('home-app').hidden = on;
    document.querySelectorAll('.nav-app').forEach((a) => (a.hidden = on));
  }
  hideEntries();
  if (standalone()) {
    try { if (!sessionStorage.getItem('psalm-app-open')) { sessionStorage.setItem('psalm-app-open', '1'); tr('app_open'); } } catch (e) {}
  }

  const hasRecords = () => { try { return JSON.parse(localStorage.getItem('psalm-collection-v1') || '[]').length > 0; } catch (e) { return false; } };
  let tab = isIOS ? 'ios' : 'android';

  const step = (i, html) => `<li><span class="app-step-n">${i}</span><div>${html}</div></li>`;
  const shareIc = '<svg class="ic-inline" aria-hidden="true"><use href="#i-share"/></svg>';
  const plusIc = '<span class="key-ic" aria-hidden="true">＋</span>';

  function iosSteps() {
    return `<ol class="app-steps">
      ${step(1, `用 <b>Safari</b> 打開這個網站，點畫面下方的分享按鈕 ${shareIc}。<span class="fine">如果下方只看到「⋯」，先點「⋯」，再點「分享」。</span>`)}
      ${step(2, `往下滑，點「<b>加入主畫面</b>」 ${plusIc}。`)}
      ${step(3, '名稱會是「詩篇光景」，點右上角「<b>加入</b>」。桌面上就會出現圖示。')}
    </ol>
    ${hasRecords() ? '<p class="note">小提醒：iPhone 從桌面打開時，是一個新的空間，之前在 Safari 裡的「我的詩篇」紀錄不會自動帶過去。可以先到 <a class="btn-link" href="#/mine">我的詩篇</a> 最下方的「備份與還原」複製備份代碼，從桌面打開後再貼上還原。</p>' : ''}`;
  }
  function androidSteps() {
    const btn = prompt ? `<button class="btn btn-primary btn-block app-install" id="app-install" type="button">${plusIc}加到手機桌面</button>
      <p class="fine center">按下去之後，在跳出來的視窗點「安裝」就完成了。</p>` : '';
    const manual = isSamsung
      ? `<ol class="app-steps">
          ${step(1, '點右下角的選單 <span class="key-ic" aria-hidden="true">≡</span>。')}
          ${step(2, '點「<b>加入頁面至</b>」，再選「<b>主螢幕</b>」。')}
          ${step(3, '確認名稱是「詩篇光景」，點「新增」。')}
        </ol>`
      : `<ol class="app-steps">
          ${step(1, '用 <b>Chrome</b> 打開這個網站，點右上角的 <span class="key-ic" aria-hidden="true">⋮</span>。')}
          ${step(2, '點「<b>加到主畫面</b>」或「<b>安裝應用程式</b>」。')}
          ${step(3, '點「安裝」或「新增」。桌面上就會出現「詩篇光景」的圖示。')}
        </ol>`;
    return btn ? `${btn}<details class="more app-manual"><summary>沒有跳出視窗？手動加入的方法</summary>${manual}</details>` : manual;
  }

  function render() {
    const body = $('app-body');
    if (!body) return;
    hideEntries();
    if (standalone()) {
      body.innerHTML = `<div class="app-done"><p><b>你現在就是從桌面打開的。</b></p><p>之後想讀詩篇，點桌面上的「詩篇光景」就好。</p><div class="btn-row"><a class="btn btn-outline" href="#/mine">看我的詩篇</a></div></div>`;
      return;
    }
    let lead = '';
    if (inApp) {
      const ext = location.href.split('#')[0].split('?')[0] + '?openExternalBrowser=1#/app';
      lead = `<div class="note app-inapp"><p><b>先換到手機的瀏覽器</b></p><p>你現在是在 ${isLine ? 'LINE' : 'App'} 裡面開啟網頁，這裡沒辦法加到桌面。請先用 ${isIOS ? 'Safari' : 'Chrome'} 打開這個網站。</p>
        ${isLine ? `<a class="btn btn-outline btn-block" href="${ext}">用${isIOS ? ' Safari ' : '瀏覽器'}打開</a>` : `<p class="fine">點右上角或右下角的「⋯」，選「用瀏覽器開啟」。</p>`}</div>`;
    } else if (!isIOS && !isAndroid) {
      lead = `<div class="note"><p>這個功能要在手機上做。用手機打開這個網址，再照下面的步驟：</p><p class="app-url">${location.href.split('#')[0].split('?')[0].replace(/^https?:\/\//, '')}</p></div>`;
    }
    body.innerHTML = `${lead}
      <div class="seg app-tabs" role="tablist" aria-label="手機類型">
        <button type="button" role="tab" data-tab="ios" aria-selected="${tab === 'ios'}">iPhone</button>
        <button type="button" role="tab" data-tab="android" aria-selected="${tab === 'android'}">Android</button>
      </div>
      <div class="app-panel" role="tabpanel">${tab === 'ios' ? iosSteps() : androidSteps()}</div>`;
    body.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; render(); }));
    if ($('app-install')) $('app-install').onclick = async () => {
      const p = prompt; if (!p) return;
      p.prompt();
      try { const r = await p.userChoice; tr('app_prompt', { outcome: r.outcome }); } catch (e) {}
      prompt = null; render();
    };
  }
  window.renderInstall = () => { render(); tr('app_guide_view', { device: isIOS ? 'ios' : isAndroid ? 'android' : 'desktop' }); };
  if (location.hash.startsWith('#/app')) window.renderInstall();
})();
