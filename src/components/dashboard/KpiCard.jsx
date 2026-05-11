import React from "react";
import { motion } from "framer-motion";

// STARK ARMOR — semantic status colors
const COLOR_MAP = {
  slate:   { c: '#c8c8c8', glow: 'rgba(200,200,200,0.35)' },  // prata
  emerald: { c: '#22C55E', glow: 'rgba(34,197,94,0.55)'   },  // prontas
  red:     { c: '#EF4444', glow: 'rgba(239,68,68,0.55)'   },  // UTS
  amber:   { c: '#F59E0B', glow: 'rgba(245,158,11,0.55)'  },  // aguarda
  blue:    { c: '#4D9FFF', glow: 'rgba(77,159,255,0.55)'  },  // progresso
  teal:    { c: '#00DDFF', glow: 'rgba(0,221,255,0.5)'    },  // a começar
  purple:  { c: '#9B5CF6', glow: 'rgba(155,92,246,0.55)'  },  // avaliar
  pink:    { c: '#C8102E', glow: 'rgba(200,16,46,0.55)'   },  // total
};

export default function KpiCard({ title, value, percentage, icon: Icon, color, delay = 0 }) {
  const c = COLOR_MAP[color] || COLOR_MAP.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="cyber-card clip-cyber p-4 relative overflow-hidden"
      style={{ boxShadow: `0 0 24px ${c.glow.replace('0.55','0.15')}, 0 0 1px rgba(212,175,55,0.05) inset` }}
    >
      {/* faixa lateral colorida */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px',
          background: `linear-gradient(180deg, ${c.c}, transparent)`,
          boxShadow: `0 0 10px ${c.glow}`,
        }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="col-header-cyber"
            style={{ color: 'var(--cyber-muted)', marginBottom: '6px' }}
          >
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span
              className="watcher-title"
              style={{
                fontSize: '32px',
                fontWeight: 900,
                color: c.c,
                textShadow: `0 0 12px ${c.glow}`,
                lineHeight: 1,
              }}
            >
              {value}
            </span>
            <span
              className="font-mono-cyber"
              style={{ fontSize: '11px', color: 'var(--cyber-muted)', letterSpacing: '0.08em' }}
            >
              ({percentage})
            </span>
          </div>
        </div>
        <div
          className="clip-cyber-sm flex items-center justify-center shrink-0"
          style={{
            width: '44px', height: '44px',
            background: `linear-gradient(135deg, ${c.c}22, ${c.c}11)`,
            border: `1px solid ${c.glow}`,
            color: c.c,
            boxShadow: `inset 0 0 12px ${c.glow}`,
          }}
        >
          <Icon className="w-5 h-5" style={{ filter: `drop-shadow(0 0 5px ${c.glow})` }} />
        </div>
      </div>
    </motion.div>
  );
}
