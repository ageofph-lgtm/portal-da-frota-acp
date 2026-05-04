import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Activity, Flag, CheckCircle2, ListOrdered, Sun, Moon,
  ChevronLeft, ChevronRight, Pause, Play, Wrench
} from "lucide-react";

// ── Config ────────────────────────────────────────────────────────────────────
const BRIDGE_URL = "https://watcherweb.base44.app/api/functions/saganBridge";
const BRIDGE_HEADERS = {
  "Content-Type": "application/json",
  "x-sagan-secret": "sagan-watcher-bridge-2026",
  "api_key": "f8517554492e492090b62dd501ad7e14",
};
const SLIDE_DURATION = 30000;

async function callBridge(payload) {
  const res = await fetch(BRIDGE_URL, { method:"POST", headers:BRIDGE_HEADERS, body:JSON.stringify(payload) });
  const data = await res.json();
  return data.result || [];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtHMS(s) {
  if (!s && s !== 0) return "00:00:00";
  const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}
function fmtDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("pt-PT",{day:"2-digit",month:"short"});
}
function fmtDay(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("pt-PT",{weekday:"short",day:"2-digit",month:"2-digit"});
}

// Segunda-feira desta semana (meia-noite UTC)
function getMondayUTC() {
  const now = new Date();
  const dow = now.getUTCDay(); // 0=Dom
  const daysBack = dow === 0 ? 6 : dow - 1;
  const mon = new Date(now);
  mon.setUTCDate(now.getUTCDate() - daysBack);
  mon.setUTCHours(0,0,0,0);
  return mon;
}

// Próxima sexta-feira (fim da semana útil)
function getFridayUTC() {
  const mon = getMondayUTC();
  const fri = new Date(mon);
  fri.setUTCDate(mon.getUTCDate() + 4);
  fri.setUTCHours(23,59,59,999);
  return fri;
}

// ── Design ────────────────────────────────────────────────────────────────────
const DT = (dark) => ({
  bg:      dark ? "#06060d" : "#eef0f7",
  surface: dark ? "#0d0d1c" : "#ffffff",
  card:    dark ? "#111126" : "#f5f6fc",
  border:  dark ? "rgba(255,45,120,0.12)" : "rgba(77,100,200,0.12)",
  pink:    "#FF2D78",
  blue:    "#4D9FFF",
  green:   "#22C55E",
  yellow:  "#F59E0B",
  red:     "#EF4444",
  purple:  "#9B5CF6",
  bronze:  "#CD7F32",
  silver:  "#C0C0C0",
  text:    dark ? "#e4e6ff" : "#0b0c18",
  muted:   dark ? "rgba(228,230,255,0.38)" : "rgba(11,12,24,0.42)",
  sub:     dark ? "rgba(228,230,255,0.12)" : "rgba(11,12,24,0.12)",
});

// ── Timer ao vivo ─────────────────────────────────────────────────────────────
function useLiveTimer(m) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const acc = m.timer_accumulated_seconds || 0;
    const running = m.timer_status === "running";
    const startedAt = m.timer_started_at ? new Date(m.timer_started_at).getTime() : null;
    if (running && startedAt) {
      const upd = () => setElapsed(acc + Math.floor((Date.now()-startedAt)/1000));
      upd(); const id = setInterval(upd,1000); return () => clearInterval(id);
    } else { setElapsed(acc); }
  }, [m.timer_status, m.timer_started_at, m.timer_accumulated_seconds]);
  return elapsed;
}

// ── Relógio ───────────────────────────────────────────────────────────────────
function LiveClock({ D }) {
  const [now,setNow] = useState(new Date());
  useEffect(() => { const id=setInterval(()=>setNow(new Date()),1000); return ()=>clearInterval(id); },[]);
  return (
    <div style={{textAlign:"right",lineHeight:1.2}}>
      <div style={{fontFamily:"'Orbitron',monospace",fontSize:"16px",fontWeight:800,color:D.text,letterSpacing:"0.06em"}}>{now.toLocaleTimeString("pt-PT")}</div>
      <div style={{fontFamily:"monospace",fontSize:"8px",color:D.muted,letterSpacing:"0.05em",textTransform:"uppercase"}}>{now.toLocaleDateString("pt-PT",{weekday:"long",day:"2-digit",month:"short"})}</div>
    </div>
  );
}

// ── CARD EM ANDAMENTO ─────────────────────────────────────────────────────────
function CardAndamento({ m, D, accent }) {
  const elapsed = useLiveTimer(m);
  const running = m.timer_status === "running";
  const tasks   = m.tarefas || [];
  const done    = tasks.filter(t=>t.concluida).length;
  const pct     = tasks.length > 0 ? Math.round((done/tasks.length)*100) : 0;
  const isPrio  = m.prioridade === true;
  const recon   = m.recondicao || {};
  const reconLabel = recon.prata ? "PRATA" : recon.bronze ? "BRONZE" : null;
  const reconColor = recon.prata ? D.silver : recon.bronze ? D.bronze : null;

  return (
    <div style={{background:D.card,border:`1.5px solid ${isPrio ? D.yellow+"55" : accent+"33"}`,borderRadius:"12px",padding:"14px 16px",display:"flex",flexDirection:"column",gap:"9px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"8px"}}>
        <div style={{minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:"5px",flexWrap:"wrap"}}>
            {isPrio && <Flag size={10} color={D.yellow}/>}
            {reconLabel && <span style={{fontFamily:"monospace",fontSize:"8px",padding:"1px 6px",borderRadius:"20px",background:`${reconColor}22`,color:reconColor,border:`1px solid ${reconColor}55`,fontWeight:700}}>{reconLabel}</span>}
            <span style={{fontFamily:"'Orbitron',monospace",fontSize:"14px",fontWeight:800,color:D.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.modelo||"—"}</span>
          </div>
          <div style={{fontFamily:"monospace",fontSize:"9px",color:D.muted,marginTop:"2px"}}>{m.serie}</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:"16px",fontWeight:900,color:running?D.green:D.yellow}}>{fmtHMS(elapsed)}</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:"4px",marginTop:"2px"}}>
            <div style={{width:"5px",height:"5px",borderRadius:"50%",background:running?D.green:D.yellow,animation:running?"blink 1.2s ease-in-out infinite":"none"}}/>
            <span style={{fontFamily:"monospace",fontSize:"7px",color:D.muted}}>{running?"EM CURSO":"PAUSADO"}</span>
          </div>
        </div>
      </div>
      {tasks.length > 0 && (
        <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
          {tasks.map((t,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:"5px"}}>
              <div style={{width:"10px",height:"10px",borderRadius:"2px",border:`1.5px solid ${t.concluida?D.green:D.sub}`,background:t.concluida?D.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {t.concluida && <span style={{color:"#000",fontSize:"7px",fontWeight:900}}>✓</span>}
              </div>
              <span style={{fontFamily:"monospace",fontSize:"9px",color:t.concluida?D.muted:D.text,textDecoration:t.concluida?"line-through":"none"}}>{t.texto}</span>
            </div>
          ))}
          <div style={{marginTop:"3px"}}>
            <div style={{height:"2px",borderRadius:"2px",background:D.sub,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${D.pink},${D.blue})`,transition:"width 0.5s ease"}}/>
            </div>
            <div style={{fontFamily:"monospace",fontSize:"7px",color:D.muted,marginTop:"2px",textAlign:"right"}}>{done}/{tasks.length} · {pct}%</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CARD PRIORITÁRIA ──────────────────────────────────────────────────────────
function CardPrio({ m, D }) {
  const elapsed = useLiveTimer(m);
  const running = m.timer_status === "running";
  const tasks   = m.tarefas || [];
  const isActive = m.estado?.startsWith("em-preparacao");
  return (
    <div style={{background:D.card,border:`2px solid ${D.yellow}55`,borderRadius:"12px",padding:"14px 16px",display:"flex",flexDirection:"column",gap:"9px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"8px"}}>
        <div style={{minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
            <Flag size={11} color={D.yellow}/>
            <span style={{fontFamily:"'Orbitron',monospace",fontSize:"14px",fontWeight:800,color:D.text}}>{m.modelo}</span>
          </div>
          <div style={{fontFamily:"monospace",fontSize:"9px",color:D.muted,marginTop:"2px"}}>{m.serie}</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          {isActive
            ? <><div style={{fontFamily:"'Orbitron',monospace",fontSize:"16px",fontWeight:900,color:running?D.green:D.yellow}}>{fmtHMS(elapsed)}</div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:"4px",marginTop:"2px"}}>
                  <div style={{width:"5px",height:"5px",borderRadius:"50%",background:running?D.green:D.yellow,animation:running?"blink 1.2s ease-in-out infinite":"none"}}/>
                  <span style={{fontFamily:"monospace",fontSize:"7px",color:D.muted}}>{running?"EM CURSO":"PAUSADO"}</span>
                </div></>
            : <span style={{fontFamily:"monospace",fontSize:"8px",padding:"3px 9px",borderRadius:"20px",background:`${D.yellow}18`,color:D.yellow,border:`1px solid ${D.yellow}44`}}>AGUARDA</span>}
        </div>
      </div>
      {tasks.length>0 && (
        <div style={{display:"flex",flexWrap:"wrap",gap:"4px"}}>
          {tasks.map((t,i)=><span key={i} style={{fontFamily:"monospace",fontSize:"8px",padding:"2px 7px",borderRadius:"20px",background:t.concluida?`${D.green}14`:`${D.yellow}14`,color:t.concluida?D.green:D.yellow,border:`1px solid ${t.concluida?D.green:D.yellow}33`,textDecoration:t.concluida?"line-through":"none"}}>{t.texto}</span>)}
        </div>
      )}
    </div>
  );
}

// ── CALENDÁRIO FILA ACP ───────────────────────────────────────────────────────
function CalendarFila({ items, D }) {
  // Montar semana actual (seg a sex)
  const monday = getMondayUTC();
  const days = Array.from({length:5},(_,i)=>{
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate()+i);
    return d;
  });

  // Máquinas com previsão nesta semana
  const friday = getFridayUTC();
  const withPrev = items.filter(m=>{
    if (!m.previsao_inicio) return false;
    const d = new Date(m.previsao_inicio);
    return d >= monday && d <= friday;
  });

  // Sem previsão — lista simples
  const withoutPrev = items.filter(m=>!m.previsao_inicio);

  // Agrupar por dia
  const byDay = {};
  withPrev.forEach(m=>{
    const key = new Date(m.previsao_inicio).toISOString().slice(0,10);
    if (!byDay[key]) byDay[key]=[];
    byDay[key].push(m);
  });

  const todayStr = new Date().toISOString().slice(0,10);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
      {/* Grid de dias */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"8px"}}>
        {days.map(d=>{
          const key = d.toISOString().slice(0,10);
          const isToday = key===todayStr;
          const dayMachines = byDay[key]||[];
          return (
            <div key={key} style={{background:D.card,border:`1.5px solid ${isToday?D.blue+"66":D.sub}`,borderRadius:"10px",overflow:"hidden",minHeight:"90px"}}>
              {/* Header dia */}
              <div style={{padding:"6px 10px",background:isToday?`${D.blue}18`:D.sub+"44",borderBottom:`1px solid ${isToday?D.blue+"33":D.sub}`,display:"flex",alignItems:"center",gap:"5px"}}>
                <span style={{fontFamily:"'Orbitron',monospace",fontSize:"9px",fontWeight:800,color:isToday?D.blue:D.muted,textTransform:"uppercase",letterSpacing:"0.08em"}}>
                  {d.toLocaleDateString("pt-PT",{weekday:"short"})}
                </span>
                <span style={{fontFamily:"monospace",fontSize:"9px",color:isToday?D.blue:D.muted}}>
                  {d.toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"})}
                </span>
                {isToday && <div style={{marginLeft:"auto",width:"6px",height:"6px",borderRadius:"50%",background:D.blue,animation:"blink 1.5s ease-in-out infinite"}}/>}
              </div>
              {/* Máquinas */}
              <div style={{padding:"6px 8px",display:"flex",flexDirection:"column",gap:"4px"}}>
                {dayMachines.length===0
                  ? <div style={{fontFamily:"monospace",fontSize:"8px",color:D.sub,textAlign:"center",paddingTop:"8px"}}>—</div>
                  : dayMachines.map((m,i)=>(
                    <div key={i} style={{padding:"4px 7px",background:`${D.blue}13`,border:`1px solid ${m.prioridade?D.yellow+"44":D.blue+"22"}`,borderRadius:"6px",display:"flex",alignItems:"center",gap:"4px"}}>
                      {m.prioridade && <Flag size={8} color={D.yellow}/>}
                      <span style={{fontFamily:"'Orbitron',monospace",fontSize:"9px",fontWeight:700,color:D.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.modelo}</span>
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sem previsão / fora desta semana */}
      {withoutPrev.length>0 && (
        <div>
          <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.1em",color:D.muted,marginBottom:"7px"}}>SEM PREVISÃO — {withoutPrev.length} NA FILA</div>
          <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
            {withoutPrev.map((m,i)=>(
              <div key={i} style={{background:D.card,border:`1px solid ${D.sub}`,borderRadius:"8px",padding:"9px 12px",display:"flex",alignItems:"center",gap:"10px"}}>
                <div style={{width:"22px",height:"22px",borderRadius:"50%",border:`1.5px solid ${m.prioridade?D.yellow:D.blue}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Orbitron',monospace",fontSize:"9px",fontWeight:800,color:m.prioridade?D.yellow:D.blue,flexShrink:0}}>{i+1}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
                    {m.prioridade && <Flag size={9} color={D.yellow}/>}
                    <span style={{fontFamily:"'Orbitron',monospace",fontSize:"12px",fontWeight:700,color:D.text}}>{m.modelo}</span>
                    <span style={{fontFamily:"monospace",fontSize:"8px",color:D.muted}}>{m.serie}</span>
                  </div>
                  {(m.tarefas||[]).length>0 && (
                    <div style={{display:"flex",flexWrap:"wrap",gap:"3px",marginTop:"3px"}}>
                      {m.tarefas.map((t,j)=><span key={j} style={{fontFamily:"monospace",fontSize:"7px",padding:"1px 6px",borderRadius:"20px",background:`${D.blue}12`,color:D.blue,border:`1px solid ${D.blue}22`}}>{t.texto}</span>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fora desta semana com previsão */}
      {(() => {
        const futuras = items.filter(m=>{
          if (!m.previsao_inicio) return false;
          const d = new Date(m.previsao_inicio);
          return d > friday;
        });
        if (!futuras.length) return null;
        return (
          <div>
            <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.1em",color:D.muted,marginBottom:"7px"}}>SEMANAS SEGUINTES — {futuras.length}</div>
            <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
              {futuras.map((m,i)=>(
                <div key={i} style={{background:D.card,border:`1px solid ${D.sub}`,borderRadius:"8px",padding:"8px 12px",display:"flex",alignItems:"center",gap:"10px"}}>
                  {m.prioridade && <Flag size={9} color={D.yellow}/>}
                  <span style={{fontFamily:"'Orbitron',monospace",fontSize:"11px",fontWeight:700,color:D.text}}>{m.modelo}</span>
                  <span style={{fontFamily:"monospace",fontSize:"8px",color:D.muted,flex:1}}>{m.serie}</span>
                  <span style={{fontFamily:"monospace",fontSize:"9px",color:D.green,fontWeight:700}}>{fmtDay(m.previsao_inicio)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── CARD RECON ────────────────────────────────────────────────────────────────
function CardRecon({ m, D }) {
  const elapsed = useLiveTimer(m);
  const running = m.timer_status === "running";
  const tasks   = m.tarefas || [];
  const recon   = m.recondicao || {};
  const isPrata = recon.prata === true;
  const isBronze = recon.bronze === true;
  const reconColor = isPrata ? D.silver : isBronze ? D.bronze : D.purple;
  const reconLabel = isPrata ? "⬡ PRATA" : isBronze ? "⬡ BRONZE" : "RECON";
  const isActive = m.estado?.startsWith("em-preparacao");
  const isConcluida = m.estado?.startsWith("concluida") || m.estado === "concluida";

  return (
    <div style={{background:D.card,border:`2px solid ${reconColor}44`,borderRadius:"12px",padding:"14px 16px",display:"flex",flexDirection:"column",gap:"9px",boxShadow:`0 0 18px ${reconColor}14`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"8px"}}>
        <div style={{minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
            <span style={{fontFamily:"monospace",fontSize:"9px",padding:"2px 8px",borderRadius:"20px",background:`${reconColor}22`,color:reconColor,border:`1px solid ${reconColor}55`,fontWeight:800,letterSpacing:"0.08em"}}>{reconLabel}</span>
            <span style={{fontFamily:"'Orbitron',monospace",fontSize:"14px",fontWeight:800,color:D.text}}>{m.modelo||"—"}</span>
          </div>
          <div style={{fontFamily:"monospace",fontSize:"9px",color:D.muted,marginTop:"3px"}}>{m.serie}</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          {isConcluida ? (
            <div style={{display:"flex",alignItems:"center",gap:"5px",justifyContent:"flex-end"}}>
              <CheckCircle2 size={14} color={D.green}/>
              <span style={{fontFamily:"monospace",fontSize:"10px",color:D.green,fontWeight:700}}>CONCLUÍDA</span>
            </div>
          ) : isActive ? (
            <>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:"16px",fontWeight:900,color:running?D.green:D.yellow}}>{fmtHMS(elapsed)}</div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:"4px",marginTop:"2px"}}>
                <div style={{width:"5px",height:"5px",borderRadius:"50%",background:running?D.green:D.yellow,animation:running?"blink 1.2s ease-in-out infinite":"none"}}/>
                <span style={{fontFamily:"monospace",fontSize:"7px",color:D.muted}}>{running?"EM CURSO":"PAUSADO"}</span>
              </div>
            </>
          ) : (
            <span style={{fontFamily:"monospace",fontSize:"8px",padding:"3px 9px",borderRadius:"20px",background:`${D.muted}14`,color:D.muted,border:`1px solid ${D.sub}`}}>FILA</span>
          )}
        </div>
      </div>
      {tasks.length>0 && (
        <div style={{display:"flex",flexWrap:"wrap",gap:"4px"}}>
          {tasks.map((t,i)=>(
            <span key={i} style={{fontFamily:"monospace",fontSize:"8px",padding:"2px 7px",borderRadius:"20px",background:t.concluida?`${D.green}14`:`${reconColor}14`,color:t.concluida?D.green:reconColor,border:`1px solid ${t.concluida?D.green:reconColor}33`,textDecoration:t.concluida?"line-through":"none"}}>{t.texto}</span>
          ))}
        </div>
      )}
      {isConcluida && <div style={{fontFamily:"monospace",fontSize:"8px",color:D.muted}}>Concluída: {fmtDate(m.dataConclusao||m.updated_date)}</div>}
    </div>
  );
}

// ── CARD CONCLUÍDA ────────────────────────────────────────────────────────────
function CardConcluida({ m, D }) {
  const dt = m.dataConclusao || m.updated_date;
  return (
    <div style={{background:D.card,border:`1px solid ${D.green}1E`,borderRadius:"10px",padding:"10px 13px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px"}}>
      <div style={{minWidth:0}}>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"11px",fontWeight:700,color:D.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.modelo}</div>
        <div style={{fontFamily:"monospace",fontSize:"8px",color:D.muted,marginTop:"1px"}}>{m.serie}</div>
      </div>
      <div style={{textAlign:"right",flexShrink:0}}>
        <div style={{fontFamily:"monospace",fontSize:"10px",color:D.green,fontWeight:700}}>{fmtDate(dt)}</div>
        {m.timer_accumulated_seconds>0 && <div style={{fontFamily:"monospace",fontSize:"8px",color:D.muted,marginTop:"1px"}}>{fmtHMS(m.timer_accumulated_seconds)}</div>}
      </div>
    </div>
  );
}

// ── SLIDE WRAPPER ─────────────────────────────────────────────────────────────
function SlideWrap({ title, icon, color, pulse, D, count, children }) {
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",gap:"14px",overflow:"hidden",minHeight:0}}>
      <div style={{display:"flex",alignItems:"center",gap:"10px",flexShrink:0}}>
        <div style={{color,filter:`drop-shadow(0 0 6px ${color})`}}>{icon}</div>
        <h2 style={{fontFamily:"'Orbitron',monospace",fontSize:"16px",fontWeight:900,letterSpacing:"0.13em",color,textShadow:`0 0 14px ${color}55`,margin:0}}>{title}</h2>
        {count!==undefined && <span style={{fontFamily:"'Orbitron',monospace",fontSize:"20px",fontWeight:900,color,marginLeft:"4px"}}>{count}</span>}
        {pulse && <div style={{width:"7px",height:"7px",borderRadius:"50%",background:color,animation:"blink 1s ease-in-out infinite"}}/>}
        <div style={{flex:1,height:"1px",background:`linear-gradient(90deg,${color}44,transparent)`}}/>
      </div>
      <div style={{flex:1,overflowY:"auto",paddingRight:"4px"}}>{children}</div>
    </div>
  );
}

function Empty({ label, D }) {
  return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"70px",color:D.muted,fontFamily:"monospace",fontSize:"11px",letterSpacing:"0.1em"}}>{label}</div>;
}

// ── SLIDES ────────────────────────────────────────────────────────────────────
const SLIDES = [
  { id:"andamento",    label:"EM ANDAMENTO" },
  { id:"prioritarias", label:"PRIORITÁRIAS" },
  { id:"fila_acp",     label:"FILA ACP"     },
  { id:"nts",          label:"NTS"          },
  { id:"recon",        label:"RECOND."      },
  { id:"concluidas",   label:"CONCLUÍDAS"   },
];

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function AoVivo() {
  const [dark,setDark] = useState(()=>{ try{return localStorage.getItem("theme")!=="light";}catch{return true;} });
  const D = DT(dark);

  const [machines,setMachines] = useState([]);
  const [loading,setLoading]   = useState(true);
  const [slide,setSlide]       = useState(0);
  const [progress,setProgress] = useState(0);
  const [paused,setPaused]     = useState(false);
  const [navHidden,setNavHidden] = useState(false);

  const startRef = useRef(Date.now());
  const timerRef = useRef(null);
  const progRef  = useRef(null);

  // Detectar fullscreen
  useEffect(()=>{
    const onFS = ()=> setNavHidden(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange",onFS);
    return ()=>document.removeEventListener("fullscreenchange",onFS);
  },[]);

  const fetchData = useCallback(async()=>{
    try {
      const data = await callBridge({action:"list",entity:"FrotaACP"});
      setMachines((data||[]).filter(m=>!m.arquivada));
    } catch(e){console.warn(e);}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{ fetchData(); const id=setInterval(fetchData,30000); return ()=>clearInterval(id); },[fetchData]);

  const goTo = useCallback((idx)=>{ setSlide(idx); setProgress(0); startRef.current=Date.now(); },[]);
  const next = useCallback(()=>goTo((slide+1)%SLIDES.length),[slide,goTo]);
  const prev = useCallback(()=>goTo((slide-1+SLIDES.length)%SLIDES.length),[slide,goTo]);

  useEffect(()=>{
    if(paused){clearTimeout(timerRef.current);clearInterval(progRef.current);return;}
    const elapsed = Date.now()-startRef.current;
    const remaining = Math.max(SLIDE_DURATION-elapsed,0);
    timerRef.current = setTimeout(next,remaining);
    progRef.current  = setInterval(()=>setProgress(Math.min((Date.now()-startRef.current)/SLIDE_DURATION,1)),100);
    return ()=>{clearTimeout(timerRef.current);clearInterval(progRef.current);};
  },[slide,paused,next]);

  // Atalho de teclado: setas + espaço
  useEffect(()=>{
    const h = (e)=>{
      if(e.key==="ArrowRight") next();
      if(e.key==="ArrowLeft")  prev();
      if(e.key===" "){ e.preventDefault(); setPaused(p=>!p); }
    };
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[next,prev]);

  // ── Filtros ──
  const monday = getMondayUTC();
  const friday = getFridayUTC();

  const andamento    = machines.filter(m=>m.estado?.startsWith("em-preparacao"));
  const prioritarias = machines.filter(m=>m.prioridade===true && !m.estado?.startsWith("concluida") && m.estado!=="concluida");
  const filaACP      = machines.filter(m=>m.estado==="a-fazer" && m.tipo!=="nova");
  const ntsAndamento = machines.filter(m=>m.tipo==="nova" && m.estado?.startsWith("em-preparacao"));
  const ntsAfazer    = machines.filter(m=>m.tipo==="nova" && m.estado==="a-fazer");

  // Recon = recondicao.bronze=true OU recondicao.prata=true (qualquer estado)
  const isRecon = m=>{ const r=m.recondicao||{}; return r.bronze===true||r.prata===true; };
  const reconAndamento  = machines.filter(m=>isRecon(m)&&m.estado?.startsWith("em-preparacao"));
  const reconAfazer     = machines.filter(m=>isRecon(m)&&m.estado==="a-fazer");
  const reconConcluidas = machines.filter(m=>isRecon(m)&&(m.estado?.startsWith("concluida")||m.estado==="concluida"));

  // Concluídas DESTA semana (segunda a agora)
  const concluiSemana = machines.filter(m=>{
    if(!m.estado?.startsWith("concluida")&&m.estado!=="concluida") return false;
    const raw = m.dataConclusao||m.updated_date;
    if(!raw) return false;
    try{ return new Date(raw)>=monday; } catch{return false;}
  });

  const totalConcluidas = machines.filter(m=>m.estado?.startsWith("concluida")||m.estado==="concluida");

  // ── Slides ──
  const slideContent = {
    andamento:(
      <SlideWrap title="EM ANDAMENTO" icon={<Activity size={17}/>} color={D.blue} D={D} count={andamento.length}>
        {andamento.length===0?<Empty label="Nenhuma máquina em produção" D={D}/>:
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:"12px"}}>
            {andamento.map(m=><CardAndamento key={m.id} m={m} D={D} accent={D.blue}/>)}
          </div>}
      </SlideWrap>
    ),
    prioritarias:(
      <SlideWrap title="PRIORITÁRIAS" icon={<Flag size={17}/>} color={D.yellow} D={D} count={prioritarias.length} pulse>
        {prioritarias.length===0?<Empty label="Sem prioritárias activas ✓" D={D}/>:
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:"12px"}}>
            {prioritarias.map(m=><CardPrio key={m.id} m={m} D={D}/>)}
          </div>}
      </SlideWrap>
    ),
    fila_acp:(
      <SlideWrap title="FILA — ACP" icon={<ListOrdered size={17}/>} color={D.blue} D={D} count={filaACP.length}>
        {filaACP.length===0?<Empty label="Fila ACP vazia" D={D}/>:
          <CalendarFila items={filaACP} D={D}/>}
      </SlideWrap>
    ),
    nts:(
      <SlideWrap title="NTS" icon={<ListOrdered size={17}/>} color={D.pink} D={D} count={ntsAndamento.length+ntsAfazer.length}>
        {(ntsAndamento.length+ntsAfazer.length)===0?<Empty label="Sem máquinas NTS" D={D}/>:
          <>
            {ntsAndamento.length>0&&<>
              <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.1em",color:D.green,marginBottom:"7px"}}>▶ EM ANDAMENTO</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:"10px",marginBottom:"16px"}}>
                {ntsAndamento.map(m=><CardAndamento key={m.id} m={m} D={D} accent={D.pink}/>)}
              </div>
            </>}
            {ntsAfazer.length>0&&<>
              <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.1em",color:D.muted,marginBottom:"7px"}}>⏳ A FAZER</div>
              <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                {ntsAfazer.map((m,i)=>(
                  <div key={i} style={{background:D.card,border:`1px solid ${D.pink}22`,borderRadius:"8px",padding:"9px 13px",display:"flex",alignItems:"center",gap:"10px"}}>
                    <span style={{fontFamily:"'Orbitron',monospace",fontSize:"12px",fontWeight:700,color:D.text}}>{m.modelo}</span>
                    <span style={{fontFamily:"monospace",fontSize:"8px",color:D.muted}}>{m.serie}</span>
                  </div>
                ))}
              </div>
            </>}
          </>}
      </SlideWrap>
    ),
    recon:(
      <SlideWrap title="RECONDICIONAMENTO" icon={<Wrench size={17}/>} color={D.purple} D={D} count={reconAndamento.length+reconAfazer.length+reconConcluidas.length}>
        {(reconAndamento.length+reconAfazer.length+reconConcluidas.length)===0
          ?<Empty label="Sem máquinas em recondicionamento" D={D}/>
          :<>
            {reconAndamento.length>0&&<>
              <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.1em",color:D.green,marginBottom:"7px",marginTop:"2px"}}>▶ EM ANDAMENTO</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:"10px",marginBottom:"16px"}}>
                {reconAndamento.map(m=><CardRecon key={m.id} m={m} D={D}/>)}
              </div>
            </>}
            {reconAfazer.length>0&&<>
              <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.1em",color:D.muted,marginBottom:"7px"}}>⏳ A FAZER</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:"10px",marginBottom:"16px"}}>
                {reconAfazer.map(m=><CardRecon key={m.id} m={m} D={D}/>)}
              </div>
            </>}
            {reconConcluidas.length>0&&<>
              <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.1em",color:D.muted,marginBottom:"7px"}}>✓ CONCLUÍDAS</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:"10px"}}>
                {reconConcluidas.map(m=><CardRecon key={m.id} m={m} D={D}/>)}
              </div>
            </>}
          </>}
      </SlideWrap>
    ),
    concluidas:(
      <SlideWrap title="CONCLUÍDAS — ESTA SEMANA" icon={<CheckCircle2 size={17}/>} color={D.green} D={D} count={concluiSemana.length}>
        {concluiSemana.length===0
          ?<Empty label="Nenhuma conclusão esta semana ainda" D={D}/>
          :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"8px"}}>
            {[...concluiSemana].sort((a,b)=>new Date(b.dataConclusao||b.updated_date)-new Date(a.dataConclusao||a.updated_date)).map(m=><CardConcluida key={m.id} m={m} D={D}/>)}
          </div>}
      </SlideWrap>
    ),
  };

  return (
    <div style={{minHeight:"100vh",height:"100vh",background:D.bg,color:D.text,display:"flex",flexDirection:"column",fontFamily:"system-ui,sans-serif",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap');
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#ffffff14;border-radius:2px}
        *{box-sizing:border-box}
      `}</style>

      {/* ── HEADER (oculta em fullscreen) ── */}
      {!navHidden && (
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 20px",background:D.surface,borderBottom:`1px solid ${D.border}`,flexShrink:0,gap:"10px",flexWrap:"wrap"}}>
          {/* Logo */}
          <div style={{display:"flex",alignItems:"center",gap:"9px"}}>
            <img src="https://media.base44.com/images/public/69c166ad19149fb0c07883cb/a35751fd9_Gemini_Generated_Image_scmohbscmohbscmo1.png" alt="" style={{width:"32px",height:"32px",objectFit:"contain",filter:`drop-shadow(0 0 6px ${D.pink}88)`}}/>
            <div>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:"13px",fontWeight:900,letterSpacing:"0.13em",color:D.pink}}>WATCHER <span style={{color:D.muted,fontSize:"8px",fontWeight:400}}>/ AO VIVO</span></div>
              <div style={{fontFamily:"monospace",fontSize:"7px",color:D.muted,letterSpacing:"0.09em"}}>AUTO-REFRESH 30s · FONTE: WATCHER</div>
            </div>
          </div>
          {/* Tabs */}
          <div style={{display:"flex",gap:"4px",flex:1,justifyContent:"center",flexWrap:"wrap"}}>
            {SLIDES.map((s,i)=>(
              <button key={s.id} onClick={()=>goTo(i)} style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.06em",padding:"4px 11px",borderRadius:"20px",cursor:"pointer",border:"none",background:i===slide?`linear-gradient(135deg,${D.pink},${D.blue})`:D.sub,color:i===slide?"#fff":D.muted,fontWeight:i===slide?700:400,transition:"all 0.2s"}}>{s.label}</button>
            ))}
          </div>
          {/* Controles */}
          <div style={{display:"flex",alignItems:"center",gap:"7px"}}>
            <LiveClock D={D}/>
            <button onClick={prev} style={{background:"transparent",border:`1px solid ${D.sub}`,borderRadius:"6px",padding:"4px 6px",cursor:"pointer",color:D.muted,display:"flex"}}><ChevronLeft size={13}/></button>
            <button onClick={()=>setPaused(p=>!p)} style={{background:paused?`${D.yellow}18`:"transparent",border:`1px solid ${paused?D.yellow:D.sub}`,borderRadius:"6px",padding:"4px 8px",cursor:"pointer",color:paused?D.yellow:D.muted,display:"flex",alignItems:"center",gap:"3px"}}>
              {paused?<Play size={11}/>:<Pause size={11}/>}
              <span style={{fontFamily:"monospace",fontSize:"7px"}}>{paused?"RETOMAR":"PAUSAR"}</span>
            </button>
            <button onClick={next} style={{background:"transparent",border:`1px solid ${D.sub}`,borderRadius:"6px",padding:"4px 6px",cursor:"pointer",color:D.muted,display:"flex"}}><ChevronRight size={13}/></button>
            <button onClick={()=>{setDark(d=>!d);localStorage.setItem("theme",dark?"light":"dark");}} style={{background:"transparent",border:`1px solid ${D.sub}`,borderRadius:"6px",padding:"4px 6px",cursor:"pointer",color:D.muted,display:"flex"}}>
              {dark?<Sun size={12}/>:<Moon size={12}/>}
            </button>
            <div style={{display:"flex",alignItems:"center",gap:"3px"}}>
              <div style={{width:"5px",height:"5px",borderRadius:"50%",background:D.green,animation:"blink 1.5s ease-in-out infinite"}}/>
              <span style={{fontFamily:"monospace",fontSize:"7px",color:D.muted}}>LIVE</span>
            </div>
          </div>
        </div>
      )}

      {/* PROGRESS BAR */}
      <div style={{height:"2px",background:D.sub,flexShrink:0}}>
        <div style={{height:"100%",width:`${progress*100}%`,background:`linear-gradient(90deg,${D.pink},${D.blue})`,transition:"width 0.1s linear"}}/>
      </div>

      {/* KPI BAR */}
      <div style={{display:"flex",gap:"1px",background:D.border,borderBottom:`1px solid ${D.border}`,flexShrink:0}}>
        {[
          {label:"ANDAMENTO",   value:andamento.length,                         color:D.blue  },
          {label:"PRIORITÁRIAS",value:prioritarias.length,                      color:D.yellow},
          {label:"FILA ACP",   value:filaACP.length,                            color:D.muted },
          {label:"NTS",        value:ntsAndamento.length+ntsAfazer.length,      color:D.pink  },
          {label:"RECON",      value:reconAndamento.length+reconAfazer.length,  color:D.purple},
          {label:"ESTA SEMANA",value:concluiSemana.length,                      color:D.green },
          {label:"TOTAL 2026", value:totalConcluidas.length,                    color:D.sub   },
        ].map(k=>(
          <div key={k.label} style={{flex:1,background:D.surface,padding:"7px 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:"2px"}}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:"18px",fontWeight:900,color:k.color}}>{loading?"…":k.value}</div>
            <div style={{fontFamily:"monospace",fontSize:"6px",color:D.muted,letterSpacing:"0.08em",textAlign:"center"}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* SLIDE CONTENT */}
      <div style={{flex:1,padding:"18px 22px",display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>
        {loading
          ?<div style={{display:"flex",alignItems:"center",justifyContent:"center",flex:1}}>
            <span style={{fontFamily:"'Orbitron',monospace",fontSize:"12px",color:D.muted,animation:"blink 1s ease-in-out infinite"}}>A CARREGAR...</span>
          </div>
          :slideContent[SLIDES[slide].id]}
      </div>

      {/* FOOTER */}
      <div style={{padding:"5px 20px",background:D.surface,borderTop:`1px solid ${D.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div style={{display:"flex",gap:"4px"}}>
          {SLIDES.map((_,i)=>(
            <button key={i} onClick={()=>goTo(i)} style={{width:i===slide?"18px":"6px",height:"3px",borderRadius:"2px",background:i===slide?`linear-gradient(90deg,${D.pink},${D.blue})`:D.sub,border:"none",cursor:"pointer",transition:"width 0.3s ease",padding:0}}/>
          ))}
        </div>
        <div style={{fontFamily:"monospace",fontSize:"7px",color:D.muted,letterSpacing:"0.07em"}}>← → NAVEGAR · ESPAÇO PAUSAR · F11 FULLSCREEN · {slide+1}/{SLIDES.length}</div>
        <div style={{fontFamily:"monospace",fontSize:"7px",color:D.muted}}>STILL OFICINA · PORTAL DA FROTA ACP</div>
      </div>
    </div>
  );
}
