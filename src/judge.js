/* ================= 判定器 =================
   v1はA案: パラメータ空間距離。正規化パッチ同士を重み付きで比較する。
   アプリはこの judgePatch(target, user, spec) シグネチャだけに依存し、
   将来B案(音響特徴量距離)へ差し替えられるようにする。

   spec.params: [{
     path: "osc.pitch",          // パッチ内のパラメータパス
     type: "choice"?,            // 離散値(波形など)。省略時は連続値
     tolerance: 0.1,             // 連続値の許容幅(正規値)
     weight: 1,                  // スコアへの寄与
     label, tooHigh, tooLow, mismatch // フィードバック文言
   }] */

const get = (obj, path) => path.split(".").reduce((o, k) => o?.[k], obj);

export function judgePatch(target, user, spec) {
  let pass = true;
  let errSum = 0;
  let wSum = 0;
  const feedback = [];

  for (const p of spec.params) {
    const w = p.weight ?? 1;
    wSum += w;
    const tv = get(target, p.path);
    const uv = get(user, p.path);

    if (p.type === "choice") {
      if (tv !== uv) {
        pass = false;
        errSum += w;
        feedback.push({ param: p.path, message: p.mismatch ?? `${p.label}がちがうみたい` });
      }
    } else {
      const diff = uv - tv;
      const err = Math.abs(diff) / p.tolerance; // 1.0が許容境界
      errSum += w * Math.min(err / 2, 1); // スコア用(境界ちょうどで0.5)
      if (err > 1) {
        pass = false;
        feedback.push({
          param: p.path,
          message: diff > 0 ? p.tooHigh ?? `${p.label}を下げてみよう` : p.tooLow ?? `${p.label}を上げてみよう`,
        });
      }
    }
  }

  const score = Math.round(100 * (1 - (wSum ? errSum / wSum : 0)));
  return { pass, score, feedback };
}
