import React from "react";
import { motion } from "framer-motion";

export default function KpiCard({ title, value, percentage, icon: Icon, color, delay = 0 }) {
  const colorMap = {
    slate:   { text: "text-slate-700 dark:text-slate-300",   icon: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",    pct: "text-slate-400 dark:text-slate-500" },
    emerald: { text: "text-emerald-700 dark:text-emerald-400", icon: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400", pct: "text-emerald-500 dark:text-emerald-400" },
    red:     { text: "text-red-700 dark:text-red-400",     icon: "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400",         pct: "text-red-500 dark:text-red-400" },
    amber:   { text: "text-amber-700 dark:text-amber-400",   icon: "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400",     pct: "text-amber-500 dark:text-amber-400" },
    blue:    { text: "text-blue-700 dark:text-blue-400",    icon: "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400",       pct: "text-blue-500 dark:text-blue-400" },
    teal:    { text: "text-teal-700 dark:text-teal-400",    icon: "bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400",       pct: "text-teal-500 dark:text-teal-400" },
    purple:  { text: "text-purple-700 dark:text-purple-400",  icon: "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400",   pct: "text-purple-500 dark:text-purple-400" },
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