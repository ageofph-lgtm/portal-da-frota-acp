import React, { useState, useEffect, useRef, useCallback } from "react";
import { Activity, Flag, CheckCircle2, ListOrdered, Sun, Moon,
         ChevronLeft, ChevronRight, Pause, Play, Wrench } from "lucide-react";

// ── Config ────────────────────────────────────────────────────────────────────
const BRIDGE_URL    = "https://watcherweb.base44.app/api/functions/saganBridge";
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

// ── Design ────────────────────────────────────────────────────────────────────
const C = {
  pink:"#FF2D78", blue:"#4D9FFF", green:"#22C55E",
  yellow:"#F59E0B", purple:"#9B5CF6", bronze:"#CD7F32", silver:"#C0C0C0",
};
const DT = d => ({
  bg:      d?"#06060d":"#eef0f7",
  surface: d?"#0d0d1c":"#ffffff",
  card:    d?"#0f0f22":"#f4f5fc",
  cardB:   d?"#12122a":"#ecedf8",
  line:    d?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)",
  sub:     d?"rgba(255,255,255,0.09)":"rgba(0,0,0,0.09)",
  text:    d?"#e4e6ff":"#0b0c18",
  muted:   d?"rgba(228,230,255,0.38)":"rgba(11,12,24,0.4)",
  ...C,
});

// ── Live timer ────────────────────────────────────────────────────────────────
function useLiveTimer(m){
  const [e,sE]=useState(0);
  useEffect(()=>{
    const acc=m.timer_accumulated_seconds||0,run=m.timer_status==="running",at=m.timer_started_at?new Date(m.timer_started_at).getTime():null;
    if(run&&at){const u=()=>sE(acc+Math.floor((Date.now()-at)/1000));u();const id=setInterval(u,1000);return()=>clearInterval(id);}
    else sE(acc);
  },[m.timer_status,m.timer_started_at,m.timer_accumulated_seconds]);
  return e;
}

// ── Clock ─────────────────────────────────────────────────────────────────────
function Clock({D}){
  const [n,sN]=useState(new Date());
  useEffect(()=>{const id=setInterval(()=>sN(new Date()),1000);return()=>clearInterval(id);},[]);
  return(
    <div style={{textAlign:"right",lineHeight:1.1}}>
      <div style={{fontFamily:"'Orbitron',monospace",fontSize:"17px",fontWeight:900,color:D.text,letterSpacing:"0.06em"}}>{n.toLocaleTimeString("pt-PT")}</div>
      <div style={{fontFamily:"monospace",fontSize:"8px",color:D.muted,textTransform:"uppercase",letterSpacing:"0.05em"}}>{n.toLocaleDateString("pt-PT",{weekday:"long",day:"2-digit",month:"short"})}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  BIG BOARD CELL — card compacto adaptável (usado em Em Andamento)
//  Tamanho adapta-se automaticamente ao nº de itens via CSS grid auto-fit
// ─────────────────────────────────────────────────────────────────────────────
function BoardCell({m, D}){
  const elapsed = useLiveTimer(m);
  const run    = m.timer_status==="running";
  const prio   = m.prioridade===true;
  const recon  = m.recondicao||{};
  const rColor = recon.prata?D.silver:recon.bronze?D.bronze:null;
  const rLabel = recon.prata?"PRATA":recon.bronze?"BRONZE":null;
  const tasks  = m.tarefas||[];
  const done   = tasks.filter(t=>t.concluida).length;
  const pct    = tasks.length?Math.round(done/tasks.length*100):0;
  const barCol = run?D.green:D.yellow;

  return(
    <div style={{
      background:D.card,
      border:`1px solid ${prio?D.yellow+"44":D.line}`,
      borderTop:`3px solid ${barCol}`,
      borderRadius:"8px",
      padding:"10px 12px",
      display:"flex",flexDirection:"column",gap:"6px",
      boxShadow:run?`0 0 14px ${D.green}18`:"none",
      overflow:"hidden",
    }}>
      {/* NS — protagonista */}
      <div style={{fontFamily:"'Orbitron',monospace",fontSize:"13px",fontWeight:900,
        color:D.blue,letterSpacing:"0.06em",textShadow:`0 0 10px ${D.blue}55`,
        whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
        {m.serie||"—"}
      </div>
      {/* Modelo */}
      <div style={{fontFamily:"monospace",fontSize:"10px",color:D.text,opacity:0.65,
        whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginTop:"-3px"}}>
        {m.modelo||"—"}
      </div>

      {/* Badges */}
      {(prio||rLabel)&&(
        <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
          {prio&&<span style={{fontFamily:"monospace",fontSize:"7px",padding:"1px 5px",borderRadius:"20px",
            background:`${D.yellow}18`,color:D.yellow,border:`1px solid ${D.yellow}44`}}>⚑ PRIO</span>}
          {rLabel&&<span style={{fontFamily:"monospace",fontSize:"7px",padding:"1px 5px",borderRadius:"20px",
            background:`${rColor}18`,color:rColor,border:`1px solid ${rColor}44`}}>⬡ {rLabel}</span>}
        </div>
      )}

      {/* Tarefas compactas */}
      {tasks.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:"3px"}}>
          {tasks.map((t,i)=>(
            <span key={i} style={{fontFamily:"monospace",fontSize:"8px",padding:"1px 6px",borderRadius:"20px",
              background:t.concluida?`${D.green}14`:`${D.blue}14`,
              color:t.concluida?D.green:D.blue,
              border:`1px solid ${t.concluida?D.green:D.blue}2A`,
              textDecoration:t.concluida?"line-through":"none"}}>
              {t.texto}
            </span>
          ))}
        </div>
      )}

      {/* Progress */}
      {tasks.length>0&&(
        <div style={{height:"2px",borderRadius:"2px",background:D.sub,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,
            background:`linear-gradient(90deg,${D.pink},${D.blue})`,transition:"width 0.5s"}}/>
        </div>
      )}

      {/* Timer — fundo */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:"auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
          <div style={{width:"5px",height:"5px",borderRadius:"50%",background:barCol,
            animation:run?"blink 1.2s ease-in-out infinite":"none"}}/>
          <span style={{fontFamily:"monospace",fontSize:"7px",color:D.muted,letterSpacing:"0.08em"}}>
            {run?"EM CURSO":"PAUSADO"}
          </span>
        </div>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"14px",fontWeight:900,
          color:barCol,letterSpacing:"0.04em",textShadow:`0 0 8px ${barCol}55`}}>
          {fmtHMS(elapsed)}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  BIG BOARD — grid auto sem scroll. Calcula minmax com base no nº de itens
// ─────────────────────────────────────────────────────────────────────────────
function BigBoard({items, D}){
  // Ajusta o min-width das células conforme quantidade
  const n = items.length;
  const minW = n<=6?"260px":n<=9?"220px":n<=12?"190px":n<=16?"165px":"145px";
  return(
    <div style={{
      display:"grid",
      gridTemplateColumns:`repeat(auto-fill,minmax(${minW},1fr))`,
      gap:"8px",
      alignContent:"start",
    }}>
      {items.map(m=><BoardCell key={m.id} m={m} D={D}/>)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  CALENDAR FILA — sem scroll, compacto, tudo visível
// ─────────────────────────────────────────────────────────────────────────────
function CalendarFila({items, D}){
  const monday = getMondayUTC(), friday = getFridayUTC();
  const days   = Array.from({length:5},(_,i)=>{ const d=new Date(monday); d.setUTCDate(monday.getUTCDate()+i); return d; });
  const todayStr = new Date().toISOString().slice(0,10);

  const withPrev    = items.filter(m=>{ if(!m.previsao_inicio)return false; const d=new Date(m.previsao_inicio); return d>=monday&&d<=friday; });
  const withoutPrev = items.filter(m=>!m.previsao_inicio);
  const futuras     = items.filter(m=>{ if(!m.previsao_inicio)return false; return new Date(m.previsao_inicio)>friday; });

  const byDay={};
  withPrev.forEach(m=>{ const k=new Date(m.previsao_inicio).toISOString().slice(0,10); if(!byDay[k])byDay[k]=[]; byDay[k].push(m); });

  return(
    <div style={{display:"flex",flexDirection:"column",gap:"10px",height:"100%"}}>

      {/* ── Calendário semanal ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"8px",flexShrink:0}}>
        {days.map(d=>{
          const key=d.toISOString().slice(0,10), isToday=key===todayStr, ms=byDay[key]||[];
          return(
            <div key={key} style={{background:D.card,border:`1.5px solid ${isToday?D.blue+"66":D.line}`,
              borderRadius:"10px",overflow:"hidden"}}>
              {/* Header dia */}
              <div style={{padding:"7px 10px",background:isToday?`${D.blue}14`:D.sub+"33",
                borderBottom:`1px solid ${isToday?D.blue+"33":D.line}`,
                display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontFamily:"'Orbitron',monospace",fontSize:"10px",fontWeight:900,
                  color:isToday?D.blue:D.muted,letterSpacing:"0.1em",textTransform:"uppercase"}}>
                  {d.toLocaleDateString("pt-PT",{weekday:"short"})}
                </span>
                <span style={{fontFamily:"monospace",fontSize:"9px",color:isToday?D.blue:D.muted}}>
                  {d.toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"})}
                </span>
                {isToday&&<div style={{width:"5px",height:"5px",borderRadius:"50%",background:D.blue,animation:"blink 1.5s ease-in-out infinite"}}/>}
              </div>
              {/* Máquinas */}
              <div style={{padding:"7px 8px",display:"flex",flexDirection:"column",gap:"5px",minHeight:"60px"}}>
                {ms.length===0
                  ?<div style={{fontFamily:"monospace",fontSize:"9px",color:D.sub,textAlign:"center",paddingTop:"8px"}}>—</div>
                  :ms.map((m,i)=>(
                    <div key={i} style={{padding:"6px 8px",background:D.cardB,
                      borderLeft:`3px solid ${m.prioridade?D.yellow:D.blue}`,
                      borderRadius:"5px",overflow:"hidden"}}>
                      {/* NS grande */}
                      <div style={{fontFamily:"'Orbitron',monospace",fontSize:"11px",fontWeight:900,
                        color:D.blue,letterSpacing:"0.05em",
                        whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                        textShadow:`0 0 8px ${D.blue}44`}}>
                        {m.serie||"—"}
                      </div>
                      {/* Modelo */}
                      <div style={{fontFamily:"monospace",fontSize:"8px",color:D.muted,marginTop:"2px",
                        whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {m.modelo}
                      </div>
                      {/* Tarefas tiny */}
                      {(m.tarefas||[]).length>0&&(
                        <div style={{display:"flex",gap:"3px",flexWrap:"wrap",marginTop:"4px"}}>
                          {m.tarefas.map((t,j)=>(
                            <span key={j} style={{fontFamily:"monospace",fontSize:"7px",padding:"1px 5px",
                              borderRadius:"20px",background:`${D.blue}14`,color:D.blue,
                              border:`1px solid ${D.blue}25`}}>
                              {t.texto}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Fila sem previsão + Semanas seguintes (linha única compacta) ── */}
      {(withoutPrev.length>0||futuras.length>0)&&(
        <div style={{display:"grid",gridTemplateColumns:withoutPrev.length&&futuras.length?"1fr 1fr":"1fr",
          gap:"10px",flexShrink:0}}>

          {withoutPrev.length>0&&(
            <div>
              <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.1em",color:D.muted,marginBottom:"6px"}}>
                SEM PREVISÃO — {withoutPrev.length}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                {withoutPrev.map((m,i)=>(
                  <div key={i} style={{background:D.card,border:`1px solid ${D.line}`,
                    borderLeft:`3px solid ${m.prioridade?D.yellow:D.blue}`,
                    borderRadius:"6px",padding:"7px 10px",
                    display:"flex",alignItems:"center",gap:"10px",overflow:"hidden"}}>
                    {m.prioridade&&<Flag size={9} color={D.yellow} style={{flexShrink:0}}/>}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:"'Orbitron',monospace",fontSize:"12px",fontWeight:800,
                        color:D.blue,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {m.serie||"—"}
                      </div>
                      <div style={{fontFamily:"monospace",fontSize:"9px",color:D.muted,marginTop:"1px"}}>
                        {m.modelo}
                      </div>
                    </div>
                    {(m.tarefas||[]).length>0&&(
                      <div style={{display:"flex",gap:"3px",flexShrink:0}}>
                        {m.tarefas.slice(0,3).map((t,j)=>(
                          <span key={j} style={{fontFamily:"monospace",fontSize:"7px",padding:"1px 5px",
                            borderRadius:"20px",background:`${D.blue}14`,color:D.blue,border:`1px solid ${D.blue}25`}}>
                            {t.texto}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {futuras.length>0&&(
            <div>
              <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px"}}>
                <div style={{width:"3px",height:"18px",borderRadius:"2px",background:`linear-gradient(180deg,${D.blue},${D.pink})`}}/>
                <span style={{fontFamily:"'Orbitron',monospace",fontSize:"10px",fontWeight:800,
                  letterSpacing:"0.1em",color:D.blue}}>SEMANAS SEGUINTES</span>
                <span style={{fontFamily:"'Orbitron',monospace",fontSize:"14px",fontWeight:900,color:D.blue}}>{futuras.length}</span>
                <div style={{flex:1,height:"1px",background:`linear-gradient(90deg,${D.blue}44,transparent)`}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                {futuras.map((m,i)=>{
                  const dt=new Date(m.previsao_inicio);
                  const label=dt.toLocaleDateString("pt-PT",{weekday:"short",day:"2-digit",month:"2-digit"});
                  return(
                    <div key={i} style={{background:D.card,
                      border:`1px solid ${D.blue}22`,
                      borderLeft:`3px solid ${D.blue}`,
                      borderRadius:"6px",
                      padding:"8px 12px",display:"flex",alignItems:"center",gap:"12px",overflow:"hidden"}}>
                      {/* Data em destaque */}
                      <div style={{flexShrink:0,textAlign:"center",
                        background:`${D.blue}14`,border:`1px solid ${D.blue}33`,
                        borderRadius:"6px",padding:"5px 10px",minWidth:"72px"}}>
                        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"9px",fontWeight:900,
                          color:D.blue,letterSpacing:"0.08em",textTransform:"uppercase"}}>
                          {dt.toLocaleDateString("pt-PT",{weekday:"short"})}
                        </div>
                        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"13px",fontWeight:900,
                          color:D.blue,letterSpacing:"0.04em",marginTop:"1px"}}>
                          {dt.toLocaleDateString("pt-PT",{day:"2-digit",month:"2-digit"})}
                        </div>
                      </div>
                      {/* Info máquina */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"13px",fontWeight:800,
                          color:D.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                          textShadow:`0 0 8px ${D.blue}33`}}>
                          {m.serie||"—"}
                        </div>
                        <div style={{fontFamily:"monospace",fontSize:"9px",color:D.muted,marginTop:"2px"}}>{m.modelo}</div>
                      </div>
                      {m.prioridade&&<Flag size={12} color={D.yellow} style={{flexShrink:0}}/>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ROW ITEM — linha compacta (Prioritárias, NTS, Recon, Concluídas)
// ─────────────────────────────────────────────────────────────────────────────
function RowItem({m, idx, D, accent, showTimer=true, showDate=false}){
  const elapsed = useLiveTimer(m);
  const run     = m.timer_status==="running";
  const tasks   = m.tarefas||[];
  const done    = tasks.filter(t=>t.concluida).length;
  const pct     = tasks.length?Math.round(done/tasks.length*100):0;
  const prio    = m.prioridade===true;
  const recon   = m.recondicao||{};
  const rColor  = recon.prata?D.silver:recon.bronze?D.bronze:null;
  const rLabel  = recon.prata?"PRATA":recon.bronze?"BRONZE":null;
  const isCon   = m.estado?.startsWith("concluida")||m.estado==="concluida";
  const isAct   = m.estado?.startsWith("em-preparacao");
  const barCol  = isCon?D.green:isAct?(run?D.green:D.yellow):D.sub;

  return(
    <div style={{
      display:"grid",
      gridTemplateColumns:"38% 1fr auto",
      alignItems:"center",gap:0,
      background:idx%2===0?D.card:D.cardB,
      border:`1px solid ${prio?D.yellow+"33":D.line}`,
      borderLeft:`3px solid ${barCol}`,
      borderRadius:"7px",overflow:"hidden",
      minHeight:"52px",
    }}>
      {/* Col A — NS + Modelo + badges */}
      <div style={{padding:"9px 14px",borderRight:`1px solid ${D.line}`,minWidth:0}}>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"14px",fontWeight:900,
          color:accent,letterSpacing:"0.07em",textShadow:`0 0 10px ${accent}44`,
          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
          {m.serie||"—"}
        </div>
        <div style={{fontFamily:"monospace",fontSize:"9px",color:D.text,opacity:0.6,marginTop:"2px",
          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
          {m.modelo}
        </div>
        {(prio||rLabel)&&(
          <div style={{display:"flex",gap:"4px",marginTop:"3px",flexWrap:"wrap"}}>
            {prio&&<span style={{fontFamily:"monospace",fontSize:"7px",padding:"1px 5px",borderRadius:"20px",
              background:`${D.yellow}18`,color:D.yellow,border:`1px solid ${D.yellow}44`}}>⚑ PRIO</span>}
            {rLabel&&<span style={{fontFamily:"monospace",fontSize:"7px",padding:"1px 5px",borderRadius:"20px",
              background:`${rColor}18`,color:rColor,border:`1px solid ${rColor}44`}}>⬡ {rLabel}</span>}
          </div>
        )}
      </div>

      {/* Col B — Tarefas + barra */}
      <div style={{padding:"9px 12px",minWidth:0}}>
        {tasks.length===0
          ?<span style={{fontFamily:"monospace",fontSize:"8px",color:D.sub}}>SEM TAREFAS</span>
          :<>
            <div style={{display:"flex",flexWrap:"wrap",gap:"4px",marginBottom:"5px"}}>
              {tasks.map((t,i)=>(
                <span key={i} style={{fontFamily:"monospace",fontSize:"8px",padding:"1px 7px",
                  borderRadius:"20px",
                  background:t.concluida?`${D.green}14`:`${accent}14`,
                  color:t.concluida?D.green:accent,
                  border:`1px solid ${t.concluida?D.green:accent}2A`,
                  textDecoration:t.concluida?"line-through":"none"}}>
                  {t.texto}
                </span>
              ))}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
              <div style={{flex:1,height:"2px",borderRadius:"2px",background:D.sub,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${pct}%`,
                  background:`linear-gradient(90deg,${D.pink},${D.blue})`,transition:"width 0.5s"}}/>
              </div>
              <span style={{fontFamily:"monospace",fontSize:"7px",color:D.muted,flexShrink:0}}>{done}/{tasks.length}</span>
            </div>
          </>}
      </div>

      {/* Col C — Timer ou Data */}
      <div style={{padding:"9px 14px",borderLeft:`1px solid ${D.line}`,
        display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"3px",minWidth:"120px"}}>
        {showTimer&&(
          <>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:"16px",fontWeight:900,
              color:barCol,letterSpacing:"0.04em",textShadow:`0 0 8px ${barCol}44`}}>
              {fmtHMS(elapsed)}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
              <div style={{width:"5px",height:"5px",borderRadius:"50%",background:barCol,
                animation:(run&&!isCon)?"blink 1.2s ease-in-out infinite":"none"}}/>
              <span style={{fontFamily:"monospace",fontSize:"7px",color:D.muted,letterSpacing:"0.08em"}}>
                {isCon?"CONCLUÍDA":run?"EM CURSO":"PAUSADO"}
              </span>
            </div>
          </>
        )}
        {showDate&&(
          <>
            <div style={{fontFamily:"monospace",fontSize:"13px",fontWeight:700,color:D.green}}>
              {fmtDate(m.dataConclusao||m.updated_date)}
            </div>
            {m.timer_accumulated_seconds>0&&(
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:"10px",color:D.muted}}>
                {fmtHMS(m.timer_accumulated_seconds)}
              </div>
            )}
          </>
        )}
        {!showTimer&&!showDate&&(
          <span style={{fontFamily:"monospace",fontSize:"8px",padding:"3px 8px",borderRadius:"20px",
            background:`${D.muted}12`,color:D.muted,border:`1px solid ${D.sub}`}}>FILA</span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION LABEL
// ─────────────────────────────────────────────────────────────────────────────
function SecLabel({label,D}){
  return(
    <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.12em",
      color:D.muted,padding:"6px 0 2px",flexShrink:0}}>
      {label}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SLIDE HEADER
// ─────────────────────────────────────────────────────────────────────────────
function SlideHead({title,icon,color,pulse,count,D}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:"10px",flexShrink:0,marginBottom:"10px"}}>
      <div style={{color,filter:`drop-shadow(0 0 5px ${color})`}}>{icon}</div>
      <span style={{fontFamily:"'Orbitron',monospace",fontSize:"14px",fontWeight:900,
        letterSpacing:"0.14em",color,textShadow:`0 0 12px ${color}55`}}>{title}</span>
      {count!==undefined&&<span style={{fontFamily:"'Orbitron',monospace",fontSize:"20px",
        fontWeight:900,color}}>{count}</span>}
      {pulse&&<div style={{width:"7px",height:"7px",borderRadius:"50%",background:color,
        animation:"blink 1s ease-in-out infinite"}}/>}
      <div style={{flex:1,height:"1px",background:`linear-gradient(90deg,${color}44,transparent)`}}/>
    </div>
  );
}

function Empty({label,D}){
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",flex:1,
      color:D.muted,fontFamily:"monospace",fontSize:"11px",letterSpacing:"0.1em"}}>
      {label}
    </div>
  );
}

// ── SLIDES list ───────────────────────────────────────────────────────────────
const SLIDES=[
  {id:"andamento",    label:"EM ANDAMENTO"},
  {id:"prioritarias", label:"PRIORITÁRIAS"},
  {id:"fila_acp",     label:"FILA ACP"},
  {id:"nts",          label:"NTS"},
  {id:"recon",        label:"RECOND."},
  {id:"concluidas",   label:"CONCLUÍDAS"},
];

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function AoVivo(){
  const [dark,sDark] = useState(()=>{ try{return localStorage.getItem("theme")!=="light";}catch{return true;} });
  const [machines,sM] = useState([]);
  const [loading,sL]  = useState(true);
  const [slide,sSlide]= useState(0);
  const [prog,sProg]  = useState(0);
  const [paused,sPaused]=useState(false);

  const D = DT(dark);
  const startRef=useRef(Date.now()), timerRef=useRef(null), progRef=useRef(null);

  const fetch0=useCallback(async()=>{
    try{const d=await callBridge({action:"list",entity:"FrotaACP"});sM((d||[]).filter(m=>!m.arquivada));}
    catch(e){console.warn(e);}finally{sL(false);}
  },[]);
  useEffect(()=>{fetch0();const id=setInterval(fetch0,30000);return()=>clearInterval(id);},[fetch0]);

  const goTo=useCallback(i=>{sSlide(i);sProg(0);startRef.current=Date.now();},[]);
  const next=useCallback(()=>goTo((slide+1)%SLIDES.length),[slide,goTo]);
  const prev=useCallback(()=>goTo((slide-1+SLIDES.length)%SLIDES.length),[slide,goTo]);

  useEffect(()=>{
    if(paused){clearTimeout(timerRef.current);clearInterval(progRef.current);return;}
    const el=Date.now()-startRef.current;
    timerRef.current=setTimeout(next,Math.max(SLIDE_DURATION-el,0));
    progRef.current=setInterval(()=>sProg(Math.min((Date.now()-startRef.current)/SLIDE_DURATION,1)),100);
    return()=>{clearTimeout(timerRef.current);clearInterval(progRef.current);};
  },[slide,paused,next]);

  useEffect(()=>{
    const h=e=>{
      if(e.key==="ArrowRight")next();
      if(e.key==="ArrowLeft")prev();
      if(e.key===" "){e.preventDefault();sPaused(p=>!p);}
    };
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);
  },[next,prev]);

  // ── Filtros ──────────────────────────────────────────────────────────────
  const monday=getMondayUTC();
  const isRecon=m=>{const r=m.recondicao||{};return r.bronze===true||r.prata===true;};
  const r30=new Date(Date.now()-30*24*3600*1000);

  const andamento    = machines.filter(m=>m.estado?.startsWith("em-preparacao"));
  const prioritarias = machines.filter(m=>m.prioridade===true&&!m.estado?.startsWith("concluida")&&m.estado!=="concluida");
  const filaACP      = machines.filter(m=>m.estado==="a-fazer"&&m.tipo!=="nova");
  const ntsAnd       = machines.filter(m=>m.tipo==="nova"&&m.estado?.startsWith("em-preparacao"));
  const ntsAF        = machines.filter(m=>m.tipo==="nova"&&m.estado==="a-fazer");
  const reconAnd     = machines.filter(m=>isRecon(m)&&m.estado?.startsWith("em-preparacao"));
  const reconAF      = machines.filter(m=>isRecon(m)&&m.estado==="a-fazer");
  const reconCon     = machines.filter(m=>{
    if(!isRecon(m))return false;
    if(!m.estado?.startsWith("concluida")&&m.estado!=="concluida")return false;
    const raw=m.dataConclusao||m.updated_date;if(!raw)return false;
    try{return new Date(raw)>=r30;}catch{return false;}
  });
  const conSemana=machines.filter(m=>{
    if(!m.estado?.startsWith("concluida")&&m.estado!=="concluida")return false;
    const raw=m.dataConclusao||m.updated_date;if(!raw)return false;
    try{return new Date(raw)>=monday;}catch{return false;}
  });
  const totalCon=machines.filter(m=>m.estado?.startsWith("concluida")||m.estado==="concluida");

  // ── Slide renders ─────────────────────────────────────────────────────────
  const slides={
    andamento:(
      <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
        <SlideHead title="EM ANDAMENTO" icon={<Activity size={16}/>} color={D.blue} D={D} count={andamento.length}/>
        {andamento.length===0?<Empty label="Nenhuma máquina em produção" D={D}/>:<BigBoard items={andamento} D={D}/>}
      </div>
    ),
    prioritarias:(
      <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
        <SlideHead title="PRIORITÁRIAS" icon={<Flag size={16}/>} color={D.yellow} pulse D={D} count={prioritarias.length}/>
        {prioritarias.length===0?<Empty label="Sem prioritárias activas ✓" D={D}/>:
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            {prioritarias.map((m,i)=><RowItem key={m.id} m={m} idx={i} D={D} accent={D.yellow}/>)}
          </div>}
      </div>
    ),
    fila_acp:(
      <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
        <SlideHead title="FILA — ACP" icon={<ListOrdered size={16}/>} color={D.blue} D={D} count={filaACP.length}/>
        {filaACP.length===0?<Empty label="Fila ACP vazia" D={D}/>:<CalendarFila items={filaACP} D={D}/>}
      </div>
    ),
    nts:(
      <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
        <SlideHead title="NTS" icon={<ListOrdered size={16}/>} color={D.pink} D={D} count={ntsAnd.length+ntsAF.length}/>
        {ntsAnd.length+ntsAF.length===0?<Empty label="Sem máquinas NTS" D={D}/>:
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            {ntsAnd.length>0&&<><SecLabel label="▶ EM ANDAMENTO" D={D}/>{ntsAnd.map((m,i)=><RowItem key={m.id} m={m} idx={i} D={D} accent={D.pink}/>)}</>}
            {ntsAF.length>0&&<><SecLabel label="⏳ A FAZER" D={D}/>{ntsAF.map((m,i)=><RowItem key={m.id} m={m} idx={i} D={D} accent={D.pink} showTimer={false}/>)}</>}
          </div>}
      </div>
    ),
    recon:(
      <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
        <SlideHead title="RECONDICIONAMENTO" icon={<Wrench size={16}/>} color={D.purple} D={D} count={reconAnd.length+reconAF.length+reconCon.length}/>
        {reconAnd.length+reconAF.length+reconCon.length===0?<Empty label="Sem máquinas em recondicionamento" D={D}/>:
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            {reconAnd.length>0&&<><SecLabel label="▶ EM ANDAMENTO" D={D}/>{reconAnd.map((m,i)=><RowItem key={m.id} m={m} idx={i} D={D} accent={D.purple}/>)}</>}
            {reconAF.length>0&&<><SecLabel label="⏳ A FAZER" D={D}/>{reconAF.map((m,i)=><RowItem key={m.id} m={m} idx={i} D={D} accent={D.purple} showTimer={false}/>)}</>}
            {reconCon.length>0&&<><SecLabel label="✓ CONCLUÍDAS (30 DIAS)" D={D}/>{reconCon.map((m,i)=><RowItem key={m.id} m={m} idx={i} D={D} accent={D.green} showTimer={false} showDate/>)}</>}
          </div>}
      </div>
    ),
    concluidas:(
      <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
        <SlideHead title="CONCLUÍDAS — ESTA SEMANA" icon={<CheckCircle2 size={16}/>} color={D.green} D={D} count={conSemana.length}/>
        {conSemana.length===0?<Empty label="Nenhuma conclusão esta semana ainda" D={D}/>:
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            {[...conSemana].sort((a,b)=>new Date(b.dataConclusao||b.updated_date)-new Date(a.dataConclusao||a.updated_date))
              .map((m,i)=><RowItem key={m.id} m={m} idx={i} D={D} accent={D.green} showTimer={false} showDate/>)}
          </div>}
      </div>
    ),
  };

  // KPIs
  const kpis=[
    {l:"ANDAMENTO",   v:andamento.length,            c:D.blue  },
    {l:"PRIORITÁRIAS",v:prioritarias.length,         c:D.yellow},
    {l:"FILA ACP",    v:filaACP.length,               c:D.muted },
    {l:"NTS",         v:ntsAnd.length+ntsAF.length,  c:D.pink  },
    {l:"RECON",       v:reconAnd.length+reconAF.length,c:D.purple},
    {l:"ESTA SEMANA", v:conSemana.length,             c:D.green },
    {l:"TOTAL 2026",  v:totalCon.length,              c:D.sub   },
  ];

  return(
    <div style={{width:"100vw",height:"100vh",background:D.bg,color:D.text,
      display:"flex",flexDirection:"column",fontFamily:"system-ui,sans-serif",
      overflow:"hidden",position:"fixed",top:0,left:0}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap');
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}
        ::-webkit-scrollbar{width:0;height:0}
        *{box-sizing:border-box}
      `}</style>

      {/* ── TOPBAR ── */}
      <div style={{display:"flex",alignItems:"center",gap:"10px",
        padding:"7px 18px",background:D.surface,
        borderBottom:`1px solid rgba(255,45,120,0.12)`,flexShrink:0,flexWrap:"wrap"}}>

        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:"9px",flexShrink:0}}>
          <img src="https://media.base44.com/images/public/69c166ad19149fb0c07883cb/a35751fd9_Gemini_Generated_Image_scmohbscmohbscmo1.png"
            alt="" style={{width:"28px",height:"28px",objectFit:"contain",filter:`drop-shadow(0 0 5px ${D.pink}88)`}}/>
          <div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:"11px",fontWeight:900,
              letterSpacing:"0.13em",color:D.pink}}>
              WATCHER <span style={{color:D.muted,fontSize:"7px",fontWeight:400}}>/ AO VIVO</span>
            </div>
            <div style={{fontFamily:"monospace",fontSize:"6px",color:D.muted,letterSpacing:"0.08em"}}>
              LIVE · AUTO-REFRESH 30s
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:"3px",flex:1,justifyContent:"center",flexWrap:"wrap"}}>
          {SLIDES.map((s,i)=>(
            <button key={s.id} onClick={()=>goTo(i)} style={{
              fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.06em",
              padding:"4px 10px",borderRadius:"20px",cursor:"pointer",border:"none",
              background:i===slide?`linear-gradient(135deg,${D.pink},${D.blue})`:D.sub,
              color:i===slide?"#fff":D.muted,
              fontWeight:i===slide?700:400,transition:"all 0.2s",
            }}>{s.label}</button>
          ))}
        </div>

        {/* Controles */}
        <div style={{display:"flex",alignItems:"center",gap:"6px",flexShrink:0}}>
          <Clock D={D}/>
          <button onClick={prev} style={{background:"transparent",border:`1px solid ${D.sub}`,borderRadius:"5px",padding:"3px 5px",cursor:"pointer",color:D.muted,display:"flex"}}><ChevronLeft size={12}/></button>
          <button onClick={()=>sPaused(p=>!p)} style={{background:paused?`${D.yellow}18`:"transparent",border:`1px solid ${paused?D.yellow:D.sub}`,borderRadius:"5px",padding:"3px 7px",cursor:"pointer",color:paused?D.yellow:D.muted,display:"flex",alignItems:"center",gap:"3px"}}>
            {paused?<Play size={10}/>:<Pause size={10}/>}
            <span style={{fontFamily:"monospace",fontSize:"7px"}}>{paused?"RETOMAR":"PAUSAR"}</span>
          </button>
          <button onClick={next} style={{background:"transparent",border:`1px solid ${D.sub}`,borderRadius:"5px",padding:"3px 5px",cursor:"pointer",color:D.muted,display:"flex"}}><ChevronRight size={12}/></button>
          <button onClick={()=>{sDark(d=>!d);localStorage.setItem("theme",dark?"light":"dark");}} style={{background:"transparent",border:`1px solid ${D.sub}`,borderRadius:"5px",padding:"3px 5px",cursor:"pointer",color:D.muted,display:"flex"}}>
            {dark?<Sun size={11}/>:<Moon size={11}/>}
          </button>
          <div style={{display:"flex",alignItems:"center",gap:"3px"}}>
            <div style={{width:"5px",height:"5px",borderRadius:"50%",background:D.green,animation:"blink 1.5s ease-in-out infinite"}}/>
            <span style={{fontFamily:"monospace",fontSize:"7px",color:D.muted}}>LIVE</span>
          </div>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div style={{height:"2px",background:D.sub,flexShrink:0}}>
        <div style={{height:"100%",width:`${prog*100}%`,
          background:`linear-gradient(90deg,${D.pink},${D.blue})`,transition:"width 0.1s linear"}}/>
      </div>

      {/* KPI BAR */}
      <div style={{display:"flex",gap:"1px",background:"rgba(255,45,120,0.06)",
        borderBottom:`1px solid rgba(255,45,120,0.08)`,flexShrink:0}}>
        {kpis.map(k=>(
          <div key={k.l} style={{flex:1,background:D.surface,padding:"5px 6px",
            display:"flex",flexDirection:"column",alignItems:"center",gap:"1px"}}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:"17px",fontWeight:900,color:k.c}}>
              {loading?"…":k.v}
            </div>
            <div style={{fontFamily:"monospace",fontSize:"6px",color:D.muted,
              letterSpacing:"0.07em",textAlign:"center"}}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* ── SLIDE CONTENT — ocupa tudo, sem overflow ── */}
      <div style={{flex:1,padding:"14px 20px",overflow:"hidden",display:"flex",flexDirection:"column",position:"relative"}}>
        {/* Jordan mascote */}
        <div style={{
          position:"absolute",bottom:0,right:0,
          width:"38%",maxWidth:"340px",
          pointerEvents:"none",
          zIndex:0,
          display:"flex",
          alignItems:"flex-end",
          justifyContent:"flex-end",
        }}>
          {/* Neon rosa ao redor — camada de glow */}
          <div style={{
            position:"absolute",bottom:0,right:0,
            width:"100%",height:"100%",
            backgroundImage:`url(${JORDAN_URL})`,
            backgroundSize:"contain",
            backgroundRepeat:"no-repeat",
            backgroundPosition:"bottom right",
            filter:"blur(18px) brightness(1.2) saturate(3) hue-rotate(-10deg)",
            opacity:0.55,
          }}/>
          {/* Imagem principal com opacidade alta */}
          <img
            src={JORDAN_URL}
            alt=""
            style={{
              position:"relative",
              width:"100%",
              objectFit:"contain",
              objectPosition:"bottom right",
              opacity:0.88,
              filter:"drop-shadow(0 0 22px #FF2D78cc) drop-shadow(0 0 8px #FF2D78aa) drop-shadow(0 0 4px rgba(255,255,255,0.25))",
              display:"block",
            }}
          />
        </div>
        {loading
          ?<div style={{display:"flex",alignItems:"center",justifyContent:"center",flex:1,position:"relative",zIndex:1}}>
            <span style={{fontFamily:"'Orbitron',monospace",fontSize:"12px",color:D.muted,
              animation:"blink 1s ease-in-out infinite"}}>A CARREGAR...</span>
          </div>
          :<div style={{position:"relative",zIndex:1,flex:1,display:"flex",flexDirection:"column"}}>{slides[SLIDES[slide].id]}</div>}
      </div>

      {/* FOOTER */}
      <div style={{padding:"4px 18px",background:D.surface,
        borderTop:`1px solid rgba(255,45,120,0.08)`,
        display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div style={{display:"flex",gap:"4px"}}>
          {SLIDES.map((_,i)=>(
            <button key={i} onClick={()=>goTo(i)} style={{
              width:i===slide?"16px":"5px",height:"3px",borderRadius:"2px",
              background:i===slide?`linear-gradient(90deg,${D.pink},${D.blue})`:D.sub,
              border:"none",cursor:"pointer",transition:"width 0.3s",padding:0}}/>
          ))}
        </div>
        <div style={{fontFamily:"monospace",fontSize:"7px",color:D.muted,letterSpacing:"0.06em"}}>
          ← → NAVEGAR · ESPAÇO PAUSAR · F11 FULLSCREEN · {slide+1}/{SLIDES.length}
        </div>
        <div style={{fontFamily:"monospace",fontSize:"7px",color:D.muted}}>STILL OFICINA · PORTAL DA FROTA ACP</div>
      </div>
    </div>
  );
}
