// 產生 150 篇的「分享連結頁」：p/1.html … p/150.html
//
// 為什麼需要：網站本身只有一個 index.html，不管分享哪個結果，LINE、Facebook 抓到的預覽都一樣。
// 這支程式替每一篇做一個小頁面，裡面有那一篇自己的標題、說明和預覽圖；
// 朋友點開後會立刻轉到那一篇的讀全文頁（並提示他也可以做測驗）。
//
// 預覽圖：用那一篇的插畫放在米色紙底上，做成 1200×630 的 p/og/詩篇號.雜湊.jpg。
//   還沒有插畫、或這次沒裝好 sharp 時，改用網站共用的 assets/og-image.jpg。
//
// 平常不用手動執行：每次推送到 GitHub，.github/workflows/deploy.yml 會在更新插畫清單之後跑這支程式。
// 想在自己電腦上先跑：在專案根目錄執行  node tools/build-share-pages.mjs（要產生預覽圖需先 npm install sharp）
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'p'), ogDir = join(outDir, 'og');

// 讀網站的資料檔（都是 window.XXX = ... 的寫法）
const win = {};
const ctx = vm.createContext({ window: win });
for (const f of ['data/psalms.js', 'data/copy.js', 'data/stage-content.js', 'data/images.js']) {
  const p = join(root, f);
  if (existsSync(p)) vm.runInContext(readFileSync(p, 'utf8'), ctx, { filename: f });
}
const PSALMS = win.PSALMS || [], COPY = win.COPY || {}, IMAGES = win.PSALM_IMAGES || {};
const STAGES = (win.PSALM_STAGE_CONTENT && win.PSALM_STAGE_CONTENT.stagesByKey) || {};
if (PSALMS.length !== 150) { console.log(`::warning::data/psalms.js 只讀到 ${PSALMS.length} 篇，沒有產生分享連結頁`); process.exit(0); }

// 網站網址：取 index.html 的 og:url
const index = readFileSync(join(root, 'index.html'), 'utf8');
const SITE = ((index.match(/property="og:url" content="([^"]+)"/) || [])[1] || 'https://gbookchurch.github.io/psalm-landscape/').replace(/\/?$/, '/');
const ver = (index.match(/\?v=([\d.]+)/) || [])[1] || '';

let sharp = null;
try { sharp = (await import('sharp')).default; } catch (e) { /* 沒有 sharp：預覽圖改用共用圖 */ }

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const stageName = (k) => (k || '').replace(/^\d\s*/, '');

/** 用插畫做 1200×630 預覽圖：米色紙底、左上四個品牌圈、插畫置中。回傳檔名或 null。 */
const keepOg = new Set();
let madeOg = 0;
async function ogImage(n) {
  const img = IMAGES[n];
  if (!img || !sharp) return null;
  const src = join(root, img.src);
  if (!existsSync(src)) return null;
  const buf = readFileSync(src);
  const hash = createHash('sha1').update(buf).update('og-v1').digest('hex').slice(0, 8);
  const name = `${String(n).padStart(3, '0')}.${hash}.jpg`;
  keepOg.add(name);
  const path = join(ogDir, name);
  if (existsSync(path)) return name;
  mkdirSync(ogDir, { recursive: true });
  const art = await sharp(buf).resize(560, 560, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const dots = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="40">
    <circle cx="20" cy="20" r="11" fill="#EB5A0C"/><circle cx="50" cy="20" r="11" fill="#F5A21B"/>
    <circle cx="80" cy="20" r="11" fill="#FFD24D"/><circle cx="110" cy="20" r="11" fill="#6DB443"/></svg>`);
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#FFF7E8' } })
    .composite([{ input: art, left: 320, top: 35 }, { input: dots, left: 40, top: 36 }])
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(path);
  madeOg++;
  return name;
}

mkdirSync(outDir, { recursive: true });
let pages = 0;
for (const p of PSALMS) {
  const n = p.psalm;
  const sc = STAGES[p.stage] || {};
  const st = (COPY.stages || {})[p.stage] || {};
  const name = stageName(p.stage);
  const og = await ogImage(n);
  const ogUrl = og ? `${SITE}p/og/${og}` : `${SITE}assets/og-image.jpg`;
  const title = `詩篇 ${n} 篇｜${p.title}`;
  const desc = `生命光景：${name}。${(sc.headline || st.line || '').replace(/。$/, '')}。你現在的光景，適合讀哪篇詩篇？`;
  const target = `../?s=${n}#/read/${n}`;
  const html = `<!doctype html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}｜教會小本本</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="${SITE}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="教會小本本">
<meta property="og:locale" content="zh_TW">
<meta property="og:url" content="${SITE}p/${n}.html">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${ogUrl}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(`詩篇 ${n} 篇的插畫`)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${ogUrl}">
<link rel="icon" href="../assets/favicon.svg${ver ? `?v=${ver}` : ''}" type="image/svg+xml">
<meta http-equiv="refresh" content="0; url=${target}">
<script>location.replace(${JSON.stringify(target)});</script>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#FFF7E8;color:#17402A;font-family:system-ui,sans-serif}a{color:#B84A0B}</style>
</head>
<body>
<p><a href="${target}">打開詩篇 ${n} 篇</a></p>
</body>
</html>
`;
  writeFileSync(join(outDir, `${n}.html`), html);
  pages++;
}

// 刪掉用不到的舊預覽圖（插畫換過之後，舊的雜湊檔名就不再使用）
let removed = 0;
if (sharp && existsSync(ogDir)) {
  for (const f of readdirSync(ogDir)) if (/\.jpg$/.test(f) && !keepOg.has(f)) { unlinkSync(join(ogDir, f)); removed++; }
}
console.log(`分享連結頁：${pages} 頁；預覽圖：${keepOg.size} 張有插畫（這次新產生 ${madeOg} 張、刪掉 ${removed} 張舊的）${sharp ? '' : '；沒有 sharp，全部改用共用預覽圖'}`);
