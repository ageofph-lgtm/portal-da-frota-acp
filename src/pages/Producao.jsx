import React, { useState, useEffect, useMemo } from "react";
import {
  Loader2, RefreshCw, Zap, Clock, CheckCircle2, AlertCircle, Wrench,
  Timer, ChevronRight, Activity, ListOrdered, CalendarClock, Hourglass,
  CalendarDays
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";

const BRIDGE_URL = "https://watcherweb.base44.app/api/functions/saganBridge";
const BRIDGE_HEADERS = {
  "Content-Type": "application/json",
  "x-sagan-secret": "sagan-watcher-bridge-2026",
  "api_key": "f8517554492e492090b62dd501ad7e14",
};

const PORTAL_APP_ID = "699ee6a6c0541069d0066cc1";
const PORTAL_API_KEY = "f8517554492e492090b62dd501ad7e14";

// Janela do timeline (dias a mostrar a partir de hoje)
const TIMELINE_DAYS = 14;
const TIMELINE_BACK_DAYS = 1;

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

function startOfDay(d) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
}

function diffDays(a, b) {
  // dias inteiros (b - a) considerando dia civil
  const A = startOfDay(a).getTime();
  const B = startOfDay(b).getTime();
  return Math.round((B - A) / 86400000);
}

function parseDate(value) {
  if (!value) return null;
  try {
    const s = String(value).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}

function formatDateShort(d) {
  if (!d) return "—";
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });
}

function formatDateLong(d) {
  if (!d) return "—";
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "2-digit" });
}

function formatDays(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  if (n === 0) return "hoje";
  if (n === 1) return "1 dia";
  if (n === -1) return "ontem";
  if (n < 0) return `há ${-n} dias`;
  return `${n} dias`;
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

function getPrevisao(machine) {
  const inicio = parseDate(machine.previsao_inicio);
  const fim    = parseDate(machine.previsao_fim);
  if (!inicio || !fim) return { inicio, fim, totalDias: null };
  const totalDias = Math.max(1, diffDays(inicio, fim));
  return { inicio, fim, totalDias };
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
function MachineActiveCard({ machine, isACP2, hasExpress }) {
  useTick(1000);
  const elapsed = getTimerElapsedSeconds(machine);
  const running = isRunning(machine);
  const paused  = isPaused(machine);

  const { inicio, fim, totalDias } = getPrevisao(machine);
  const today = new Date();
  const hasPrevisao = !!(inicio && fim);
  const diasDecorridos = hasPrevisao ? Math.max(0, diffDays(inicio, today)) : 0;
  const diasRestantes  = hasPrevisao ? diffDays(today, fim) : null;
  const overrun        = hasPrevisao && diasRestantes < 0;
  const pct = hasPrevisao
    ? Math.min(100, Math.max(0, Math.round((diasDecorridos / totalDias) * 100)))
    : 0;

  const cardClass = overrun
    ? 'cyber-card-late'
    : (running ? 'cyber-card-running' : (paused ? 'cyber-card-warn' : ''));

  return (
    <div className={`cyber-card ${cardClass} animate-fadeInUp p-4 clip-cyber relative overflow-hidden`}>
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
            {!hasPrevisao && <StatusPill color="muted">SEM PREVISÃO</StatusPill>}
          </div>
          <div className="watcher-title truncate" style={{ fontSize: '17px', fontWeight: 900, color: '#4D9FFF', letterSpacing: '0.06em', textShadow: '0 0 10px rgba(77,159,255,0.5)' }}>
            {machine.serie || "—"}
          </div>
          <div className="font-mono-cyber" style={{ fontSize: '11px', color: 'var(--cyber-text)', letterSpacing: '0.05em', marginTop: '2px', opacity: 0.7 }}>
            {machine.modelo || "—"} {machine.ano ? `· ${machine.ano}` : ''} {machine.tipo ? `· ${machine.tipo}` : ''}
          </div>
        </div>
        <div className="font-mono-cyber text-right shrink-0" style={{ fontSize: '10px', color: 'var(--cyber-muted)', letterSpacing: '0.1em' }}>
          <div style={{ textTransform: 'uppercase' }}>ETAPA</div>
          <div style={{ color: '#4D9FFF', fontWeight: 700, marginTop: '2px' }}>{getEtapaAtual(machine.estado || "")}</div>
        </div>
      </div>

      {/* DIAS RESTANTES + DATA DE ENTREGA */}
      <div className="grid grid-cols-2 gap-3 relative z-10">
        <div>
          <div className="font-mono-cyber" style={{ fontSize: '9px', letterSpacing: '0.14em', color: 'var(--cyber-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
            <Hourglass className="w-3 h-3 inline mr-1" /> Faltam
          </div>
          {hasPrevisao ? (
            <div
              className="watcher-title"
              style={{
                fontSize: '28px',
                fontWeight: 900,
                color: overrun ? '#EF4444' : (diasRestantes <= 1 ? '#F59E0B' : '#22C55E'),
                textShadow: overrun
                  ? '0 0 14px rgba(239,68,68,0.8)'
                  : (diasRestantes <= 1 ? '0 0 14px rgba(245,158,11,0.7)' : '0 0 14px rgba(34,197,94,0.7)'),
                lineHeight: 1,
              }}
            >
              {overrun
                ? `+${-diasRestantes}d`
                : (diasRestantes === 0 ? 'HOJE' : `${diasRestantes}d`)}
            </div>
          ) : (
            <div className="watcher-title" style={{ fontSize: '24px', color: 'var(--cyber-muted)', lineHeight: 1 }}>—</div>
          )}
          <div className="font-mono-cyber" style={{ fontSize: '9px', color: 'var(--cyber-muted)', letterSpacing: '0.1em', marginTop: '4px' }}>
            {hasPrevisao ? `iniciou ${formatDays(-diasDecorridos)}` : 'sem datas previstas'}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono-cyber" style={{ fontSize: '9px', letterSpacing: '0.14em', color: 'var(--cyber-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
            <CalendarClock className="w-3 h-3 inline mr-1" /> Entrega
          </div>
          <div
            className="timer-display"
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: overrun ? '#EF4444' : '#4D9FFF',
              textShadow: overrun ? '0 0 14px rgba(239,68,68,0.8)' : '0 0 14px rgba(77,159,255,0.7)',
            }}
          >
            {formatDateShort(fim)}
          </div>
          <div className="font-mono-cyber" style={{ fontSize: '9px', color: 'var(--cyber-muted)', letterSpacing: '0.1em', marginTop: '2px' }}>
            {hasPrevisao ? `${totalDias}d previstos` : ''}
          </div>
        </div>
      </div>

      {/* PROGRESS BAR (em dias) */}
      {hasPrevisao && (
        <div className="mt-3 relative z-10">
          <div className="cyber-progress">
            <div
              className={`cyber-progress-fill ${overrun ? 'cyber-progress-fill-late' : ''}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 font-mono-cyber" style={{ fontSize: '9px', color: 'var(--cyber-muted)', letterSpacing: '0.08em' }}>
            <span>{formatDateShort(inicio)}</span>
            <span>{pct}%</span>
            <span>{formatDateShort(fim)}</span>
          </div>
        </div>
      )}

      {/* TIMER ATIVO (rodapé) */}
      <div className="mt-3 pt-3 border-t flex items-center justify-between gap-2 relative z-10" style={{ borderColor: 'var(--cyber-border)' }}>
        <div className="flex items-center gap-2 font-mono-cyber" style={{ fontSize: '10px', color: 'var(--cyber-muted)', letterSpacing: '0.1em' }}>
          <Timer className="w-3 h-3" />
          <span>TIMER</span>
        </div>
        <div className="timer-display" style={{ fontSize: '14px', fontWeight: 700, color: running ? '#22C55E' : (paused ? '#F59E0B' : 'var(--cyber-muted)') }}>
          {formatHMS(elapsed)}
        </div>
      </div>
    </div>
  );
}

// ── Card de fila (próximas) ────────────────────────────────────────────────
function MachineQueueRow({ machine, position, isACP2, hasExpress }) {
  const { inicio, fim, totalDias } = getPrevisao(machine);
  const today = new Date();
  const diasParaIniciar = inicio ? diffDays(today, inicio) : null;

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
          {!inicio && <StatusPill color="muted">SEM PREVISÃO</StatusPill>}
        </div>
        <div className="watcher-title truncate" style={{ fontSize: '14px', fontWeight: 900, color: '#4D9FFF', letterSpacing: '0.06em', textShadow: '0 0 8px rgba(77,159,255,0.45)' }}>
          {machine.serie || "—"}
        </div>
        <div className="font-mono-cyber truncate" style={{ fontSize: '10px', color: 'var(--cyber-text)', opacity: 0.65, letterSpacing: '0.06em' }}>
          {machine.modelo || "—"} {totalDias ? `· ${totalDias}d previstos` : ''}
        </div>
      </div>

      <div className="text-right font-mono-cyber shrink-0" style={{ fontSize: '10px', color: 'var(--cyber-muted)', letterSpacing: '0.08em' }}>
        <div style={{ textTransform: 'uppercase', fontSize: '8px' }}>INÍCIO</div>
        <div className="timer-display" style={{ color: '#9B5CF6', fontSize: '13px', fontWeight: 700, textShadow: '0 0 8px rgba(155,92,246,0.5)' }}>
          {formatDateShort(inicio)}
        </div>
        <div style={{ textTransform: 'uppercase', fontSize: '8px', marginTop: '3px' }}>ENTREGA</div>
        <div className="timer-display" style={{ color: '#4D9FFF', fontSize: '13px', fontWeight: 700, textShadow: '0 0 8px rgba(77,159,255,0.5)' }}>
          {formatDateShort(fim)}
        </div>
        {diasParaIniciar !== null && (
          <div style={{ marginTop: '3px', color: diasParaIniciar < 0 ? '#EF4444' : '#9DA0BC' }}>
            {diasParaIniciar < 0 ? `atrasada ${-diasParaIniciar}d` : `em ${formatDays(diasParaIniciar)}`}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Card de máquina concluída ─────────────────────────────────────────────
function MachineDoneRow({ machine, isACP2 }) {
  const elapsed = Number(machine.timer_accumulated_seconds) || 0;
  const { inicio, fim } = getPrevisao(machine);
  return (
    <div className="cyber-card p-3 clip-cyber-sm flex items-center gap-3" style={{ borderColor: 'rgba(34,197,94,0.35)' }}>
      <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#22C55E', filter: 'drop-shadow(0 0 6px rgba(34,197,94,0.6))' }} />
      <div className="flex-1 min-w-0">
        <div className="watcher-title truncate" style={{ fontSize: '14px', fontWeight: 900, color: '#22C55E', letterSpacing: '0.06em', textShadow: '0 0 8px rgba(34,197,94,0.45)' }}>
          {machine.serie || "—"} {isACP2 && <span style={{ color: '#F59E0B', fontSize: '9px', fontWeight: 700, marginLeft: '6px' }}>[ACP2]</span>}
        </div>
        <div className="font-mono-cyber truncate" style={{ fontSize: '10px', color: 'var(--cyber-text)', opacity: 0.65, letterSpacing: '0.06em' }}>
          {machine.modelo || "—"} {fim ? `· entregue ${formatDateShort(fim)}` : ''}
        </div>
      </div>
      <div className="timer-display shrink-0" style={{ color: '#22C55E', fontSize: '13px', fontWeight: 700, textShadow: '0 0 8px rgba(34,197,94,0.5)' }}>
        {elapsed > 0 ? formatHMS(elapsed) : (inicio && fim ? `${diffDays(inicio, fim)}d` : '—')}
      </div>
    </div>
  );
}

// ── TIMELINE: dias do mês, "hoje" como cursor ──────────────────────────────
function DayTimeline({ activeMachines, queueMachines }) {
  useTick(60000);

  const today = startOfDay(new Date());
  const start = new Date(today); start.setDate(start.getDate() - TIMELINE_BACK_DAYS);
  const end   = new Date(today); end.setDate(end.getDate() + TIMELINE_DAYS);
  const totalDays = diffDays(start, end);

  // Posição do "agora" em %
  const nowPct = ((Date.now() - start.getTime()) / (totalDays * 86400000)) * 100;

  // Blocos
  const blocks = [];
  for (const m of activeMachines) {
    const { inicio, fim } = getPrevisao(m);
    if (!inicio || !fim) continue;
    const overrun = startOfDay(new Date()) > startOfDay(fim);
    blocks.push({
      id: m.id,
      label: m.serie || m.modelo,
      nsLabel: m.serie,
      modeloLabel: m.modelo,
      startMs: inicio.getTime(),
      endMs: fim.getTime(),
      kind: 'active',
      overrun,
    });
  }
  for (const m of queueMachines) {
    const { inicio, fim } = getPrevisao(m);
    if (!inicio || !fim) continue;
    blocks.push({
      id: m.id,
      label: m.serie || m.modelo,
      nsLabel: m.serie,
      modeloLabel: m.modelo,
      startMs: inicio.getTime(),
      endMs: fim.getTime(),
      kind: 'queue',
    });
  }

  function pctOf(ms) {
    return ((ms - start.getTime()) / (totalDays * 86400000)) * 100;
  }

  // Régua de dias
  const days = Array.from({ length: totalDays + 1 }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="cyber-card p-4 clip-cyber">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4" style={{ color: '#FF2D78', filter: 'drop-shadow(0 0 6px rgba(255,45,120,0.5))' }} />
          <span className="col-header-cyber" style={{ color: 'var(--cyber-text)' }}>TIMELINE · PRÓXIMOS {TIMELINE_DAYS} DIAS</span>
        </div>
        <div className="flex items-center gap-3 font-mono-cyber" style={{ fontSize: '9px', color: 'var(--cyber-muted)', letterSpacing: '0.1em' }}>
          <span><span style={{ display: 'inline-block', width: '10px', height: '6px', background: 'linear-gradient(90deg, #4D9FFF, #FF2D78)', marginRight: '4px' }} /> EM CURSO</span>
          <span><span style={{ display: 'inline-block', width: '10px', height: '6px', background: 'rgba(155,92,246,0.6)', marginRight: '4px' }} /> FILA</span>
          <span><span style={{ display: 'inline-block', width: '2px', height: '10px', background: '#FF2D78', marginRight: '4px', boxShadow: '0 0 6px #FF2D78' }} /> HOJE</span>
        </div>
      </div>

      {/* Régua de dias (cabeçalho) */}
      <div style={{ position: 'relative', height: '20px', borderBottom: '1px solid var(--cyber-border)' }}>
        {days.map((d, i) => {
          const left = (i / totalDays) * 100;
          const isToday = startOfDay(d).getTime() === today.getTime();
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${left}%`,
                width: `${100 / totalDays}%`,
                top: 0,
                height: '100%',
                borderLeft: '1px dashed rgba(255,45,120,0.10)',
                background: isWeekend ? 'rgba(155,92,246,0.04)' : 'transparent',
              }}
            >
              <div
                className="font-mono-cyber"
                style={{
                  fontSize: '8px',
                  color: isToday ? '#FF2D78' : (isWeekend ? '#9B5CF6' : 'var(--cyber-muted)'),
                  fontWeight: isToday ? 800 : 500,
                  letterSpacing: '0.05em',
                  position: 'absolute', top: '4px', left: '4px',
                  textTransform: 'uppercase',
                  textShadow: isToday ? '0 0 6px rgba(255,45,120,0.7)' : 'none',
                }}
              >
                {d.toLocaleDateString("pt-PT", { day: "2-digit" })}
                <span style={{ opacity: 0.6, marginLeft: '2px' }}>{d.toLocaleDateString("pt-PT", { month: "short" }).slice(0,3)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Área dos blocos */}
      <div style={{ position: 'relative', height: `${Math.max(60, blocks.length * 22 + 16)}px`, padding: '8px 0', overflow: 'hidden' }}>
        {/* Cursor "hoje" */}
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

        {/* Linhas verticais por dia (subtis) */}
        {days.map((d, i) => {
          const left = (i / totalDays) * 100;
          return (
            <div
              key={`v-${i}`}
              style={{
                position: 'absolute', top: 0, bottom: 0, left: `${left}%`,
                borderLeft: '1px dashed rgba(255,45,120,0.06)',
                pointerEvents: 'none',
              }}
            />
          );
        })}

        {/* Blocos */}
        {blocks.map((b, idx) => {
          const leftRaw  = pctOf(b.startMs);
          const rightRaw = pctOf(b.endMs + 86400000); // +1 dia para incluir o dia inteiro
          if (rightRaw <= 0 || leftRaw >= 100) return null; // fora do range visível
          const left  = Math.max(0, Math.min(100, leftRaw));
          const right = Math.max(0, Math.min(100, rightRaw));
          const width = Math.max(0.8, right - left);
          const top = 8 + idx * 22;
          return (
            <div
              key={b.id + '-' + idx}
              title={`${b.nsLabel||b.label} · ${b.modeloLabel||''} · ${formatDateLong(new Date(b.startMs))} → ${formatDateLong(new Date(b.endMs))}`}
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
              <span style={{
                fontFamily:"'Orbitron',monospace",fontSize:'10px',fontWeight:900,
                letterSpacing:'0.06em',flexShrink:0,whiteSpace:'nowrap',
              }}>{b.nsLabel||b.label}</span>
              {b.modeloLabel && b.nsLabel && width > 15 && (
                <span style={{fontSize:'7px',opacity:0.55,marginLeft:'4px',
                  whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',flexShrink:1}}>
                  {b.modeloLabel}
                </span>
              )}
            </div>
          );
        })}

        {blocks.length === 0 && (
          <div className="font-mono-cyber" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '10px', color: 'var(--cyber-muted)', letterSpacing: '0.14em' }}>
            SEM PREVISÕES DEFINIDAS · CONFIGURAR NO WATCHER
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

  // Buckets
  const ativas = machines.filter(m => getColuna(m.estado || "") === "em-progresso");
  const queue  = machines.filter(m => getColuna(m.estado || "") === "a-fazer");
  const concluidasHoje = (() => {
    const today = startOfDay(new Date());
    return machines.filter(m => {
      if (getColuna(m.estado || "") !== "concluida") return false;
      const dt = m.updated_date || m.updated_at || m.created_date;
      if (!dt) return true;
      try { return new Date(dt) >= today; } catch { return true; }
    });
  })();
  const concluidas = machines.filter(m => getColuna(m.estado || "") === "concluida");

  // Sort: ACP2 → express → previsao_fim ASC → modelo
  const sortMachines = (arr) => arr.slice().sort((a, b) => {
    const aIsAcp2 = acp2Series.has((a.serie || "").trim()) ? 0 : 1;
    const bIsAcp2 = acp2Series.has((b.serie || "").trim()) ? 0 : 1;
    if (aIsAcp2 !== bIsAcp2) return aIsAcp2 - bIsAcp2;
    const aExpress = (a.tarefas || []).some(t => (t.texto||"").toUpperCase() === "EXPRESS") ? 0 : 1;
    const bExpress = (b.tarefas || []).some(t => (t.texto||"").toUpperCase() === "EXPRESS") ? 0 : 1;
    if (aExpress !== bExpress) return aExpress - bExpress;
    const fA = parseDate(a.previsao_fim);
    const fB = parseDate(b.previsao_fim);
    if (fA && fB) return fA - fB;
    if (fA && !fB) return -1;
    if (!fA && fB) return 1;
    return (a.modelo || "").localeCompare(b.modelo || "");
  });

  const ativasSorted = sortMachines(ativas);
  const queueSorted = (() => {
    const arr = sortMachines(queue);
    // Ordena: com previsão por previsao_inicio ASC, sem previsão no fim
    return arr.sort((a, b) => {
      const iA = parseDate(a.previsao_inicio);
      const iB = parseDate(b.previsao_inicio);
      if (iA && iB) return iA - iB;
      if (iA && !iB) return -1;
      if (!iA && iB) return 1;
      return 0;
    });
  })();
  const concluidasSorted = sortMachines(concluidasHoje).reverse();

  // Próxima entrega
  const nextDelivery = useMemo(() => {
    const today = startOfDay(new Date());
    const candidates = [];
    for (const m of ativasSorted) {
      const { fim } = getPrevisao(m);
      if (fim) candidates.push({ at: fim, machine: m });
    }
    candidates.sort((a, b) => a.at - b.at);
    // primeira que ainda não passou (ou a mais próxima)
    const futura = candidates.find(c => c.at >= today);
    return futura || candidates[0] || null;
  }, [ativasSorted]);

  // Atrasadas
  const atrasadasCount = useMemo(() => {
    const today = startOfDay(new Date());
    return ativasSorted.filter(m => {
      const { fim } = getPrevisao(m);
      return fim && startOfDay(fim) < today;
    }).length;
  }, [ativasSorted]);

  const secondsSinceUpdate = lastUpdate ? Math.floor((Date.now() - lastUpdate.getTime()) / 1000) : null;

  // Loading
  if (loading && machines.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="PRODUÇÃO · LIVE" subtitle="A sincronizar com Watcher..." accent="pink" />
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#FF2D78', filter: 'drop-shadow(0 0 12px rgba(255,45,120,0.7))' }} />
          <div className="watcher-title" style={{ color: '#FF2D78', textShadow: '0 0 12px rgba(255,45,120,0.7)', fontSize: '14px' }}>
            A SINCRONIZAR...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="PRODUÇÃO · LIVE"
        subtitle="Feed em tempo real · Previsões em dias geridas no Watcher"
        accent="pink"
        right={
          <>
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
          </>
        }
      />

      {error && (
        <div className="cyber-card p-4 clip-cyber-sm flex items-center gap-2" style={{ borderColor: 'rgba(239,68,68,0.5)', color: '#EF4444' }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-mono-cyber" style={{ fontSize: '11px', letterSpacing: '0.1em' }}>{error}</span>
        </div>
      )}

      {/* KPIs */}
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
          sub={queueSorted.length > 0 && parseDate(queueSorted[0].previsao_inicio)
            ? `próx. ${formatDateShort(parseDate(queueSorted[0].previsao_inicio))}`
            : 'sem previsão'}
          color="purple"
        />
        <MetricBlock
          icon={Hourglass}
          label="PRÓX. ENTREGA"
          value={nextDelivery ? formatDateShort(nextDelivery.at) : '—'}
          sub={nextDelivery ? (nextDelivery.machine.modelo || '—') : (atrasadasCount > 0 ? `${atrasadasCount} atrasada(s)` : 'sem entregas')}
          color={atrasadasCount > 0 ? 'red' : 'pink'}
        />
      </div>

      {/* TIMELINE */}
      <DayTimeline activeMachines={ativasSorted} queueMachines={queueSorted} />

      {/* EM PRODUÇÃO */}
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
                isACP2={acp2Series.has((m.serie || "").trim())}
                hasExpress={(m.tarefas || []).some(t => (t.texto||"").toUpperCase() === "EXPRESS")}
              />
            ))}
          </div>
        )}
      </section>

      {/* FILA */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <ChevronRight className="w-4 h-4" style={{ color: '#9B5CF6', filter: 'drop-shadow(0 0 6px rgba(155,92,246,0.6))' }} />
          <span className="col-header-cyber" style={{ color: 'var(--cyber-text)' }}>FILA · PRÓXIMAS</span>
          <span className="font-mono-cyber" style={{ fontSize: '10px', color: 'var(--cyber-muted)', letterSpacing: '0.1em' }}>
            ({queueSorted.length})
          </span>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(155,92,246,0.4), transparent)' }} />
        </div>
        {queueSorted.length === 0 ? (
          <div className="cyber-card p-6 clip-cyber-sm text-center font-mono-cyber" style={{ color: 'var(--cyber-muted)', fontSize: '11px', letterSpacing: '0.14em' }}>
            FILA VAZIA
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {queueSorted.map((m, idx) => (
              <MachineQueueRow
                key={m.id}
                machine={m}
                position={idx + 1}
                isACP2={acp2Series.has((m.serie || "").trim())}
                hasExpress={(m.tarefas || []).some(t => (t.texto||"").toUpperCase() === "EXPRESS")}
              />
            ))}
          </div>
        )}
      </section>

      {/* PRONTAS HOJE */}
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

      {/* FOOTER STATS */}
      <div className="cyber-card p-3 clip-cyber-sm flex flex-wrap gap-4 justify-between items-center">
        <div className="flex flex-wrap gap-4 font-mono-cyber" style={{ fontSize: '10px', color: 'var(--cyber-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          <span>Total Watcher: <strong style={{ color: 'var(--cyber-text)' }}>{machines.length}</strong></span>
          <span>ACP2 rastreadas: <strong style={{ color: '#F59E0B' }}>{acp2Series.size}</strong></span>
          {atrasadasCount > 0 && (
            <span>Atrasadas: <strong style={{ color: '#EF4444', textShadow: '0 0 6px rgba(239,68,68,0.5)' }}>{atrasadasCount}</strong></span>
          )}
        </div>
        <div className="font-mono-cyber" style={{ fontSize: '9px', color: 'var(--cyber-muted)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Polling 10s · Previsões em dias (Watcher)
        </div>
      </div>
    </div>
  );
}
