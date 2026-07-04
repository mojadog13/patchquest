/* ================= audio engine =================
   パッチJSON(正規化パラメータ0..1)を受け取って鳴らす薄い層。
   正規値→物理量のマッピングはこのモジュールに閉じ込め、
   UI・判定器・カリキュラムは正規化パッチだけを扱う。 */

let ctx = null;
let master = null;
let analyser = null;
let voice = null;
let masterVol = 0.5; // 0..1(二乗して実ゲインへ=聴感カーブ)

/* --- 正規値→物理量マッピング --- */

/* ピッチ: 55〜880Hzの対数マッピング(4オクターブ) */
export const pitchToFreq = (v) => 55 * Math.pow(2, v * 4);

/* カットオフ: 60Hz〜16kHzの対数マッピング(約8オクターブ) */
export const cutoffToFreq = (v) => 60 * Math.pow(2, v * 8.06);

/* レゾナンス: lowpassのQはdB単位で解釈される。0〜24dB */
export const resoToQ = (v) => v * 24;

/* --- エンジン本体 --- */

function ensureAudio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = masterVol * masterVol;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    master.connect(analyser);
    analyser.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
}

export function setMasterVolume(v) {
  masterVol = v;
  if (master) master.gain.setTargetAtTime(v * v, ctx.currentTime, 0.02);
}

export function getLevel() {
  if (!analyser) return 0;
  const buf = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buf);
  let sum = 0;
  for (const x of buf) sum += x * x;
  return Math.sqrt(sum / buf.length);
}

/* source: "user"=自分のパッチ / "target"=お題。
   お題再生中はノブ編集(updateVoice)を音に反映させない。 */
export function noteOn(patch, source = "user") {
  ensureAudio();
  noteOff();
  const osc = ctx.createOscillator();
  osc.type = patch.osc.waveform;
  osc.frequency.value = pitchToFreq(patch.osc.pitch);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cutoffToFreq(patch.filter.cutoff);
  filter.Q.value = resoToQ(patch.filter.reso);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0, ctx.currentTime);
  amp.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.012);
  osc.connect(filter).connect(amp).connect(master);
  osc.start();
  voice = { osc, filter, amp, source };
}

export function noteOff() {
  if (!voice) return;
  const { osc, amp } = voice;
  const t = ctx.currentTime;
  amp.gain.cancelScheduledValues(t);
  amp.gain.setValueAtTime(amp.gain.value, t);
  amp.gain.linearRampToValueAtTime(0, t + 0.09);
  osc.stop(t + 0.12);
  voice = null;
}

export function updateVoice(patch) {
  if (!voice || voice.source !== "user") return;
  voice.osc.type = patch.osc.waveform;
  voice.osc.frequency.setTargetAtTime(pitchToFreq(patch.osc.pitch), ctx.currentTime, 0.01);
  voice.filter.frequency.setTargetAtTime(cutoffToFreq(patch.filter.cutoff), ctx.currentTime, 0.01);
  voice.filter.Q.setTargetAtTime(resoToQ(patch.filter.reso), ctx.currentTime, 0.01);
}
