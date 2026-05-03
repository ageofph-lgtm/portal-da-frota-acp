import React, { useState, useEffect, useMemo } from "react";
import {
  Loader2, RefreshCw, Zap, Clock, CheckCircle2, AlertCircle, Wrench,
  Timer, ChevronRight, Activity, ListOrdered, CalendarClock, Hourglass
} from "lucide-react";

const BRIDGE_URL = "https://watcherweb.base44.app/api/functions/saganBridge";
const BRIDGE_HEADERS = {
  "Content-Type": "application/json",
  "x-sagan-secret": "sagan-watcher-bridge-2026",
  "api_key": "f8517554492e492090b62dd501ad7e14",
};

const PORTAL_APP_ID = "699ee6a6c0541069d0066cc1";
const PORTAL_API_KEY = "f8517554492e492090b62dd501ad7e14";

// Capacidade simultânea de oficina (paralelismo) — usado na fila
const WORKSHOP_PARALLEL_SLOTS = 4;
// Estimativa fallback em segundos (caso não haja histórico)
const FALLBACK_DURATION_SEC = 4 * 3600; // 4h

// ─── Helpers ──────────────────────────────────────────────────────────────
function getColuna(estado = "") {
  if (estado === "a-fazer") return "a-fazer";
  if (estado.startsWith("em-preparacao")) return "em-progresso";
  if (estado.startsWith("concluida")) return "concluida";
  return null;
}

function getEtapaAtual(estado = "") {
  if (estado === "a-fazer") return "Aguardando";
  if (estado.startsWith("em-preparacao")) return "Em preparação";
  if (estado.startsWith("concluida")) return "Concluída";
  return "—";
}

function formatHMS(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return "00:00:00";
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = n => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

function formatHM(seconds) {
  if (!seconds || isNaN(seconds)) return "—";
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

function formatHora(date) {
  if (!date) return "—";
  return date.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

function getTimerElapsedSeconds(m) {
  if (!m) return 0;
  const acc = Number(m.timer_accumulated_seconds) || 0;
  if (m.timer_status !== "running" || !m.timer_started_at) return acc;
  return acc + Math.max(0, (Date.now() - new Date(m.timer_started_at).getTime()) / 1000);
}

const isRunning = (m) => m?.timer_status === "running" && !!m?.timer_started_at;
const isPaused  = (m) => m?.timer_status === "paused" || (
  m?.timer_status !== "running" && (Number(m?.timer_accumulated_seconds) || 0) > 0
);

function useTick(activeMs = 1000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), activeMs);
    return () => clearInterval(id);
  }, [activeMs]);
}

// Estima duração média por (modelo|tipo) com base em histórico de máquinas concluídas
function buildDurationEstimator(machines) {
  const buckets = new Map(); // key -> { sum, n }
  for (const m of machines) {
    const acc = Number(m.timer_accumulated_seconds) || 0;
    if (!(m.estado || "").startsWith("concluida") || acc <= 60) continue;
    const keyModelo = `M:${(m.modelo || "").trim().toUpperCase()}`;
    const keyTipo   = `T:${(m.tipo   || "").trim().toUpperCase()}`;
    for (const k of [keyModelo, keyTipo]) {
      if (!k.endsWith(":")) {
        const cur = buckets.get(k) || { sum: 0, n: 0 };
        cur.sum += acc; cur.n += 1;
        buckets.set(k, cur);
      }
    }
  }
  // Média global como fallback de último recurso
  const concluidasComTempo = machines.filter(m =>
    (m.estado || "").startsWith("concluida") && (Number(m.timer_accumulated_seconds) || 0) > 60
  );
  const globalAvg = concluidasComTempo.length
    ? concluidasComTempo.reduce((s, m) => s + (Number(m.timer_accumulated_seconds) || 0), 0) / concluidasComTempo.length
    : FALLBACK_DURATION_SEC;

  return function estimateFor(machine) {
    const km = `M:${(machine.modelo || "").trim().toUpperCase()}`;
    const kt = `T:${(machine.tipo   || "").trim().toUpperCase()}`;
    const m = buckets.get(km);
    if (m && m.n >= 2) return Math.round(m.sum / m.n);
    const t = buckets.get(kt);
    if (t && t.n >= 2) return Math.round(t.sum / t.n);
    if (m) return Math.round(m.sum / m.n);
    if (t) return Math.round(t.sum / t.n);
    return Math.round(globalAvg);
  };
}

async function callBridge(payload) {
  const res = await fetch(BRIDGE_URL, {
    method: "POST",
    headers: BRIDGE_HEADERS,
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return data.result || [];
}

// ─── COMPONENTES ───────────────────────────────────────────────────────────

function StatusPill({ children, color = "blue", glow = true }) {
  const map = {
    pink:   { bg: 'rgba(255,45,120,0.12)',  border: 'rgba(255,45,120,0.45)',  text: '#FF2D78' },
    blue:   { bg: 'rgba(77,159,255,0.12)',  border: 'rgba(77,159,255,0.45)',  text: '#4D9FFF' },
    green:  { bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.5)',    text: '#22C55E' },
    amber:  { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.55)',  text: '#F59E0B' },
    red:    { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.55)',   text: '#EF4444' },
    purple: { bg: 'rgba(155,92,246,0.12)',  border: 'rgba(155,92,246,0.5)',   text: '#9B5CF6' },
    muted:  { bg: 'rgba(120,120,160,0.10)', border: 'rgba(120,120,160,0.35)', text: '#9DA0BC' },
  };
  const c = map[color] || map.muted;
  return (
    <span
      className="font-mono-cyber inline-flex items-center gap-1 px-2 py-0.5"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        fontSize: '9px',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        fontWeight: 700,
        boxShadow: glow ? `0 0 8px ${c.border}` : 'none',
      }}
    >
      {children}
    </span>
  );
}

function MetricBlock({ icon: Icon, label, value, sub, color = "blue", flicker = false }) {
  const map = {
    pink:  { c: '#FF2D78', glow: 'rgba(255,45,120,0.5)' },
    blue:  { c: '#4D9FFF', glow: 'rgba(77,159,255,0.5)' },
    green: { c: '#22C55E', glow: 'rgba(34,197,94,0.5)' },
    amber: { c: '#F59E0B', glow: 'rgba(245,158,11,0.5)' },
    red:   { c: '#EF4444', glow: 'rgba(239,68,68,0.5)' },
    purple:{ c: '#9B5CF6', glow: 'rgba(155,92,246,0.5)' },
  };
  const m = map[color] || map.blue;
  return (
    <div className="cyber-card p-4 clip-cyber-sm">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5" style={{ color: m.c, filter: `drop-shadow(0 0 6px ${m.glow})` }} />
        <span className="col-header-cyber" style={{ color: 'var(--cyber-muted)' }}>{label}</span>
      </div>
      <div
        className={`watcher-title ${flicker ? 'animate-cyber-flicker' : ''}`}
        style={{
          fontSize: '28px',
          fontWeight: 900,
          color: m.c,
          textShadow: `0 0 12px ${m.glow}`,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div className="font-mono-cyber" style={{ fontSize: '9px', color: 'var(--cyber-muted)', letterSpacing: '0.1em', marginTop: '4px', textTransform: 'uppercase' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ── Card de máquina em produção (ATIVA) ────────────────────────────────────
function MachineActiveCard({ machine, estimate, isACP2, hasExpress }) {
  useTick(1000);
  const elapsed = getTimerElapsedSeconds(machine);
  const running = isRunning(machine);
  const paused  = isPaused(machine);

  const pct = Math.min(100, Math.round((elapsed / Math.max(estimate, 60)) * 100));
  const remaining = Math.max(0, estimate - elapsed);
  const overrun = elapsed > estimate;
  const eta = running ? new Date(Date.now() + remaining * 1000) : null;
  const overrunSec = overrun ? elapsed - estimate : 0;

  // Urgência: borda
  const cardClass = overrun
    ? 'cyber-card-late'
    : (running ? 'cyber-card-running' : (paused ? 'cyber-card-warn' : ''));

  return (
    <div
      className={`cyber-card ${cardClass} animate-fadeInUp p-4 clip-cyber relative overflow-hidden`}
    >
      {/* Scan line decorativa quando em curso */}
      {running && !overrun && (
        <div
          className="animate-scan-line"
          style={{
            position: 'absolute', top: 0, left: 0, height: '100%', width: '40%',
            background: 'linear-gradient(90deg, transparent, rgba(34,197,94,0.06), transparent)',
            pointerEvents: 'none',
          }}
        />
      )}

      <div className="flex items-start justify-between gap-3 mb-3 relative z-10">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            {hasExpress && <StatusPill color="pink">EXPRESS</StatusPill>}
            {isACP2 && <StatusPill color="amber">ACP2</StatusPill>}
            {overrun && <StatusPill color="red">ATRASADA</StatusPill>}
            {paused && !running && <StatusPill color="amber">PAUSADA</StatusPill>}
            {running && !overrun && <StatusPill color="green">EM CURSO</StatusPill>}
          </div>
          <div className="watcher-title truncate" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--cyber-text)' }}>
            {machine.modelo || "—"}
          </div>
          <div className="font-mono-cyber" style={{ fontSize: '10px', color: 'var(--cyber-muted)', letterSpacing: '0.1em', marginTop: '2px' }}>
            #{machine.serie || "—"} {machine.ano ? `· ${machine.ano}` : ''} {machine.tipo ? `· ${machine.tipo}` : ''}
          </div>
        </div>
        <div className="font-mono-cyber text-right shrink-0" style={{ fontSize: '10px', color: 'var(--cyber-muted)', letterSpacing: '0.1em' }}>
          <div style={{ textTransform: 'uppercase' }}>ETAPA</div>
          <div style={{ color: '#4D9FFF', fontWeight: 700, marginTop: '2px' }}>{getEtapaAtual(machine.estado || "")}</div>
        </div>
      </div>

      {/* TIMER + ETA */}
      <div className="grid grid-cols-2 gap-3 relative z-10">
        <div>
          <div className="font-mono-cyber" style={{ fontSize: '9px', letterSpacing: '0.14em', color: 'var(--cyber-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
            <Timer className="w-3 h-3 inline mr-1" /> Decorrido
          </div>
          <div
            className="timer-display"
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: overrun ? '#EF4444' : (running ? '#22C55E' : '#F59E0B'),
              textShadow: overrun
                ? '0 0 14px rgba(239,68,68,0.8)'
                : (running ? '0 0 14px rgba(34,197,94,0.7)' : '0 0 10px rgba(245,158,11,0.6)'),
            }}
          >
            {formatHMS(elapsed)}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono-cyber" style={{ fontSize: '9px', letterSpacing: '0.14em', color: 'var(--cyber-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
            <CalendarClock className="w-3 h-3 inline mr-1" /> Entrega
          </div>
          {overrun ? (
            <div className="timer-display" style={{ fontSize: '24px', fontWeight: 700, color: '#EF4444', textShadow: '0 0 14px rgba(239,68,68,0.8)' }}>
              +{formatHM(overrunSec)}
            </div>
          ) : (
            <div className="timer-display" style={{ fontSize: '24px', fontWeight: 700, color: '#4D9FFF', textShadow: '0 0 14px rgba(77,159,255,0.7)' }}>
              {running ? formatHora(eta) : formatHM(remaining)}
            </div>
          )}
          <div className="font-mono-cyber" style={{ fontSize: '9px', color: 'var(--cyber-muted)', letterSpacing: '0.1em', marginTop: '2px' }}>
            est. {formatHM(estimate)}
          </div>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="mt-3 relative z-10">
        <div className="cyber-progress">
          <div
            className={`cyber-progress-fill ${overrun ? 'cyber-progress-fill-late' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 font-mono-cyber" style={{ fontSize: '9px', color: 'var(--cyber-muted)', letterSpacing: '0.08em' }}>
          <span>{pct}%</span>
          <span>{overrun ? `+${Math.round((elapsed - estimate)/60)}m sobre estimativa` : `faltam ${formatHM(remaining)}`}</span>
        </div>
      </div>
    </div>
  );
}

// ── Card de fila (próximas) ────────────────────────────────────────────────
function MachineQueueRow({ machine, estStart, estEnd, estimate, position, isACP2, hasExpress }) {
  return (
    <div className="cyber-card p-3 clip-cyber-sm flex items-center gap-3">
      <div
        className="watcher-title shrink-0 flex items-center justify-center"
        style={{
          width: '40px', height: '40px',
          background: 'linear-gradient(135deg, rgba(155,92,246,0.18), rgba(77,159,255,0.18))',
          border: '1px solid rgba(155,92,246,0.45)',
          color: '#9B5CF6',
          fontSize: '16px',
          fontWeight: 900,
          textShadow: '0 0 8px rgba(155,92,246,0.7)',
        }}
      >
        {position}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          {hasExpress && <StatusPill color="pink">EXPRESS</StatusPill>}
          {isACP2 && <StatusPill color="amber">ACP2</StatusPill>}
        </div>
        <div className="watcher-title truncate" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--cyber-text)' }}>
          {machine.modelo || "—"}
        </div>
        <div className="font-mono-cyber truncate" style={{ fontSize: '10px', color: 'var(--cyber-muted)', letterSpacing: '0.08em' }}>
          #{machine.serie || "—"} · est. {formatHM(estimate)}
        </div>
      </div>

      <div className="text-right font-mono-cyber shrink-0" style={{ fontSize: '10px', color: 'var(--cyber-muted)', letterSpacing: '0.08em' }}>
        <div style={{ textTransform: 'uppercase', fontSize: '8px' }}>INÍCIO ~</div>
        <div className="timer-display" style={{ color: '#9B5CF6', fontSize: '14px', fontWeight: 700, textShadow: '0 0 8px rgba(155,92,246,0.5)' }}>
          {formatHora(estStart)}
        </div>
        <div style={{ textTransform: 'uppercase', fontSize: '8px', marginTop: '3px' }}>ENTREGA ~</div>
        <div className="timer-display" style={{ color: '#4D9FFF', fontSize: '14px', fontWeight: 700, textShadow: '0 0 8px rgba(77,159,255,0.5)' }}>
          {formatHora(estEnd)}
        </div>
      </div>
    </div>
  );
}

// ── Card de máquina concluída (compacto) ───────────────────────────────────
function MachineDoneRow({ machine, isACP2 }) {
  const elapsed = Number(machine.timer_accumulated_seconds) || 0;
  return (
    <div className="cyber-card p-3 clip-cyber-sm flex items-center gap-3" style={{ borderColor: 'rgba(34,197,94,0.35)' }}>
      <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#22C55E', filter: 'drop-shadow(0 0 6px rgba(34,197,94,0.6))' }} />
      <div className="flex-1 min-w-0">
        <div className="watcher-title truncate" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--cyber-text)' }}>
          {machine.modelo || "—"} {isACP2 && <span style={{ color: '#F59E0B', fontSize: '10px', marginLeft: '4px' }}>[ACP2]</span>}
        </div>
        <div className="font-mono-cyber truncate" style={{ fontSize: '10px', color: 'var(--cyber-muted)', letterSpacing: '0.08em' }}>
          #{machine.serie || "—"}
        </div>
      </div>
      <div className="timer-display shrink-0" style={{ color: '#22C55E', fontSize: '13px', fontWeight: 700, textShadow: '0 0 8px rgba(34,197,94,0.5)' }}>
        {formatHMS(elapsed)}
      </div>
    </div>
  );
}

// ── TIMELINE: barra do dia, "agora" como cursor ────────────────────────────
function DayTimeline({ activeMachines, queueMachines, estimateFor, queuePlan }) {
  useTick(60000);

  // Janela do dia: 07:00 → 19:00 (12h)
  const start = new Date(); start.setHours(7, 0, 0, 0);
  const end   = new Date(); end.setHours(19, 0, 0, 0);
  const total = end.getTime() - start.getTime();

  const now = Date.now();
  const nowPct = Math.max(0, Math.min(100, ((now - start.getTime()) / total) * 100));

  // Blocos das ativas
  const blocks = [];
  for (const m of activeMachines) {
    const elapsed = getTimerElapsedSeconds(m);
    const est = estimateFor(m);
    const startedAt = m.timer_started_at
      ? new Date(m.timer_started_at).getTime() - (Number(m.timer_accumulated_seconds) - elapsed) * 1000
      : now - elapsed * 1000;
    const finishAt = isRunning(m) ? now + Math.max(0, est - elapsed) * 1000 : startedAt + est * 1000;
    blocks.push({ id: m.id, label: m.modelo, startedAt, finishAt, kind: 'active', overrun: elapsed > est });
  }
  // Blocos da fila (estimativa)
  for (const q of queuePlan) {
    blocks.push({ id: q.machine.id, label: q.machine.modelo, startedAt: q.estStart.getTime(), finishAt: q.estEnd.getTime(), kind: 'queue' });
  }

  function pctOf(t) {
    return Math.max(0, Math.min(100, ((t - start.getTime()) / total) * 100));
  }

  return (
    <div className="cyber-card p-4 clip-cyber">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color: '#FF2D78', filter: 'drop-shadow(0 0 6px rgba(255,45,120,0.5))' }} />
          <span className="col-header-cyber" style={{ color: 'var(--cyber-text)' }}>TIMELINE DO DIA</span>
        </div>
        <div className="flex items-center gap-3 font-mono-cyber" style={{ fontSize: '9px', color: 'var(--cyber-muted)', letterSpacing: '0.1em' }}>
          <span><span style={{ display: 'inline-block', width: '10px', height: '6px', background: 'linear-gradient(90deg, #4D9FFF, #FF2D78)', marginRight: '4px' }} /> EM CURSO</span>
          <span><span style={{ display: 'inline-block', width: '10px', height: '6px', background: 'rgba(155,92,246,0.6)', marginRight: '4px' }} /> FILA</span>
          <span><span style={{ display: 'inline-block', width: '2px', height: '10px', background: '#FF2D78', marginRight: '4px', boxShadow: '0 0 6px #FF2D78' }} /> AGORA</span>
        </div>
      </div>

      <div style={{ position: 'relative', height: `${Math.max(60, blocks.length * 22 + 20)}px`, padding: '8px 0' }}>
        {/* Régua de horas */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%' }}>
          {Array.from({ length: 13 }).map((_, i) => {
            const left = (i / 12) * 100;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute', top: 0, left: `${left}%`, height: '100%',
                  borderLeft: '1px dashed rgba(255,45,120,0.10)',
                }}
              >
                <div className="font-mono-cyber" style={{ fontSize: '8px', color: 'var(--cyber-muted)', letterSpacing: '0.05em', position: 'absolute', top: '-2px', left: '4px' }}>
                  {String(7 + i).padStart(2, '0')}h
                </div>
              </div>
            );
          })}
        </div>

        {/* Cursor "agora" */}
        {nowPct >= 0 && nowPct <= 100 && (
          <div
            style={{
              position: 'absolute', top: 0, bottom: 0, left: `${nowPct}%`,
              width: '2px', background: '#FF2D78',
              boxShadow: '0 0 10px rgba(255,45,120,0.9), 0 0 20px rgba(255,45,120,0.5)',
              zIndex: 5,
            }}
          />
        )}

        {/* Blocos */}
        {blocks.map((b, idx) => {
          const left = pctOf(b.startedAt);
          const right = pctOf(b.finishAt);
          const width = Math.max(1.5, right - left);
          const top = 16 + idx * 22;
          return (
            <div
              key={b.id + '-' + idx}
              title={`${b.label} · ${formatHora(new Date(b.startedAt))} → ${formatHora(new Date(b.finishAt))}`}
              style={{
                position: 'absolute',
                left: `${left}%`,
                width: `${width}%`,
                top: `${top}px`,
                height: '16px',
                background: b.kind === 'active'
                  ? (b.overrun ? 'linear-gradient(90deg, #F59E0B, #EF4444)' : 'linear-gradient(90deg, #4D9FFF, #FF2D78)')
                  : 'rgba(155,92,246,0.45)',
                border: b.kind === 'queue' ? '1px dashed rgba(155,92,246,0.7)' : '1px solid rgba(255,45,120,0.5)',
                boxShadow: b.kind === 'active' ? '0 0 10px rgba(255,45,120,0.45)' : 'none',
                fontSize: '9px',
                color: '#fff',
                fontFamily: "'Share Tech Mono', monospace",
                letterSpacing: '0.05em',
                padding: '0 4px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: '14px',
                zIndex: 2,
              }}
            >
              {b.label}
            </div>
          );
        })}

        {blocks.length === 0 && (
          <div className="font-mono-cyber" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '10px', color: 'var(--cyber-muted)', letterSpacing: '0.14em' }}>
            SEM ATIVIDADE
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────
export default function Producao() {
  const [machines, setMachines] = useState([]);
  const [acp2Series, setAcp2Series] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [, setTick] = useState(0);

  // Tick para "atualizado há X segundos"
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const watcher = await callBridge({ action: "list", entity: "FrotaACP" });

      const portalRes = await fetch(
        `https://base44.app/api/apps/${PORTAL_APP_ID}/entities/Equipment?limit=500`,
        { headers: { "api_key": PORTAL_API_KEY } }
      );
      const portalData = await portalRes.json();
      const portalItems = Array.isArray(portalData) ? portalData : (portalData.items || []);
      const acp2 = portalItems.filter((e) => e.frota === "acp2");
      const seriesSet = new Set(acp2.map((e) => (e.serial_number || "").trim()));

      setMachines(watcher);
      setAcp2Series(seriesSet);
      setLastUpdate(new Date());
    } catch (e) {
      setError("Erro ao carregar dados do Watcher.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Estimador baseado em histórico
  const estimateFor = useMemo(() => buildDurationEstimator(machines), [machines]);

  // Buckets
  const ativas    = machines.filter(m => getColuna(m.estado || "") === "em-progresso");
  const queue     = machines.filter(m => getColuna(m.estado || "") === "a-fazer");
  const concluidasHoje = (() => {
    const today = new Date(); today.setHours(0,0,0,0);
    return machines.filter(m => {
      if (getColuna(m.estado || "") !== "concluida") return false;
      const dt = m.updated_date || m.updated_at || m.created_date;
      if (!dt) return true;
      try { return new Date(dt) >= today; } catch { return true; }
    });
  })();
  const concluidas = machines.filter(m => getColuna(m.estado || "") === "concluida");

  // Sort: ACP2 → express → modelo
  const sortMachines = (arr) => arr.slice().sort((a, b) => {
    const aIsAcp2 = acp2Series.has((a.serie || "").trim()) ? 0 : 1;
    const bIsAcp2 = acp2Series.has((b.serie || "").trim()) ? 0 : 1;
    if (aIsAcp2 !== bIsAcp2) return aIsAcp2 - bIsAcp2;
    const aExpress = (a.tarefas || []).some(t => (t.texto||"").toUpperCase() === "EXPRESS") ? 0 : 1;
    const bExpress = (b.tarefas || []).some(t => (t.texto||"").toUpperCase() === "EXPRESS") ? 0 : 1;
    if (aExpress !== bExpress) return aExpress - bExpress;
    return (a.modelo || "").localeCompare(b.modelo || "");
  });

  const ativasSorted = sortMachines(ativas);
  const queueSorted = sortMachines(queue);
  const concluidasSorted = sortMachines(concluidasHoje).reverse();

  // Plano da fila: distribui em N slots paralelos a partir do término previsto das ativas
  const queuePlan = useMemo(() => {
    const now = Date.now();
    // Tempos em que cada slot fica livre
    const slots = [];
    const sortedAtivas = ativasSorted.slice().sort((a, b) => {
      const ea = getTimerElapsedSeconds(a), eb = getTimerElapsedSeconds(b);
      const ra = Math.max(0, estimateFor(a) - ea);
      const rb = Math.max(0, estimateFor(b) - eb);
      return ra - rb;
    });
    for (const m of sortedAtivas) {
      const est = estimateFor(m);
      const elapsed = getTimerElapsedSeconds(m);
      const remaining = Math.max(0, est - elapsed) * 1000;
      slots.push(now + remaining);
    }
    while (slots.length < WORKSHOP_PARALLEL_SLOTS) slots.push(now);
    slots.sort((a, b) => a - b);

    const plan = [];
    for (const m of queueSorted) {
      const est = estimateFor(m);
      const startMs = slots[0];
      const endMs = startMs + est * 1000;
      plan.push({ machine: m, estStart: new Date(startMs), estEnd: new Date(endMs), estimate: est });
      slots[0] = endMs;
      slots.sort((a, b) => a - b);
    }
    return plan;
  }, [queueSorted, ativasSorted, estimateFor]);

  // Próxima entrega global
  const nextDelivery = useMemo(() => {
    const candidates = [];
    for (const m of ativasSorted) {
      if (!isRunning(m)) continue;
      const est = estimateFor(m);
      const elapsed = getTimerElapsedSeconds(m);
      const remaining = Math.max(0, est - elapsed);
      candidates.push({ at: new Date(Date.now() + remaining * 1000), machine: m });
    }
    for (const q of queuePlan) candidates.push({ at: q.estEnd, machine: q.machine });
    candidates.sort((a, b) => a.at - b.at);
    return candidates[0] || null;
  }, [ativasSorted, queuePlan, estimateFor]);

  // Atraso médio do dia
  const avgDelayMin = useMemo(() => {
    const lates = ativas.filter(m => {
      const est = estimateFor(m);
      const el = getTimerElapsedSeconds(m);
      return el > est;
    });
    if (lates.length === 0) return 0;
    const sum = lates.reduce((s, m) => s + (getTimerElapsedSeconds(m) - estimateFor(m)), 0);
    return Math.round((sum / lates.length) / 60);
  }, [ativas, estimateFor]);

  const secondsSinceUpdate = lastUpdate ? Math.floor((Date.now() - lastUpdate.getTime()) / 1000) : null;

  // Loading
  if (loading && machines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#FF2D78', filter: 'drop-shadow(0 0 12px rgba(255,45,120,0.7))' }} />
        <div className="watcher-title" style={{ color: '#FF2D78', textShadow: '0 0 12px rgba(255,45,120,0.7)', fontSize: '14px' }}>
          A SINCRONIZAR COM WATCHER...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="watcher-title" style={{ fontSize: '24px', color: '#FF2D78', textShadow: '0 0 14px rgba(255,45,120,0.6)', fontWeight: 900 }}>
              PRODUÇÃO · LIVE
            </div>
            <span className="animate-cyber-pulse" style={{ width: '8px', height: '8px', background: '#22C55E', borderRadius: '50%', boxShadow: '0 0 12px rgba(34,197,94,0.9)' }} />
          </div>
          <div className="font-mono-cyber" style={{ fontSize: '10px', color: 'var(--cyber-muted)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            FEED EM TEMPO REAL · ESTIMATIVAS BASEADAS NO HISTÓRICO
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <div className="font-mono-cyber" style={{ fontSize: '10px', color: 'var(--cyber-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              ATUALIZADO {secondsSinceUpdate}s ATRÁS
            </div>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="btn-cyber clip-cyber-sm flex items-center gap-2 px-4 py-2"
            style={{ fontSize: '11px', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            ATUALIZAR
          </button>
        </div>
      </div>

      {error && (
        <div className="cyber-card p-4 clip-cyber-sm flex items-center gap-2" style={{ borderColor: 'rgba(239,68,68,0.5)', color: '#EF4444' }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-mono-cyber" style={{ fontSize: '11px', letterSpacing: '0.1em' }}>{error}</span>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricBlock
          icon={Wrench}
          label="EM PRODUÇÃO"
          value={ativasSorted.length}
          sub={`${ativasSorted.filter(isRunning).length} em curso`}
          color="green"
          flicker={ativasSorted.filter(isRunning).length > 0}
        />
        <MetricBlock
          icon={CheckCircle2}
          label="PRONTAS HOJE"
          value={concluidasHoje.length}
          sub={`${concluidas.length} no total`}
          color="blue"
        />
        <MetricBlock
          icon={ListOrdered}
          label="NA FILA"
          value={queueSorted.length}
          sub={queueSorted.length > 0 ? `próx. início ${formatHora(queuePlan[0]?.estStart)}` : 'fila vazia'}
          color="purple"
        />
        <MetricBlock
          icon={Hourglass}
          label="PRÓX. ENTREGA"
          value={nextDelivery ? formatHora(nextDelivery.at) : '—'}
          sub={nextDelivery ? (nextDelivery.machine.modelo || '—') : (avgDelayMin > 0 ? `atraso médio ${avgDelayMin}m` : 'sem entregas previstas')}
          color={avgDelayMin > 15 ? 'red' : (avgDelayMin > 0 ? 'amber' : 'pink')}
        />
      </div>

      {/* ── TIMELINE ── */}
      <DayTimeline
        activeMachines={ativasSorted}
        queueMachines={queueSorted}
        estimateFor={estimateFor}
        queuePlan={queuePlan}
      />

      {/* ── EM PRODUÇÃO ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4" style={{ color: '#22C55E', filter: 'drop-shadow(0 0 6px rgba(34,197,94,0.6))' }} />
          <span className="col-header-cyber" style={{ color: 'var(--cyber-text)' }}>EM PRODUÇÃO</span>
          <span className="font-mono-cyber" style={{ fontSize: '10px', color: 'var(--cyber-muted)', letterSpacing: '0.1em' }}>
            ({ativasSorted.length})
          </span>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(34,197,94,0.4), transparent)' }} />
        </div>
        {ativasSorted.length === 0 ? (
          <div className="cyber-card p-6 clip-cyber-sm text-center font-mono-cyber" style={{ color: 'var(--cyber-muted)', fontSize: '11px', letterSpacing: '0.14em' }}>
            NENHUMA MÁQUINA EM PRODUÇÃO
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {ativasSorted.map((m) => (
              <MachineActiveCard
                key={m.id}
                machine={m}
                estimate={estimateFor(m)}
                isACP2={acp2Series.has((m.serie || "").trim())}
                hasExpress={(m.tarefas || []).some(t => (t.texto||"").toUpperCase() === "EXPRESS")}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── FILA ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <ChevronRight className="w-4 h-4" style={{ color: '#9B5CF6', filter: 'drop-shadow(0 0 6px rgba(155,92,246,0.6))' }} />
          <span className="col-header-cyber" style={{ color: 'var(--cyber-text)' }}>FILA · PRÓXIMAS</span>
          <span className="font-mono-cyber" style={{ fontSize: '10px', color: 'var(--cyber-muted)', letterSpacing: '0.1em' }}>
            ({queueSorted.length})
          </span>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(155,92,246,0.4), transparent)' }} />
        </div>
        {queuePlan.length === 0 ? (
          <div className="cyber-card p-6 clip-cyber-sm text-center font-mono-cyber" style={{ color: 'var(--cyber-muted)', fontSize: '11px', letterSpacing: '0.14em' }}>
            FILA VAZIA
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {queuePlan.map((q, idx) => (
              <MachineQueueRow
                key={q.machine.id}
                machine={q.machine}
                estStart={q.estStart}
                estEnd={q.estEnd}
                estimate={q.estimate}
                position={idx + 1}
                isACP2={acp2Series.has((q.machine.serie || "").trim())}
                hasExpress={(q.machine.tarefas || []).some(t => (t.texto||"").toUpperCase() === "EXPRESS")}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── PRONTAS HOJE ── */}
      {concluidasSorted.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4" style={{ color: '#22C55E', filter: 'drop-shadow(0 0 6px rgba(34,197,94,0.6))' }} />
            <span className="col-header-cyber" style={{ color: 'var(--cyber-text)' }}>PRONTAS HOJE</span>
            <span className="font-mono-cyber" style={{ fontSize: '10px', color: 'var(--cyber-muted)', letterSpacing: '0.1em' }}>
              ({concluidasSorted.length})
            </span>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(34,197,94,0.4), transparent)' }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {concluidasSorted.slice(0, 12).map((m) => (
              <MachineDoneRow
                key={m.id}
                machine={m}
                isACP2={acp2Series.has((m.serie || "").trim())}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── FOOTER STATS ── */}
      <div className="cyber-card p-3 clip-cyber-sm flex flex-wrap gap-4 justify-between items-center">
        <div className="flex flex-wrap gap-4 font-mono-cyber" style={{ fontSize: '10px', color: 'var(--cyber-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          <span>Total Watcher: <strong style={{ color: 'var(--cyber-text)' }}>{machines.length}</strong></span>
          <span>ACP2 rastreadas: <strong style={{ color: '#F59E0B' }}>{acp2Series.size}</strong></span>
          <span>Slots paralelos: <strong style={{ color: 'var(--cyber-text)' }}>{WORKSHOP_PARALLEL_SLOTS}</strong></span>
        </div>
        <div className="font-mono-cyber" style={{ fontSize: '9px', color: 'var(--cyber-muted)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Polling 10s · ETA = histórico médio por modelo/tipo
        </div>
      </div>
    </div>
  );
}
