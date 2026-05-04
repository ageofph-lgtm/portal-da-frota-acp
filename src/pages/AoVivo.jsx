import React, { useState, useEffect, useRef, useCallback } from "react";
import { Activity, AlertTriangle, CheckCircle2, ListOrdered, Sun, Moon } from "lucide-react";

// ── Config ───────────────────────────────────────────────────────────────────
const BRIDGE_URL = "https://watcherweb.base44.app/api/functions/saganBridge";
const BRIDGE_HEADERS = {
  "Content-Type": "application/json",
  "x-sagan-secret": "sagan-watcher-bridge-2026",
  "api_key": "f8517554492e492090b62dd501ad7e14",
};

async function callBridge(payload) {
  const res = await fetch(BRIDGE_URL, { method: "POST", headers: BRIDGE_HEADERS, body: JSON.stringify(payload) });
  const data = await res.json();
  return data.result || [];
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const DT = (dark) => ({
  bg:      dark ? '#06060d' : '#eef0f7',
  surface: dark ? '#0d0d1c' : '#ffffff',
  card:    dark ? '#101022' : '#f5f6fc',
  border:  dark ? 'rgba(255,45,120,0.15)' : 'rgba(77,100,200,0.15)',
  pink:    '#FF2D78',
  blue:    '#4D9FFF',
  green:   '#22C55E',
  yellow:  '#F59E0B',
  red:     '#EF4444',
  purple:  '#9B5CF6',
  text:    dark ? '#e4e6ff' : '#0b0c18',
  muted:   dark ? 'rgba(228,230,255,0.4)' : 'rgba(11,12,24,0.45)',
  glow:    (c) => `0 0 16px ${c}88`,
});

const TECH_COLORS = { raphael:'#ef4444', nuno:'#f59e0b', rogerio:'#06b6d4', yano:'#22c55e', patrick:'#a855f7' };
const tc = (t) => TECH_COLORS[(t||'').toLowerCase()] || '#6b7280';
const tl = (t) => t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : '—';

function fmtHMS(s) {
  if (!s) return '00:00:00';
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-PT', { day:'2-digit', month:'short' });
}

// ── Timer ao vivo ─────────────────────────────────────────────────────────────
function useLiveTimer(m) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const acc = m.timer_accumulated_seconds || 0;
    const running = m.timer_status === 'running';
    const startedAt = m.timer_started_at ? new Date(m.timer_started_at).getTime() : null;
    if (running && startedAt) {
      const upd = () => setElapsed(acc + Math.floor((Date.now() - startedAt) / 1000));
      upd(); const id = setInterval(upd, 1000); return () => clearInterval(id);
    } else { setElapsed(acc); }
  }, [m.timer_status, m.timer_started_at, m.timer_accumulated_seconds]);
  return elapsed;
}

// ── Slide wrapper ─────────────────────────────────────────────────────────────
function SlideWrap({ title, icon, color, pulse, D, children }) {
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'20px', overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
        <div style={{ color, filter:`drop-shadow(0 0 8px ${color})` }}>{icon}</div>
        <h2 style={{ fontFamily:"'Orbitron',monospace", fontSize:'20px', fontWeight:900, letterSpacing:'0.15em', color, textShadow:`0 0 18px ${color}88`, margin:0 }}>{title}</h2>
        {pulse && <div style={{ width:'9px', height:'9px', borderRadius:'50%', background:color, boxShadow:`0 0 10px ${color}`, animation:'dot-blink 1s ease-in-out infinite' }} />}
        <div style={{ flex:1, height:'1px', background:`linear-gradient(90deg,${color}55,transparent)` }} />
      </div>
      <div style={{ flex:1, overflowY:'auto', paddingRight:'4px' }}>{children}</div>
    </div>
  );
}

function Empty({ label, D }) {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100px', color:D.muted, fontFamily:'monospace', fontSize:'13px', letterSpacing:'0.1em' }}>{label}</div>;
}

// ── Card: EM ANDAMENTO ────────────────────────────────────────────────────────
function CardAndamento({ m, D }) {
  const elapsed = useLiveTimer(m);
  const running = m.timer_status === 'running';
  const tasks = m.tarefas || [];
  const done = tasks.filter(t => t.concluida).length;
  const pct = tasks.length > 0 ? Math.round((done/tasks.length)*100) : 0;
  const color = tc(m.tecnico);

  return (
    <div style={{ background:D.card, border:`1.5px solid ${color}44`, borderRadius:'16px', padding:'20px 22px', boxShadow:`0 0 20px ${color}18`, display:'flex', flexDirection:'column', gap:'12px' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'17px', fontWeight:800, color:D.text, letterSpacing:'0.05em' }}>{m.modelo || '—'}</div>
          <div style={{ fontFamily:'monospace', fontSize:'10px', color:D.muted, marginTop:'2px', letterSpacing:'0.08em' }}>{m.serie}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:'monospace', fontSize:'20px', fontWeight:700, color: running ? D.green : D.yellow, textShadow: running ? D.glow(D.green) : 'none', letterSpacing:'0.04em' }}>{fmtHMS(elapsed)}</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:'4px', marginTop:'2px' }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: running ? D.green : D.yellow, animation: running ? 'dot-blink 1.2s ease-in-out infinite' : 'none' }} />
            <span style={{ fontFamily:'monospace', fontSize:'8px', color:D.muted, letterSpacing:'0.1em' }}>{running ? 'RUNNING' : 'PAUSED'}</span>
          </div>
        </div>
      </div>
      {/* Técnico + tipo */}
      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
        <div style={{ width:'26px', height:'26px', borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'monospace', fontSize:'11px', fontWeight:700, color:'#fff' }}>{(m.tecnico||'?')[0].toUpperCase()}</div>
        <span style={{ fontFamily:'monospace', fontSize:'11px', color:D.text, letterSpacing:'0.07em' }}>{tl(m.tecnico)}</span>
        {m.tipo && <span style={{ marginLeft:'auto', fontFamily:'monospace', fontSize:'8px', padding:'2px 7px', borderRadius:'20px', background:`${D.blue}18`, color:D.blue, border:`1px solid ${D.blue}33`, textTransform:'uppercase', letterSpacing:'0.1em' }}>{m.tipo}</span>}
      </div>
      {/* Tarefas */}
      {tasks.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
          {tasks.map((t,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'7px' }}>
              <div style={{ width:'13px', height:'13px', borderRadius:'3px', border:`1.5px solid ${t.concluida ? D.green : D.muted}`, background: t.concluida ? D.green : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {t.concluida && <span style={{ color:'#000', fontSize:'8px', fontWeight:800 }}>✓</span>}
              </div>
              <span style={{ fontFamily:'monospace', fontSize:'11px', color: t.concluida ? D.muted : D.text, textDecoration: t.concluida ? 'line-through' : 'none' }}>{t.texto}</span>
            </div>
          ))}
          <div style={{ marginTop:'3px' }}>
            <div style={{ height:'3px', borderRadius:'2px', background:`${D.muted}28`, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${D.pink},${D.blue})`, transition:'width 0.5s ease' }} />
            </div>
            <div style={{ fontFamily:'monospace', fontSize:'8px', color:D.muted, marginTop:'2px', textAlign:'right' }}>{done}/{tasks.length} TAREFAS · {pct}%</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Card: URGÊNCIA ────────────────────────────────────────────────────────────
function CardUrgencia({ m, D }) {
  const elapsed = useLiveTimer(m);
  const tasks = m.tarefas || [];
  return (
    <div style={{ background:D.card, border:`2px solid ${D.red}`, borderRadius:'16px', padding:'20px 22px', animation:'urgencia-pulse 2s ease-in-out infinite', display:'flex', flexDirection:'column', gap:'12px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
            <AlertTriangle size={15} color={D.red} />
            <span style={{ fontFamily:"'Orbitron',monospace", fontSize:'17px', fontWeight:800, color:D.red }}>{m.modelo}</span>
          </div>
          <div style={{ fontFamily:'monospace', fontSize:'10px', color:D.muted, marginTop:'2px' }}>{m.serie}</div>
        </div>
        <div style={{ fontFamily:'monospace', fontSize:'18px', color:D.red, fontWeight:700 }}>{fmtHMS(elapsed)}</div>
      </div>
      {tasks.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
          {tasks.map((t,i) => <span key={i} style={{ fontFamily:'monospace', fontSize:'10px', padding:'2px 9px', borderRadius:'20px', background:`${D.red}18`, color:D.red, border:`1px solid ${D.red}33` }}>{t.texto}</span>)}
        </div>
      )}
      <div style={{ fontFamily:'monospace', fontSize:'9px', color:D.muted }}>Entrada: {fmtDate(m.dataAtribuicao || m.created_date)}</div>
    </div>
  );
}

// ── Card: FILA ────────────────────────────────────────────────────────────────
function CardFila({ m, idx, color, D }) {
  const tasks = m.tarefas || [];
  return (
    <div style={{ background:D.card, border:`1.5px solid ${color}28`, borderRadius:'13px', padding:'14px 18px', display:'flex', alignItems:'center', gap:'14px' }}>
      <div style={{ width:'34px', height:'34px', borderRadius:'50%', border:`2px solid ${color}`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Orbitron',monospace", fontSize:'13px', fontWeight:800, color, flexShrink:0 }}>{idx+1}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:'9px', flexWrap:'wrap' }}>
          <span style={{ fontFamily:"'Orbitron',monospace", fontSize:'14px', fontWeight:700, color:D.text }}>{m.modelo}</span>
          <span style={{ fontFamily:'monospace', fontSize:'10px', color:D.muted }}>{m.serie}</span>
        </div>
        {tasks.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:'4px', marginTop:'5px' }}>
            {tasks.map((t,i) => <span key={i} style={{ fontFamily:'monospace', fontSize:'9px', padding:'2px 7px', borderRadius:'20px', background:`${color}14`, color, border:`1px solid ${color}28` }}>{t.texto}</span>)}
          </div>
        )}
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        {m.previsao_inicio ? (
          <>
            <div style={{ fontFamily:'monospace', fontSize:'12px', color:D.green, fontWeight:700 }}>{fmtDate(m.previsao_inicio)}</div>
            <div style={{ fontFamily:'monospace', fontSize:'8px', color:D.muted, marginTop:'2px' }}>até {fmtDate(m.previsao_fim)}</div>
          </>
        ) : (
          <div style={{ fontFamily:'monospace', fontSize:'10px', color:D.muted }}>A agendar</div>
        )}
      </div>
    </div>
  );
}

// ── Card: CONCLUÍDA ───────────────────────────────────────────────────────────
function CardConcluida({ m, D }) {
  return (
    <div style={{ background:D.card, border:`1px solid ${D.green}28`, borderRadius:'10px', padding:'10px 14px' }}>
      <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'12px', fontWeight:700, color:D.text }}>{m.modelo}</div>
      <div style={{ fontFamily:'monospace', fontSize:'9px', color:D.muted, marginTop:'2px' }}>{m.serie}</div>
      {(m.timer_accumulated_seconds > 0) && <div style={{ fontFamily:'monospace', fontSize:'9px', color:D.green, marginTop:'4px' }}>{fmtHMS(m.timer_accumulated_seconds)}</div>}
    </div>
  );
}

// ── Relógio ───────────────────────────────────────────────────────────────────
function LiveClock({ D }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  return (
    <div style={{ textAlign:'right' }}>
      <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'15px', fontWeight:700, color:D.text, letterSpacing:'0.08em' }}>{now.toLocaleTimeString('pt-PT')}</div>
      <div style={{ fontFamily:'monospace', fontSize:'8px', color:D.muted, letterSpacing:'0.06em', textTransform:'uppercase' }}>{now.toLocaleDateString('pt-PT',{weekday:'short',day:'2-digit',month:'short'})}</div>
    </div>
  );
}

// ── SLIDES ────────────────────────────────────────────────────────────────────
const SLIDES = [
  { id:'andamento',  label:'EM ANDAMENTO', duration:10000 },
  { id:'urgencias',  label:'URGÊNCIAS',    duration:8000  },
  { id:'fila_acp',   label:'FILA ACP',     duration:10000 },
  { id:'fila_nts',   label:'FILA NTS',     duration:10000 },
  { id:'concluidas', label:'CONCLUÍDAS',   duration:10000 },
];

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function AoVivo() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('theme') !== 'light'; } catch { return true; }
  });
  const D = DT(dark);

  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  const timerRef = useRef(null);
  const progRef = useRef(null);
  const startRef = useRef(Date.now());
  const pausedAtRef = useRef(null);

  // Fetch via bridge (mesma fonte da Produção)
  const fetchData = useCallback(async () => {
    try {
      const data = await callBridge({ action:'list', entity:'FrotaACP' });
      setMachines((data || []).filter(m => !m.arquivada));
    } catch(e) { console.warn('AoVivo fetch:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); const id = setInterval(fetchData, 30000); return () => clearInterval(id); }, [fetchData]);

  // Carrossel
  const advance = useCallback(() => {
    setSlide(s => (s+1) % SLIDES.length);
    setProgress(0);
    startRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (paused) {
      clearTimeout(timerRef.current); clearInterval(progRef.current);
      pausedAtRef.current = Date.now(); return;
    }
    if (pausedAtRef.current) { startRef.current += Date.now() - pausedAtRef.current; pausedAtRef.current = null; }
    const dur = SLIDES[slide].duration;
    const remaining = dur - (Date.now() - startRef.current);
    timerRef.current = setTimeout(advance, Math.max(remaining, 0));
    progRef.current = setInterval(() => setProgress(Math.min((Date.now() - startRef.current) / dur, 1)), 50);
    return () => { clearTimeout(timerRef.current); clearInterval(progRef.current); };
  }, [slide, paused, advance]);

  // Filtros — espelham exatamente o que está na aba Produção
  const andamento  = machines.filter(m => m.estado?.startsWith('em-preparacao'));
  const urgentes   = machines.filter(m => m.prioridade === true);
  const aFazer     = machines.filter(m => m.estado === 'a-fazer');
  const filaACP    = aFazer.filter(m => m.tipo !== 'nova');
  const filaNTS    = aFazer.filter(m => m.tipo === 'nova');
  const concluidas = machines.filter(m => m.estado?.startsWith('concluida') || m.estado === 'concluida');
  const weekAgo    = Date.now() - 7*24*3600*1000;
  const semana     = concluidas.filter(m => new Date(m.dataConclusao || m.updated_date).getTime() > weekAgo);

  const slideContent = {
    andamento: (
      <SlideWrap title="EM ANDAMENTO" icon={<Activity size={20}/>} color={D.blue} D={D}>
        {andamento.length === 0 ? <Empty label="Nenhuma máquina em produção" D={D}/> :
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(290px,1fr))', gap:'16px' }}>
            {andamento.map(m => <CardAndamento key={m.id} m={m} D={D}/>)}
          </div>}
      </SlideWrap>
    ),
    urgencias: (
      <SlideWrap title="URGÊNCIAS" icon={<AlertTriangle size={20}/>} color={D.red} D={D} pulse>
        {urgentes.length === 0 ? <Empty label="Sem urgências activas ✓" D={D}/> :
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(290px,1fr))', gap:'16px' }}>
            {urgentes.map(m => <CardUrgencia key={m.id} m={m} D={D}/>)}
          </div>}
      </SlideWrap>
    ),
    fila_acp: (
      <SlideWrap title="PRÓXIMAS — ACP" icon={<ListOrdered size={20}/>} color={D.blue} D={D}>
        {filaACP.length === 0 ? <Empty label="Fila ACP vazia" D={D}/> :
          <div style={{ display:'flex', flexDirection:'column', gap:'9px' }}>
            {filaACP.map((m,i) => <CardFila key={m.id} m={m} idx={i} color={D.blue} D={D}/>)}
          </div>}
      </SlideWrap>
    ),
    fila_nts: (
      <SlideWrap title="PRÓXIMAS — NTS" icon={<ListOrdered size={20}/>} color={D.pink} D={D}>
        {filaNTS.length === 0 ? <Empty label="Fila NTS vazia" D={D}/> :
          <div style={{ display:'flex', flexDirection:'column', gap:'9px' }}>
            {filaNTS.map((m,i) => <CardFila key={m.id} m={m} idx={i} color={D.pink} D={D}/>)}
          </div>}
      </SlideWrap>
    ),
    concluidas: (
      <SlideWrap title="CONCLUÍDAS — ESTA SEMANA" icon={<CheckCircle2 size={20}/>} color={D.green} D={D}>
        {semana.length === 0 ? <Empty label="Sem conclusões esta semana" D={D}/> : (() => {
          const byTech = {};
          semana.forEach(m => { const t = m.tecnico||'outros'; if (!byTech[t]) byTech[t]=[]; byTech[t].push(m); });
          return (
            <div>
              {Object.entries(byTech).sort((a,b)=>b[1].length-a[1].length).map(([tec,macs]) => (
                <div key={tec} style={{ marginBottom:'18px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'9px' }}>
                    <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:tc(tec), display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'monospace', fontSize:'12px', fontWeight:700, color:'#fff' }}>{tec[0].toUpperCase()}</div>
                    <span style={{ fontFamily:'monospace', fontSize:'12px', color:D.text, fontWeight:700, letterSpacing:'0.07em' }}>{tl(tec)}</span>
                    <span style={{ marginLeft:'auto', fontFamily:"'Orbitron',monospace", fontSize:'18px', fontWeight:900, color:D.green }}>{macs.length}</span>
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'7px' }}>
                    {macs.map(m => <CardConcluida key={m.id} m={m} D={D}/>)}
                  </div>
                </div>
              ))}
              <div style={{ textAlign:'right', fontFamily:"'Orbitron',monospace", fontSize:'12px', color:D.muted }}>
                TOTAL: <span style={{ color:D.green, fontWeight:800 }}>{semana.length}</span> MÁQUINAS
              </div>
            </div>
          );
        })()}
      </SlideWrap>
    ),
  };

  return (
    <div style={{ minHeight:'100vh', background:D.bg, color:D.text, display:'flex', flexDirection:'column', fontFamily:'system-ui,sans-serif', userSelect:'none' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        @keyframes dot-blink{0%,100%{opacity:1}50%{opacity:0.15}}
        @keyframes urgencia-pulse{0%,100%{box-shadow:0 0 28px #EF444433}50%{box-shadow:0 0 48px #EF444477}}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#ffffff18;border-radius:2px}
        *{box-sizing:border-box}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 24px', background:D.surface, borderBottom:`1px solid ${D.border}`, flexWrap:'wrap', gap:'10px', position:'sticky', top:0, zIndex:20 }}>
        {/* Logo + título */}
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <img src="https://media.base44.com/images/public/69c166ad19149fb0c07883cb/a35751fd9_Gemini_Generated_Image_scmohbscmohbscmo1.png"
            alt="WATCHER" style={{ width:'40px', height:'40px', objectFit:'contain', filter:`drop-shadow(0 0 8px ${D.pink}88)` }}/>
          <div>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'16px', fontWeight:900, letterSpacing:'0.15em', color:D.pink }}>
              WATCHER <span style={{ color:D.muted, fontSize:'10px', fontWeight:400 }}>/ AO VIVO</span>
            </div>
            <div style={{ fontFamily:'monospace', fontSize:'8px', color:D.muted, letterSpacing:'0.12em' }}>MONITOR · AUTO-REFRESH 30s · FONTE: WATCHER</div>
          </div>
        </div>

        {/* Slide tabs */}
        <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
          {SLIDES.map((s,i) => (
            <button key={s.id} onClick={() => { setSlide(i); setProgress(0); startRef.current = Date.now(); }} style={{
              fontFamily:'monospace', fontSize:'9px', letterSpacing:'0.08em',
              padding:'5px 12px', borderRadius:'20px', cursor:'pointer', border:'none',
              background: i===slide ? `linear-gradient(135deg,${D.pink},${D.blue})` : `${D.muted}18`,
              color: i===slide ? '#fff' : D.muted,
              fontWeight: i===slide ? 700 : 400, transition:'all 0.2s',
            }}>{s.label}</button>
          ))}
        </div>

        {/* Controlos direita */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <LiveClock D={D}/>
          <button onClick={() => setPaused(p=>!p)} style={{ background: paused ? `${D.yellow}18` : 'transparent', border:`1px solid ${paused ? D.yellow : D.muted+'44'}`, borderRadius:'7px', padding:'5px 10px', cursor:'pointer', fontFamily:'monospace', fontSize:'9px', color: paused ? D.yellow : D.muted, letterSpacing:'0.08em' }}>{paused ? '▶ RETOMAR' : '⏸ PAUSAR'}</button>
          <button onClick={() => { setDark(d => !d); localStorage.setItem('theme', dark ? 'light' : 'dark'); }} style={{ background:'transparent', border:`1px solid ${D.muted}44`, borderRadius:'7px', padding:'5px 8px', cursor:'pointer', color:D.muted }}>{dark ? <Sun size={13}/> : <Moon size={13}/>}</button>
          <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
            <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:D.green, animation:'dot-blink 1.5s ease-in-out infinite' }}/>
            <span style={{ fontFamily:'monospace', fontSize:'8px', color:D.muted }}>LIVE</span>
          </div>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div style={{ height:'2px', background:`${D.muted}18` }}>
        <div style={{ height:'100%', width:`${progress*100}%`, background:`linear-gradient(90deg,${D.pink},${D.blue})`, transition:'width 0.05s linear' }}/>
      </div>

      {/* KPI BAR */}
      <div style={{ display:'flex', gap:'1px', background:D.border, borderBottom:`1px solid ${D.border}` }}>
        {[
          { label:'EM PRODUÇÃO', value:andamento.length, color:D.blue },
          { label:'URGÊNCIAS',   value:urgentes.length,  color:D.red  },
          { label:'NA FILA',     value:aFazer.length,    color:D.yellow },
          { label:'ESTA SEMANA', value:semana.length,    color:D.green },
          { label:'TOTAL 2026',  value:concluidas.length, color:D.pink },
        ].map(k => (
          <div key={k.label} style={{ flex:1, background:D.surface, padding:'9px 12px', display:'flex', flexDirection:'column', alignItems:'center', gap:'2px' }}>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'22px', fontWeight:900, color:k.color, textShadow: dark ? `0 0 14px ${k.color}55` : 'none' }}>{loading ? '…' : k.value}</div>
            <div style={{ fontFamily:'monospace', fontSize:'8px', color:D.muted, letterSpacing:'0.1em' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* SLIDE CONTENT */}
      <div style={{ flex:1, padding:'24px 28px', display:'flex', flexDirection:'column', overflow:'hidden' }} onClick={() => setPaused(p=>!p)}>
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', flex:1 }}>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'14px', color:D.muted, animation:'dot-blink 1s ease-in-out infinite' }}>A CARREGAR DADOS DO WATCHER...</div>
          </div>
        ) : slideContent[SLIDES[slide].id]}
      </div>

      {/* FOOTER */}
      <div style={{ padding:'7px 24px', background:D.surface, borderTop:`1px solid ${D.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', gap:'5px' }}>
          {SLIDES.map((_,i) => <div key={i} style={{ width: i===slide ? '22px' : '7px', height:'3px', borderRadius:'2px', background: i===slide ? `linear-gradient(90deg,${D.pink},${D.blue})` : `${D.muted}33`, transition:'width 0.3s ease' }}/>)}
        </div>
        <div style={{ fontFamily:'monospace', fontSize:'8px', color:D.muted, letterSpacing:'0.1em' }}>
          {SLIDES[slide].label} · {slide+1}/{SLIDES.length} · CLIQUE PARA {paused ? 'RETOMAR' : 'PAUSAR'}
        </div>
        <div style={{ fontFamily:'monospace', fontSize:'8px', color:D.muted }}>STILL OFICINA · PORTAL DA FROTA ACP</div>
      </div>
    </div>
  );
}
