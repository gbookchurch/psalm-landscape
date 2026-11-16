/*
 * 計分模組：與 V2.44 原型 compute() 及 V2.146/V2.147 模擬的距離函數一致。
 * 不包含任何未核准規則；同分／近分的暫行作法由 CONFIG.tieRule 控制。
 * 可在瀏覽器與 Node 中執行（Node 供測試比對使用）。
 */
(function (root) {
  const DIMS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  /** 把作答（{Q1: 0..3 | null}）轉成八維平均分數。Q20 權重同時作用於分子與分母。 */
  function scoreAnswers(answers, questions, config) {
    const sum = {}, cnt = {};
    for (const q of questions) {
      const a = answers[q.id];
      if (!Number.isInteger(a)) continue;           // 略過或未答
      if (a < 0 || a >= q.options.length) continue;
      if (q.id === 'Q19' && !config.q19.scoring) continue;
      const mult = q.id === 'Q20' ? config.q20Weight : 1;
      for (const [d, v] of Object.entries(q.options[a].scores || {})) {
        sum[d] = (sum[d] || 0) + mult * v;
        cnt[d] = (cnt[d] || 0) + mult;
      }
    }
    const scores = {};
    for (const d of Object.keys(sum)) if (cnt[d] > 0) scores[d] = sum[d] / cnt[d];
    return scores;
  }

  /** 使用者分數與一篇詩篇的加權距離（既有函數，未修改）。 */
  function distance(scores, p, config) {
    let total = 0, den = 0;
    for (const [d, x] of Object.entries(scores)) {
      let w = config.weights[d];
      if ((d === 'D' || d === 'H') && Math.abs(x) < config.dhLowSignal.threshold) w *= config.dhLowSignal.factor;
      let delta = Math.abs(x - p[d]);
      if ((d === 'D' || d === 'H') && p[d] === 0 && x > 0) delta = Math.max(0, delta - config.dhNotEvidenced.relief);
      total += w * delta * delta;
      den += w;
    }
    return Math.sqrt(total / den);
  }

  /** 排序全部 150 篇，回傳主結果、完全同分、近分候選。 */
  function rank(answers, questions, psalms, config) {
    const scores = scoreAnswers(answers, questions, config);
    const dims = Object.keys(scores);
    if (dims.length < config.minDimensions) {
      return { status: 'insufficient', scores, answeredDimensions: dims.length };
    }
    const ranked = psalms
      .map((p) => ({ psalm: p.psalm, stage: p.stage, distance: distance(scores, p, config) }))
      .sort((a, b) => a.distance - b.distance || a.psalm - b.psalm); // 暫行：同距離時篇號小者在前
    const best = ranked[0];
    const t = config.tieRule;
    const tied = ranked.filter((r) => Math.abs(r.distance - best.distance) < t.tieEpsilon);
    const near = ranked.filter((r) => r.psalm !== best.psalm && r.distance <= best.distance + t.nearWindow + 1e-9).slice(0, t.maxNear);
    return { status: 'ok', scores, best, tied, near, ranked };
  }

  const api = { DIMS, scoreAnswers, distance, rank };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Scoring = api;
})(typeof window !== 'undefined' ? window : globalThis);
