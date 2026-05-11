import React from "react";

const STATUS_STYLES = {
  "Pronta":           { c: '#22C55E', glow: 'rgba(34,197,94,0.5)' },
  "UTS":              { c: '#EF4444', glow: 'rgba(239,68,68,0.5)' },
  "Aguarda material": { c: '#F59E0B', glow: 'rgba(245,158,11,0.5)' },
  "Em progresso":     { c: '#4D9FFF', glow: 'rgba(77,159,255,0.5)' },
  "A começar":        { c: '#00DDFF', glow: 'rgba(0,221,255,0.5)' },
  "Avaliar":          { c: '#9B5CF6', glow: 'rgba(155,92,246,0.5)' },
};

export default function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { c: '#9DA0BC', glow: 'rgba(157,160,188,0.4)' };
  return (
    <span
      className="font-mono-cyber inline-flex items-center gap-2"
      style={{
        padding: '3px 10px',
        background: `${s.c}1A`,
        border: `1px solid ${s.glow}`,
        color: s.c,
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        boxShadow: `0 0 8px ${s.glow}`,
        clipPath: 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
      }}
    >
      <span style={{width:'5px',height:'5px',borderRadius:'50%',background:s.c,boxShadow:`0 0 6px ${s.glow}`,flexShrink:0}}/>
      {status}
    </span>
  );
}
