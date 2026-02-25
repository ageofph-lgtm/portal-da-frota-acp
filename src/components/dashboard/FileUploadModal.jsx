import React, { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

export default function FileUploadModal({ open, onOpenChange }) {
  const [uploading, setUploading] = useState(false);
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

      // Delete existing and bulk create
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#F08100]" />
            Importar Planilha
          </DialogTitle>
          <DialogDescription>
            Faça upload de um ficheiro CSV ou Excel com os dados dos equipamentos. Os dados existentes serão substituídos.
          </DialogDescription>
        </DialogHeader>

        <div
          className={`mt-4 border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            dragOver
              ? "border-[#F08100] bg-orange-50"
              : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-[#F08100] animate-spin" />
              <p className="text-sm text-slate-600 font-medium">A processar ficheiro...</p>
              <p className="text-xs text-slate-400">Extraindo e importando dados</p>
            </div>
          ) : result ? (
            <div className="flex flex-col items-center gap-3">
              {result.success ? (
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              ) : (
                <AlertCircle className="w-10 h-10 text-red-500" />
              )}
              <p className={`text-sm font-medium ${result.success ? "text-emerald-700" : "text-red-700"}`}>
                {result.message}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setResult(null); }}
                className="mt-2"
              >
                Importar outro ficheiro
              </Button>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-600 font-medium mb-1">
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
      </DialogContent>
    </Dialog>
  );
}