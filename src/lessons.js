/* ================= カリキュラムデータ =================
   第1章: オシレータ(波形+ピッチ) Q1〜Q5
   第2章: フィルタ(カットオフ+レゾナンス) Q6〜Q10
   1問=1概念。パラメータはすべて正規値(0..1)。
   お題文言はプレイテストで要調整(CLAUDE.md「未解決の問い」)。 */

const OPEN_FILTER = { cutoff: 1, reso: 0 };

/* --- spec部品: フィードバック文言を共通化 --- */

const waveParam = {
  path: "osc.waveform",
  type: "choice",
  label: "波形",
  mismatch: "波形がちがうみたい。WAVEのほかのボタンも試してみよう",
};

const pitchParam = (tolerance) => ({
  path: "osc.pitch",
  tolerance,
  label: "ピッチ",
  tooHigh: "音が高すぎるみたい。PITCHを下げてみよう",
  tooLow: "音が低すぎるみたい。PITCHを上げてみよう",
});

const cutoffParam = (tolerance) => ({
  path: "filter.cutoff",
  tolerance,
  label: "カットオフ",
  tooHigh: "まだ音が明るすぎる。CUTOFFを下げてこもらせよう",
  tooLow: "こもりすぎてるみたい。CUTOFFを上げて開こう",
});

const resoParam = (tolerance) => ({
  path: "filter.reso",
  tolerance,
  label: "レゾナンス",
  tooHigh: "クセが強すぎるみたい。RESOを下げてみよう",
  tooLow: "クセが足りないみたい。RESOを上げてみよう",
});

export const LESSONS = [
  /* ---------- 第1章 オシレータ ---------- */
  {
    id: 1,
    chapter: 1,
    title: "まずは同じ音を出してみよう",
    modules: ["osc"],
    target: { osc: { waveform: "sine", pitch: 0.5 }, filter: OPEN_FILTER },
    spec: { params: [waveParam, pitchParam(0.2)] },
    unlockCard: {
      module: "osc",
      title: "オシレータ(VCO)",
      text: "すべての音の出発点。電気の波をそのまま音にする装置で、波形が音色のキャラクターを、ピッチが音の高さを決める。まずは「お題」と「自分」を聴き比べて、同じ音を目指そう。",
    },
  },
  {
    id: 2,
    chapter: 1,
    title: "霧笛のような低くて丸い音",
    modules: ["osc"],
    target: { osc: { waveform: "sine", pitch: 0.15 }, filter: OPEN_FILTER },
    spec: { params: [waveParam, pitchParam(0.1)] },
  },
  {
    id: 3,
    chapter: 1,
    title: "ゲームの決定音みたいな明るいピッ",
    modules: ["osc"],
    target: { osc: { waveform: "square", pitch: 0.78 }, filter: OPEN_FILTER },
    spec: { params: [waveParam, pitchParam(0.1)] },
  },
  {
    id: 4,
    chapter: 1,
    title: "ハチの羽音のようなブザー",
    modules: ["osc"],
    target: { osc: { waveform: "sawtooth", pitch: 0.3 }, filter: OPEN_FILTER },
    spec: { params: [waveParam, pitchParam(0.09)] },
  },
  {
    id: 5,
    chapter: 1,
    title: "時報の「ピッ」(440Hz)",
    modules: ["osc"],
    target: { osc: { waveform: "sine", pitch: 0.75 }, filter: OPEN_FILTER },
    spec: { params: [waveParam, pitchParam(0.05)] },
  },

  /* ---------- 第2章 フィルタ ---------- */
  {
    id: 6,
    chapter: 2,
    title: "毛布ごしに聞こえるブザー",
    modules: ["osc", "filter"],
    target: { osc: { waveform: "sawtooth", pitch: 0.35 }, filter: { cutoff: 0.3, reso: 0 } },
    spec: { params: [waveParam, pitchParam(0.1), cutoffParam(0.12)] },
    unlockCard: {
      module: "filter",
      title: "フィルタ(VCF)",
      text: "減算合成の心臓部。ローパスフィルタは高い成分を削って音を「こもらせる」。CUTOFFが削りはじめる高さ、RESOが境目のクセ。ノコギリ波のようなギラギラした音から、削って音色を作っていこう。",
    },
  },
  {
    id: 7,
    chapter: 2,
    title: "遠くの雷のような低いうなり",
    modules: ["osc", "filter"],
    target: { osc: { waveform: "sawtooth", pitch: 0.08 }, filter: { cutoff: 0.22, reso: 0 } },
    spec: { params: [waveParam, pitchParam(0.1), cutoffParam(0.12)] },
  },
  {
    id: 8,
    chapter: 2,
    title: "パーンと明るいシンセブラス",
    modules: ["osc", "filter"],
    target: { osc: { waveform: "sawtooth", pitch: 0.42 }, filter: { cutoff: 0.8, reso: 0 } },
    spec: { params: [waveParam, pitchParam(0.1), cutoffParam(0.12)] },
  },
  {
    id: 9,
    chapter: 2,
    title: "「ミョン」とクセのある音",
    modules: ["osc", "filter"],
    target: { osc: { waveform: "square", pitch: 0.4 }, filter: { cutoff: 0.35, reso: 0.6 } },
    spec: { params: [waveParam, pitchParam(0.12), cutoffParam(0.15), resoParam(0.15)] },
  },
  {
    id: 10,
    chapter: 2,
    title: "ビヨッと効いたアシッドベース",
    modules: ["osc", "filter"],
    target: { osc: { waveform: "sawtooth", pitch: 0.2 }, filter: { cutoff: 0.45, reso: 0.75 } },
    spec: { params: [waveParam, pitchParam(0.08), cutoffParam(0.12), resoParam(0.12)] },
  },
];
