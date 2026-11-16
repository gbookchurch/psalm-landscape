/*
 * 計分與產品設定。所有「尚未核准」的規則都集中在這裡，改這個檔案就好，不必動程式。
 * 狀態依據：Claude 開發交接 V1 ＋ V2.147 交接包 README。
 */
window.CONFIG = {
  version: 'web-0.6（品牌孔版印刷三頁視覺版）',

  /* 八維距離權重：沿用 V2.44 原型與 V2.146/V2.147 模擬所用的既有距離函數，未新增規則。 */
  weights: { A: 1.3, B: 1.15, C: 0.65, D: 1.0, E: 0.85, F: 0.7, G: 1.3, H: 1.0 },
  dhLowSignal: { threshold: 0.5, factor: 0.35 },   // D/H 使用者分數接近 0 時降權（既有函數）
  dhNotEvidenced: { relief: 0.5 },                  // 詩篇 D/H=0 代表「未見證據」，使用者 >0 時距離減 0.5（既有函數）

  /* Q19：停用（主編決定）。題目照原型顯示，但不計分。不得擅自改成 true。 */
  q19: { show: true, scoring: false },

  /* Q20：正式權重仍為 100%。0.5 只是候選方案，未核准。 */
  q20Weight: 1.0,

  /* 至少需要幾個維度有作答，才產生結果（原型規則）。 */
  minDimensions: 5,

  /*
   * 同分與近分：待最終產品決策。
   * 目前作法（暫行、沿用 V2.44 原型）：距離相同時以篇號小者為主結果，
   * 並把「與第一名距離差 ≤ nearWindow」的詩篇列為「也可能共鳴」。
   * 這不是已核准的正式規則。
   */
  tieRule: { status: 'provisional', tieEpsilon: 1e-6, nearWindow: 0.10, maxNear: 3 },

  /* 八維圖譜：只顯示 -2 到 +2 的原始分數，不換算成百分比（換算公式尚未核准）。 */
  chart: { showPercent: false },

  /*
   * 結果插畫：只依 data/images.js（psalm-images.json）查詢，有列出的篇章才顯示圖片，
   * 其他篇章一律顯示中性佔位，不推測檔名、不載入候選圖。
   */
  illustration: (n) => (window.PSALM_IMAGES && window.PSALM_IMAGES[n]) || null,
  homeIllustration: null, // 首頁主視覺目前以程式繪製（hero），之後可換成正式動態資產

  /*
   * 結果卡引用的經文節數，例如 { 1: 2, 23: 1 }。
   * 未指定時暫取經文錨點內第一節長度適中的經文；建議主編逐篇指定。
   */
  keyVerse: {},

  /* 本機暫存作答進度（只存在這台裝置的瀏覽器，不會上傳）。 */
  saveProgress: true,
};
