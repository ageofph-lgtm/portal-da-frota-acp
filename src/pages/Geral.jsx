import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Forklift, CheckCircle, AlertOctagon, Package, Wrench, PlayCircle, Search, Upload } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import KpiCard from "@/components/dashboard/KpiCard";
import FleetChart from "@/components/dashboard/FleetChart";
import EquipmentTable from "@/components/dashboard/EquipmentTable";
import FileUploadModal from "@/components/dashboard/FileUploadModal";
import PageHeader from "@/components/shared/PageHeader";

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
      <div className="space-y-6">
        <PageHeader title="GERAL" subtitle="Todas as frotas · agregado" accent="blue" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array(7).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="GERAL · TODAS AS FROTAS"
        subtitle={`${total} equipamentos no total · ACP1 + ACP2`}
        accent="blue"
        right={
          <button
            onClick={() => setUploadOpen(true)}
            className="btn-cyber clip-cyber-sm flex items-center gap-2 px-4 py-2"
            style={{ fontSize: '11px' }}
          >
            <Upload className="w-3.5 h-3.5" />
            IMPORTAR / EXPORTAR
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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