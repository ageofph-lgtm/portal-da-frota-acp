import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { motion } from "framer-motion";

const STATUS_COLORS = {
  "Pronta": "#22C55E",
  "UTS": "#EF4444",
  "Aguarda material": "#F59E0B",
  "Em progresso": "#4D9FFF",
  "A começar": "#14B8A6",
  "Avaliar": "#9B5CF6",
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
    <div
      className="cyber-card font-mono-cyber"
      style={{
        padding: '10px 14px',
        background: 'rgba(6,6,13,0.96)',
        border: '1px solid rgba(255,45,120,0.5)',
        boxShadow: '0 0 14px rgba(255,45,120,0.35)',
        color: '#E4E6FF',
        fontSize: '11px',
        letterSpacing: '0.08em',
      }}
    >
      <p className="watcher-title" style={{ color: '#FF2D78', fontSize: '12px' }}>{d.name}</p>
      <p style={{ color: 'var(--cyber-muted)', marginTop: '4px' }}>{d.value} equipamentos ({d.payload.pct}%)</p>
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
      className="cyber-card clip-cyber p-6"
    >
      <h3 className="watcher-title text-center mb-2" style={{ fontSize: '16px', color: 'var(--cyber-text)', letterSpacing: '0.18em' }}>ESTADO DA FROTA</h3>
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
              stroke="rgba(13,13,24,0.8)"
              strokeWidth={2}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#9DA0BC"} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="middle"
              align="right"
              layout="vertical"
              iconType="circle"
              iconSize={9}
              formatter={(value) => <span className="font-mono-cyber" style={{ fontSize: '11px', color: 'var(--cyber-text)', letterSpacing: '0.08em' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}