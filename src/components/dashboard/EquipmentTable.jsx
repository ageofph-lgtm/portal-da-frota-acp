import React, { useState, useMemo } from "react";
import { Search, Filter, RotateCcw, Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import StatusBadge from "./StatusBadge";
import { motion, AnimatePresence } from "framer-motion";

const STATUSES = ["Pronta", "UTS", "Aguarda material", "Em progresso", "A começar", "Avaliar"];

export default function EquipmentTable({ equipment }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Equipment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      setEditingId(null);
    },
  });

  const filtered = useMemo(() => {
    return equipment
      .filter((eq) => {
        const matchSearch =
          eq.equipment.toLowerCase().includes(search.toLowerCase()) ||
          eq.serial_number.toLowerCase().includes(search.toLowerCase()) ||
          (eq.action || "").toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "all" || eq.status === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => a.status.localeCompare(b.status));
  }, [equipment, search, statusFilter]);

  const startEdit = (eq) => {
    setEditingId(eq.id);
    setEditData({ status: eq.status, action: eq.action || "" });
  };

  const saveEdit = (id) => {
    updateMutation.mutate({ id, data: editData });
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="cyber-card clip-cyber overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b" style={{ borderColor: 'var(--cyber-border)' }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="watcher-title flex items-center gap-2" style={{ fontSize: '16px', color: 'var(--cyber-text)', letterSpacing: '0.16em' }}>
            <Filter className="w-4 h-4" style={{ color: '#FF2D78', filter: 'drop-shadow(0 0 6px rgba(255,45,120,0.6))' }} />
            REGISTO DE EQUIPAMENTOS
          </h3>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Pesquisar série, modelo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-full sm:w-64 dark:bg-slate-700/30 dark:text-slate-100 dark:placeholder-slate-400 focus-visible:ring-pink-500"
                style={{ borderColor: 'var(--cyber-border)' }}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 dark:bg-slate-700/30 dark:text-slate-100 focus:ring-pink-500" style={{ borderColor: 'var(--cyber-border)' }}>
                <SelectValue placeholder="Todos os Estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Estados</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr
              className="col-header-cyber border-b"
              style={{
                background: 'rgba(255,45,120,0.04)',
                color: 'var(--cyber-muted)',
                borderColor: 'var(--cyber-border)',
              }}
            >
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Equipamento</th>
              <th className="px-6 py-4">Nº Série</th>
              <th className="px-6 py-4">Ação / Obs.</th>
              <th className="px-6 py-4 w-20">Editar</th>
            </tr>
          </thead>
          <tbody style={{ color: 'var(--cyber-text)' }}>
            <AnimatePresence>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-slate-400 dark:text-slate-500">
                    <Search className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-medium">Nenhum registo encontrado</p>
                  </td>
                </tr>
              ) : (
                filtered.map((eq) => (
                  <motion.tr
                    key={eq.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="transition group"
                    style={{ borderTop: '1px solid var(--cyber-border)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,45,120,0.04)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === eq.id ? (
                        <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                          <SelectTrigger className="w-40 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <StatusBadge status={eq.status} />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-display font-bold tracking-wider group-hover:text-pink-500 transition" style={{ color: 'var(--cyber-text)' }}>
                      {eq.equipment}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono-cyber text-xs" style={{ color: 'var(--cyber-muted)', letterSpacing: '0.08em' }}>
                      {eq.serial_number}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--cyber-text)' }}>
                      {editingId === eq.id ? (
                        <Input
                          value={editData.action}
                          onChange={(e) => setEditData({ ...editData, action: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="Observação..."
                        />
                      ) : (
                        eq.action || <span style={{ color: 'var(--cyber-muted)', fontStyle: 'italic', opacity: 0.5 }}>—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === eq.id ? (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30" onClick={() => saveEdit(eq.id)}>
                             <Check className="w-4 h-4" />
                           </Button>
                           <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => setEditingId(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-pink-500 opacity-0 group-hover:opacity-100 transition" style={{ color: 'var(--cyber-muted)' }} onClick={() => startEdit(eq)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-4 border-t flex justify-between items-center font-mono-cyber text-xs" style={{ borderColor: 'var(--cyber-border)', color: 'var(--cyber-muted)', letterSpacing: '0.08em' }}>
        <span>MOSTRANDO {filtered.length} DE {equipment.length} REGISTOS</span>
        <button onClick={resetFilters} className="font-bold transition flex items-center gap-1" style={{ color: '#FF2D78' }}>
          <RotateCcw className="w-3.5 h-3.5" />
          LIMPAR FILTROS
        </button>
      </div>
    </motion.div>
  );
}