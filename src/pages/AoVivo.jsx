import React, { useState, useEffect, useRef, useCallback } from "react";
import { Activity, Flag, CheckCircle2, ListOrdered, Sun, Moon, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

// ── Config ────────────────────────────────────────────────────────────────────
const BRIDGE_URL = "https://watcherweb.base44.app/api/functions/saganBridge";
const BRIDGE_HEADERS = {
  "Content-Type": "application/json",
  "x-sagan-secret": "sagan-watcher-bridge-2026",
  "api_key": "f8517554492e492090b62dd501ad7e14",
};
const SLIDE_DURATION = 30000; // 30 segundos

async function callBridge(payload) {
  const res = await fetch(BRIDGE_URL, { method: "POST", headers: BRIDGE_HEADERS, body: JSON.stringify(payload) });
  const data = await res.json();
  return data.result || [];
}

// ── Design ────────────────────────────────────────────────────────────────────
const DT = (dark) => ({
  bg:      dark ? '#06060d' : '#eef0f7',
  surface: dark ? '#0d0d1c' : '#ffffff',
  card:    dark ? '#111126' : '#f5f6fc',
  border:  dark ? 'rgba(255,45,120,0.13)' : 'rgba(77,100,200,0.13)',
  pink:    '#FF2D78',
  blue:    '#4D9FFF',
  green:   '#22C55E',
  yellow:  '#F59E0B',
  red:     '#EF4444',
  purple:  '#9B5CF6',
  text:    dark ? '#e4e6ff' : '#0b0c18',
  muted:   dark ? 'rgba(228,230,255,0.38)' : 'rgba(11,12,24,0.42)',
  sub:     dark ? 'rgba(228,230,255,0.18)' : 'rgba(11,12,24,0.2)',
});

function fmtHMS(s) {
  if (!s && s !== 0) return '00:00:00';
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}
function fmtDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('pt-PT', { day:'2-digit', month:'short' });
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

// ── RELÓGIO ───────────────────────────────────────────────────────────────────
function LiveClock({ D }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  return (
    <div style={{ textAlign:'right', lineHeight:1.2 }}>
      <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'18px', fontWeight:800, color:D.text, letterSpacing:'0.07em' }}>
        {now.toLocaleTimeString('pt-PT')}
      </div>
      <div style={{ fontFamily:'monospace', fontSize:'9px', color:D.muted, letterSpacing:'0.06em', textTransform:'uppercase' }}>
        {now.toLocaleDateString('pt-PT',{weekday:'long',day:'2-digit',month:'short'})}
      </div>
    </div>
  );
}

// ── CARD EM ANDAMENTO ─────────────────────────────────────────────────────────
function CardAndamento({ m, D, accent }) {
  const elapsed = useLiveTimer(m);
  const running = m.timer_status === 'running';
  const tasks   = m.tarefas || [];
  const done    = tasks.filter(t => t.concluida).length;
  const pct     = tasks.length > 0 ? Math.round((done/tasks.length)*100) : 0;
  const isPrio  = m.prioridade === true;

  return (
    <div style={{
      background: D.card,
      border: `1.5px solid ${isPrio ? D.yellow+'66' : accent+'33'}`,
      borderRadius: '14px',
      padding: '16px 18px',
      display: 'flex', flexDirection:'column', gap:'10px',
      boxShadow: isPrio ? `0 0 18px ${D.yellow}22` : `0 0 12px ${accent}11`,
    }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px' }}>
        <div style={{ minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap' }}>
            {isPrio && <Flag size={11} color={D.yellow} style={{ flexShrink:0 }}/>}
            <span style={{ fontFamily:"'Orbitron',monospace", fontSize:'15px', fontWeight:800, color:D.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.modelo || '—'}</span>
          </div>
          <div style={{ fontFamily:'monospace', fontSize:'9px', color:D.muted, marginTop:'2px', letterSpacing:'0.07em' }}>{m.serie}</div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'18px', fontWeight:900, color: running ? D.green : D.yellow, letterSpacing:'0.04em' }}>{fmtHMS(elapsed)}</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:'4px', marginTop:'2px' }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: running ? D.green : D.yellow, animation: running ? 'blink 1.2s ease-in-out infinite' : 'none' }}/>
            <span style={{ fontFamily:'monospace', fontSize:'8px', color:D.muted, letterSpacing:'0.1em' }}>{running ? 'EM CURSO' : 'PAUSADO'}</span>
          </div>
        </div>
      </div>

      {/* Tarefas */}
      {tasks.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
          {tasks.map((t,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <div style={{ width:'11px', height:'11px', borderRadius:'3px', border:`1.5px solid ${t.concluida ? D.green : D.sub}`, background: t.concluida ? D.green : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {t.concluida && <span style={{ color:'#000', fontSize:'7px', fontWeight:900 }}>✓</span>}
              </div>
              <span style={{ fontFamily:'monospace', fontSize:'10px', color: t.concluida ? D.muted : D.text, textDecoration: t.concluida ? 'line-through' : 'none' }}>{t.texto}</span>
            </div>
          ))}
          <div style={{ marginTop:'4px' }}>
            <div style={{ height:'3px', borderRadius:'2px', background:`${D.sub}`, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${D.pink},${D.blue})`, transition:'width 0.5s ease' }}/>
            </div>
            <div style={{ fontFamily:'monospace', fontSize:'8px', color:D.muted, marginTop:'2px', textAlign:'right' }}>{done}/{tasks.length} · {pct}%</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CARD PRIORITÁRIA ──────────────────────────────────────────────────────────
function CardPrio({ m, D }) {
  const elapsed = useLiveTimer(m);
  const running = m.timer_status === 'running';
  const tasks   = m.tarefas || [];
  const isActive = m.estado?.startsWith('em-preparacao');

  return (
    <div style={{
      background: D.card,
      border: `2px solid ${D.yellow}66`,
      borderRadius: '14px',
      padding: '16px 18px',
      display: 'flex', flexDirection:'column', gap:'10px',
      boxShadow: `0 0 22px ${D.yellow}22`,
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px' }}>
        <div style={{ minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <Flag size={13} color={D.yellow}/>
            <span style={{ fontFamily:"'Orbitron',monospace", fontSize:'15px', fontWeight:800, color:D.text }}>{m.modelo}</span>
          </div>
          <div style={{ fontFamily:'monospace', fontSize:'9px', color:D.muted, marginTop:'2px' }}>{m.serie}</div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          {isActive ? (
            <>
              <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'18px', fontWeight:900, color: running ? D.green : D.yellow }}>{fmtHMS(elapsed)}</div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:'4px', marginTop:'2px' }}>
                <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: running ? D.green : D.yellow, animation: running ? 'blink 1.2s ease-in-out infinite' : 'none' }}/>
                <span style={{ fontFamily:'monospace', fontSize:'8px', color:D.muted }}>{running ? 'EM CURSO' : 'PAUSADO'}</span>
              </div>
            </>
          ) : (
            <span style={{ fontFamily:'monospace', fontSize:'9px', padding:'3px 10px', borderRadius:'20px', background:`${D.yellow}18`, color:D.yellow, border:`1px solid ${D.yellow}44` }}>AGUARDA</span>
          )}
        </div>
      </div>

      {tasks.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
          {tasks.map((t,i) => (
            <span key={i} style={{ fontFamily:'monospace', fontSize:'9px', padding:'2px 8px', borderRadius:'20px', background: t.concluida ? `${D.green}15` : `${D.yellow}15`, color: t.concluida ? D.green : D.yellow, border:`1px solid ${t.concluida ? D.green : D.yellow}33`, textDecoration: t.concluida ? 'line-through' : 'none' }}>{t.texto}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── CARD FILA ─────────────────────────────────────────────────────────────────
function CardFila({ m, idx, accent, D }) {
  const tasks = m.tarefas || [];
  const isPrio = m.prioridade === true;
  return (
    <div style={{ background:D.card, border:`1.5px solid ${isPrio ? D.yellow+'44' : accent+'22'}`, borderRadius:'11px', padding:'12px 16px', display:'flex', alignItems:'center', gap:'14px' }}>
      <div style={{ width:'30px', height:'30px', borderRadius:'50%', border:`2px solid ${isPrio ? D.yellow : accent}`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Orbitron',monospace", fontSize:'12px', fontWeight:800, color: isPrio ? D.yellow : accent, flexShrink:0 }}>{idx+1}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:'8px', flexWrap:'wrap' }}>
          {isPrio && <Flag size={10} color={D.yellow}/>}
          <span style={{ fontFamily:"'Orbitron',monospace", fontSize:'13px', fontWeight:700, color:D.text }}>{m.modelo}</span>
          <span style={{ fontFamily:'monospace', fontSize:'9px', color:D.muted }}>{m.serie}</span>
        </div>
        {tasks.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:'4px', marginTop:'4px' }}>
            {tasks.map((t,i) => <span key={i} style={{ fontFamily:'monospace', fontSize:'8px', padding:'1px 7px', borderRadius:'20px', background:`${accent}13`, color:accent, border:`1px solid ${accent}25` }}>{t.texto}</span>)}
          </div>
        )}
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        {m.previsao_inicio ? (
          <>
            <div style={{ fontFamily:'monospace', fontSize:'11px', color:D.green, fontWeight:700 }}>{fmtDate(m.previsao_inicio)}</div>
            <div style={{ fontFamily:'monospace', fontSize:'8px', color:D.muted, marginTop:'1px' }}>→ {fmtDate(m.previsao_fim)}</div>
          </>
        ) : (
          <div style={{ fontFamily:'monospace', fontSize:'9px', color:D.muted }}>A agendar</div>
        )}
      </div>
    </div>
  );
}

// ── CARD CONCLUÍDA ────────────────────────────────────────────────────────────
function CardConcluida({ m, D }) {
  const dt = m.dataConclusao || m.updated_date;
  return (
    <div style={{ background:D.card, border:`1px solid ${D.green}22`, borderRadius:'10px', padding:'11px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px' }}>
      <div style={{ minWidth:0 }}>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'12px', fontWeight:700, color:D.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.modelo}</div>
        <div style={{ fontFamily:'monospace', fontSize:'9px', color:D.muted, marginTop:'2px' }}>{m.serie}</div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontFamily:'monospace', fontSize:'11px', color:D.green, fontWeight:700 }}>{fmtDate(dt)}</div>
        {m.timer_accumulated_seconds > 0 && <div style={{ fontFamily:'monospace', fontSize:'9px', color:D.muted, marginTop:'1px' }}>{fmtHMS(m.timer_accumulated_seconds)}</div>}
      </div>
    </div>
  );
}

// ── SLIDE WRAPPER ─────────────────────────────────────────────────────────────
function SlideWrap({ title, icon, color, pulse, D, count, children }) {
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'16px', overflow:'hidden', minHeight:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px', flexShrink:0 }}>
        <div style={{ color, filter:`drop-shadow(0 0 7px ${color})` }}>{icon}</div>
        <h2 style={{ fontFamily:"'Orbitron',monospace", fontSize:'17px', fontWeight:900, letterSpacing:'0.14em', color, textShadow:`0 0 16px ${color}66`, margin:0 }}>{title}</h2>
        {count !== undefined && <span style={{ fontFamily:"'Orbitron',monospace", fontSize:'22px', fontWeight:900, color, marginLeft:'4px' }}>{count}</span>}
        {pulse && <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:color, animation:'blink 1s ease-in-out infinite' }}/>}
        <div style={{ flex:1, height:'1px', background:`linear-gradient(90deg,${color}44,transparent)` }}/>
      </div>
      <div style={{ flex:1, overflowY:'auto', paddingRight:'4px' }}>{children}</div>
    </div>
  );
}

function Empty({ label, D }) {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'80px', color:D.muted, fontFamily:'monospace', fontSize:'12px', letterSpacing:'0.1em' }}>{label}</div>;
}

// ── SLIDES config ─────────────────────────────────────────────────────────────
const SLIDES = [
  { id:'andamento',  label:'EM ANDAMENTO' },
  { id:'prioritarias', label:'PRIORITÁRIAS' },
  { id:'fila_acp',   label:'FILA ACP'     },
  { id:'fila_nts',   label:'NTS'          },
  { id:'concluidas', label:'CONCLUÍDAS'   },
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

  const startRef   = useRef(Date.now());
  const timerRef   = useRef(null);
  const progRef    = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await callBridge({ action:'list', entity:'FrotaACP' });
      setMachines((data || []).filter(m => !m.arquivada));
    } catch(e) { console.warn(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); const id = setInterval(fetchData, 30000); return () => clearInterval(id); }, [fetchData]);

  const goTo = useCallback((idx) => {
    setSlide(idx);
    setProgress(0);
    startRef.current = Date.now();
  }, []);

  const next = useCallback(() => goTo((slide + 1) % SLIDES.length), [slide, goTo]);
  const prev = useCallback(() => goTo((slide - 1 + SLIDES.length) % SLIDES.length), [slide, goTo]);

  // Auto-advance
  useEffect(() => {
    if (paused) { clearTimeout(timerRef.current); clearInterval(progRef.current); return; }
    timerRef.current = setTimeout(next, SLIDE_DURATION - (Date.now() - startRef.current));
    progRef.current  = setInterval(() => setProgress(Math.min((Date.now() - startRef.current) / SLIDE_DURATION, 1)), 100);
    return () => { clearTimeout(timerRef.current); clearInterval(progRef.current); };
  }, [slide, paused, next]);

  // ── Filtros fiéis aos dados reais ──
  const notArchived = machines.filter(m => !m.arquivada);

  // Em andamento = qualquer estado em-preparacao
  const andamento = notArchived.filter(m => m.estado?.startsWith('em-preparacao'));

  // Prioritárias activas = prioridade=true E não concluída
  const prioritarias = notArchived.filter(m =>
    m.prioridade === true &&
    !m.estado?.startsWith('concluida') &&
    m.estado !== 'concluida'
  );

  // Fila ACP = a-fazer E tipo != nova
  const filaACP = notArchived.filter(m => m.estado === 'a-fazer' && m.tipo !== 'nova');

  // NTS = tipo nova, em andamento OU a-fazer
  const ntsAndamento = notArchived.filter(m => m.tipo === 'nova' && m.estado?.startsWith('em-preparacao'));
  const ntsAfazer    = notArchived.filter(m => m.tipo === 'nova' && m.estado === 'a-fazer');

  // Concluídas esta semana = desde segunda-feira
  const hoje = new Date();
  const segunda = new Date(hoje);
  segunda.setHours(0,0,0,0);
  segunda.setDate(hoje.getDate() - hoje.getDay() === 0 ? 6 : hoje.getDay() - 1);
  // Cálculo correcto da segunda
  const dow = hoje.getDay(); // 0=Dom,1=Seg,...
  const diasParaSegunda = dow === 0 ? 6 : dow - 1;
  segunda.setDate(hoje.getDate() - diasParaSegunda);
  segunda.setHours(0,0,0,0);

  const concluiSemana = notArchived.filter(m => {
    if (!m.estado?.startsWith('concluida') && m.estado !== 'concluida') return false;
    const raw = m.dataConclusao || m.updated_date;
    if (!raw) return false;
    return new Date(raw) >= segunda;
  });

  // Total concluídas = tudo com estado concluida
  const totalConcluidas = notArchived.filter(m => m.estado?.startsWith('concluida') || m.estado === 'concluida');

  // ── Slide content ──
  const slides = {
    andamento: (
      <SlideWrap title="EM ANDAMENTO" icon={<Activity size={19}/>} color={D.blue} D={D} count={andamento.length}>
        {andamento.length === 0 ? <Empty label="Nenhuma máquina em produção" D={D}/> :
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'14px' }}>
            {andamento.map(m => <CardAndamento key={m.id} m={m} D={D} accent={D.blue}/>)}
          </div>}
      </SlideWrap>
    ),
    prioritarias: (
      <SlideWrap title="PRIORITÁRIAS" icon={<Flag size={19}/>} color={D.yellow} D={D} count={prioritarias.length} pulse>
        {prioritarias.length === 0
          ? <Empty label="Sem máquinas prioritárias activas ✓" D={D}/>
          : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'14px' }}>
              {prioritarias.map(m => <CardPrio key={m.id} m={m} D={D}/>)}
            </div>}
      </SlideWrap>
    ),
    fila_acp: (
      <SlideWrap title="FILA — ACP" icon={<ListOrdered size={19}/>} color={D.blue} D={D} count={filaACP.length}>
        {filaACP.length === 0 ? <Empty label="Fila ACP vazia" D={D}/> :
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {filaACP.map((m,i) => <CardFila key={m.id} m={m} idx={i} accent={D.blue} D={D}/>)}
          </div>}
      </SlideWrap>
    ),
    fila_nts: (
      <SlideWrap title="NTS" icon={<ListOrdered size={19}/>} color={D.pink} D={D} count={ntsAndamento.length + ntsAfazer.length}>
        {(ntsAndamento.length + ntsAfazer.length) === 0
          ? <Empty label="Sem máquinas NTS" D={D}/>
          : <>
              {ntsAndamento.length > 0 && (
                <>
                  <div style={{ fontFamily:'monospace', fontSize:'9px', letterSpacing:'0.12em', color:D.green, marginBottom:'8px', marginTop:'2px' }}>▶ EM ANDAMENTO</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'10px', marginBottom:'18px' }}>
                    {ntsAndamento.map(m => <CardAndamento key={m.id} m={m} D={D} accent={D.pink}/>)}
                  </div>
                </>
              )}
              {ntsAfazer.length > 0 && (
                <>
                  <div style={{ fontFamily:'monospace', fontSize:'9px', letterSpacing:'0.12em', color:D.muted, marginBottom:'8px' }}>⏳ A FAZER</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                    {ntsAfazer.map((m,i) => <CardFila key={m.id} m={m} idx={i} accent={D.pink} D={D}/>)}
                  </div>
                </>
              )}
            </>}
      </SlideWrap>
    ),
    concluidas: (
      <SlideWrap title="CONCLUÍDAS — ESTA SEMANA" icon={<CheckCircle2 size={19}/>} color={D.green} D={D} count={concluiSemana.length}>
        {concluiSemana.length === 0
          ? <Empty label="Nenhuma conclusão esta semana ainda" D={D}/>
          : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:'9px' }}>
              {concluiSemana
                .sort((a,b) => new Date(b.dataConclusao||b.updated_date) - new Date(a.dataConclusao||a.updated_date))
                .map(m => <CardConcluida key={m.id} m={m} D={D}/>)}
            </div>}
      </SlideWrap>
    ),
  };

  return (
    <div style={{ minHeight:'100vh', height:'100vh', background:D.bg, color:D.text, display:'flex', flexDirection:'column', fontFamily:'system-ui,sans-serif', overflow:'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap');
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#ffffff18;border-radius:2px}
        *{box-sizing:border-box}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 22px', background:D.surface, borderBottom:`1px solid ${D.border}`, flexShrink:0, gap:'12px', flexWrap:'wrap' }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <img src="https://media.base44.com/images/public/69c166ad19149fb0c07883cb/a35751fd9_Gemini_Generated_Image_scmohbscmohbscmo1.png" alt="" style={{ width:'36px', height:'36px', objectFit:'contain', filter:`drop-shadow(0 0 7px ${D.pink}88)` }}/>
          <div>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'14px', fontWeight:900, letterSpacing:'0.14em', color:D.pink }}>WATCHER <span style={{ color:D.muted, fontSize:'9px', fontWeight:400, letterSpacing:'0.08em' }}>/ AO VIVO</span></div>
            <div style={{ fontFamily:'monospace', fontSize:'8px', color:D.muted, letterSpacing:'0.1em' }}>AUTO-REFRESH 30s · FONTE: WATCHER</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', flex:1, justifyContent:'center' }}>
          {SLIDES.map((s,i) => (
            <button key={s.id} onClick={() => goTo(i)} style={{
              fontFamily:'monospace', fontSize:'9px', letterSpacing:'0.07em',
              padding:'5px 13px', borderRadius:'20px', cursor:'pointer', border:'none',
              background: i===slide ? `linear-gradient(135deg,${D.pink},${D.blue})` : `${D.sub}`,
              color: i===slide ? '#fff' : D.muted,
              fontWeight: i===slide ? 700 : 400, transition:'all 0.2s',
            }}>{s.label}</button>
          ))}
        </div>

        {/* Direita */}
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <LiveClock D={D}/>
          <button onClick={prev} style={{ background:'transparent', border:`1px solid ${D.sub}`, borderRadius:'6px', padding:'4px 7px', cursor:'pointer', color:D.muted, display:'flex' }}><ChevronLeft size={14}/></button>
          <button onClick={() => setPaused(p=>!p)} style={{ background: paused ? `${D.yellow}18` : 'transparent', border:`1px solid ${paused ? D.yellow : D.sub}`, borderRadius:'6px', padding:'4px 8px', cursor:'pointer', color: paused ? D.yellow : D.muted, display:'flex', alignItems:'center', gap:'4px' }}>
            {paused ? <Play size={12}/> : <Pause size={12}/>}
            <span style={{ fontFamily:'monospace', fontSize:'8px', letterSpacing:'0.07em' }}>{paused ? 'RETOMAR' : 'PAUSAR'}</span>
          </button>
          <button onClick={next} style={{ background:'transparent', border:`1px solid ${D.sub}`, borderRadius:'6px', padding:'4px 7px', cursor:'pointer', color:D.muted, display:'flex' }}><ChevronRight size={14}/></button>
          <button onClick={() => { setDark(d=>!d); localStorage.setItem('theme', dark ? 'light' : 'dark'); }} style={{ background:'transparent', border:`1px solid ${D.sub}`, borderRadius:'6px', padding:'4px 7px', cursor:'pointer', color:D.muted, display:'flex' }}>
            {dark ? <Sun size={13}/> : <Moon size={13}/>}
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:D.green, animation:'blink 1.5s ease-in-out infinite' }}/>
            <span style={{ fontFamily:'monospace', fontSize:'8px', color:D.muted }}>LIVE</span>
          </div>
        </div>
      </div>

      {/* PROGRESS */}
      <div style={{ height:'2px', background:`${D.sub}`, flexShrink:0 }}>
        <div style={{ height:'100%', width:`${progress*100}%`, background:`linear-gradient(90deg,${D.pink},${D.blue})`, transition:'width 0.1s linear' }}/>
      </div>

      {/* KPI BAR */}
      <div style={{ display:'flex', gap:'1px', background:D.border, borderBottom:`1px solid ${D.border}`, flexShrink:0 }}>
        {[
          { label:'EM ANDAMENTO',  value: andamento.length,      color: D.blue  },
          { label:'PRIORITÁRIAS',  value: prioritarias.length,   color: D.yellow},
          { label:'FILA ACP',      value: filaACP.length,        color: D.muted },
          { label:'NTS ACTIVAS',   value: ntsAndamento.length + ntsAfazer.length, color: D.pink },
          { label:'ESTA SEMANA',   value: concluiSemana.length,  color: D.green },
          { label:'TOTAL 2026',    value: totalConcluidas.length, color: D.purple},
        ].map(k => (
          <div key={k.label} style={{ flex:1, background:D.surface, padding:'8px 10px', display:'flex', flexDirection:'column', alignItems:'center', gap:'2px' }}>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'20px', fontWeight:900, color:k.color }}>{loading ? '…' : k.value}</div>
            <div style={{ fontFamily:'monospace', fontSize:'7px', color:D.muted, letterSpacing:'0.09em', textAlign:'center' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ flex:1, padding:'20px 24px', display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
        {loading
          ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', flex:1 }}>
              <span style={{ fontFamily:"'Orbitron',monospace", fontSize:'13px', color:D.muted, animation:'blink 1s ease-in-out infinite' }}>A CARREGAR...</span>
            </div>
          : slides[SLIDES[slide].id]}
      </div>

      {/* FOOTER */}
      <div style={{ padding:'6px 22px', background:D.surface, borderTop:`1px solid ${D.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
        <div style={{ display:'flex', gap:'5px' }}>
          {SLIDES.map((_,i) => (
            <button key={i} onClick={() => goTo(i)} style={{ width: i===slide ? '20px' : '7px', height:'3px', borderRadius:'2px', background: i===slide ? `linear-gradient(90deg,${D.pink},${D.blue})` : `${D.sub}`, border:'none', cursor:'pointer', transition:'width 0.3s ease', padding:0 }}/>
          ))}
        </div>
        <div style={{ fontFamily:'monospace', fontSize:'8px', color:D.muted, letterSpacing:'0.08em' }}>
          ‹ › NAVEGAR · ESPAÇO PAUSAR · {slide+1}/{SLIDES.length}
        </div>
        <div style={{ fontFamily:'monospace', fontSize:'8px', color:D.muted }}>STILL OFICINA · PORTAL DA FROTA ACP</div>
      </div>
    </div>
  );
}
