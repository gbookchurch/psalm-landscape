// 掃描 images/psalms/ 裡的插畫，重新產生 data/images.js，並自動產生兩種縮小版：
//   images/psalms/m/  中圖（寬 800），給結果頁和讀全文頁用
//   images/psalms/s/  小圖（寬 192），給「我的詩篇」的集章和列表用
// 縮小版的檔名帶有原圖內容的短雜湊，換了同名的新圖也會重新產生；用不到的舊縮圖會自動刪掉。
// 平常不用手動執行：每次推送到 GitHub，.github/workflows/deploy.yml 會自動跑這支程式再部署。
// 想在自己電腦上先跑：在專案根目錄執行  node tools/build-images.mjs（要產生縮圖需先 npm install sharp）
import { readdirSync, readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'images', 'psalms');
const out = join(root, 'data', 'images.js');
const SIZES = { m: { w: 800, q: 82 }, s: { w: 192, q: 76 } };
const inCI = !!process.env.GITHUB_ACTIONS;
const warnings = [];
const warn = (file, msg) => { warnings.push(`${file}：${msg}`); if (inCI) console.log(`::warning file=images/psalms/${file}::${msg}`); };

let sharp = null;
try { sharp = (await import('sharp')).default; } catch (e) { /* 沒有安裝 sharp：沿用已經存在的縮圖，不產生新的 */ }

/** 讀 webp 檔頭，取得寬、高、有沒有透明色版。讀不懂就回傳 null。 */
function webpInfo(buf) {
  if (buf.length < 30 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const kind = buf.toString('ascii', 12, 16);
  if (kind === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3), alpha: !!(buf[20] & 0x10) };
  if (kind === 'VP8L') { const b = buf.readUInt32LE(21); return { w: (b & 0x3fff) + 1, h: ((b >>> 14) & 0x3fff) + 1, alpha: !!((b >>> 28) & 1) }; }
  if (kind === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff, alpha: false };
  return null;
}

const files = existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isFile()).map((d) => d.name).sort() : [];
const images = {};
const keep = { m: new Set(), s: new Set() };
let skippedOther = 0, made = 0;
for (const f of files) {
  if (f.startsWith('.')) continue;
  const m = f.match(/^psalm[-_](\d{1,3})(?:[-_.].*)?\.webp$/i);
  if (!m) {
    if (/\.webp$/i.test(f)) warn(f, '檔名不是 psalm-三位數篇號 開頭（例如 psalm-040-xxx.webp），已略過');
    else skippedOther++;
    continue;
  }
  const n = +m[1];
  if (n < 1 || n > 150) { warn(f, `篇號 ${n} 不在 1 到 150 之間，已略過`); continue; }
  if (images[n]) { warn(f, `詩篇 ${n} 已經有 ${images[n].src.split('/').pop()}，這個檔案已略過；同一篇請只留一張`); continue; }
  const buf = readFileSync(join(dir, f));
  const info = webpInfo(buf);
  if (!info) { warn(f, '不是有效的 webp 檔，已略過'); continue; }
  if (info.w !== info.h) warn(f, `不是正方形（${info.w}×${info.h}），畫面上會留白`);
  if (!info.alpha) warn(f, '沒有透明背景，疊在紙底上會看到方形底色');
  const entry = { src: `images/psalms/${f}`, w: info.w, h: info.h };
  const hash = createHash('sha1').update(buf).digest('hex').slice(0, 8);
  for (const [k, cfg] of Object.entries(SIZES)) {
    const name = f.replace(/\.webp$/i, `.${hash}.webp`);
    const path = join(dir, k, name);
    if (!existsSync(path) && sharp && info.w > cfg.w) {
      mkdirSync(join(dir, k), { recursive: true });
      try { await sharp(buf).resize({ width: cfg.w }).webp({ quality: cfg.q, alphaQuality: 90, effort: 5 }).toFile(path); made++; }
      catch (e) { warn(f, `產生${k === 'm' ? '中圖' : '小圖'}失敗：${e.message}`); }
    }
    if (existsSync(path)) { entry[k] = `images/psalms/${k}/${name}`; keep[k].add(name); }
  }
  images[n] = entry;
}
// 刪掉用不到的舊縮圖（原圖被換掉或刪掉之後留下的）
let removed = 0;
for (const k of Object.keys(SIZES)) {
  const d = join(dir, k);
  if (!existsSync(d)) continue;
  for (const f of readdirSync(d)) if (/\.webp$/i.test(f) && !keep[k].has(f)) { unlinkSync(join(d, f)); removed++; }
}

const nums = Object.keys(images).map(Number).sort((a, b) => a - b);
const head = `/* 自動產生，請勿手改。由 tools/build-images.mjs 依 images/psalms/ 內的 psalm-NNN-*.webp 產生（共 ${nums.length} 篇）。
 * src 是原圖（分享圖用），m 是中圖（結果頁、讀全文），s 是小圖（我的詩篇）。沒有縮圖時網站會改用原圖。
 * 只有這裡列出的篇章會顯示插畫；其他篇章一律用中性佔位，不推測檔名。
 * 新增插畫：把 webp 上傳到 images/psalms/ 就好，推送後 GitHub 會自動重新產生這個檔案和縮圖並部署。 */
`;
const body = 'window.PSALM_IMAGES = {\n' + nums.map((n) => `  ${n}: ${JSON.stringify(images[n]).replace(/":/g, '": ').replace(/,"/g, ', "')}`).join(',\n') + '\n};\n';

const before = existsSync(out) ? readFileSync(out, 'utf8') : '';
const had = new Set([...before.matchAll(/^\s*(\d+):\s*\{/gm)].map((x) => +x[1]));
const added = nums.filter((n) => !had.has(n));
const gone = [...had].filter((n) => !images[n]).sort((a, b) => a - b);
if (before !== head + body) writeFileSync(out, head + body);

const missing = []; for (let n = 1; n <= 150; n++) if (!images[n]) missing.push(n);
const noThumb = nums.filter((n) => !images[n].m || !images[n].s);
const lines = [
  `插畫清單：共 ${nums.length} / 150 篇有插畫。`,
  added.length ? `這次新增：詩篇 ${added.join('、')}` : '這次沒有新增。',
  gone.length ? `這次移除：詩篇 ${gone.join('、')}` : '',
  `縮圖：這次新產生 ${made} 張${removed ? `，刪掉 ${removed} 張用不到的舊縮圖` : ''}。${noThumb.length ? `還沒有縮圖的篇章：${noThumb.join('、')}${sharp ? '' : '（這台電腦沒有安裝 sharp，所以沒有產生）'}` : ''}`,
  missing.length ? `還沒有插畫的篇章（${missing.length} 篇）：${missing.join('、')}` : '150 篇都有插畫了。',
  skippedOther ? `資料夾裡另有 ${skippedOther} 個不是 webp 的檔案，沒有使用（可以刪掉）。` : '',
  warnings.length ? `\n需要注意（${warnings.length} 項）：\n- ${warnings.join('\n- ')}` : '',
].filter(Boolean);
console.log(lines.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## 插畫清單\n\n' + lines.join('\n\n') + '\n');
