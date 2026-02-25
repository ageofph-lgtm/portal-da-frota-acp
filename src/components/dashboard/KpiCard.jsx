import React from "react";
import { motion } from "framer-motion";

export default function KpiCard({ title, value, percentage, icon: Icon, color, delay = 0 }) {
  const colorMap = {
    slate:   { bg: "bg-slate-50",    text: "text-slate-700",   icon: "bg-slate-100 text-slate-600",    pct: "text-slate-400" },
    emerald: { bg: "bg-emerald-50",  text: "text-emerald-700", icon: "bg-emerald-100 text-emerald-600", pct: "text-emerald-500" },
    red:     { bg: "bg-red-50",      text: "text-red-700",     icon: "bg-red-100 text-red-600",         pct: "text-red-500" },
    amber:   { bg: "bg-amber-50",    text: "text-amber-700",   icon: "bg-amber-100 text-amber-600",     pct: "text-amber-500" },
    blue:    { bg: "bg-blue-50",     text: "text-blue-700",    icon: "bg-blue-100 text-blue-600",       pct: "text-blue-500" },
    teal:    { bg: "bg-teal-50",     text: "text-teal-700",    icon: "bg-teal-100 text-teal-600",       pct: "text-teal-500" },
    purple:  { bg: "bg-purple-50",   text: "text-purple-700",  icon: "bg-purple-100 text-purple-600",   pct: "text-purple-500" },
  };

  const c = colorMap[color] || colorMap.slate;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${c.text}`}>{value}</span>
            <span className={`text-sm font-semibold ${c.pct}`}>({percentage})</span>
          </div>
        </div>
        <div className={`w-12 h-12 rounded-xl ${c.icon} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}