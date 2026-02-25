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
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Filter className="w-5 h-5 text-[#F08100]" />
            Registo de Equipamentos
          </h3>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Pesquisar série, modelo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-full sm:w-64 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 focus-visible:ring-[#F08100]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:ring-[#F08100]">
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
            <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              <th className="px-6 py-4 font-semibold">Estado</th>
              <th className="px-6 py-4 font-semibold">Equipamento</th>
              <th className="px-6 py-4 font-semibold">Nº Série</th>
              <th className="px-6 py-4 font-semibold">Acção / Obs.</th>
              <th className="px-6 py-4 font-semibold w-20">Editar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <AnimatePresence>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-slate-400">
                    <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium">Nenhum registo encontrado</p>
                  </td>
                </tr>
              ) : (
                filtered.map((eq) => (
                  <motion.tr
                    key={eq.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-slate-50/80 transition group"
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
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-800 group-hover:text-[#F08100] transition">
                      {eq.equipment}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-slate-500">
                      {eq.serial_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {editingId === eq.id ? (
                        <Input
                          value={editData.action}
                          onChange={(e) => setEditData({ ...editData, action: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="Observação..."
                        />
                      ) : (
                        eq.action || <span className="text-slate-300 italic">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === eq.id ? (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={() => saveEdit(eq.id)}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:bg-slate-100" onClick={() => setEditingId(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-[#F08100] hover:bg-orange-50 opacity-0 group-hover:opacity-100 transition" onClick={() => startEdit(eq)}>
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
      <div className="p-4 border-t border-slate-100 flex justify-between items-center text-sm text-slate-500 bg-slate-50/50">
        <span>Mostrando {filtered.length} de {equipment.length} registos</span>
        <button onClick={resetFilters} className="text-[#F08100] hover:text-orange-700 font-medium transition flex items-center gap-1">
          <RotateCcw className="w-3.5 h-3.5" />
          Limpar Filtros
        </button>
      </div>
    </motion.div>
  );
}