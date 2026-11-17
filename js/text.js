/*
 * 文字小工具：結果頁與分享圖共用。
 */
(function (root) {
  /**
   * 把一節經文依標點切成適合分行顯示的短句。
   * 先在逗號、分號、冒號、句號後切開，再把太短的相鄰片段併回同一行（每行不超過 maxLen 個字）。
   */
  function verseLines(text, maxLen = 11) {
    const parts = String(text || '').match(/[^，；：。！？]+[，；：。！？」』…]*/g) || [String(text || '')];
    const lines = [];
    for (const p of parts) {
      const last = lines[lines.length - 1];
      if (last !== undefined && (last + p).length <= maxLen) lines[lines.length - 1] = last + p;
      else lines.push(p);
    }
    return lines;
  }

  /** 光景的一句說明：在第一個逗號後斷行，回傳各行。 */
  function stageLines(text) {
    const s = String(text || '');
    const i = s.indexOf('，');
    return i > 0 && i < s.length - 1 ? [s.slice(0, i + 1), s.slice(i + 1)] : [s];
  }

  root.PsalmText = { verseLines, stageLines };
})(typeof window !== 'undefined' ? window : globalThis);
