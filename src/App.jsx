import { useEffect, useRef, useState } from "react";
import {
  pitchToFreq,
  cutoffToFreq,
  setMasterVolume,
  getLevel,
  noteOn,
  noteOff,
  updateVoice,
} from "./audio.js";
import { judgePatch } from "./judge.js";
import { LESSONS } from "./lessons.js";

/* ================= 表示フォーマッタ ================= */

const freqLabel = (freq) => `${Math.round(freq)} Hz`;
const cutoffLabel = (f) => (f >= 1000 ? `${(f / 1000).toFixed(1)} kHz` : `${Math.round(f)} Hz`);

/* ================= knob ================= */

const ARC = 270; // 回転レンジ(度)

function Knob({ label, jpLabel, value, defaultValue, onChange, display, size = 92, mini = false }) {
  const drag = useRef(null);
  const lastTap = useRef(0);

  const angle = -ARC / 2 + value * ARC;

  const onPointerDown = (e) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 合成イベント等でキャプチャできなくてもドラッグ自体は継続する
    }
    // ダブルタップでデフォルト値へ
    const now = performance.now();
    if (now - lastTap.current < 300) {
      onChange(defaultValue);
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
    drag.current = { y: e.clientY, v: value };
  };

  const onPointerMove = (e) => {
    if (!drag.current) return;
    const dy = drag.current.y - e.clientY; // 上ドラッグで増加
    onChange(Math.min(1, Math.max(0, drag.current.v + dy / 160)));
  };

  const onPointerUp = () => (drag.current = null);

  // 目盛り(11本)
  const ticks = [];
  if (!mini) {
    for (let i = 0; i <= 10; i++) {
      const a = ((-ARC / 2 + (i / 10) * ARC) * Math.PI) / 180;
      const r1 = size / 2 + 4;
      const r2 = size / 2 + (i % 5 === 0 ? 9 : 7);
      ticks.push(
        <line
          key={i}
          x1={Math.sin(a) * r1}
          y1={-Math.cos(a) * r1}
          x2={Math.sin(a) * r2}
          y2={-Math.cos(a) * r2}
          className={i % 5 === 0 ? "tick major" : "tick"}
        />
      );
    }
  }

  const pad = mini ? 6 : size <= 60 ? 11 : 16;
  const box = size + pad * 2;

  return (
    <div className="knob-unit">
      <svg
        className="knob-svg"
        width={box}
        height={box}
        viewBox={`${-box / 2} ${-box / 2} ${box} ${box}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <defs>
          <radialGradient id="knobCap" cx="0.36" cy="0.28" r="0.9">
            <stop offset="0%" stopColor="#4d5157" />
            <stop offset="45%" stopColor="#2a2d31" />
            <stop offset="100%" stopColor="#141518" />
          </radialGradient>
          <linearGradient id="knobRim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3c3f44" />
            <stop offset="50%" stopColor="#1a1c1f" />
            <stop offset="100%" stopColor="#0b0c0e" />
          </linearGradient>
        </defs>
        {ticks}
        {/* 落ち影 */}
        <ellipse cx="0" cy={size * 0.06} rx={size / 2} ry={size / 2} fill="rgba(0,0,0,0.55)" />
        {/* 外周リム(ローレット風) */}
        <circle r={size / 2} fill="url(#knobRim)" />
        <circle r={size / 2} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
        {/* キャップ */}
        <circle r={size / 2 - 7} fill="url(#knobCap)" />
        <circle r={size / 2 - 7} fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="1.5" />
        {/* 天面ハイライト */}
        <ellipse cx={-size * 0.09} cy={-size * 0.13} rx={size * 0.3} ry={size * 0.22} fill="rgba(255,255,255,0.06)" />
        {/* インジケータ */}
        <g transform={`rotate(${angle})`}>
          <line x1="0" y1={-size * 0.16} x2="0" y2={-(size / 2 - (mini ? 6 : 11))} className="knob-pointer" />
        </g>
      </svg>
      {display != null && <div className="lcd">{display}</div>}
      {label && (
        <div className="param-label">
          {label} <span className="jp">{jpLabel}</span>
        </div>
      )}
    </div>
  );
}

/* ================= waveform selector ================= */

const WAVES = [
  { id: "sine", label: "SIN", path: "M2 9 Q 6.5 1, 11 9 T 20 9" },
  { id: "square", label: "SQR", path: "M2 14 V4 H11 V14 H20 V4" },
  { id: "sawtooth", label: "SAW", path: "M2 14 L11 4 V14 L20 4" },
];

function WaveSelector({ value, onChange }) {
  return (
    <div className="wave-selector">
      {WAVES.map((w) => (
        <button
          key={w.id}
          className={`wave-btn ${value === w.id ? "active" : ""}`}
          onClick={() => onChange(w.id)}
        >
          <span className={`led ${value === w.id ? "on" : ""}`} />
          <svg viewBox="0 0 22 18" className="wave-icon">
            <path d={w.path} fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="wave-label">{w.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ================= panel frame ================= */

function PanelFrame({ id, title, sub, badge, locked, active, onFocus, children }) {
  return (
    <section
      className={`panel panel-${id} ${locked ? "locked" : ""} ${active ? "active" : ""}`}
      onPointerDownCapture={onFocus}
    >
      <div className="screw tl" /><div className="screw tr" />
      <div className="screw bl" /><div className="screw br" />

      <header className="panel-header">
        <span className="power-led" />
        <h2 className="panel-title">
          {title} <span className="panel-sub">{sub}</span>
        </h2>
        <span className="panel-badge">{locked ? "LOCKED 未解放" : badge}</span>
      </header>

      <div className="panel-body">{children}</div>
    </section>
  );
}

/* パネル間の信号フロー表示。mod=モジュレーション経路(点線) */
function FlowArrow({ mod = false }) {
  return (
    <div className={`flow-arrow ${mod ? "mod" : ""}`}>
      <span className="flow-line" />
      {mod && <span className="flow-label">MOD</span>}
      <span className="flow-head">▼</span>
    </div>
  );
}

/* ================= module panels ================= */

function OscillatorPanel({ patch, setPatch, active, onFocus }) {
  const setOsc = (partial) => {
    const next = { ...patch, osc: { ...patch.osc, ...partial } };
    setPatch(next);
    updateVoice(next);
  };

  return (
    <PanelFrame id="osc" title="OSC-1" sub="OSCILLATOR / オシレータ" badge="VCO" active={active} onFocus={onFocus}>
      <fieldset className="section">
        <legend>WAVE <span className="jp">波形</span></legend>
        <WaveSelector value={patch.osc.waveform} onChange={(waveform) => setOsc({ waveform })} />
      </fieldset>

      <fieldset className="section">
        <legend>PITCH <span className="jp">ピッチ</span></legend>
        <Knob
          label="PITCH"
          jpLabel="ピッチ"
          value={patch.osc.pitch}
          defaultValue={0.5}
          display={freqLabel(pitchToFreq(patch.osc.pitch))}
          onChange={(pitch) => setOsc({ pitch })}
        />
      </fieldset>
    </PanelFrame>
  );
}

const noop = () => {};

function FilterPanel({ patch, setPatch, locked, active, onFocus }) {
  const setFilter = (partial) => {
    const next = { ...patch, filter: { ...patch.filter, ...partial } };
    setPatch(next);
    updateVoice(next);
  };

  return (
    <PanelFrame id="filter" title="VCF-1" sub="FILTER / フィルタ" badge="LPF" locked={locked} active={active} onFocus={onFocus}>
      <fieldset className="section">
        <legend>CUTOFF <span className="jp">カットオフ</span></legend>
        <Knob
          label="CUTOFF"
          jpLabel="明るさ"
          value={patch.filter.cutoff}
          defaultValue={1}
          display={cutoffLabel(cutoffToFreq(patch.filter.cutoff))}
          onChange={(cutoff) => setFilter({ cutoff })}
        />
      </fieldset>
      <fieldset className="section">
        <legend>RESO <span className="jp">レゾナンス</span></legend>
        <Knob
          label="RESO"
          jpLabel="クセ"
          value={patch.filter.reso}
          defaultValue={0}
          display={`${Math.round(patch.filter.reso * 100)} %`}
          onChange={(reso) => setFilter({ reso })}
        />
      </fieldset>
    </PanelFrame>
  );
}

function EnvPanel({ locked }) {
  const params = [
    { label: "ATK", jp: "立上り", value: 0.1, display: "12 ms" },
    { label: "DEC", jp: "減衰", value: 0.35, display: "180 ms" },
    { label: "SUS", jp: "持続", value: 0.6, display: "60 %" },
    { label: "REL", jp: "余韻", value: 0.4, display: "240 ms" },
  ];
  return (
    <PanelFrame id="env" title="EG-1" sub="ENVELOPE / エンベロープ" badge="ADSR" locked={locked}>
      <fieldset className="section wide">
        <legend>ADSR <span className="jp">音量の時間変化</span></legend>
        <div className="knob-row">
          {params.map((p) => (
            <Knob
              key={p.label}
              size={54}
              label={p.label}
              jpLabel={p.jp}
              value={p.value}
              defaultValue={p.value}
              display={p.display}
              onChange={noop}
            />
          ))}
        </div>
      </fieldset>
    </PanelFrame>
  );
}

function LfoPanel({ locked }) {
  return (
    <PanelFrame id="lfo" title="LFO-1" sub="LFO / 揺らぎ" badge="MOD" locked={locked}>
      <fieldset className="section">
        <legend>RATE <span className="jp">速さ</span></legend>
        <Knob label="RATE" jpLabel="速さ" value={0.4} defaultValue={0.4} display="5.2 Hz" onChange={noop} />
      </fieldset>
      <fieldset className="section">
        <legend>DEPTH <span className="jp">深さ</span></legend>
        <Knob label="DEPTH" jpLabel="深さ" value={0.0} defaultValue={0.0} display="0 %" onChange={noop} />
      </fieldset>
    </PanelFrame>
  );
}

/* ================= header ================= */

function LevelMeter() {
  const ref = useRef(null);
  useEffect(() => {
    let raf;
    const tick = () => {
      const lv = getLevel();
      const db = lv > 0 ? 20 * Math.log10(lv) : -Infinity;
      const segs = ref.current?.children ?? [];
      const lit = Math.max(0, Math.min(segs.length, Math.round(((db + 40) / 34) * segs.length)));
      for (let i = 0; i < segs.length; i++) segs[i].classList.toggle("on", i < lit);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="meter" ref={ref}>
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className={`seg ${i >= 6 ? "hot" : ""}`} />
      ))}
    </div>
  );
}

function TopBar({ volume, onVolume, lessonNo, total, title, monitor, onMonitor, cleared }) {
  return (
    <header className="top-bar">
      <div className="top-inner">
        <h1 className="app-title">
          PATCH<span>QUEST</span>
        </h1>
        <LevelMeter />
        <div className="master-vol">
          <Knob mini size={34} value={volume} defaultValue={0.5} onChange={onVolume} />
          <span className="vol-label">VOL</span>
        </div>
      </div>
      <div className="quest-bar">
        {cleared ? (
          <span className="quest-title done">全問クリア!自由に音作りを楽しもう</span>
        ) : (
          <>
            <span className="quest-no">Q{lessonNo}/{total}</span>
            <span className="quest-title">{title}</span>
          </>
        )}
        <div className="monitor-toggle">
          <button className={monitor === "target" ? "active" : ""} onClick={() => onMonitor("target")}>
            <span className={`led ${monitor === "target" ? "on" : ""}`} />お題
          </button>
          <button className={monitor === "user" ? "active" : ""} onClick={() => onMonitor("user")}>
            <span className={`led ${monitor === "user" ? "on" : ""}`} />自分
          </button>
        </div>
      </div>
    </header>
  );
}

/* ================= modal ================= */

function Modal({ modal, onClose, onNext, isLast }) {
  if (!modal) return null;

  let body;
  if (modal.type === "unlock") {
    const card = modal.lesson.unlockCard;
    body = (
      <div className={`modal-card unlock sig-${card.module}`}>
        <div className="modal-tag">MODULE UNLOCKED</div>
        <h3>{card.title}</h3>
        <p>{card.text}</p>
        <button className="modal-btn" onClick={onClose}>はじめる</button>
      </div>
    );
  } else if (modal.result.pass) {
    body = (
      <div className="modal-card pass">
        <div className="modal-tag">CLEAR!</div>
        <h3>一致度 {modal.result.score}%</h3>
        <p>{isLast ? "これで全問クリア!ラックは君のものだ。" : "いい耳してる。次のお題へ進もう。"}</p>
        <button className="modal-btn" onClick={onNext}>{isLast ? "完走!" : "次の問題へ"}</button>
      </div>
    );
  } else {
    body = (
      <div className="modal-card fail">
        <div className="modal-tag">おしい… 一致度 {modal.result.score}%</div>
        <ul className="feedback-list">
          {modal.result.feedback.map((f) => (
            <li key={f.param}>{f.message}</li>
          ))}
        </ul>
        <button className="modal-btn" onClick={onClose}>もう一度</button>
      </div>
    );
  }

  return <div className="modal-backdrop">{body}</div>;
}

/* ================= app ================= */

const DEFAULT_PATCH = {
  osc: { waveform: "sine", pitch: 0.5 },
  filter: { cutoff: 1, reso: 0 },
};

const seenCards = () => JSON.parse(localStorage.getItem("pq-cards") ?? "[]");

export default function App() {
  const [patch, setPatch] = useState(DEFAULT_PATCH);
  const [volume, setVolume] = useState(0.5);
  const [playing, setPlaying] = useState(false);
  const [focused, setFocused] = useState("osc"); // 操作中モジュールのハイライト
  const [monitor, setMonitor] = useState("target"); // お題/自分 どちらを鳴らすか
  const [lessonIndex, setLessonIndex] = useState(() => Number(localStorage.getItem("pq-lesson") ?? 0));
  const [modal, setModal] = useState(null);

  const cleared = lessonIndex >= LESSONS.length;
  const lesson = cleared ? null : LESSONS[lessonIndex];
  const unlocked = {
    osc: true,
    filter: cleared || lesson.modules.includes("filter"),
    env: false,
    lfo: false,
  };

  const patchRef = useRef(patch);
  patchRef.current = patch;

  // 新モジュール解放時の解説カード(初回のみ)
  useEffect(() => {
    if (lesson?.unlockCard && !seenCards().includes(lesson.id)) {
      setModal({ type: "unlock", lesson });
    }
  }, [lessonIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVolume = (v) => {
    setVolume(v);
    setMasterVolume(v);
  };

  const play = () => {
    if (monitor === "target" && lesson) {
      noteOn(lesson.target, "target");
    } else {
      noteOn(patchRef.current, "user");
    }
    setPlaying(true);
  };
  const stop = () => {
    noteOff();
    setPlaying(false);
  };

  const switchMonitor = (m) => {
    stop();
    setMonitor(m);
  };

  const submit = () => {
    stop();
    const result = judgePatch(lesson.target, patchRef.current, lesson.spec);
    setModal({ type: "result", result });
  };

  const closeModal = () => {
    if (modal?.type === "unlock") {
      localStorage.setItem("pq-cards", JSON.stringify([...seenCards(), modal.lesson.id]));
    }
    setModal(null);
  };

  const nextLesson = () => {
    const next = lessonIndex + 1;
    localStorage.setItem("pq-lesson", String(next));
    setLessonIndex(next);
    setMonitor("target");
    setModal(null);
  };

  return (
    <>
      <TopBar
        volume={volume}
        onVolume={handleVolume}
        lessonNo={lessonIndex + 1}
        total={LESSONS.length}
        title={lesson?.title}
        monitor={monitor}
        onMonitor={switchMonitor}
        cleared={cleared}
      />
      <div className="app">
        <OscillatorPanel
          patch={patch}
          setPatch={setPatch}
          active={focused === "osc"}
          onFocus={() => setFocused("osc")}
        />
        <FlowArrow />
        <FilterPanel
          patch={patch}
          setPatch={setPatch}
          locked={!unlocked.filter}
          active={focused === "filter"}
          onFocus={() => setFocused("filter")}
        />
        <FlowArrow />
        <EnvPanel locked={!unlocked.env} />
        <FlowArrow mod />
        <LfoPanel locked={!unlocked.lfo} />

        <div className="transport">
          <button
            className={`play-btn ${playing ? "playing" : ""} ${monitor === "target" ? "target" : ""}`}
            onPointerDown={play}
            onPointerUp={stop}
            onPointerLeave={() => playing && stop()}
            onPointerCancel={stop}
          >
            <span className="play-icon">{playing ? "■" : "▶"}</span>
            <span className="play-text">
              {monitor === "target" ? "TARGET" : "YOURS"}
              <small>{monitor === "target" ? "お題の音" : "自分の音"}を長押しで再生</small>
            </span>
          </button>
          {!cleared && (
            <button className="submit-btn" onClick={submit}>
              SUBMIT
              <small>提出する</small>
            </button>
          )}
        </div>
      </div>
      <Modal
        modal={modal}
        onClose={closeModal}
        onNext={nextLesson}
        isLast={lessonIndex === LESSONS.length - 1}
      />
    </>
  );
}
