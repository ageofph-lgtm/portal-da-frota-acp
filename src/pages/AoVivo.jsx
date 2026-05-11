import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Flag, CheckCircle2, ListOrdered, ChevronLeft, ChevronRight, Pause, Play, Wrench, CalendarDays } from "lucide-react";

// ── Config ────────────────────────────────────────────────────────────────────
const BRIDGE_URL     = "https://watcherweb.base44.app/api/functions/saganBridge";
const BRIDGE_HEADERS = {
  "Content-Type":"application/json",
  "x-sagan-secret":"sagan-watcher-bridge-2026",
  "api_key":"f8517554492e492090b62dd501ad7e14",
};
const SLIDE_DURATION = 30000;
const JORDAN_URL = "https://base44.app/api/apps/69c166ad19149fb0c07883cb/files/mp/public/69c166ad19149fb0c07883cb/d672073ee_3c1ea8ca9_Gemini_Generated_Image_if4bsvif4bsvif4b.png";

async function callBridge(p) {
  const r = await fetch(BRIDGE_URL,{method:"POST",headers:BRIDGE_HEADERS,body:JSON.stringify(p)});
  return (await r.json()).result || [];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const pad2 = n => String(n).padStart(2,"0");
function fmtHMS(s){ if(!s&&s!==0)return"00:00:00"; return`${pad2(Math.floor(s/3600))}:${pad2(Math.floor((s%3600)/60))}:${pad2(s%60)}`; }
function fmtDate(v){ if(!v)return"—"; return new Date(v).toLocaleDateString("pt-PT",{day:"2-digit",month:"short"}); }
function getMondayUTC(){ const n=new Date(),d=n.getUTCDay(),b=d===0?6:d-1,m=new Date(n); m.setUTCDate(n.getUTCDate()-b); m.setUTCHours(0,0,0,0); return m; }
function getFridayUTC(){ const f=new Date(getMondayUTC()); f.setUTCDate(f.getUTCDate()+4); f.setUTCHours(23,59,59,999); return f; }
const isRecon = m => m.recondicao && (m.recondicao.prata || m.recondicao.bronze);

// ── ARMOR DESIGN SYSTEM ───────────────────────────────────────────────────────
const A = {
  red:      "#c8102e",
  redDeep:  "#7a0a1c",
  redBright:"#ff2240",
  redGlow:  "rgba(255,34,64,0.55)",
  redFaint: "rgba(200,16,46,0.12)",
  gold:     "#ffb547",
  goldBrt:  "#ffd166",
  goldDeep: "#b87617",
  goldGlow: "rgba(255,181,71,0.55)",
  goldFaint:"rgba(255,181,71,0.12)",
  arc:      "#5cffff",
  arcGlow:  "rgba(92,255,255,0.6)",
  arcFaint: "rgba(92,255,255,0.15)",
  hud:      "#fff5e6",
  hudDim:   "#c9a880",
  hudMute:  "#6a5a44",
  bg:       "#0a0408",
  plate:    "#14070b",
  rim:      "rgba(255,181,71,0.25)",
  rimStrong:"rgba(255,181,71,0.55)",
  // status colors mantendo semântica original
  green:    "#22C55E",
  yellow:   "#F59E0B",
  purple:   "#9B5CF6",
  silver:   "#C0C0C0",
  bronze:   "#CD7F32",
  pink:     "#FF2D78",
  blue:     "#4D9FFF",
  cyan:     "#22D3EE",
};

// ── KEYFRAMES ─────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700;800;900&family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}
  @keyframes hudScan{0%{background-position:200% 0}100%{background-position:-200% 0}}
  @keyframes helmetPulse{0%,100%{opacity:1;box-shadow:0 0 10px #5cffff,0 0 20px #5cffff}50%{opacity:0.5;box-shadow:0 0 4px #5cffff}}
  @keyframes goldPulse{0%,100%{box-shadow:0 0 8px rgba(255,181,71,0.6)}50%{box-shadow:0 0 20px rgba(255,181,71,0.2)}}
  @keyframes tabAlert{0%,100%{box-shadow:0 0 18px rgba(255,34,64,0.6)}50%{box-shadow:0 0 6px rgba(255,34,64,0.2)}}
  @keyframes slideIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  @keyframes reactorSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  *{box-sizing:border-box}
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:rgba(255,181,71,0.05)}
  ::-webkit-scrollbar-thumb{background:rgba(255,181,71,0.25);border-radius:2px}
`;

// ── ARMOR PLATE WRAPPER ───────────────────────────────────────────────────────
function Plate({children, heavy, danger, style={}}){
  const bg = danger
    ? `linear-gradient(135deg,rgba(255,34,64,0.22),rgba(122,10,28,0.15)),linear-gradient(180deg,rgba(50,10,18,0.97),rgba(20,5,9,0.97))`
    : heavy
    ? `linear-gradient(135deg,rgba(200,16,46,0.28),rgba(122,10,28,0.15) 60%,transparent),linear-gradient(180deg,rgba(50,14,22,0.97),rgba(20,7,11,0.97))`
    : `linear-gradient(135deg,rgba(200,16,46,0.14),transparent 40%),linear-gradient(180deg,rgba(35,12,18,0.97),rgba(15,6,10,0.97))`;
  const border = danger ? `1px solid ${A.redBright}` : heavy ? `1px solid ${A.gold}` : `1px solid ${A.rim}`;
  const shadow = danger
    ? `0 0 24px ${A.redGlow},inset 0 0 28px rgba(200,16,46,0.12)`
    : heavy
    ? `0 0 20px rgba(255,181,71,0.14),inset 0 0 24px rgba(200,16,46,0.08)`
    : "none";
  return (
    <div style={{
      position:"relative",background:bg,border,boxShadow:shadow,
      clipPath:"polygon(14px 0,calc(100% - 14px) 0,100% 14px,100% calc(100% - 14px),calc(100% - 14px) 100%,14px 100%,0 calc(100% - 14px),0 14px)",
      ...style
    }}>
      {/* rivets */}
      {[{top:7,left:7},{top:7,right:7},{bottom:7,left:7},{bottom:7,right:7}].map((pos,i)=>(
        <span key={i} style={{position:"absolute",...pos,width:6,height:6,borderRadius:"50%",
          background:`radial-gradient(circle,${A.goldBrt} 30%,${A.goldDeep} 70%)`,
          boxShadow:`0 0 4px ${A.goldGlow}`,zIndex:3,pointerEvents:"none"}}/>
      ))}
      {/* inner gold trim */}
      <span style={{position:"absolute",top:4,left:4,right:4,bottom:4,
        border:`1px solid rgba(255,181,71,0.12)`,pointerEvents:"none",
        clipPath:"polygon(11px 0,calc(100% - 11px) 0,100% 11px,100% calc(100% - 11px),calc(100% - 11px) 100%,11px 100%,0 calc(100% - 11px),0 11px)"}}/>
      {children}
    </div>
  );
}

// ── HELMET ICON ───────────────────────────────────────────────────────────────
function HelmetIcon(){
  return(
    <div style={{width:54,height:54,position:"relative",display:"grid",placeItems:"center",flexShrink:0}}>
      <svg viewBox="0 0 60 60" width="54" height="54">
        <defs>
          <linearGradient id="hg1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff2240"/><stop offset="60%" stopColor="#c8102e"/><stop offset="100%" stopColor="#7a0a1c"/>
          </linearGradient>
          <linearGradient id="hg2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd166"/><stop offset="100%" stopColor="#b87617"/>
          </linearGradient>
        </defs>
        <path d="M30 3 L52 14 L54 30 L48 48 L40 55 L30 57 L20 55 L12 48 L6 30 L8 14 Z" fill="url(#hg1)" stroke="#7a0a1c" strokeWidth="0.5"/>
        <path d="M30 16 L44 22 L46 36 L41 47 L30 50 L19 47 L14 36 L16 22 Z" fill="url(#hg2)" stroke="#7a0a1c" strokeWidth="0.4"/>
        <path d="M19 28 L26 27 L28 30 L26 32 L20 31 Z" fill="#0a0408"/>
        <path d="M41 28 L34 27 L32 30 L34 32 L40 31 Z" fill="#0a0408"/>
        <path d="M22 41 L38 41 L36 43 L24 43 Z" fill="#0a0408" opacity="0.6"/>
        <line x1="30" y1="16" x2="30" y2="50" stroke="#7a0a1c" strokeWidth="0.4" opacity="0.5"/>
      </svg>
      {/* glowing eyes */}
      <span style={{position:"absolute",top:25,left:13,width:8,height:4,background:A.arc,
        boxShadow:`0 0 10px ${A.arc},0 0 20px ${A.arc}`,borderRadius:1,
        animation:"helmetPulse 2s infinite"}}/>
      <span style={{position:"absolute",top:25,right:13,width:8,height:4,background:A.arc,
        boxShadow:`0 0 10px ${A.arc},0 0 20px ${A.arc}`,borderRadius:1,
        animation:"helmetPulse 2s infinite"}}/>
    </div>
  );
}

// ── ARC REACTOR MINI ──────────────────────────────────────────────────────────
function ArcReactor({size=36}){
  return(
    <svg width={size} height={size} viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="17" fill="none" stroke={A.goldDeep} strokeWidth="1" opacity="0.5"/>
      <circle cx="18" cy="18" r="14" fill="none" stroke={A.gold} strokeWidth="1.5"
        strokeDasharray="4 6" style={{transformOrigin:"18px 18px",animation:"reactorSpin 4s linear infinite"}} opacity="0.6"/>
      <circle cx="18" cy="18" r="9" fill={`radial-gradient(circle,rgba(92,255,255,0.3),transparent)`}/>
      <circle cx="18" cy="18" r="9" fill="none" stroke={A.arc} strokeWidth="0.8" opacity="0.7"/>
      <circle cx="18" cy="18" r="5" fill={A.arc} opacity="0.9" style={{filter:`drop-shadow(0 0 4px ${A.arc})`}}/>
    </svg>
  );
}

// ── CHIP ARMOR ────────────────────────────────────────────────────────────────
function ArmorChip({label, color, pulse=false}){
  return(
    <span style={{
      fontFamily:"'Orbitron',monospace",fontSize:"clamp(8px,0.6vw,9px)",fontWeight:700,
      letterSpacing:"0.1em",padding:"2px 8px",
      color, background:`${color}18`,border:`1px solid ${color}44`,
      clipPath:"polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%)",
      whiteSpace:"nowrap",animation:pulse?`blink 1s infinite`:"none"
    }}>{label}</span>
  );
}

// ── LIVE TIMER ────────────────────────────────────────────────────────────────
function useLiveTimer(m){
  const [e,sE]=useState(0);
  useEffect(()=>{
    const acc=m.timer_accumulated_seconds||0,run=m.timer_status==="running",at=m.timer_started_at?new Date(m.timer_started_at).getTime():null;
    if(run&&at){const u=()=>sE(acc+Math.floor((Date.now()-at)/1000));u();const id=setInterval(u,1000);return()=>clearInterval(id);}
    else sE(acc);
  },[m.timer_status,m.timer_started_at,m.timer_accumulated_seconds]);
  return e;
}

// ── CLOCK ─────────────────────────────────────────────────────────────────────
function Clock(){
  const [n,sN]=useState(new Date());
  useEffect(()=>{const id=setInterval(()=>sN(new Date()),1000);return()=>clearInterval(id);},[]);
  const days=["DOMINGO","SEGUNDA","TERÇA","QUARTA","QUINTA","SEXTA","SÁBADO"];
  return(
    <div style={{
      padding:"6px 20px 6px 24px",
      background:`linear-gradient(180deg,rgba(40,14,20,0.85),rgba(20,7,11,0.9))`,
      border:`1px solid ${A.rimStrong}`,
      clipPath:"polygon(0 0,calc(100% - 14px) 0,100% 50%,calc(100% - 14px) 100%,0 100%,14px 50%)",
      textAlign:"right",
    }}>
      <div style={{fontFamily:"'Orbitron',monospace",fontSize:"clamp(20px,1.6vw,26px)",fontWeight:700,
        letterSpacing:"0.1em",color:A.goldBrt,textShadow:`0 0 14px ${A.goldGlow}`,lineHeight:1}}>
        {n.toLocaleTimeString("pt-PT")}
      </div>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"clamp(8px,0.65vw,10px)",
        letterSpacing:"0.22em",color:A.hudDim,marginTop:3}}>
        {days[n.getDay()]} · {n.toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit",year:"numeric"})}
      </div>
    </div>
  );
}

// ── BOARD CELL (Em Andamento) ─────────────────────────────────────────────────
function BoardCell({m}){
  const elapsed = useLiveTimer(m);
  const run    = m.timer_status==="running";
  const prio   = m.prioridade===true;
  const recon  = m.recondicao||{};
  const rColor = recon.prata?A.silver:recon.bronze?A.bronze:null;
  const rLabel = recon.prata?"PRATA":recon.bronze?"BRONZE":null;
  const tasks  = m.tarefas||[];
  const done   = tasks.filter(t=>t.concluida).length;
  const pct    = tasks.length?Math.round(done/tasks.length*100):0;
  const accent = run?A.gold:prio?A.gold:A.arc;

  return(
    <Plate heavy={run||prio} style={{padding:"14px 16px 12px",display:"flex",flexDirection:"column",gap:8,overflow:"hidden"}}>
      {run&&(
        <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:0,
          background:`linear-gradient(110deg,transparent 40%,rgba(255,181,71,0.06) 50%,transparent 60%)`,
          backgroundSize:"200% 100%",animation:"hudScan 5s linear infinite"}}/>
      )}
      {/* REACTOR GAUGE mini */}
      <div style={{position:"absolute",top:14,right:16,opacity:0.4,zIndex:1}}>
        <ArcReactor size={30}/>
      </div>
      {/* NS */}
      <div style={{position:"relative",zIndex:2,
        fontFamily:"'Orbitron',monospace",fontSize:"clamp(14px,1.2vw,18px)",fontWeight:900,
        color:A.goldBrt,letterSpacing:"0.08em",
        textShadow:`0 0 14px ${A.goldGlow}`,
        whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
        {m.serie||"—"}
      </div>
      {/* Modelo */}
      <div style={{position:"relative",zIndex:2,
        fontFamily:"'JetBrains Mono',monospace",fontSize:"clamp(9px,0.75vw,11px)",
        color:A.hudDim,marginTop:-4,
        whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
        {m.modelo||"—"} {m.ano?`· ${m.ano}`:""}
      </div>
      {/* Chips */}
      <div style={{position:"relative",zIndex:2,display:"flex",gap:4,flexWrap:"wrap"}}>
        {prio&&<ArmorChip label="⚑ PRIO" color={A.gold} pulse/>}
        {rLabel&&<ArmorChip label={`◇ ${rLabel}`} color={rColor}/>}
        {tasks.filter(t=>!t.concluida).slice(0,2).map((t,i)=>(
          <ArmorChip key={i} label={t.texto} color={A.arc}/>
        ))}
      </div>
      {/* Progress bar */}
      {tasks.length>0&&(
        <div style={{position:"relative",zIndex:2}}>
          <div style={{height:2,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${pct}%`,
              background:`linear-gradient(90deg,${A.red},${A.gold})`,
              boxShadow:`0 0 8px ${A.goldGlow}`,transition:"width 0.5s"}}/>
          </div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:A.hudMute,marginTop:2,letterSpacing:"0.1em"}}>
            {done}/{tasks.length} TAREFAS · {pct}%
          </div>
        </div>
      )}
      {/* Timer */}
      <div style={{position:"relative",zIndex:2,display:"flex",alignItems:"center",
        justifyContent:"space-between",marginTop:"auto",
        paddingTop:8,borderTop:`1px solid rgba(255,181,71,0.12)`}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{width:7,height:7,borderRadius:"50%",background:accent,
            boxShadow:`0 0 8px ${accent}`,
            animation:run?"blink 1.2s infinite":"none",display:"inline-block"}}/>
          <span style={{fontFamily:"'Orbitron',monospace",fontSize:"clamp(8px,0.6vw,9px)",
            fontWeight:700,color:accent,letterSpacing:"0.12em"}}>
            {run?"● EM CURSO":"◌ PAUSADO"}
          </span>
        </div>
        <div style={{fontFamily:"'Orbitron',monospace",
          fontSize:"clamp(17px,1.5vw,23px)",fontWeight:900,
          color:accent,letterSpacing:"0.06em",textShadow:`0 0 12px ${accent}88`}}>
          {fmtHMS(elapsed)}
        </div>
      </div>
    </Plate>
  );
}

function BigBoard({items}){
  const n=items.length;
  const cols=n<=2?2:n<=4?2:n<=6?3:n<=9?3:n<=12?4:5;
  return(
    <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,
      gap:10,flex:1,overflow:"hidden",alignContent:"start"}}>
      {items.map(m=><BoardCell key={m.id} m={m}/>)}
    </div>
  );
}

// ── ROW ITEM ─────────────────────────────────────────────────────────────────
function RowItem({m,idx,accent=A.gold,showTimer=true,showDate=false}){
  const elapsed=useLiveTimer(m);
  const run=m.timer_status==="running";
  const prio=m.prioridade===true;
  const tasks=m.tarefas||[];
  return(
    <div style={{
      position:"relative",display:"flex",alignItems:"center",gap:12,
      padding:"10px 16px",
      background:`linear-gradient(135deg,rgba(200,16,46,0.1),transparent 40%),rgba(20,7,11,0.9)`,
      border:`1px solid ${prio?A.rimStrong:A.rim}`,
      borderLeft:`3px solid ${accent}`,
      clipPath:"polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))",
      overflow:"hidden",
    }}>
      {run&&<div style={{position:"absolute",inset:0,background:`linear-gradient(110deg,transparent 40%,rgba(255,181,71,0.05) 50%,transparent 60%)`,
        backgroundSize:"200% 100%",animation:"hudScan 4s linear infinite",pointerEvents:"none"}}/>}
      {/* index */}
      <span style={{fontFamily:"'Orbitron',monospace",fontSize:11,fontWeight:900,
        color:`${accent}44`,letterSpacing:"0.05em",flexShrink:0,width:22,textAlign:"right"}}>
        {String(idx+1).padStart(2,"0")}
      </span>
      {/* NS + modelo */}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"clamp(12px,1vw,15px)",fontWeight:900,
          color:A.goldBrt,letterSpacing:"0.07em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
          textShadow:`0 0 10px ${A.goldGlow}`}}>
          {m.serie||"—"}
        </div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"clamp(9px,0.7vw,11px)",
          color:A.hudDim,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
          {m.modelo||"—"}{m.ano?` · ${m.ano}`:""}
          {showDate&&m.dataConclusao&&` · ${fmtDate(m.dataConclusao)}`}
        </div>
      </div>
      {/* chips */}
      <div style={{display:"flex",gap:4,flexShrink:0}}>
        {prio&&<ArmorChip label="⚑ PRIO" color={A.gold} pulse/>}
        {(m.tarefas||[]).filter(t=>!t.concluida).slice(0,2).map((t,i)=>(
          <ArmorChip key={i} label={t.texto} color={A.arc}/>
        ))}
        {showDate&&<ArmorChip label={fmtDate(m.dataConclusao||m.updated_date)} color={A.green}/>}
      </div>
      {/* timer */}
      {showTimer&&(
        <div style={{fontFamily:"'Orbitron',monospace",
          fontSize:"clamp(14px,1.2vw,18px)",fontWeight:900,
          color:run?A.gold:A.hudMute,letterSpacing:"0.06em",flexShrink:0,
          textShadow:run?`0 0 10px ${A.goldGlow}`:"none"}}>
          {fmtHMS(elapsed)}
        </div>
      )}
    </div>
  );
}

// ── SLIDE HEADER ──────────────────────────────────────────────────────────────
function SlideHead({title,count,color,pulse=false}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,flexShrink:0,
      paddingBottom:8,borderBottom:`1px solid rgba(255,181,71,0.15)`}}>
      <span style={{width:4,alignSelf:"stretch",background:`linear-gradient(180deg,${color},${A.redDeep})`,
        boxShadow:`2px 0 12px ${color}66`,flexShrink:0,borderRadius:2}}/>
      <span style={{fontFamily:"'Orbitron',monospace",fontSize:"clamp(12px,1vw,16px)",fontWeight:900,
        color:A.goldBrt,letterSpacing:"0.18em",textShadow:`0 0 12px ${A.goldGlow}`}}>
        {title}
      </span>
      {count!=null&&(
        <span style={{fontFamily:"'Orbitron',monospace",fontSize:"clamp(18px,1.6vw,24px)",fontWeight:900,
          color,letterSpacing:"0.04em",textShadow:`0 0 14px ${color}88`,
          animation:pulse?`blink 1.5s infinite`:"none",marginLeft:4}}>
          {count}
        </span>
      )}
      <div style={{flex:1,height:1,background:`linear-gradient(90deg,${color}44,transparent)`}}/>
    </div>
  );
}

function Empty({label}){
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",flex:1,
      fontFamily:"'Orbitron',monospace",fontSize:12,color:A.hudMute,letterSpacing:"0.2em"}}>
      {label}
    </div>
  );
}

function SecLabel({label}){
  return(
    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:"0.14em",
      color:A.hudMute,marginBottom:4,marginTop:4}}>{label}</div>
  );
}

// ── CALENDAR FILA ─────────────────────────────────────────────────────────────
function CalendarFila({items}){
  const monday=getMondayUTC(),friday=getFridayUTC();
  const days=Array.from({length:5},(_,i)=>{ const d=new Date(monday); d.setUTCDate(monday.getUTCDate()+i); return d; });
  const todayStr=new Date().toISOString().slice(0,10);
  const withPrev=items.filter(m=>{ if(!m.previsao_inicio)return false; const d=new Date(m.previsao_inicio); return d>=monday&&d<=friday; });
  const withoutPrev=items.filter(m=>!m.previsao_inicio);
  const futuras=items.filter(m=>{ if(!m.previsao_inicio)return false; return new Date(m.previsao_inicio)>friday; });
  const byDay={};
  withPrev.forEach(m=>{ const k=new Date(m.previsao_inicio).toISOString().slice(0,10); if(!byDay[k])byDay[k]=[]; byDay[k].push(m); });
  const ptDays=["DOM","SEG","TER","QUA","QUI","SEX","SÁB"];

  return(
    <div style={{display:"flex",flexDirection:"column",gap:10,height:"100%"}}>
      {/* Calendário semanal */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,flexShrink:0}}>
        {days.map(d=>{
          const key=d.toISOString().slice(0,10),isToday=key===todayStr,ms=byDay[key]||[];
          return(
            <Plate key={key} heavy={isToday} style={{overflow:"hidden"}}>
              {/* header dia */}
              <div style={{padding:"7px 12px",
                background:isToday?`rgba(200,16,46,0.2)`:`rgba(255,255,255,0.02)`,
                borderBottom:`1px solid ${isToday?A.rimStrong:A.rim}`,
                display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontFamily:"'Orbitron',monospace",fontSize:10,fontWeight:900,
                  color:isToday?A.goldBrt:A.hudDim,letterSpacing:"0.12em"}}>
                  {ptDays[d.getUTCDay()]}
                </span>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
                  color:isToday?A.gold:A.hudMute}}>
                  {d.toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"})}
                </span>
                {isToday&&<span style={{width:6,height:6,borderRadius:"50%",background:A.redBright,
                  boxShadow:`0 0 8px ${A.redGlow}`,animation:"blink 1.2s infinite",display:"inline-block"}}/>}
              </div>
              {/* máquinas */}
              <div style={{padding:"8px 10px",display:"flex",flexDirection:"column",gap:5,minHeight:60}}>
                {ms.length===0
                  ?<div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:A.hudMute,
                      textAlign:"center",paddingTop:8,letterSpacing:"0.1em"}}>—</div>
                  :ms.map((m,i)=>(
                    <div key={i} style={{padding:"6px 8px",
                      background:"rgba(255,255,255,0.03)",
                      borderLeft:`2px solid ${A.gold}`,
                      clipPath:"polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px))"}}>
                      <div style={{fontFamily:"'Orbitron',monospace",fontSize:10,fontWeight:900,
                        color:A.goldBrt,letterSpacing:"0.06em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {m.serie}
                      </div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:A.hudDim,marginTop:2}}>
                        {m.modelo}
                      </div>
                      {m.prioridade&&<ArmorChip label="⚑ PRIO" color={A.gold}/>}
                    </div>
                  ))}
              </div>
            </Plate>
          );
        })}
      </div>

      {/* Sem data + Futuras */}
      <div style={{display:"grid",gridTemplateColumns:withoutPrev.length&&futuras.length?"1fr 1fr":"1fr",gap:10,flex:1,overflow:"hidden"}}>
        {withoutPrev.length>0&&(
          <div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:A.hudMute,
              letterSpacing:"0.14em",marginBottom:6}}>// SEM DATA DEFINIDA</div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {withoutPrev.map((m,i)=><RowItem key={m.id} m={m} idx={i} accent={A.hudMute} showTimer={false}/>)}
            </div>
          </div>
        )}
        {futuras.length>0&&(
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{width:3,height:18,background:`linear-gradient(180deg,${A.gold},${A.red})`,borderRadius:2}}/>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:A.hudDim,letterSpacing:"0.14em"}}>
                // SEMANAS SEGUINTES
              </span>
              <div style={{flex:1,height:1,background:`linear-gradient(90deg,${A.gold}33,transparent)`}}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {futuras.map((m,i)=>{
                const ini=new Date(m.previsao_inicio),fim=m.previsao_fim?new Date(m.previsao_fim):null;
                return(
                  <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",
                    background:"rgba(255,255,255,0.02)",border:`1px solid ${A.rim}`,
                    clipPath:"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))"}}>
                    <div style={{flexShrink:0,textAlign:"center",minWidth:36,
                      background:`rgba(255,181,71,0.08)`,border:`1px solid ${A.rim}`,padding:"3px 6px"}}>
                      <div style={{fontFamily:"'Orbitron',monospace",fontSize:8,color:A.hudMute,letterSpacing:"0.1em"}}>
                        {ini.toLocaleDateString("pt-PT",{month:"short"}).replace(".","").toUpperCase()}
                      </div>
                      <div style={{fontFamily:"'Orbitron',monospace",fontSize:15,fontWeight:900,
                        color:A.gold,lineHeight:1}}>
                        {ini.toLocaleDateString("pt-PT",{day:"2-digit"})}
                      </div>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:900,
                        color:A.goldBrt,letterSpacing:"0.07em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {m.serie}
                      </div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:A.hudDim,marginTop:2}}>
                        {m.modelo}{fim?` → ${fmtDate(fim)}`:""}
                      </div>
                    </div>
                    {m.prioridade&&<ArmorChip label="⚑ PRIO" color={A.gold}/>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── GANTT CHART ───────────────────────────────────────────────────────────────
function GanttChart({machines}){
  const today=new Date(); today.setHours(0,0,0,0);
  const numDays=14;
  const endDate=new Date(today); endDate.setDate(endDate.getDate()+numDays-1);
  const ruleDays=Array.from({length:numDays},(_,i)=>{ const d=new Date(today); d.setDate(d.getDate()+i); return d; });
  const pctRaw=ms=>((ms - today.getTime())/(numDays*86400000))*100;
  const nowPct=pctRaw(Date.now());

  const blocks=machines.map(m=>{
    const pi=m.previsao_inicio?new Date(m.previsao_inicio):null;
    const pf=m.previsao_fim?new Date(m.previsao_fim):null;
    if(!pi||!pf)return null;
    const isActive=m.estado?.startsWith("em-preparacao");
    const run=m.timer_status==="running";
    const isPrio=m.prioridade===true;
    const overrun=pf<today&&!m.estado?.startsWith("concluida");
    return{m,pi,pf,isActive,run,isPrio,overrun};
  }).filter(Boolean).sort((a,b)=>a.pi-b.pi);

  const BAR_H=30,GAP=5;
  const barBg=b=>{
    if(b.overrun)return`linear-gradient(90deg,${A.gold},${A.red})`;
    if(b.isActive&&b.run)return`linear-gradient(90deg,${A.gold},${A.redBright})`;
    if(b.isActive)return`linear-gradient(90deg,rgba(255,181,71,0.7),rgba(200,16,46,0.6))`;
    if(b.isPrio)return`linear-gradient(90deg,rgba(255,181,71,0.55),rgba(255,34,64,0.4))`;
    return`rgba(255,181,71,0.22)`;
  };

  if(blocks.length===0)return<Empty label="SEM PREVISÕES DEFINIDAS · CONFIGURAR NO WATCHER"/>;
  const totalH=Math.max(120,blocks.length*(BAR_H+GAP));

  return(
    <div style={{display:"flex",flexDirection:"column",gap:8,flex:1,overflowY:"auto",overflowX:"hidden"}}>
      {/* Régua */}
      <div style={{position:"relative",height:32,flexShrink:0,
        borderBottom:`1px solid ${A.rim}`,
        background:`linear-gradient(180deg,rgba(20,7,11,0.9),rgba(10,4,8,0.9))`}}>
        {ruleDays.map((d,i)=>{
          const left=(i/numDays)*100;
          const isToday=d.toDateString()===today.toDateString();
          const isWE=d.getDay()===0||d.getDay()===6;
          return(
            <div key={i} style={{position:"absolute",left:left+"%",top:0,width:(100/numDays)+"%",height:"100%",
              borderLeft:i>0?`1px solid ${isToday?A.redBright:A.rim}`:undefined,
              background:isWE?"rgba(200,16,46,0.04)":"transparent"}}>
              <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
                textAlign:"center",fontFamily:"'Orbitron',monospace",
                fontSize:isToday?10:8,fontWeight:isToday?900:600,
                color:isToday?A.goldBrt:isWE?A.hudMute:A.hudDim,
                letterSpacing:"0.04em",whiteSpace:"nowrap",lineHeight:1.2,
                textShadow:isToday?`0 0 10px ${A.goldGlow}`:"none"}}>
                <div>{d.toLocaleDateString("pt-PT",{day:"2-digit"})}</div>
                <div style={{fontSize:7,opacity:0.7}}>{d.toLocaleDateString("pt-PT",{month:"short"}).replace(".","").toUpperCase()}</div>
              </div>
              {isToday&&<div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",
                width:"100%",height:2,background:`linear-gradient(90deg,transparent,${A.redBright},transparent)`}}/>}
            </div>
          );
        })}
        {nowPct>=0&&nowPct<=100&&(
          <div style={{position:"absolute",top:0,bottom:0,left:nowPct+"%",width:2,
            background:A.redBright,boxShadow:`0 0 10px ${A.redGlow}`,zIndex:10}}/>
        )}
      </div>
      {/* Barras */}
      <div style={{position:"relative",height:`${totalH}px`,flexShrink:0}}>
        {ruleDays.map((d,i)=>{
          const left=(i/numDays)*100;
          const isWE=d.getDay()===0||d.getDay()===6;
          return<div key={"g"+i} style={{position:"absolute",top:0,bottom:0,left:left+"%",
            width:isWE?(100/numDays)+"%":"0",
            borderLeft:i>0?`1px dashed rgba(255,181,71,0.08)`:undefined,
            background:isWE?"rgba(200,16,46,0.03)":"transparent",pointerEvents:"none",zIndex:0}}/>;
        })}
        {nowPct>=0&&nowPct<=100&&(
          <div style={{position:"absolute",top:0,bottom:0,left:nowPct+"%",width:2,
            background:A.redBright,boxShadow:`0 0 12px ${A.redGlow}`,zIndex:10,pointerEvents:"none"}}/>
        )}
        {blocks.map((b,idx)=>{
          const leftRaw=pctRaw(b.pi.getTime());
          const rightRaw=pctRaw(b.pf.getTime()+86400000);
          const leftC=Math.max(0,Math.min(100,leftRaw));
          const rightC=Math.max(0,Math.min(100,rightRaw));
          const width=Math.max(0.8,rightC-leftC);
          if(rightC<=0||leftC>=100)return null;
          const top=idx*(BAR_H+GAP);
          return(
            <div key={b.m.id} title={`${b.m.serie} · ${b.m.modelo}`}
              style={{position:"absolute",left:leftC+"%",width:width+"%",top,height:BAR_H,
                background:barBg(b),
                border:`1px solid ${b.overrun?A.red:b.isActive?A.gold:A.rimStrong}`,
                boxShadow:b.overrun?`0 0 10px ${A.redGlow}`:b.isActive?`0 0 10px ${A.goldGlow}`:"none",
                clipPath:"polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))",
                display:"flex",alignItems:"center",padding:"0 10px",overflow:"hidden",gap:8,zIndex:2}}>
              {b.run&&<span style={{width:5,height:5,borderRadius:"50%",background:"#fff",
                animation:"blink 1s infinite",flexShrink:0}}/>}
              <span style={{fontFamily:"'Orbitron',monospace",fontSize:10,fontWeight:900,
                color:"#fff",letterSpacing:"0.06em",whiteSpace:"nowrap",flexShrink:0,
                textShadow:"0 1px 6px rgba(0,0,0,0.9)"}}>
                {b.m.serie||"—"}
              </span>
              {width>12&&<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,
                color:"rgba(255,255,255,0.5)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flexShrink:1,minWidth:0}}>
                {b.m.modelo}
              </span>}
              {b.overrun&&<span style={{flexShrink:0,fontFamily:"monospace",fontSize:7,
                background:"rgba(255,34,64,0.35)",color:"#FCA5A5",padding:"1px 4px",fontWeight:700}}>ATRÁS.</span>}
            </div>
          );
        })}
      </div>
      {/* Legenda */}
      <div style={{display:"flex",gap:16,flexShrink:0,fontFamily:"'JetBrains Mono',monospace",
        fontSize:8,color:A.hudMute,letterSpacing:"0.1em",
        paddingTop:6,borderTop:`1px solid ${A.rim}`,alignItems:"center"}}>
        {[
          {bg:`linear-gradient(90deg,${A.gold},${A.red})`,label:"EM CURSO"},
          {bg:`rgba(255,181,71,0.25)`,border:`1px solid ${A.rimStrong}`,label:"FILA"},
          {bg:`linear-gradient(90deg,${A.gold},${A.red})`,label:"ATRASADA"},
        ].map((l,i)=>(
          <span key={i} style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{display:"inline-block",width:14,height:7,background:l.bg,border:l.border}}/>
            {l.label}
          </span>
        ))}
        <span style={{marginLeft:"auto",fontFamily:"'Orbitron',monospace",fontSize:8,color:A.hudMute}}>
          {blocks.length} MÁQUINAS · {blocks.filter(b=>b.isActive).length} EM CURSO
        </span>
      </div>
    </div>
  );
}

// ── SLIDES LIST ───────────────────────────────────────────────────────────────
const SLIDES=[
  {id:"andamento",    label:"EM ANDAMENTO"},
  {id:"prioritarias", label:"PRIORITÁRIAS"},
  {id:"fila_acp",     label:"FILA ACP"},
  {id:"nts",          label:"NTS"},
  {id:"recon",        label:"RECOND."},
  {id:"timeline",     label:"TIMELINE"},
  {id:"concluidas",   label:"CONCLUÍDAS"},
];

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function AoVivo(){
  const navigate=useNavigate();
  const [machines,setMachines]=useState([]);
  const [slide,setSlide]=useState(0);
  const [paused,setPaused]=useState(false);
  const [loading,setLoading]=useState(true);
  const timerRef=useRef(null);

  const fetchData=useCallback(async()=>{
    try{
      const r=await callBridge({action:"list",entity:"FrotaACP",query:{arquivada:false}});
      setMachines(Array.isArray(r)?r:[]);
    }catch(e){console.error(e);}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{fetchData();const id=setInterval(fetchData,30000);return()=>clearInterval(id);},[fetchData]);

  const goTo=i=>setSlide(((i%SLIDES.length)+SLIDES.length)%SLIDES.length);
  const next=useCallback(()=>goTo(slide+1),[slide]);
  const prev=useCallback(()=>goTo(slide-1),[slide]);

  useEffect(()=>{
    if(paused){clearInterval(timerRef.current);return;}
    timerRef.current=setInterval(next,SLIDE_DURATION);
    return()=>clearInterval(timerRef.current);
  },[paused,next]);

  // Dados filtrados
  const andamento    = machines.filter(m=>m.estado?.startsWith("em-preparacao")&&(m.timer_status==="running"||m.timer_status==="paused"));
  const prioritarias = machines.filter(m=>m.prioridade===true&&!m.estado?.startsWith("concluida"));
  const filaACP      = machines.filter(m=>m.origemMaquina!=="nts"&&m.tipo!=="nts"&&!isRecon(m)&&(m.estado==="a-fazer"||m.estado==="em-preparacao")).sort((a,b)=>{
    if(a.prioridade&&!b.prioridade)return-1;
    if(!a.prioridade&&b.prioridade)return 1;
    if(a.previsao_inicio&&b.previsao_inicio)return new Date(a.previsao_inicio)-new Date(b.previsao_inicio);
    if(a.previsao_inicio)return-1;
    if(b.previsao_inicio)return 1;
    return 0;
  });
  const ntsAnd       = machines.filter(m=>(m.origemMaquina==="nts"||m.tipo==="nts")&&m.estado?.startsWith("em-preparacao"));
  const ntsAF        = machines.filter(m=>(m.origemMaquina==="nts"||m.tipo==="nts")&&m.estado==="a-fazer");
  const reconAnd     = machines.filter(m=>isRecon(m)&&m.estado?.startsWith("em-preparacao"));
  const reconAF      = machines.filter(m=>isRecon(m)&&(m.estado==="a-fazer"));
  const r30          = new Date(); r30.setDate(r30.getDate()-30);
  const monday       = getMondayUTC();
  const reconCon     = machines.filter(m=>{
    if(!isRecon(m))return false;
    if(!m.estado?.startsWith("concluida"))return false;
    const raw=m.dataConclusao||m.updated_date;if(!raw)return false;
    try{return new Date(raw)>=r30;}catch{return false;}
  });
  const conSemana=machines.filter(m=>{
    if(!m.estado?.startsWith("concluida")&&m.estado!=="concluida")return false;
    const raw=m.dataConclusao||m.updated_date;if(!raw)return false;
    try{return new Date(raw)>=monday;}catch{return false;}
  });
  const totalCon=machines.filter(m=>m.estado?.startsWith("concluida")||m.estado==="concluida");

  const slides={
    andamento:(
      <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden",animation:"slideIn 0.35s ease"}}>
        <SlideHead title="EM ANDAMENTO" color={A.gold} count={andamento.length}/>
        {andamento.length===0?<Empty label="NENHUMA MÁQUINA EM PRODUÇÃO"/>:<BigBoard items={andamento}/>}
      </div>
    ),
    prioritarias:(
      <div style={{display:"flex",flexDirection:"column",height:"100%",animation:"slideIn 0.35s ease"}}>
        <SlideHead title="PRIORITÁRIAS" color={A.gold} pulse count={prioritarias.length}/>
        {prioritarias.length===0?<Empty label="SEM PRIORITÁRIAS ACTIVAS ✓"/>:
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {prioritarias.map((m,i)=><RowItem key={m.id} m={m} idx={i} accent={A.gold}/>)}
          </div>}
      </div>
    ),
    fila_acp:(
      <div style={{display:"flex",flexDirection:"column",height:"100%",animation:"slideIn 0.35s ease"}}>
        <SlideHead title="FILA — ACP" color={A.arc} count={filaACP.length}/>
        {filaACP.length===0?<Empty label="FILA ACP VAZIA"/>:<CalendarFila items={filaACP}/>}
      </div>
    ),
    nts:(
      <div style={{display:"flex",flexDirection:"column",height:"100%",animation:"slideIn 0.35s ease"}}>
        <SlideHead title="NTS" color={A.redBright} count={ntsAnd.length+ntsAF.length}/>
        {ntsAnd.length+ntsAF.length===0?<Empty label="SEM MÁQUINAS NTS"/>:
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {ntsAnd.length>0&&<><SecLabel label="▶ EM ANDAMENTO"/>{ntsAnd.map((m,i)=><RowItem key={m.id} m={m} idx={i} accent={A.redBright}/>)}</>}
            {ntsAF.length>0&&<><SecLabel label="⏳ A FAZER"/>{ntsAF.map((m,i)=><RowItem key={m.id} m={m} idx={i} accent={A.redBright} showTimer={false}/>)}</>}
          </div>}
      </div>
    ),
    recon:(()=>{
      const reconAll=[...reconAnd,...reconAF].sort((a,b)=>{
        const p=s=>s==="running"?0:s==="paused"?1:2;
        return p(a.timer_status)-p(b.timer_status);
      });
      return(
        <div style={{display:"flex",flexDirection:"column",height:"100%",gap:8,animation:"slideIn 0.35s ease"}}>
          <SlideHead title="RECONDICIONAMENTO" color={A.purple} count={reconAnd.length+reconAF.length+reconCon.length}/>
          {reconAll.length+reconCon.length===0?<Empty label="SEM MÁQUINAS EM RECONDICIONAMENTO"/>:
            <>
              {reconAll.length>0&&<BigBoard items={reconAll}/>}
              {reconCon.length>0&&(
                <div style={{flexShrink:0}}>
                  <SecLabel label="✓ CONCLUÍDAS (30 DIAS)"/>
                  <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:4}}>
                    {reconCon.map((m,i)=><RowItem key={m.id} m={m} idx={i} accent={A.green} showTimer={false} showDate/>)}
                  </div>
                </div>
              )}
            </>}
        </div>
      );
    })(),
    timeline:(
      <div style={{display:"flex",flexDirection:"column",height:"100%",animation:"slideIn 0.35s ease"}}>
        <SlideHead title="TIMELINE · 14 DIAS" color={A.red} count={
          machines.filter(m=>(m.estado?.startsWith("em-preparacao")||m.estado==="a-fazer")&&m.previsao_inicio).length}/>
        <GanttChart machines={[
          ...machines.filter(m=>m.estado?.startsWith("em-preparacao")&&m.previsao_inicio),
          ...machines.filter(m=>m.estado==="a-fazer"&&m.previsao_inicio),
        ]}/>
      </div>
    ),
    concluidas:(
      <div style={{display:"flex",flexDirection:"column",height:"100%",animation:"slideIn 0.35s ease"}}>
        <SlideHead title="CONCLUÍDAS — ESTA SEMANA" color={A.green} count={conSemana.length}/>
        {conSemana.length===0?<Empty label="NENHUMA CONCLUSÃO ESTA SEMANA AINDA"/>:
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {[...conSemana].sort((a,b)=>new Date(b.dataConclusao||b.updated_date)-new Date(a.dataConclusao||a.updated_date))
              .map((m,i)=><RowItem key={m.id} m={m} idx={i} accent={A.green} showTimer={false} showDate/>)}
          </div>}
      </div>
    ),
  };

  // KPIs
  const kpis=[
    {l:"ANDAMENTO",   v:andamento.length,         c:A.gold},
    {l:"PRIORITÁRIAS",v:prioritarias.length,       c:A.redBright},
    {l:"FILA ACP",    v:filaACP.length,            c:A.arc},
    {l:"NTS",         v:ntsAnd.length+ntsAF.length,c:A.redBright},
    {l:"RECON",       v:reconAnd.length+reconAF.length,c:A.purple},
    {l:"ESTA SEMANA", v:conSemana.length,          c:A.green},
    {l:"TOTAL 2026",  v:totalCon.length,           c:A.gold},
  ];

  return(
    <div style={{
      width:"100vw",height:"100vh",
      background:A.bg,color:A.hud,
      display:"flex",flexDirection:"column",
      fontFamily:"'Rajdhani',sans-serif",
      overflow:"hidden",position:"fixed",top:0,left:0,
    }}>
      <style>{STYLES}</style>

      {/* BACKGROUND LAYERS */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,
        background:`
          repeating-linear-gradient(0deg,transparent 0px,transparent 2px,rgba(200,16,46,0.02) 2px,rgba(200,16,46,0.02) 3px),
          radial-gradient(ellipse at 50% 100%,rgba(200,16,46,0.1),transparent 60%),
          radial-gradient(ellipse at 50% 0%,rgba(255,181,71,0.06),transparent 50%),
          linear-gradient(180deg,#0d0509 0%,#050204 100%)
        `}}/>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,opacity:0.4,
        backgroundImage:`linear-gradient(60deg,transparent 49%,rgba(255,181,71,0.025) 49%,rgba(255,181,71,0.025) 51%,transparent 51%),linear-gradient(-60deg,transparent 49%,rgba(255,181,71,0.025) 49%,rgba(255,181,71,0.025) 51%,transparent 51%)`,
        backgroundSize:"40px 70px"}}/>

      {/* ── HEADER ── */}
      <header style={{
        position:"relative",zIndex:10,
        display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",
        height:72,padding:"0 20px",flexShrink:0,
      }}>
        {/* gold/red separator line */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:2,
          background:`linear-gradient(90deg,transparent,${A.red} 20%,${A.gold} 50%,${A.red} 80%,transparent)`,
          boxShadow:`0 0 12px ${A.redGlow}`}}/>

        {/* BRAND */}
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <HelmetIcon/>
          <div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:"clamp(18px,1.5vw,24px)",fontWeight:900,
              letterSpacing:"0.2em",lineHeight:1,
              background:`linear-gradient(180deg,${A.goldBrt},${A.gold},${A.goldDeep})`,
              WebkitBackgroundClip:"text",backgroundClip:"text",WebkitTextFillColor:"transparent",
              filter:`drop-shadow(0 0 8px ${A.goldGlow})`}}>
              WATCHER <span style={{WebkitTextFillColor:A.redBright,fontSize:"0.7em",letterSpacing:"0.1em"}}>//</span> AO VIVO
            </div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"clamp(8px,0.65vw,10px)",
              letterSpacing:"0.3em",color:A.hudDim,marginTop:5}}>
              <span style={{color:A.arc,textShadow:`0 0 6px ${A.arc}`}}>● LIVE</span>
              {" · STILL OFICINA · STARK INDUSTRIES · SYNC 30s"}
            </div>
          </div>
        </div>

        {/* TABS */}
        <nav style={{
          display:"flex",gap:5,padding:5,
          background:`linear-gradient(180deg,rgba(40,14,20,0.9),rgba(20,7,11,0.9))`,
          border:`1px solid ${A.rim}`,
          clipPath:"polygon(14px 0,calc(100% - 14px) 0,100% 50%,calc(100% - 14px) 100%,14px 100%,0 50%)",
        }}>
          {SLIDES.map((s,i)=>{
            const active=i===slide;
            return(
              <button key={s.id} onClick={()=>goTo(i)} style={{
                fontFamily:"'Orbitron',monospace",fontSize:"clamp(9px,0.72vw,11px)",fontWeight:600,
                letterSpacing:"0.12em",padding:"8px 14px",cursor:"pointer",border:"none",
                clipPath:"polygon(7px 0,calc(100% - 7px) 0,100% 50%,calc(100% - 7px) 100%,7px 100%,0 50%)",
                background:active?`linear-gradient(180deg,${A.redBright},${A.redDeep})`:"rgba(20,7,11,0.6)",
                color:active?A.goldBrt:A.hudMute,
                boxShadow:active?`0 0 16px ${A.redGlow},inset 0 0 8px ${A.goldFaint}`:"none",
                textShadow:active?`0 0 8px rgba(0,0,0,0.6)`:"none",
                transition:"all 0.2s",
              }}>
                {s.label}
              </button>
            );
          })}
        </nav>

        {/* CLOCK + CONTROLS */}
        <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"flex-end"}}>
          <button onClick={()=>navigate("/")} style={{
            width:36,height:36,cursor:"pointer",border:`1px solid ${A.rim}`,
            background:`linear-gradient(180deg,rgba(80,20,30,0.6),rgba(30,10,15,0.8))`,
            color:A.gold,fontSize:14,display:"grid",placeItems:"center",
            clipPath:"polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)",
          }}>✕</button>
          <button onClick={prev} style={{
            width:36,height:36,cursor:"pointer",border:`1px solid ${A.rim}`,
            background:`linear-gradient(180deg,rgba(80,20,30,0.6),rgba(30,10,15,0.8))`,
            color:A.gold,fontSize:14,display:"grid",placeItems:"center",
            clipPath:"polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)",
          }}><ChevronLeft size={16}/></button>
          <button onClick={()=>setPaused(p=>!p)} style={{
            display:"flex",alignItems:"center",gap:6,
            padding:"8px 16px",cursor:"pointer",
            border:`1px solid ${A.gold}`,
            background:`linear-gradient(180deg,rgba(255,181,71,0.16),rgba(184,118,23,0.18))`,
            color:A.goldBrt,fontFamily:"'Orbitron',monospace",fontSize:"clamp(9px,0.7vw,11px)",
            letterSpacing:"0.12em",fontWeight:600,
            clipPath:"polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)",
            textShadow:`0 0 6px ${A.goldGlow}`,
          }}>
            {paused?<Play size={12}/>:<Pause size={12}/>}
            {paused?"RETOMAR":"PAUSAR"}
          </button>
          <button onClick={next} style={{
            width:36,height:36,cursor:"pointer",border:`1px solid ${A.rim}`,
            background:`linear-gradient(180deg,rgba(80,20,30,0.6),rgba(30,10,15,0.8))`,
            color:A.gold,fontSize:14,display:"grid",placeItems:"center",
            clipPath:"polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)",
          }}><ChevronRight size={16}/></button>
          <Clock/>
        </div>
      </header>

      {/* ── TELEMETRY BAR ── */}
      <div style={{
        position:"relative",zIndex:10,flexShrink:0,
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"5px 24px",
        background:`linear-gradient(180deg,rgba(40,14,20,0.7),rgba(20,7,11,0.7))`,
        borderTop:`1px solid rgba(255,181,71,0.12)`,borderBottom:`1px solid rgba(255,181,71,0.12)`,
        fontFamily:"'JetBrains Mono',monospace",fontSize:"clamp(8px,0.65vw,10px)",letterSpacing:"0.14em",
      }}>
        {[
          {label:"ARMOR",val:"NOMINAL",color:A.green},
          {label:"QUEUE",val:`${filaACP.length} PEND`,color:A.gold},
          {label:"SHIFT",val:`${andamento.length} ATIVOS`,color:A.arc},
          {label:"UTS",val:machines.filter(m=>m.estado==="uts").length,color:A.redBright},
          {label:"SYNC",val:"30s",color:A.hudDim},
          {label:"LAT",val:"live",color:A.hudDim},
        ].map((t,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{color:A.hudMute}}>{t.label}</span>
            <span style={{color:t.color,fontWeight:600,textShadow:t.color!==A.hudDim&&t.color!==A.hudMute?`0 0 8px ${t.color}55`:"none"}}>
              {t.val}
            </span>
          </div>
        ))}
      </div>

      {/* ── KPI STRIP ── */}
      <div style={{
        position:"relative",zIndex:10,flexShrink:0,
        display:"flex",gap:8,padding:"8px 20px",
        background:`linear-gradient(180deg,rgba(20,7,11,0.6),rgba(10,4,8,0.6))`,
        borderBottom:`1px solid ${A.rim}`,
      }}>
        {kpis.map((k,i)=>(
          <Plate key={i} style={{flex:1,padding:"8px 12px",textAlign:"center"}}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:"clamp(20px,1.8vw,28px)",fontWeight:900,
              color:k.c,letterSpacing:"0.04em",textShadow:`0 0 14px ${k.c}66`,lineHeight:1}}>
              {loading?"…":k.v}
            </div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"clamp(7px,0.58vw,9px)",
              color:A.hudMute,letterSpacing:"0.14em",marginTop:4}}>
              {k.l}
            </div>
          </Plate>
        ))}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{position:"relative",zIndex:10,flex:1,overflow:"hidden",padding:"12px 20px 10px"}}>
        {loading?(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
            height:"100%",gap:16}}>
            <ArcReactor size={60}/>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:13,letterSpacing:"0.3em",
              color:A.hudMute,animation:"blink 1.5s infinite"}}>
              INITIALIZING SYSTEMS…
            </div>
          </div>
        ):(slides[SLIDES[slide].id])}
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        position:"relative",zIndex:10,flexShrink:0,
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"6px 20px",
        background:`linear-gradient(180deg,rgba(20,7,11,0.8),rgba(10,4,8,0.9))`,
        borderTop:`1px solid rgba(255,181,71,0.1)`,
      }}>
        {/* JORDAN */}
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:"50%",overflow:"hidden",flexShrink:0,
            border:`1.5px solid ${A.rimStrong}`,boxShadow:`0 0 12px ${A.goldGlow}`}}>
            <img src={JORDAN_URL} alt="Jordan" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          </div>
          <div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:"clamp(8px,0.65vw,10px)",
              fontWeight:700,letterSpacing:"0.2em",color:A.gold}}>JORDAN</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"clamp(7px,0.55vw,8px)",
              color:A.hudMute,letterSpacing:"0.14em"}}>GUARDIAN · ACP OPS</div>
          </div>
        </div>

        {/* Slide progress dots */}
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {SLIDES.map((_,i)=>(
            <button key={i} onClick={()=>goTo(i)} style={{
              width:i===slide?24:7,height:7,border:"none",cursor:"pointer",
              borderRadius:4,transition:"all 0.3s",
              background:i===slide?`linear-gradient(90deg,${A.red},${A.gold})`:A.hudMute+"55",
              boxShadow:i===slide?`0 0 8px ${A.redGlow}`:"none",
            }}/>
          ))}
        </div>

        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"clamp(7px,0.6vw,9px)",
          color:A.hudMute,letterSpacing:"0.14em",textAlign:"right"}}>
          STARK PORTAL · STILL OFICINA · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
