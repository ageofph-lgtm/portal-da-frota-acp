import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from "@/components/dashboard/StatusBadge";

const STATUSES = ["Pronta", "UTS", "Aguarda material", "Em progresso", "A começar", "Avaliar"];

export default function Gestao() {
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [newEq, setNewEq] = useState({ equipment: "", serial_number: "", status: "Pronta", action: "" });
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

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Equipment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      setDeleteId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Equipamentos</h1>
          <p className="text-sm text-slate-500 mt-1">Adicionar ou remover equipamentos da frota</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-[#F08100] hover:bg-[#d97200] text-white gap-2">
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </div>

      {/* Equipment Cards */}
      <div className="grid gap-3">
        {equipment.map((eq) => (
          <div key={eq.id} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition">
            <div className="flex items-center gap-4 flex-wrap">
              <StatusBadge status={eq.status} />
              <span className="font-semibold text-slate-800">{eq.equipment}</span>
              <span className="font-mono text-sm text-slate-500">{eq.serial_number}</span>
              {eq.action && <span className="text-sm text-slate-600 bg-slate-50 px-2 py-0.5 rounded">{eq.action}</span>}
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="text-slate-400 hover:text-red-600 hover:bg-red-50"
              onClick={() => setDeleteId(eq.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        {equipment.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="font-medium">Nenhum equipamento registado</p>
            <p className="text-sm mt-1">Adicione equipamentos ou importe uma planilha no Dashboard</p>
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Equipamento</DialogTitle>
            <DialogDescription>Preencha os dados do novo equipamento</DialogDescription>
          </DialogHeader>
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