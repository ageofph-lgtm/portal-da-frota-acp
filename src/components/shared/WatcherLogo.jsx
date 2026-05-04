import React from "react";

const LOGO_URL = "https://media.base44.com/images/public/69c166ad19149fb0c07883cb/0063feaf2_Gemini_Generated_Image_scmohbscmohbscmo.png";

const ACCENTS = {
  pink:   { c: "#FF2D78", glow: "rgba(255,45,120,0.85)", glowSoft: "rgba(255,45,120,0.4)" },
  blue:   { c: "#4D9FFF", glow: "rgba(77,159,255,0.85)", glowSoft: "rgba(77,159,255,0.4)" },
  green:  { c: "#22C55E", glow: "rgba(34,197,94,0.85)",  glowSoft: "rgba(34,197,94,0.4)" },
  purple: { c: "#9B5CF6", glow: "rgba(155,92,246,0.85)", glowSoft: "rgba(155,92,246,0.4)" },
  amber:  { c: "#F59E0B", glow: "rgba(245,158,11,0.85)", glowSoft: "rgba(245,158,11,0.4)" },
};

export default function WatcherLogo({ size = 56, accent = "pink", title = "Frota ACP · Watcher", className = "", interactive = false }) {
  const a = ACCENTS[accent] || ACCENTS.pink;

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      title={title}
    >
      {/* Halo orbital pulsante */}
      <div
        className="watcher-logo-halo"
        style={{
          position: "absolute",
          inset: -size * 0.25,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${a.glow} 0%, transparent 65%)`,
          filter: "blur(2px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Anel interior */}
      <div
        className="watcher-logo-ring"
        style={{
          position: "absolute",
          inset: -2,
          borderRadius: "50%",
          border: `1px solid ${a.glow}`,
          boxShadow: `0 0 14px ${a.glowSoft}, inset 0 0 8px ${a.glowSoft}`,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      <img
        src={LOGO_URL}
        alt="WATCHER"
        className={`watcher-logo-img ${interactive ? "cursor-pointer" : ""}`}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          filter: `drop-shadow(0 0 18px ${a.glow}) drop-shadow(0 0 6px ${a.glowSoft})`,
          position: "relative",
          zIndex: 2,
        }}
      />
    </div>
  );
}
