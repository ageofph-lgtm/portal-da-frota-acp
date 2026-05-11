import React from "react";
import WatcherLogo from "./WatcherLogo";

export default function PageHeader({ title, subtitle, accent = "pink", right = null, children }) {
  const accents = {
    pink:   { c: "#C8102E", glow: "rgba(200,16,46,0.7)"   },  // Stark red
    blue:   { c: "#c0c0c0", glow: "rgba(200,200,200,0.5)" },  // prata
    green:  { c: "#22C55E", glow: "rgba(34,197,94,0.7)"   },
    purple: { c: "#9B5CF6", glow: "rgba(155,92,246,0.7)"  },
    amber:  { c: "#D4AF37", glow: "rgba(212,175,55,0.7)"  },  // gold
    gold:   { c: "#D4AF37", glow: "rgba(212,175,55,0.7)"  },
  };
  const a = accents[accent] || accents.pink;

  return (
    <div
      className="cyber-card clip-cyber p-4 sm:p-6 mb-6 relative overflow-hidden"
      style={{ borderColor: a.glow }}
    >
      {/* Linha topo neon */}
      <div
        style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "2px",
          background: `linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.6) 30%, ${a.c} 55%, rgba(212,175,55,0.6) 80%, transparent 100%)`,
          opacity: 0.9,
        }}
      />
      <div className="flex items-center gap-4 sm:gap-5">
        <WatcherLogo size={64} accent={accent} />

        <div className="min-w-0 flex-1">
          <div
            className="watcher-title"
            style={{
              fontSize: "clamp(20px, 4vw, 30px)",
              fontWeight: 900,
              color: a.c,
              textShadow: `0 0 14px ${a.glow}`,
              letterSpacing: "0.18em",
              lineHeight: 1.1,
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              className="font-mono-cyber"
              style={{
                fontSize: "10px",
                color: "var(--cyber-muted)",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                marginTop: "4px",
              }}
            >
              {subtitle}
            </div>
          )}
          {children}
        </div>

        {right && <div className="hidden sm:flex items-center gap-2 shrink-0">{right}</div>}
      </div>

      {/* mobile right-side actions */}
      {right && <div className="sm:hidden mt-3 flex items-center gap-2 flex-wrap">{right}</div>}
    </div>
  );
}
