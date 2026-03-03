import React, { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { exportDashboardToExcel } from "./ExportExcel";

const TABS = [
  { id: "import", label: "Importar", icon: Upload },
  { id: "export", label: "Exportar", icon: Download },
];

export default function FileUploadModal({ open, onOpenChange, equipment = [] }) {
  const [tab, setTab] = useState("import");
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const queryClient = useQueryClient();

  const processFile = async (file) => {
    setUploading(true);
    setResult(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              equipment: { type: "string", description: "Modelo do equipamento (ex: RX6030, FM-X17, EXH-S_25)" },
              serial_number: { type: "string", description: "Número de série" },
              status: { type: "string", description: "Estado: Pronta, UTS, Aguarda material, Em progresso, A começar, Avaliar" },
              action: { type: "string", description: "Ação ou observação" },
            },
          },
        },
      });

      if (extracted.status === "error") {
        setResult({ success: false, message: extracted.details });
        setUploading(false);
        return;
      }

      const records = (extracted.output || []).map((r) => ({
        equipment: r.equipment || "",
        serial_number: r.serial_number || "",
        status: r.status || "Pronta",
        action: r.action || "",
      }));

      const existing = await base44.entities.Equipment.list();
      for (const eq of existing) {
        await base44.entities.Equipment.delete(eq.id);
      }
      if (records.length > 0) {
        await base44.entities.Equipment.bulkCreate(records);
      }

      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      setResult({ success: true, message: `${records.length} equipamentos importados com sucesso.` });
    } catch (err) {
      setResult({ success: false, message: err.message });
    }
    setUploading(false);
  };

  const handleExport = async () => {
    setExporting(true);
    await exportDashboardToExcel(equipment);
    setExporting(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  const handleOpenChange = (v) => {
    if (!v) { setResult(null); setTab("import"); }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#F08100]" />
            Importar / Exportar Documento
          </DialogTitle>
          <DialogDescription>
            Importe dados de uma planilha ou exporte o estado atual do dashboard.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mt-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setResult(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                tab === id
                  ? "bg-white dark:bg-slate-700 text-[#F08100] shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Import Tab */}
        {tab === "import" && (
          <div
            className={`mt-4 border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              dragOver
                ? "border-[#F08100] bg-orange-50 dark:bg-orange-900/10"
                : "border-slate-200 dark:border-slate-600 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-800/30"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-[#F08100] animate-spin" />
                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">A processar ficheiro...</p>
                <p className="text-xs text-slate-400">Extraindo e importando dados</p>
              </div>
            ) : result ? (
              <div className="flex flex-col items-center gap-3">
                {result.success
                  ? <CheckCircle className="w-10 h-10 text-emerald-500" />
                  : <AlertCircle className="w-10 h-10 text-red-500" />}
                <p className={`text-sm font-medium ${result.success ? "text-emerald-700" : "text-red-700"}`}>
                  {result.message}
                </p>
                <Button variant="outline" size="sm" onClick={() => setResult(null)} className="mt-2">
                  Importar outro ficheiro
                </Button>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">
                  Arraste o ficheiro aqui ou
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  className="border-[#F08100] text-[#F08100] hover:bg-orange-50"
                >
                  Selecionar Ficheiro
                </Button>
                <p className="text-xs text-slate-400 mt-3">CSV, XLSX, XLS suportados</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </>
            )}
          </div>
        )}

        {/* Export Tab */}
        {tab === "export" && (
          <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 p-8 text-center space-y-4">
            <FileSpreadsheet className="w-12 h-12 text-[#F08100] mx-auto" />
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Exportar Dashboard completo</p>
              <p className="text-xs text-slate-400 mt-1">
                Gera um ficheiro <strong>.xlsx</strong> com duas folhas:<br />
                <span className="text-[#F08100] font-medium">Dashboard</span> — KPIs e distribuição com cores<br />
                <span className="text-[#F08100] font-medium">Equipamentos</span> — tabela completa com filtros
              </p>
            </div>
            <div className="bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-3 text-left text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <p>✅ <span className="font-medium text-slate-700 dark:text-slate-300">{equipment.length}</span> equipamentos prontos para exportar</p>
              <p>✅ Cores por estado (Pronta, UTS, Aguarda material…)</p>
              <p>✅ KPIs e distribuição percentual</p>
              <p>✅ Barra visual de distribuição</p>
            </div>
            <Button
              onClick={handleExport}
              disabled={exporting || equipment.length === 0}
              className="bg-[#F08100] hover:bg-[#d97200] text-white gap-2 w-full"
            >
              {exporting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> A gerar ficheiro...</>
                : <><Download className="w-4 h-4" /> Descarregar Excel (.xlsx)</>}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}