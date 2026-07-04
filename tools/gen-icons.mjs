/* PWAアイコン生成スクリプト(依存なし)
   アプリのノブ意匠をピクセル計算で描画し、PNGを直接エンコードする。
   実行: node tools/gen-icons.mjs → public/icons/ に出力 */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

/* ---------- PNGエンコーダ ---------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(rgba, w, h) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  // 各スキャンライン先頭にフィルタ種別0を付与
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------- 描画ヘルパー ---------- */

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const mix = (c1, c2, t) => c1.map((v, i) => lerp(v, c2[i], clamp01(t)));

/* 角丸矩形のSDF(<=0で内側) */
function roundRectSDF(x, y, cx, cy, hw, hh, r) {
  const qx = Math.abs(x - cx) - (hw - r);
  const qy = Math.abs(y - cy) - (hh - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

/* 線分への距離 */
function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const t = clamp01(((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy));
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

/* ---------- アイコン描画 ----------
   size: 出力px / pad: 0..1 (maskable用の追加余白) / bleed: 背景を全面に敷く(apple用) */
function drawIcon(size, { pad = 0, bleed = false } = {}) {
  const SS = 3; // スーパーサンプリング
  const S = size * SS;
  const px = new Float64Array(S * S * 4);

  const RED = [229, 72, 77];
  const scale = 1 - pad * 2;
  const cx = S / 2;
  const cy = S / 2;
  const half = (S / 2) * (bleed ? 1 : 0.94) * scale;
  const rrRad = bleed ? 0 : half * 0.24;
  const knobR = half * 0.62;
  const knobCy = cy + half * 0.06;

  // インジケータ角度(12時からやや右 = 電源ONの気配)
  const ang = (-18 * Math.PI) / 180;
  const ix = Math.sin(ang), iy = -Math.cos(ang);

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let rgb = null;
      let alpha = 0;

      const bgSDF = bleed ? -1 : roundRectSDF(x, y, cx, cy, half, half, rrRad);
      if (bgSDF <= 0 || bleed) {
        alpha = 1;
        // パネル背景: 縦グラデーション
        const t = y / S;
        rgb = mix([44, 47, 52], [20, 21, 24], t);
        // 上端ハイライト(下へ行くほどフェード)
        if (!bleed && bgSDF > -S * 0.008) rgb = mix(rgb, [255, 255, 255], 0.08 * clamp01((cy - y) / (half * 0.9)));

        const d = Math.hypot(x - cx, y - knobCy);

        if (d <= knobR) {
          if (d > knobR * 0.86) {
            // 外周リム
            const t2 = (y - (knobCy - knobR)) / (knobR * 2);
            rgb = mix([60, 63, 68], [11, 12, 14], t2);
          } else {
            // キャップ: 左上光源
            const lx = (x - cx) / knobR, ly = (y - knobCy) / knobR;
            const light = clamp01(0.55 - 0.5 * (lx * 0.5 + ly * 0.75));
            rgb = mix([18, 19, 22], [80, 84, 90], light);
            // インジケータ
            const w = knobR * 0.06;
            const dist = segDist(
              x, y,
              cx + ix * knobR * 0.3, knobCy + iy * knobR * 0.3,
              cx + ix * knobR * 0.72, knobCy + iy * knobR * 0.72
            );
            if (dist < w) rgb = RED;
            else if (dist < w * 2.2) rgb = mix(rgb, RED, 0.5 * (1 - (dist - w) / (w * 1.2)));
          }
        } else if (d < knobR * 1.12) {
          // 落ち影
          rgb = mix(rgb, [0, 0, 0], 0.45 * (1 - (d - knobR) / (knobR * 0.12)));
        }

        // 目盛り(下側を除く円周上に12本)
        const tickAng = Math.atan2(x - cx, -(y - knobCy)); // 12時=0
        if (Math.abs(tickAng) < (135 * Math.PI) / 180 && d > knobR * 1.14 && d < knobR * 1.24) {
          const step = (27 * Math.PI) / 180;
          const near = Math.abs(((tickAng % step) + step) % step - step / 2);
          if (near > step / 2 - 0.55 / (d / SS)) rgb = mix(rgb, [200, 205, 212], 0.5);
        }

        // LED(右上)
        const ledX = cx + half * 0.62, ledY = cy - half * 0.62;
        const ld = Math.hypot(x - ledX, y - ledY);
        const ledR = half * 0.07;
        if (ld < ledR) rgb = mix(RED, [255, 210, 212], clamp01(0.7 - ld / ledR));
        else if (ld < ledR * 3) rgb = mix(rgb, RED, 0.35 * (1 - (ld - ledR) / (ledR * 2)));
      }

      if (alpha > 0) {
        const i = (y * S + x) * 4;
        px[i] = rgb[0];
        px[i + 1] = rgb[1];
        px[i + 2] = rgb[2];
        px[i + 3] = 255;
      }
    }
  }

  // ダウンサンプリング(SS x SS平均)
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * S + x * SS + sx) * 4;
          r += px[i]; g += px[i + 1]; b += px[i + 2]; a += px[i + 3];
        }
      }
      const n = SS * SS;
      const o = (y * size + x) * 4;
      // 透明部との平均で縁を滑らかに(プリマルチプライ風)
      out[o] = a ? Math.round(r / n) : 0;
      out[o + 1] = a ? Math.round(g / n) : 0;
      out[o + 2] = a ? Math.round(b / n) : 0;
      out[o + 3] = Math.round(a / n);
    }
  }
  return encodePNG(out, size, size);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", drawIcon(192));
writeFileSync("public/icons/icon-512.png", drawIcon(512));
writeFileSync("public/icons/icon-maskable-512.png", drawIcon(512, { pad: 0.12, bleed: true }));
writeFileSync("public/icons/apple-touch-icon.png", drawIcon(180, { bleed: true }));
console.log("icons written to public/icons/");
