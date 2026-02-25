import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Upload, Settings } from "lucide-react";

const STILL_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_683986eb1d316acfa9ad7d61/ec07cb6e0_640px-Still-Logosvg.png";

export default function Layout({ children, currentPageName }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-[#1A1A1A] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <img 
                src={STILL_LOGO} 
                alt="STILL" 
                className="h-8 w-auto"
              />
              <div className="hidden sm:block h-6 w-px bg-slate-600" />
              <span className="hidden sm:block text-white font-semibold text-lg tracking-tight">
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
            </div>
          </div>
        </div>
      </nav>
      
      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-xs text-slate-400">
            Portal da Frota ACP &middot; STILL &middot; Gestão Integrada de Equipamentos
          </p>
        </div>
      </footer>
    </div>
  );
}