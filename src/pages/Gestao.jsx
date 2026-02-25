import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Save, Wand2, ChevronDown, ChevronRight, LayoutList, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from "@/components/dashboard/StatusBadge";
import AIImageExtractor from "@/components/gestao/AIImageExtractor";

const STATUSES = ["Pronta", "UTS", "Aguarda material", "Em progresso", "A começar", "Avaliar"];
const GROUP_OPTIONS = [
  { value: "status", label: "Estado" },
  { value: "equipment", label: "Modelo" },
  { value: "serial_number", label: "Nº Série" },
];

function EquipmentRow({ eq, onDelete, onSave }) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});

  const startEdit = () => {
    setEditData({ equipment: eq.equipment, serial_number: eq.serial_number, status: eq.status, action: eq.action || "" });
    setEditing(true);
  };

  const save = () => {
    onSave(eq.id, editData);
    setEditing(false);
  };

  return (
    <div className={`flex items-center justify-between px-5 py-3 transition group ${editing ? "bg-orange-50/40 dark:bg-orange-900/10" : "hover:bg-slate-50/80 dark:hover:bg-slate-700/30"}`}>
      {editing ? (
        <div className="flex flex-wrap gap-2 flex-1 mr-2">
          <Input
            value={editData.equipment}
            onChange={(e) => setEditData({ ...editData, equipment: e.target.value })}
            className="h-8 text-sm w-32 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
            placeholder="Modelo"
          />
          <Input
            value={editData.serial_number}
            onChange={(e) => setEditData({ ...editData, serial_number: e.target.value })}
            className="h-8 text-sm w-40 font-mono dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
            placeholder="Nº Série"
          />
          <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
            <SelectTrigger className="h-8 text-xs w-44 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            value={editData.action}
            onChange={(e) => setEditData({ ...editData, action: e.target.value })}
            className="h-8 text-sm flex-1 min-w-[120px] dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
            placeholder="Observação..."
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <StatusBadge status={eq.status} />
          <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{eq.equipment}</span>
          <span className="font-mono text-xs text-slate-400">{eq.serial_number}</span>
          {eq.action && <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{eq.action}</span>}
        </div>
      )}
      <div className="flex gap-1 shrink-0">
        {editing ? (
          <>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30" onClick={save}>
              <Check className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => setEditing(false)}>
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-300 hover:text-[#F08100] hover:bg-orange-50 dark:hover:bg-orange-900/20 opacity-0 group-hover:opacity-100 transition" onClick={startEdit}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition" onClick={() => onDelete(eq.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function GroupSection({ groupKey, items, onDelete, onSave }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-700/40 transition"
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          <span className="font-semibold text-slate-700 dark:text-slate-200">{groupKey}</span>
          <span className="text-xs text-slate-400 bg-slate-200 dark:bg-slate-700 rounded-full px-2 py-0.5">{items.length}</span>
        </div>
        {groupKey && <StatusBadge status={groupKey} />}
      </button>
      {open && (
        <div className="divide-y divide-slate-50 dark:divide-slate-700">
          {items.map((eq) => (
            <EquipmentRow key={eq.id} eq={eq} onDelete={onDelete} onSave={onSave} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Gestao() {
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState("manual"); // "manual" | "ai"
  const [deleteId, setDeleteId] = useState(null);
  const [newEq, setNewEq] = useState({ equipment: "", serial_number: "", status: "Pronta", action: "" });
  const [groupBy, setGroupBy] = useState("status");
  const queryClient = useQueryClient();

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ["equipment"],
    queryFn: () => base44.entities.Equipment.list("-created_date", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Equipment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      setShowAdd(false);
      setNewEq({ equipment: "", serial_number: "", status: "Pronta", action: "" });
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (records) => base44.entities.Equipment.bulkCreate(records),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      setShowAdd(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Equipment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      setDeleteId(null);
    },
  });

  // Group logic
  const grouped = useMemo(() => {
    const STATUS_ORDER = ["Pronta", "Em progresso", "A começar", "Aguarda material", "Avaliar", "UTS"];
    const map = {};
    equipment.forEach((eq) => {
      const key = eq[groupBy] || "—";
      if (!map[key]) map[key] = [];
      map[key].push(eq);
    });

    // Sort group keys
    let keys = Object.keys(map);
    if (groupBy === "status") {
      keys = keys.sort((a, b) => {
        const ai = STATUS_ORDER.indexOf(a);
        const bi = STATUS_ORDER.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
    } else {
      keys = keys.sort((a, b) => a.localeCompare(b));
    }

    return keys.map((k) => ({ key: k, items: map[k] }));
  }, [equipment, groupBy]);

  const handleAIConfirm = (records) => {
    bulkCreateMutation.mutate(records);
  };

  const openManual = () => { setAddMode("manual"); setShowAdd(true); };
  const openAI = () => { setAddMode("ai"); setShowAdd(true); };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Equipamentos</h1>
          <p className="text-sm text-slate-500 mt-1">{equipment.length} equipamentos registados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openManual} className="gap-2 border-slate-200">
            <Plus className="w-4 h-4" /> Manual
          </Button>
          <Button onClick={openAI} className="bg-[#F08100] hover:bg-[#d97200] text-white gap-2 shadow-md">
            <Wand2 className="w-4 h-4" /> Adicionar com IA
          </Button>
        </div>
      </div>

      {/* Group selector */}
      <div className="flex items-center gap-3">
        <LayoutList className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-500 font-medium">Agrupar por:</span>
        <div className="flex gap-1">
          {GROUP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setGroupBy(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                groupBy === opt.value
                  ? "bg-[#F08100] text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped list */}
      <div className="space-y-3">
        {grouped.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="font-medium">Nenhum equipamento registado</p>
            <p className="text-sm mt-1">Use "Adicionar com IA" para criar equipamentos a partir de imagens</p>
          </div>
        ) : (
          grouped.map(({ key, items }) => (
            <GroupSection
              key={key}
              groupKey={key}
              items={items}
              onDelete={(id) => setDeleteId(id)}
            />
          ))
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className={addMode === "ai" ? "sm:max-w-2xl" : "sm:max-w-md"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {addMode === "ai" ? (
                <><Wand2 className="w-5 h-5 text-[#F08100]" /> Adicionar com IA — Reconhecimento por Imagem</>
              ) : (
                <><Plus className="w-5 h-5 text-[#F08100]" /> Adicionar Equipamento</>
              )}
            </DialogTitle>
            {addMode === "manual" && (
              <DialogDescription>Preencha os dados do novo equipamento</DialogDescription>
            )}
          </DialogHeader>

          {addMode === "ai" ? (
            <AIImageExtractor
              onConfirm={handleAIConfirm}
              onCancel={() => setShowAdd(false)}
            />
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Input value={newEq.equipment} onChange={(e) => setNewEq({ ...newEq, equipment: e.target.value })} placeholder="Ex: RX6030" />
                </div>
                <div className="space-y-2">
                  <Label>Nº Série</Label>
                  <Input value={newEq.serial_number} onChange={(e) => setNewEq({ ...newEq, serial_number: e.target.value })} placeholder="Ex: 516305V00014" />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={newEq.status} onValueChange={(v) => setNewEq({ ...newEq, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Input value={newEq.action} onChange={(e) => setNewEq({ ...newEq, action: e.target.value })} placeholder="Ex: Express, SCC..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
                <Button
                  onClick={() => createMutation.mutate(newEq)}
                  className="bg-[#F08100] hover:bg-[#d97200] text-white"
                  disabled={!newEq.equipment || !newEq.serial_number}
                >
                  <Save className="w-4 h-4 mr-2" /> Guardar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminação</DialogTitle>
            <DialogDescription>Tem a certeza que deseja remover este equipamento?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteId)}>
              <Trash2 className="w-4 h-4 mr-2" /> Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}