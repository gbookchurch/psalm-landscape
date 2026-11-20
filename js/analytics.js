/*
 * Google Analytics 4（web-0.39）
 *
 * 啟用方式：在 data/config.js 的 ga4Id 填上評估 ID（G- 開頭），沒填就完全不載入、不送任何資料。
 *
 * 會送出的：
 *   page_view          換頁時送出，頁面路徑像 /quiz、/result、/read/23、/mine、/about
 *   quiz_start         開始作答（答第一題時）
 *   quiz_complete      做完測驗看到結果：psalm（篇號）、stage（光景名稱）
 *   share_open         打開分享圖視窗：kind（result 結果／verse 經文）
 *   share_image        儲存或分享圖片：method（download 下載／native 手機分享）、kind、ratio、style
 *   share_link         複製這一篇的分享連結、或按上方分享按鈕：method（copy／native）
 *   shared_visit       從朋友的分享連結進來：psalm
 *   verse_keep         記住一節經文：psalm
 *   verse_copy         複製一節經文：psalm
 *   podcast_click      點結果頁的「教會小本本」
 * 不會送出的：任何題目的作答、八個面向的分數、記住的是哪一節、備份代碼。
 */
(function (root) {
  const C = root.PSALM_CONFIG || root.CONFIG || {};
  const id = (C.ga4Id || '').trim();
  const on = /^G-[A-Z0-9]+$/i.test(id);
  root.track = function () {};
  root.trackPage = function () {};
  if (!on) return;

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
  root.dataLayer = root.dataLayer || [];
  function gtag() { root.dataLayer.push(arguments); }
  root.gtag = gtag;
  gtag('js', new Date());
  // 換頁由網站自己送（網站用 #/ 切換畫面，GA 預設抓不到）
  gtag('config', id, { send_page_view: false });

  const titles = { '/': '首頁', '/quiz': '作答', '/result': '結果', '/mine': '我的詩篇', '/about': '關於網站', '/insufficient': '作答不足' };
  let lastPath = '';
  root.trackPage = function (path) {
    if (!path || path === lastPath) return;
    lastPath = path;
    const title = titles[path] || (path.startsWith('/read/') ? `讀全文 詩篇 ${path.split('/')[2]}` : path);
    gtag('event', 'page_view', {
      page_path: path,
      page_location: location.origin + location.pathname.replace(/index\.html$/, '') + path.replace(/^\//, '#/'),
      page_title: title,
    });
  };
  root.track = function (name, params) {
    try { gtag('event', name, params || {}); } catch (e) { /* 統計失敗不影響網站 */ }
  };
})(window);
