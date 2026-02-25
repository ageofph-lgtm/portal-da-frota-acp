import React from "react";

const STATUS_STYLES = {
  "Pronta":           "bg-emerald-100 text-emerald-800 border-emerald-200",
  "UTS":              "bg-red-100 text-red-800 border-red-200",
  "Aguarda material": "bg-amber-100 text-amber-800 border-amber-200",
  "Em progresso":     "bg-blue-100 text-blue-800 border-blue-200",
  "A começar":        "bg-teal-100 text-teal-800 border-teal-200",
  "Avaliar":          "bg-purple-100 text-purple-800 border-purple-200",
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || "bg-slate-100 text-slate-800 border-slate-200";
  return (
    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${style}`}>
      {status}
    </span>
  );
}