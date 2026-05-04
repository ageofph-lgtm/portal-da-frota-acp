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
function getMondayUTC() {
  const now = new Date();
  const dow = now.getUTCDay();
  const back = dow === 0 ? 6 : dow - 1;
  const mon = new Date(now);
  mon.setUTCDate(now.getUTCDate() - back);
  mon.setUTCHours(0,0,0,0);
  return mon;
}
function getFridayUTC() {
  const fri = new Date(getMondayUTC());
  fri.setUTCDate(fri.getUTCDate() + 4);
  fri.setUTCHours(23,59,59,999);
  return fri;
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const DT = (dark) => ({
  bg:      dark ? "#06060d" : "#eef0f7",
  surface: dark ? "#0d0d1c" : "#ffffff",
  card:    dark ? "#0f0f22" : "#f4f5fc",
  cardAlt: dark ? "#111128" : "#ecedf8",
  border:  dark ? "rgba(255,45,120,0.10)" : "rgba(77,100,200,0.10)",
  pink:    "#FF2D78",
  blue:    "#4D9FFF",
  green:   "#22C55E",
  yellow:  "#F59E0B",
  red:     "#EF4444",
  purple:  "#9B5CF6",
  bronze:  "#CD7F32",
  silver:  "#C0C0C0",
  text:    dark ? "#e4e6ff" : "#0b0c18",
  muted:   dark ? "rgba(228,230,255,0.35)" : "rgba(11,12,24,0.40)",
  sub:     dark ? "rgba(228,230,255,0.09)" : "rgba(11,12,24,0.09)",
  line:    dark ? "rgba(228,230,255,0.06)" : "rgba(11,12,24,0.06)",
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
      <div style={{fontFamily:"monospace",fontSize:"8px",color:D.muted,textTransform:"uppercase",letterSpacing:"0.05em"}}>{now.toLocaleDateString("pt-PT",{weekday:"long",day:"2-digit",month:"short"})}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROW CARD — formato horizontal unificado para todos os slides
// Layout: [barra estado] [NS grande + modelo pequeno] [tarefas] [badge tipo] [timer]
// ─────────────────────────────────────────────────────────────────────────────
function MachineRow({ m, idx, D, accentColor, showTimer=true, showDate=false, extraBadge=null }) {
  const elapsed  = useLiveTimer(m);
  const running  = m.timer_status === "running";
  const tasks    = m.tarefas || [];
  const done     = tasks.filter(t=>t.concluida).length;
  const pct      = tasks.length > 0 ? Math.round((done/tasks.length)*100) : 0;
  const isPrio   = m.prioridade === true;
  const recon    = m.recondicao || {};
  const isPrata  = recon.prata === true;
  const isBronze = recon.bronze === true;
  const reconColor = isPrata ? D.silver : isBronze ? D.bronze : null;
  const reconLabel = isPrata ? "PRATA" : isBronze ? "BRONZE" : null;

  // Cor da barra lateral de estado
  const isActive    = m.estado?.startsWith("em-preparacao");
  const isConcluida = m.estado?.startsWith("concluida") || m.estado === "concluida";
  const barColor = isConcluida ? D.green : isActive ? (running ? D.green : D.yellow) : D.sub;

  const rowBg = idx % 2 === 0 ? D.card : D.cardAlt;

  return (
    <div style={{
      display:"flex", alignItems:"center", gap:0,
      background: rowBg,
      border: `1px solid ${isPrio ? D.yellow+"33" : D.line}`,
      borderLeft: `3px solid ${barColor}`,
      borderRadius: "8px",
      overflow: "hidden",
      transition: "border-color 0.3s",
      boxShadow: isPrio ? `0 0 12px ${D.yellow}11` : "none",
    }}>

      {/* ── BLOCO NS + MODELO (40% largura) ── */}
      <div style={{
        flex:"0 0 38%", padding:"13px 16px",
        borderRight:`1px solid ${D.line}`,
        display:"flex", flexDirection:"column", justifyContent:"center", gap:"3px",
        minWidth:0,
      }}>
        {/* NS — protagonista */}
        <div style={{
          fontFamily:"'Orbitron',monospace",
          fontSize:"17px",
          fontWeight:900,
          color: accentColor,
          letterSpacing:"0.08em",
          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
          textShadow: `0 0 12px ${accentColor}44`,
        }}>
          {m.serie || "—"}
        </div>
        {/* Modelo — secundário */}
        <div style={{
          fontFamily:"monospace",
          fontSize:"11px",
          fontWeight:600,
          color: D.text,
          letterSpacing:"0.05em",
          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
          opacity:0.75,
        }}>
          {m.modelo || "—"}
        </div>
        {/* Badges linha */}
        <div style={{display:"flex", gap:"5px", flexWrap:"wrap", marginTop:"2px"}}>
          {isPrio && (
            <span style={{display:"flex",alignItems:"center",gap:"3px",fontFamily:"monospace",fontSize:"7px",padding:"1px 6px",borderRadius:"20px",background:`${D.yellow}18`,color:D.yellow,border:`1px solid ${D.yellow}44`,fontWeight:700,letterSpacing:"0.08em"}}>
              <Flag size={7}/> PRIO
            </span>
          )}
          {reconLabel && (
            <span style={{fontFamily:"monospace",fontSize:"7px",padding:"1px 6px",borderRadius:"20px",background:`${reconColor}18`,color:reconColor,border:`1px solid ${reconColor}44`,fontWeight:700,letterSpacing:"0.08em"}}>
              ⬡ {reconLabel}
            </span>
          )}
          {extraBadge}
        </div>
      </div>

      {/* ── TAREFAS (flex fill) ── */}
      <div style={{flex:1, padding:"12px 14px", display:"flex", flexDirection:"column", justifyContent:"center", gap:"6px", minWidth:0}}>
        {tasks.length === 0 ? (
          <span style={{fontFamily:"monospace",fontSize:"9px",color:D.sub,letterSpacing:"0.1em"}}>SEM TAREFAS</span>
        ) : (
          <>
            <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
              {tasks.map((t,i)=>(
                <span key={i} style={{
                  fontFamily:"monospace", fontSize:"9px",
                  padding:"2px 9px", borderRadius:"20px",
                  background: t.concluida ? `${D.green}14` : `${accentColor}14`,
                  color:       t.concluida ? D.green         : accentColor,
                  border:`1px solid ${t.concluida ? D.green : accentColor}33`,
                  textDecoration: t.concluida ? "line-through" : "none",
                  fontWeight: t.concluida ? 400 : 600,
                  letterSpacing:"0.05em",
                }}>
                  {t.texto}
                </span>
              ))}
            </div>
            {tasks.length > 0 && (
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <div style={{flex:1,height:"2px",borderRadius:"2px",background:D.sub,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${D.pink},${D.blue})`,transition:"width 0.5s"}}/>
                </div>
                <span style={{fontFamily:"monospace",fontSize:"8px",color:D.muted,flexShrink:0}}>{done}/{tasks.length}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── TIMER / DATA / STATUS (fixo direita) ── */}
      <div style={{
        flex:"0 0 auto", minWidth:"130px", maxWidth:"150px",
        padding:"12px 16px",
        borderLeft:`1px solid ${D.line}`,
        display:"flex", flexDirection:"column", alignItems:"flex-end", justifyContent:"center", gap:"4px",
      }}>
        {showTimer && (
          <>
            <div style={{
              fontFamily:"'Orbitron',monospace", fontSize:"18px", fontWeight:900,
              color: isConcluida ? D.green : running ? D.green : D.yellow,
              letterSpacing:"0.04em",
              textShadow: `0 0 10px ${running ? D.green : D.yellow}44`,
            }}>
              {fmtHMS(elapsed)}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"5px",justifyContent:"flex-end"}}>
              <div style={{width:"5px",height:"5px",borderRadius:"50%",
                background: isConcluida ? D.green : running ? D.green : D.yellow,
                animation: (running && !isConcluida) ? "blink 1.2s ease-in-out infinite" : "none",
              }}/>
              <span style={{fontFamily:"monospace",fontSize:"7px",color:D.muted,letterSpacing:"0.1em"}}>
                {isConcluida ? "CONCLUÍDA" : running ? "EM CURSO" : "PAUSADO"}
              </span>
            </div>
          </>
        )}
        {showDate && (
          <>
            <div style={{fontFamily:"monospace",fontSize:"13px",fontWeight:700,color:D.green}}>{fmtDate(m.dataConclusao||m.updated_date)}</div>
            {m.timer_accumulated_seconds > 0 && (
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:"11px",color:D.muted}}>{fmtHMS(m.timer_accumulated_seconds)}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── CALENDÁRIO FILA ACP ───────────────────────────────────────────────────────
function CalendarFila({ items, D }) {
  const monday = getMondayUTC();
  const friday = getFridayUTC();
  const days   = Array.from({length:5},(_,i)=>{ const d=new Date(monday); d.setUTCDate(monday.getUTCDate()+i); return d; });

  const withPrev    = items.filter(m=>{ if(!m.previsao_inicio) return false; const d=new Date(m.previsao_inicio); return d>=monday&&d<=friday; });
  const withoutPrev = items.filter(m=>!m.previsao_inicio);
  const futuras     = items.filter(m=>{ if(!m.previsao_inicio) return false; return new Date(m.previsao_inicio)>friday; });

  const byDay = {};
  withPrev.forEach(m=>{ const k=new Date(m.previsao_inicio).toISOString().slice(0,10); if(!byDay[k])byDay[k]=[]; byDay[k].push(m); });
  const todayStr = new Date().toISOString().slice(0,10);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
      {/* Grid semanal */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"8px"}}>
        {days.map(d=>{
          const key=d.toISOString().slice(0,10);
          const isToday=key===todayStr;
          const dayMachines=byDay[key]||[];
          return (
            <div key={key} style={{background:D.card,border:`1.5px solid ${isToday?D.blue+"55":D.sub}`,borderRadius:"10px",overflow:"hidden",minHeight:"80px"}}>
              <div style={{padding:"6px 10px",background:isToday?`${D.blue}14`:D.sub+"33",borderBottom:`1px solid ${isToday?D.blue+"33":D.line}`,display:"flex",alignItems:"center",gap:"6px"}}>
                <span style={{fontFamily:"'Orbitron',monospace",fontSize:"9px",fontWeight:800,color:isToday?D.blue:D.muted,textTransform:"uppercase"}}>{d.toLocaleDateString("pt-PT",{weekday:"short"})}</span>
                <span style={{fontFamily:"monospace",fontSize:"9px",color:isToday?D.blue:D.muted}}>{d.toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"})}</span>
                {isToday&&<div style={{marginLeft:"auto",width:"5px",height:"5px",borderRadius:"50%",background:D.blue,animation:"blink 1.5s ease-in-out infinite"}}/>}
              </div>
              <div style={{padding:"6px 8px",display:"flex",flexDirection:"column",gap:"5px"}}>
                {dayMachines.length===0
                  ? <div style={{fontFamily:"monospace",fontSize:"8px",color:D.sub,textAlign:"center",paddingTop:"6px"}}>—</div>
                  : dayMachines.map((m,i)=>(
                    <div key={i} style={{padding:"5px 8px",background:D.cardAlt,border:`1px solid ${m.prioridade?D.yellow+"44":D.blue+"22"}`,borderLeft:`3px solid ${m.prioridade?D.yellow:D.blue}`,borderRadius:"5px"}}>
                      {/* NS em destaque */}
                      <div style={{fontFamily:"'Orbitron',monospace",fontSize:"11px",fontWeight:800,color:D.blue,letterSpacing:"0.05em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.serie||"—"}</div>
                      <div style={{fontFamily:"monospace",fontSize:"8px",color:D.muted,marginTop:"1px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.modelo}</div>
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sem previsão */}
      {withoutPrev.length>0&&(
        <div>
          <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.1em",color:D.muted,marginBottom:"8px"}}>SEM PREVISÃO — {withoutPrev.length} NA FILA</div>
          <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
            {withoutPrev.map((m,i)=><MachineRow key={m.id} m={m} idx={i} D={D} accentColor={D.blue} showTimer={false}/>)}
          </div>
        </div>
      )}

      {/* Semanas seguintes */}
      {futuras.length>0&&(
        <div>
          <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.1em",color:D.muted,marginBottom:"8px"}}>SEMANAS SEGUINTES — {futuras.length}</div>
          <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
            {futuras.map((m,i)=>(
              <MachineRow key={m.id} m={m} idx={i} D={D} accentColor={D.blue} showTimer={false}
                extraBadge={<span style={{fontFamily:"monospace",fontSize:"7px",padding:"1px 6px",borderRadius:"20px",background:`${D.green}14`,color:D.green,border:`1px solid ${D.green}33`}}>{fmtDay(m.previsao_inicio)}</span>}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── SLIDE WRAPPER ─────────────────────────────────────────────────────────────
function SlideWrap({ title, icon, color, pulse, D, count, children }) {
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",gap:"12px",overflow:"hidden",minHeight:0}}>
      <div style={{display:"flex",alignItems:"center",gap:"10px",flexShrink:0}}>
        <div style={{color,filter:`drop-shadow(0 0 6px ${color})`}}>{icon}</div>
        <h2 style={{fontFamily:"'Orbitron',monospace",fontSize:"15px",fontWeight:900,letterSpacing:"0.14em",color,textShadow:`0 0 14px ${color}55`,margin:0}}>{title}</h2>
        {count!==undefined&&<span style={{fontFamily:"'Orbitron',monospace",fontSize:"22px",fontWeight:900,color}}>{count}</span>}
        {pulse&&<div style={{width:"7px",height:"7px",borderRadius:"50%",background:color,animation:"blink 1s ease-in-out infinite"}}/>}
        <div style={{flex:1,height:"1px",background:`linear-gradient(90deg,${color}44,transparent)`}}/>
      </div>
      <div style={{flex:1,overflowY:"auto",paddingRight:"3px",display:"flex",flexDirection:"column",gap:"4px"}}>{children}</div>
    </div>
  );
}

function Empty({ label, D }) {
  return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"70px",color:D.muted,fontFamily:"monospace",fontSize:"11px",letterSpacing:"0.1em"}}>{label}</div>;
}

function SectionLabel({ label, D }) {
  return <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.12em",color:D.muted,padding:"8px 0 2px",flexShrink:0}}>{label}</div>;
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
  const [dark,setDark]       = useState(()=>{ try{return localStorage.getItem("theme")!=="light";}catch{return true;} });
  const [machines,setMachines] = useState([]);
  const [loading,setLoading]   = useState(true);
  const [slide,setSlide]       = useState(0);
  const [progress,setProgress] = useState(0);
  const [paused,setPaused]     = useState(false);
  const [navHidden,setNavHidden] = useState(false);

  const D = DT(dark);
  const startRef = useRef(Date.now());
  const timerRef = useRef(null);
  const progRef  = useRef(null);

  // Fullscreen detection
  useEffect(()=>{
    const h=()=>setNavHidden(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange",h);
    document.addEventListener("webkitfullscreenchange",h);
    return ()=>{ document.removeEventListener("fullscreenchange",h); document.removeEventListener("webkitfullscreenchange",h); };
  },[]);

  const fetchData = useCallback(async()=>{
    try { const d=await callBridge({action:"list",entity:"FrotaACP"}); setMachines((d||[]).filter(m=>!m.arquivada)); }
    catch(e){console.warn(e);}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{ fetchData(); const id=setInterval(fetchData,30000); return ()=>clearInterval(id); },[fetchData]);

  const goTo = useCallback((idx)=>{ setSlide(idx); setProgress(0); startRef.current=Date.now(); },[]);
  const next = useCallback(()=>goTo((slide+1)%SLIDES.length),[slide,goTo]);
  const prev = useCallback(()=>goTo((slide-1+SLIDES.length)%SLIDES.length),[slide,goTo]);

  useEffect(()=>{
    if(paused){clearTimeout(timerRef.current);clearInterval(progRef.current);return;}
    const elapsed=Date.now()-startRef.current;
    timerRef.current=setTimeout(next,Math.max(SLIDE_DURATION-elapsed,0));
    progRef.current=setInterval(()=>setProgress(Math.min((Date.now()-startRef.current)/SLIDE_DURATION,1)),100);
    return ()=>{clearTimeout(timerRef.current);clearInterval(progRef.current);};
  },[slide,paused,next]);

  useEffect(()=>{
    const h=(e)=>{
      if(e.key==="ArrowRight")next();
      if(e.key==="ArrowLeft")prev();
      if(e.key===" "){e.preventDefault();setPaused(p=>!p);}
    };
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[next,prev]);

  // ── Filtros ──────────────────────────────────────────────────────────────
  const monday = getMondayUTC();
  const isRecon = m=>{ const r=m.recondicao||{}; return r.bronze===true||r.prata===true; };
  const recon30 = new Date(Date.now()-30*24*3600*1000);

  const andamento    = machines.filter(m=>m.estado?.startsWith("em-preparacao"));
  const prioritarias = machines.filter(m=>m.prioridade===true && !m.estado?.startsWith("concluida") && m.estado!=="concluida");
  const filaACP      = machines.filter(m=>m.estado==="a-fazer" && m.tipo!=="nova");
  const ntsAndamento = machines.filter(m=>m.tipo==="nova" && m.estado?.startsWith("em-preparacao"));
  const ntsAfazer    = machines.filter(m=>m.tipo==="nova" && m.estado==="a-fazer");
  const reconAndamento  = machines.filter(m=>isRecon(m)&&m.estado?.startsWith("em-preparacao"));
  const reconAfazer     = machines.filter(m=>isRecon(m)&&m.estado==="a-fazer");
  const reconConcluidas = machines.filter(m=>{
    if(!isRecon(m)) return false;
    if(!m.estado?.startsWith("concluida")&&m.estado!=="concluida") return false;
    const raw=m.dataConclusao||m.updated_date; if(!raw) return false;
    try{return new Date(raw)>=recon30;}catch{return false;}
  });
  const concluiSemana = machines.filter(m=>{
    if(!m.estado?.startsWith("concluida")&&m.estado!=="concluida") return false;
    const raw=m.dataConclusao||m.updated_date; if(!raw) return false;
    try{return new Date(raw)>=monday;}catch{return false;}
  });
  const totalConcluidas = machines.filter(m=>m.estado?.startsWith("concluida")||m.estado==="concluida");

  // ── Slide content ─────────────────────────────────────────────────────────
  const slides = {
    andamento:(
      <SlideWrap title="EM ANDAMENTO" icon={<Activity size={17}/>} color={D.blue} D={D} count={andamento.length}>
        {andamento.length===0 ? <Empty label="Nenhuma máquina em produção" D={D}/> :
          andamento.map((m,i)=><MachineRow key={m.id} m={m} idx={i} D={D} accentColor={D.blue}/>)}
      </SlideWrap>
    ),
    prioritarias:(
      <SlideWrap title="PRIORITÁRIAS" icon={<Flag size={17}/>} color={D.yellow} D={D} count={prioritarias.length} pulse>
        {prioritarias.length===0 ? <Empty label="Sem prioritárias activas ✓" D={D}/> :
          prioritarias.map((m,i)=><MachineRow key={m.id} m={m} idx={i} D={D} accentColor={D.yellow}/>)}
      </SlideWrap>
    ),
    fila_acp:(
      <SlideWrap title="FILA — ACP" icon={<ListOrdered size={17}/>} color={D.blue} D={D} count={filaACP.length}>
        {filaACP.length===0 ? <Empty label="Fila ACP vazia" D={D}/> : <CalendarFila items={filaACP} D={D}/>}
      </SlideWrap>
    ),
    nts:(
      <SlideWrap title="NTS" icon={<ListOrdered size={17}/>} color={D.pink} D={D} count={ntsAndamento.length+ntsAfazer.length}>
        {(ntsAndamento.length+ntsAfazer.length)===0 ? <Empty label="Sem máquinas NTS" D={D}/> : <>
          {ntsAndamento.length>0&&<><SectionLabel label="▶ EM ANDAMENTO" D={D}/>{ntsAndamento.map((m,i)=><MachineRow key={m.id} m={m} idx={i} D={D} accentColor={D.pink}/>)}</>}
          {ntsAfazer.length>0&&<><SectionLabel label="⏳ A FAZER" D={D}/>{ntsAfazer.map((m,i)=><MachineRow key={m.id} m={m} idx={i} D={D} accentColor={D.pink} showTimer={false}/>)}</>}
        </>}
      </SlideWrap>
    ),
    recon:(
      <SlideWrap title="RECONDICIONAMENTO" icon={<Wrench size={17}/>} color={D.purple} D={D} count={reconAndamento.length+reconAfazer.length+reconConcluidas.length}>
        {(reconAndamento.length+reconAfazer.length+reconConcluidas.length)===0
          ? <Empty label="Sem máquinas em recondicionamento" D={D}/>
          : <>
            {reconAndamento.length>0&&<><SectionLabel label="▶ EM ANDAMENTO" D={D}/>{reconAndamento.map((m,i)=><MachineRow key={m.id} m={m} idx={i} D={D} accentColor={D.purple}/>)}</>}
            {reconAfazer.length>0&&<><SectionLabel label="⏳ A FAZER" D={D}/>{reconAfazer.map((m,i)=><MachineRow key={m.id} m={m} idx={i} D={D} accentColor={D.purple} showTimer={false}/>)}</>}
            {reconConcluidas.length>0&&<><SectionLabel label="✓ CONCLUÍDAS (30 DIAS)" D={D}/>{reconConcluidas.map((m,i)=><MachineRow key={m.id} m={m} idx={i} D={D} accentColor={D.green} showTimer={false} showDate/>)}</>}
          </>}
      </SlideWrap>
    ),
    concluidas:(
      <SlideWrap title="CONCLUÍDAS — ESTA SEMANA" icon={<CheckCircle2 size={17}/>} color={D.green} D={D} count={concluiSemana.length}>
        {concluiSemana.length===0
          ? <Empty label="Nenhuma conclusão esta semana ainda" D={D}/>
          : [...concluiSemana]
              .sort((a,b)=>new Date(b.dataConclusao||b.updated_date)-new Date(a.dataConclusao||a.updated_date))
              .map((m,i)=><MachineRow key={m.id} m={m} idx={i} D={D} accentColor={D.green} showTimer={false} showDate/>)}
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
        ::-webkit-scrollbar-thumb{background:#ffffff12;border-radius:2px}
        *{box-sizing:border-box}
      `}</style>

      {/* ── HEADER (oculto em fullscreen) ── */}
      {!navHidden && (
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 20px",background:D.surface,borderBottom:`1px solid ${D.border}`,flexShrink:0,gap:"10px",flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:"9px"}}>
            <img src="https://media.base44.com/images/public/69c166ad19149fb0c07883cb/a35751fd9_Gemini_Generated_Image_scmohbscmohbscmo1.png" alt="" style={{width:"30px",height:"30px",objectFit:"contain",filter:`drop-shadow(0 0 6px ${D.pink}88)`}}/>
            <div>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:"12px",fontWeight:900,letterSpacing:"0.13em",color:D.pink}}>WATCHER <span style={{color:D.muted,fontSize:"8px",fontWeight:400}}>/ AO VIVO</span></div>
              <div style={{fontFamily:"monospace",fontSize:"7px",color:D.muted,letterSpacing:"0.08em"}}>AUTO-REFRESH 30s · FONTE: WATCHER</div>
            </div>
          </div>
          <div style={{display:"flex",gap:"4px",flex:1,justifyContent:"center",flexWrap:"wrap"}}>
            {SLIDES.map((s,i)=>(
              <button key={s.id} onClick={()=>goTo(i)} style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.06em",padding:"4px 11px",borderRadius:"20px",cursor:"pointer",border:"none",background:i===slide?`linear-gradient(135deg,${D.pink},${D.blue})`:D.sub,color:i===slide?"#fff":D.muted,fontWeight:i===slide?700:400,transition:"all 0.2s"}}>{s.label}</button>
            ))}
          </div>
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
          {label:"ANDAMENTO",  value:andamento.length,                        color:D.blue  },
          {label:"PRIORITÁRIAS",value:prioritarias.length,                    color:D.yellow},
          {label:"FILA ACP",   value:filaACP.length,                          color:D.muted },
          {label:"NTS",        value:ntsAndamento.length+ntsAfazer.length,    color:D.pink  },
          {label:"RECON",      value:reconAndamento.length+reconAfazer.length,color:D.purple},
          {label:"ESTA SEMANA",value:concluiSemana.length,                    color:D.green },
          {label:"TOTAL 2026", value:totalConcluidas.length,                  color:D.sub   },
        ].map(k=>(
          <div key={k.label} style={{flex:1,background:D.surface,padding:"6px 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:"1px"}}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:"18px",fontWeight:900,color:k.color}}>{loading?"…":k.value}</div>
            <div style={{fontFamily:"monospace",fontSize:"6px",color:D.muted,letterSpacing:"0.07em",textAlign:"center"}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* SLIDE CONTENT */}
      <div style={{flex:1,padding:"16px 22px",display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>
        {loading
          ?<div style={{display:"flex",alignItems:"center",justifyContent:"center",flex:1}}>
            <span style={{fontFamily:"'Orbitron',monospace",fontSize:"12px",color:D.muted,animation:"blink 1s ease-in-out infinite"}}>A CARREGAR...</span>
          </div>
          :slides[SLIDES[slide].id]}
      </div>

      {/* FOOTER */}
      <div style={{padding:"5px 20px",background:D.surface,borderTop:`1px solid ${D.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div style={{display:"flex",gap:"4px"}}>
          {SLIDES.map((_,i)=>(
            <button key={i} onClick={()=>goTo(i)} style={{width:i===slide?"18px":"6px",height:"3px",borderRadius:"2px",background:i===slide?`linear-gradient(90deg,${D.pink},${D.blue})`:D.sub,border:"none",cursor:"pointer",transition:"width 0.3s",padding:0}}/>
          ))}
        </div>
        <div style={{fontFamily:"monospace",fontSize:"7px",color:D.muted,letterSpacing:"0.07em"}}>← → NAVEGAR · ESPAÇO PAUSAR · F11 FULLSCREEN · {slide+1}/{SLIDES.length}</div>
        <div style={{fontFamily:"monospace",fontSize:"7px",color:D.muted}}>STILL OFICINA · PORTAL DA FROTA ACP</div>
      </div>
    </div>
  );
}
