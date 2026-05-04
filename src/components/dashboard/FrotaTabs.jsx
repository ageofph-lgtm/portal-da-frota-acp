import React from "react";

const FROTAS = [
  { id: "acp1", label: "FROTA ACP1" },
  { id: "acp2", label: "FROTA ACP2" },
];

export default function FrotaTabs({ active, onChange }) {
  return (
    <div
      className="cyber-card flex gap-1 p-1 w-fit clip-cyber-sm"
      style={{ borderColor: 'var(--cyber-border)' }}
    >
      {FROTAS.map(({ id, label }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="px-5 py-2 transition-all"
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.16em',
              color: isActive ? '#fff' : 'var(--cyber-muted)',
              background: isActive
                ? 'linear-gradient(135deg, #FF2D78, #9B5CF6)'
                : 'transparent',
              border: isActive ? '1px solid rgba(255,45,120,0.6)' : '1px solid transparent',
              boxShadow: isActive ? '0 0 16px rgba(255,45,120,0.45)' : 'none',
              clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
