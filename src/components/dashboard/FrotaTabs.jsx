import React from "react";

const FROTAS = [
  { id: "acp1", label: "Frota ACP1" },
  { id: "acp2", label: "Frota ACP2" },
];

export default function FrotaTabs({ active, onChange }) {
  return (
    <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
      {FROTAS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            active === id
              ? "bg-[#F08100] text-white shadow-md"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}