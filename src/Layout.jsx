import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Settings, Moon, Sun } from "lucide-react";

const STILL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_683986eb1d316acfa9ad7d61/ec07cb6e0_640px-Still-Logosvg.png";

export default function Layout({ children, currentPageName }) {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("theme") === "dark"; } catch { return false; }
  });

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Navbar */}
      <nav className="shadow-lg overflow-hidden relative" style={{
        background: dark
          ? "linear-gradient(to right, #374151 0%, #374151 calc(50% - 20px), #111827 calc(50% + 20px), #111827 100%)"
          : "linear-gradient(to right, #ffffff 0%, #ffffff calc(50% - 20px), #1A1A1A calc(50% + 20px), #1A1A1A 100%)"
      }}>
        {/* Diagonal divider line */}
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1, overflow: "hidden" }}>
          <svg width="100%" height="100%" preserveAspectRatio="none" style={{ position: "absolute", top: 0, left: 0 }}>
            <line x1="calc(50% - 22px)" y1="100%" x2="calc(50% + 22px)" y2="0%"
              stroke={dark ? "#6b7280" : "white"} strokeWidth="2" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative" style={{ zIndex: 2 }}>
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <img src={STILL_LOGO} alt="STILL" className="h-8 w-auto" />
              <div className={`hidden sm:block h-6 w-px ${dark ? "bg-slate-500" : "bg-slate-600"}`} />
              <span className={`hidden sm:block font-semibold text-lg tracking-tight ${dark ? "text-slate-200" : "text-slate-800"}`}>
                Frota ACP
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Link
                to={createPageUrl("Dashboard")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentPageName === "Dashboard"
                    ? "bg-[#F08100] text-white shadow-md"
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <Link
                to={createPageUrl("Gestao")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentPageName === "Gestao"
                    ? "bg-[#F08100] text-white shadow-md"
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Gestão</span>
              </Link>
              {/* Dark mode toggle */}
              <button
                onClick={() => setDark(!dark)}
                className="ml-2 flex items-center justify-center w-9 h-9 rounded-lg transition-all text-slate-300 hover:text-white hover:bg-white/10"
                title={dark ? "Modo claro" : "Modo escuro"}
              >
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 mt-8 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            Portal da Frota ACP &middot; STILL &middot; Gestão Integrada de Equipamentos
          </p>
        </div>
      </footer>
    </div>
  );
}