import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Forklift, CheckCircle, AlertOctagon, Package, Wrench, PlayCircle, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import KpiCard from "@/components/dashboard/KpiCard";
import FleetChart from "@/components/dashboard/FleetChart";
import EquipmentTable from "@/components/dashboard/EquipmentTable";
import FileUploadModal from "@/components/dashboard/FileUploadModal";

export default function Geral() {
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ["equipment"],
    queryFn: () => base44.entities.Equipment.list("-created_date", 500),
  });

  const total = equipment.length;
  const count = (st) => equipment.filter((e) => e.status === st).length;
  const pct = (val) => total > 0 ? ((val / total) * 100).toFixed(1) + "%" : "0%";

  const kpis = [
    { title: "Total Equipamentos", value: total, pct: "100%",        icon: Forklift,     color: "slate",   delay: 0 },
    { title: "Máquinas Prontas",   value: count("Pronta"), pct: pct(count("Pronta")),      icon: CheckCircle,  color: "emerald", delay: 0.05 },
    { title: "UTS (Paradas)",      value: count("UTS"), pct: pct(count("UTS")),             icon: AlertOctagon, color: "red",     delay: 0.1 },
    { title: "Aguardam Material",  value: count("Aguarda material"), pct: pct(count("Aguarda material")), icon: Package, color: "amber", delay: 0.15 },
    { title: "Em Progresso",       value: count("Em progresso"), pct: pct(count("Em progresso")),         icon: Wrench,    color: "blue",  delay: 0.2 },
    { title: "A Começar",          value: count("A começar"), pct: pct(count("A começar")),               icon: PlayCircle, color: "teal", delay: 0.25 },
    { title: "Avaliar",            value: count("Avaliar"), pct: pct(count("Avaliar")),                   icon: Search,    color: "purple", delay: 0.3 },
  ];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array(7).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header + Upload */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Geral — Todas as Frotas</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{total} equipamentos no total (ACP1 + ACP2)</p>
        </div>
        <Button
          onClick={() => setUploadOpen(true)}
          className="bg-[#F08100] hover:bg-[#d97200] text-white gap-2 shadow-md"
        >
          <Upload className="w-4 h-4" />
          Importar / Exportar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            percentage={kpi.pct}
            icon={kpi.icon}
            color={kpi.color}
            delay={kpi.delay}
          />
        ))}
      </div>

      {/* Chart */}
      <div className="flex justify-center">
        <div className="w-full md:w-2/3 lg:w-1/2">
          <FleetChart equipment={equipment} />
        </div>
      </div>

      {/* Table */}
      <EquipmentTable equipment={equipment} />

      {/* Upload Modal */}
      <FileUploadModal open={uploadOpen} onOpenChange={setUploadOpen} equipment={equipment} />
    </div>
  );
}