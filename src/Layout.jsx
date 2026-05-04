import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Settings, Moon, Sun, Globe, Kanban, Zap } from "lucide-react";
import WatcherLogo from "@/components/shared/WatcherLogo";

const T = {
  pink:   '#FF2D78',
  blue:   '#4D9FFF',
  purple: '#9B5CF6',
  green:  '#22C55E',
  dark:  { bg: '#06060D', nav: 'rgba(6,6,13,0.98)', border: '#1A1A2F', text: '#E4E6FF', muted: '#5A5A8A' },
  light: { bg: '#E4E6EE', nav: 'rgba(232,234,245,0.97)', border: '#BFC3D8', text: '#0B0C18', muted: '#626480' },
};

export default function Layout({ children, currentPageName }) {
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem("theme");
      return saved ? saved === "dark" : true; // default dark
    } catch { return true; }
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const theme = dark ? T.dark : T.light;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const navLinks = [
    { page: "Dashboard", icon: LayoutDashboard, label: "DASHBOARD" },
    { page: "Producao",  icon: Kanban,          label: "PRODUÇÃO"  },
    { page: "Geral",     icon: Globe,           label: "GERAL"     },
    { page: "Gestao",    icon: Settings,        label: "GESTÃO"    },
  ];

  return (
    <div className="min-h-screen flex flex-col cyber-bg-page" style={{ background: theme.bg }}>
      {/* ── NAVBAR ── */}
      <nav style={{
        background: dark
          ? 'linear-gradient(180deg, rgba(6,6,13,0.98) 0%, rgba(9,9,20,0.96) 100%)'
          : 'linear-gradient(180deg, rgba(232,234,245,0.98) 0%, rgba(220,222,235,0.96) 100%)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: `1px solid ${theme.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        {/* Linha neon superior */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px',
          background: `linear-gradient(90deg, transparent 0%, ${T.pink} 25%, ${T.blue} 75%, transparent 100%)`,
          opacity: dark ? 0.9 : 0.5,
        }} />

        <div className="max-w-[1600px] mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
            {/* LOGO + TÍTULO */}
            <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3 min-w-0">
              <WatcherLogo size={42} accent="pink" interactive />
              <div className="hidden sm:block min-w-0">
                <div
                  className="watcher-title truncate"
                  style={{
                    fontSize: '15px',
                    fontWeight: 900,
                    color: T.pink,
                    textShadow: dark ? '0 0 14px rgba(255,45,120,0.7)' : 'none',
                  }}
                >
                  FROTA ACP
                </div>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: '8px',
                  color: theme.muted,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  marginTop: '-2px',
                }}>
                  [PORTAL · STILL · UNIT-LINK-01]
                </div>
              </div>
            </Link>

            {/* NAV LINKS */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {navLinks.map(({ page, icon: Icon, label }) => {
                const active = currentPageName === page;
                return (
                  <Link
                    key={page}
                    to={createPageUrl(page)}
                    className="relative flex items-center gap-2 px-3 sm:px-4 py-2 transition-all shrink-0"
                    style={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.14em',
                      color: active ? '#fff' : theme.muted,
                      background: active
                        ? `linear-gradient(135deg, ${T.pink}, ${T.purple})`
                        : 'transparent',
                      border: `1px solid ${active ? 'rgba(255,45,120,0.6)' : 'transparent'}`,
                      boxShadow: active && dark ? '0 0 18px rgba(255,45,120,0.45)' : 'none',
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </Link>
                );
              })}

              <button
                onClick={() => setDark(!dark)}
                title={dark ? "Modo claro" : "Modo escuro"}
                className="ml-1 flex items-center justify-center w-9 h-9 transition-all shrink-0"
                style={{
                  border: `1px solid ${dark ? 'rgba(255,184,0,0.35)' : 'rgba(77,159,255,0.35)'}`,
                  background: dark ? 'rgba(255,184,0,0.07)' : 'rgba(77,159,255,0.07)',
                  borderRadius: '4px',
                }}
              >
                {dark
                  ? <Sun className="w-4 h-4" style={{ color: '#FFB800', filter: 'drop-shadow(0 0 4px rgba(255,184,0,0.7))' }} />
                  : <Moon className="w-4 h-4" style={{ color: T.blue }} />
                }
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── MAIN ── */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      {/* ── FOOTER CYBER ── */}
      <footer style={{
        borderTop: `1px solid ${theme.border}`,
        background: dark
          ? 'linear-gradient(180deg, rgba(6,6,13,0.98) 0%, rgba(9,9,16,1) 100%)'
          : theme.nav,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        position: 'relative',
        marginTop: '24px',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
          background: `linear-gradient(90deg, transparent 0%, ${T.pink} 25%, ${T.blue} 75%, transparent 100%)`,
          opacity: dark ? 0.9 : 0.5,
        }} />
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px rgba(34,197,94,0.9)' }} className="animate-dot-blink" />
            <span style={{ fontFamily: 'monospace', fontSize: '10px', color: theme.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              SYNC ATIVO
            </span>
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: theme.muted, letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Zap size={9} color={T.pink} style={{ opacity: 0.7 }} />
              <span style={{ color: dark ? T.blue : T.blue, fontWeight: 700 }}>{timeStr}</span>
            </div>
          </div>
          <p style={{
            fontFamily: 'monospace',
            fontSize: '9px',
            color: theme.muted,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            margin: 0,
          }}>
            PORTAL FROTA ACP &middot; STILL &middot; LINK · WATCHER
          </p>
        </div>
      </footer>
    </div>
  );
}
