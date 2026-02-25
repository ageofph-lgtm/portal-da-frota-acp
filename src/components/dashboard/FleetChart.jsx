import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { motion } from "framer-motion";

const STATUS_COLORS = {
  "Pronta": "#10b981",
  "UTS": "#ef4444",
  "Aguarda material": "#f59e0b",
  "Em progresso": "#3b82f6",
  "A começar": "#14b8a6",
  "Avaliar": "#a855f7",
};

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
  if (value === 0) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-sm font-bold">
      {value}
    </text>
  );
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-slate-900/90 text-white px-4 py-3 rounded-xl shadow-xl text-sm">
      <p className="font-semibold">{d.name}</p>
      <p className="text-slate-300">{d.value} equipamentos ({d.payload.pct}%)</p>
    </div>
  );
};

export default function FleetChart({ equipment }) {
  const chartData = useMemo(() => {
    const counts = {};
    equipment.forEach(eq => {
      counts[eq.status] = (counts[eq.status] || 0) + 1;
    });
    const total = equipment.length;
    return Object.entries(counts)
      .map(([name, value]) => ({
        name,
        value,
        pct: total > 0 ? ((value / total) * 100).toFixed(1) : "0",
      }))
      .sort((a, b) => b.value - a.value);
  }, [equipment]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700"
    >
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 text-center mb-2">Estado da Frota</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={120}
              paddingAngle={3}
              dataKey="value"
              labelLine={false}
              label={CustomLabel}
              stroke="#fff"
              strokeWidth={3}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#94a3b8"} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="middle"
              align="right"
              layout="vertical"
              iconType="circle"
              iconSize={10}
              formatter={(value) => <span className="text-sm text-slate-600 font-medium">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}