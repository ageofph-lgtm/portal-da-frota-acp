import React, { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, RefreshCw, Zap, Clock, CheckCircle2, AlertCircle } from "lucide-react";

const BRIDGE_URL = "https://watcherweb.base44.app/api/functions/saganBridge";
const BRIDGE_HEADERS = {
  "Content-Type": "application/json",
  "x-sagan-secret": "sagan-watcher-bridge-2026",
  "api_key": "f8517554492e492090b62dd501ad7e14",
};

const PORTAL_APP_ID = "699ee6a6c0541069d0066cc1";
const PORTAL_API_KEY = "f8517554492e492090b62dd501ad7e14";

// Mapeia estado do Watcher → coluna do board
function getColuna(estado = "") {
  if (estado === "a-fazer") return "a-fazer";
  if (estado.startsWith("em-preparacao")) return "em-progresso";
  if (estado.startsWith("concluida")) return "concluida";
  return null;
}

// Mapeia estado Watcher → status Portal ACP2
function watcherToPortalStatus(estado = "") {
  if (estado === "a-fazer") return "A começar";
  if (estado.startsWith("em-preparacao")) return "Em progresso";
  if (estado.startsWith("concluida")) return "Pronta";
  return null;
}

// Extrai técnico do estado
function getTecnico(estado = "") {
  const m = estado.match(/-([\w]+)$/);
  return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1) : null;
}

const COLUNA_CONFIG = {
  "a-fazer": {
    label: "A Fazer",
    icon: Clock,
    color: "border-t-slate-400",
    bg: "bg-slate-50 dark:bg-slate-800/50",
    badge: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
    iconColor: "text-slate-400",
  },
  "em-progresso": {
    label: "Em Progresso",
    icon: Zap,
    color: "border-t-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    iconColor: "text-blue-500",
  },
  "concluida": {
    label: "Concluída",
    icon: CheckCircle2,
    color: "border-t-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    iconColor: "text-emerald-500",
  },
};

async function callBridge(payload) {
  const res = await fetch(BRIDGE_URL, {
    method: "POST",
    headers: BRIDGE_HEADERS,
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return data.result || [];
}

async function updatePortalACP2(serialNumber, novoStatus) {
  try {
    const listRes = await fetch(
      `https://base44.app/api/apps/${PORTAL_APP_ID}/entities/Equipment?limit=500`,
      { headers: { "api_key": PORTAL_API_KEY } }
    );
    const all = await listRes.json();
    const items = Array.isArray(all) ? all : (all.items || []);
    const rec = items.find(
      (e) => e.frota === "acp2" && (e.serial_number || "").trim() === serialNumber.trim()
    );
    if (!rec) return;
    await fetch(
      `https://base44.app/api/apps/${PORTAL_APP_ID}/entities/Equipment/${rec.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", "api_key": PORTAL_API_KEY },
        body: JSON.stringify({ status: novoStatus }),
      }
    );
  } catch (e) {
    console.error("Erro ao atualizar Portal ACP2:", e);
  }
}

function formatDuration(minutes) {
  if (minutes === null || minutes === undefined) return null;
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}min`;
  return `${h}h${m > 0 ? ` ${m}min` : ""}`;
}

function useElapsedTimer(machine) {
  const [elapsed, setElapsed] = React.useState(null);
  const ref = React.useRef(null);

  React.useEffect(() => {
    clearInterval(ref.current);
    const ativo   = machine?.timer_ativo === true;
    const pausado = machine?.timer_pausado === true;
    const inicio  = machine?.timer_inicio || null;
    const acumulado = machine?.timer_acumulado || 0;

    if (ativo && !pausado && inicio) {
      const update = () => {
        const diff = (Date.now() - new Date(inicio).getTime()) / 1000 / 60;
        setElapsed(acumulado + diff);
      };
      update();
      ref.current = setInterval(update, 1000);
    } else if (pausado) {
      setElapsed(acumulado);
    } else if (!ativo && machine?.timer_duracao_minutos != null) {
      setElapsed(machine.timer_duracao_minutos);
    } else {
      setElapsed(null);
    }
    return () => clearInterval(ref.current);
  }, [
    machine?.timer_ativo,
    machine?.timer_pausado,
    machine?.timer_inicio,
    machine?.timer_acumulado,
    machine?.timer_duracao_minutos
  ]);

  return elapsed;
}

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("pt-PT", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit"
  });
}

function MachineCard({ machine, acp2Series }) {
  const timerElapsed = useElapsedTimer(machine);
  const isACP2 = acp2Series.has((machine.serie || "").trim());
  const tecnico = getTecnico(machine.estado || "");
  const hasExpress = (machine.tarefas || []).some(
    (t) => (t.texto || "").toUpperCase() === "EXPRESS"
  );

  const timerAtivo = machine.timer_ativo === true;
  const pausado = machine.timer_pausado === true;
  const timerInicio = machine.timer_inicio || null;
  const timerFim = machine.timer_fim || null;
  const timerDuracao = machine.timer_duracao_minutos;
  const hasDuracao = timerDuracao !== null && timerDuracao !== undefined;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 space-y-2 transition-all hover:shadow-md ${isACP2 ? "ring-1 ring-[#F08100]/40" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">
            {machine.modelo || "—"}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">
            {machine.serie || "—"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {hasExpress && (
            <span className="text-[10px] font-bold bg-[#F08100] text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
              Express
            </span>
          )}
          {isACP2 && (
            <span className="text-[10px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 px-2 py-0.5 rounded-full">
              ACP2
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {machine.ano && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
            {machine.ano}
          </span>
        )}
        {machine.tipo && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md capitalize">
            {machine.tipo}
          </span>
        )}
        {tecnico && (
          <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
            {tecnico}
          </span>
        )}
      </div>

      {/* ── TIMER INFO ── */}
      {(timerInicio || hasDuracao || timerElapsed !== null) && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1">
          {/* Ticker em tempo real */}
          {timerElapsed !== null && (timerAtivo || pausado) && (
            <div className={`flex items-center gap-1.5 text-[11px] font-mono font-bold ${pausado ? "text-yellow-500" : "text-emerald-500"}`}>
              {pausado
                ? <><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> {formatDuration(timerElapsed)} <span className="font-normal text-slate-400">pausado</span></>
                : <><span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" /> {formatDuration(timerElapsed)} <span className="font-normal text-slate-400">em curso</span></>
              }
            </div>
          )}
          {timerInicio && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              ▶ Início: <span className="font-mono">{formatDate(timerInicio)}</span>
            </p>
          )}
          {timerFim && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              ⏹ Fim: <span className="font-mono">{formatDate(timerFim)}</span>
            </p>
          )}
          {hasDuracao && !timerAtivo && (
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              ✓ Duração: {formatDuration(timerDuracao)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Column({ id, machines, acp2Series }) {
  const cfg = COLUNA_CONFIG[id];
  const Icon = cfg.icon;

  return (
    <div className={`flex flex-col rounded-2xl border-t-4 ${cfg.color} ${cfg.bg} p-4 min-h-[300px] gap-3`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
          <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">
            {cfg.label}
          </span>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.badge}`}>
          {machines.length}
        </span>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-320px)]">
        {machines.length === 0 ? (
          <p className="text-center text-slate-400 dark:text-slate-600 text-xs py-8">Sem máquinas</p>
        ) : (
          machines.map((m) => (
            <MachineCard key={m.id} machine={m} acp2Series={acp2Series} />
          ))
        )}
      </div>
    </div>
  );
}

export default function Producao() {
  const [machines, setMachines] = useState([]);
  const [acp2Series, setAcp2Series] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      // 1. Buscar todas do Watcher
      const watcher = await callBridge({ action: "list", entity: "FrotaACP" });

      // 2. Buscar séries ACP2 do Portal
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
    const interval = setInterval(loadData, 5 * 60 * 1000); // refresh 5min
    return () => clearInterval(interval);
  }, []);

  const colunas = { "a-fazer": [], "em-progresso": [], "concluida": [] };
  for (const m of machines) {
    const col = getColuna(m.estado || "");
    if (col) colunas[col].push(m);
  }

  // Ordenar: ACP2 primeiro, depois express, depois por modelo
  for (const col of Object.keys(colunas)) {
    colunas[col].sort((a, b) => {
      const aIsAcp2 = acp2Series.has((a.serie || "").trim()) ? 0 : 1;
      const bIsAcp2 = acp2Series.has((b.serie || "").trim()) ? 0 : 1;
      if (aIsAcp2 !== bIsAcp2) return aIsAcp2 - bIsAcp2;
      const aExpress = (a.tarefas || []).some(t => (t.texto||"").toUpperCase() === "EXPRESS") ? 0 : 1;
      const bExpress = (b.tarefas || []).some(t => (t.texto||"").toUpperCase() === "EXPRESS") ? 0 : 1;
      if (aExpress !== bExpress) return aExpress - bExpress;
      return (a.modelo || "").localeCompare(b.modelo || "");
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Board de Produção
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Alimentado pelo Watcher · ACP2 em destaque
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-slate-400">
              Atualizado {lastUpdate.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#F08100] hover:bg-[#d97200] text-white rounded-lg text-sm font-medium transition-all shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && machines.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-[#F08100]" />
        </div>
      ) : (
        <>
          {/* Legenda */}
          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#F08100] inline-block" />
              ACP2 em destaque
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#F08100] inline-block opacity-50" />
              Express
            </div>
          </div>

          {/* Board */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {Object.entries(colunas).map(([id, maquinas]) => (
              <Column key={id} id={id} machines={maquinas} acp2Series={acp2Series} />
            ))}
          </div>


          {/* ── Ranking de Produtividade por Técnico ── */}
          {(() => {
            const TECHS = ['raphael','nuno','rogerio','yano'];
            const stats = TECHS.map(tech => {
              const concluidas = machines.filter(m =>
                m.estado?.includes(`concluida-${tech}`) &&
                m.timer_duracao_minutos != null
              );
              const total = concluidas.length;
              const totalMin = concluidas.reduce((sum, m) => sum + (m.timer_duracao_minutos || 0), 0);
              const mediaMin = total > 0 ? Math.round(totalMin / total) : null;
              return { tech, total, totalMin, mediaMin };
            }).filter(s => s.total > 0 || machines.some(m => m.tecnico === s.tech));

            if (stats.length === 0) return null;

            const COLORS = {
              raphael: { ring: 'ring-red-400', badge: 'bg-red-500', label: 'RAPHAEL' },
              nuno:    { ring: 'ring-yellow-400', badge: 'bg-yellow-500', label: 'NUNO' },
              rogerio: { ring: 'ring-cyan-400', badge: 'bg-cyan-500', label: 'ROGÉRIO' },
              yano:    { ring: 'ring-green-400', badge: 'bg-green-500', label: 'YANO' },
            };

            const fmtMin = (m) => {
              if (m === null) return '—';
              const h = Math.floor(m / 60); const min = m % 60;
              return h === 0 ? `${min}min` : `${h}h${min > 0 ? ` ${min}min` : ''}`;
            };

            return (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <h2 className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-3">
                  ⏱ Performance por Técnico (máquinas com timer)
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {stats.map(({ tech, total, totalMin, mediaMin }) => {
                    const c = COLORS[tech] || { ring: 'ring-slate-400', badge: 'bg-slate-400', label: tech };
                    const emCurso = machines.filter(m => m.tecnico === tech && m.timer_ativo && !m.timer_pausado).length;
                    const pausadas = machines.filter(m => m.tecnico === tech && m.timer_pausado).length;
                    return (
                      <div key={tech} className={`bg-white dark:bg-slate-800 rounded-xl p-4 ring-2 ${c.ring} shadow-sm space-y-2`}>
                        <div className={`inline-block text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${c.badge}`}>
                          {c.label}
                        </div>
                        <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <p className="text-lg font-black text-slate-800 dark:text-slate-100">{total} <span className="text-xs font-normal">concluídas</span></p>
                          <p>Média por máquina: <span className="font-bold text-slate-700 dark:text-slate-200">{fmtMin(mediaMin)}</span></p>
                          <p>Total acumulado: <span className="font-bold text-slate-700 dark:text-slate-200">{fmtMin(totalMin)}</span></p>
                          {emCurso > 0 && <p className="text-emerald-500 font-bold animate-pulse">● {emCurso} em curso</p>}
                          {pausadas > 0 && <p className="text-yellow-500 font-bold">⏸ {pausadas} pausada{pausadas > 1 ? 's' : ''}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Totais */}
          <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
            <span>Total no Watcher: <strong className="text-slate-700 dark:text-slate-200">{machines.length}</strong></span>
            <span>ACP2 rastreadas: <strong className="text-slate-700 dark:text-slate-200">{acp2Series.size}</strong></span>
          </div>
        </>
      )}
    </div>
  );
}
