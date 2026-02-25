import React, { useState, useRef } from "react";
import { Upload, ImagePlus, Loader2, CheckCircle, AlertCircle, X, Wand2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

const STATUSES = ["Pronta", "UTS", "Aguarda material", "Em progresso", "A começar", "Avaliar"];

export default function AIImageExtractor({ onConfirm, onCancel }) {
  const [images, setImages] = useState([]); // [{file, preview, url}]
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState([]); // list of {equipment, serial_number, status, action}
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const addImages = (files) => {
    const newImgs = Array.from(files).map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
    }));
    setImages((prev) => [...prev, ...newImgs]);
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addImages(e.dataTransfer.files);
  };

  const extractWithAI = async () => {
    if (images.length === 0) return;
    setExtracting(true);
    try {
      // Upload all images first
      const uploadedUrls = await Promise.all(
        images.map(async (img) => {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: img.file });
          return file_url;
        })
      );

      // Call LLM with all images at once
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analisa estas imagens de equipamentos industriais (empilhadoras/stackers/etc da marca STILL).
Para cada equipamento visível extrai:
- equipment: modelo/tipo do equipamento (ex: RX6030, FM-X17, EXH-S_25, etc.)
- serial_number: número de série (sequência alfanumérica, geralmente numa chapa/etiqueta)
- status: um dos seguintes - "Pronta", "UTS", "Aguarda material", "Em progresso", "A começar", "Avaliar" (se não conseguires determinar, usa "Pronta")
- action: observação ou ação visível (ex: "Chassis danificado", "SCC", ou vazio)

Se numa imagem aparecerem múltiplos equipamentos, extrai todos.
Se não conseguires ler algum campo, deixa em branco ("").
Responde apenas com o JSON, sem texto adicional.`,
        file_urls: uploadedUrls,
        response_json_schema: {
          type: "object",
          properties: {
            equipments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  equipment: { type: "string" },
                  serial_number: { type: "string" },
                  status: { type: "string" },
                  action: { type: "string" },
                },
              },
            },
          },
        },
      });

      const items = (result?.equipments || []).map((e) => ({
        equipment: e.equipment || "",
        serial_number: e.serial_number || "",
        status: STATUSES.includes(e.status) ? e.status : "Pronta",
        action: e.action || "",
      }));

      setExtracted(items.length > 0 ? items : [{ equipment: "", serial_number: "", status: "Pronta", action: "" }]);
    } catch (err) {
      setExtracted([{ equipment: "", serial_number: "", status: "Pronta", action: "" }]);
    }
    setExtracting(false);
  };

  const updateItem = (idx, field, value) => {
    setExtracted((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const removeItem = (idx) => {
    setExtracted((prev) => prev.filter((_, i) => i !== idx));
  };

  const addBlankItem = () => {
    setExtracted((prev) => [...prev, { equipment: "", serial_number: "", status: "Pronta", action: "" }]);
  };

  // ---- STEP 1: Image upload ----
  if (extracted.length === 0) {
    return (
      <div className="space-y-4">
        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
            dragOver ? "border-[#F08100] bg-orange-50" : "border-slate-200 hover:border-slate-300 bg-slate-50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-600 font-medium">Arraste imagens ou clique para selecionar</p>
          <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP — pode selecionar várias</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addImages(e.target.files)}
          />
        </div>

        {/* Thumbnails */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {images.map((img, i) => (
              <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-200">
                <img src={img.preview} alt="" className="w-full h-24 object-cover" />
                <button
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button
            className="bg-[#F08100] hover:bg-[#d97200] text-white gap-2"
            disabled={images.length === 0 || extracting}
            onClick={extractWithAI}
          >
            {extracting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> A analisar imagens...</>
            ) : (
              <><Wand2 className="w-4 h-4" /> Extrair com IA ({images.length} {images.length === 1 ? "imagem" : "imagens"})</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ---- STEP 2: Review & edit ----
  const canSave = extracted.every((e) => e.equipment && e.serial_number);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 text-sm font-medium">
        <CheckCircle className="w-4 h-4" />
        {extracted.length} equipamento(s) detetado(s). Reveja e corrija antes de guardar.
      </div>

      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
        {extracted.map((item, idx) => (
          <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 relative">
            <div className="absolute top-3 right-3">
              <button onClick={() => removeItem(idx)} className="text-slate-300 hover:text-red-500 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Equipamento {idx + 1}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Modelo *</Label>
                <Input
                  value={item.equipment}
                  onChange={(e) => updateItem(idx, "equipment", e.target.value)}
                  placeholder="Ex: RX6030"
                  className={`h-8 text-sm ${!item.equipment ? "border-red-300 focus-visible:ring-red-300" : ""}`}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nº Série *</Label>
                <Input
                  value={item.serial_number}
                  onChange={(e) => updateItem(idx, "serial_number", e.target.value)}
                  placeholder="Ex: 516305V00014"
                  className={`h-8 text-sm font-mono ${!item.serial_number ? "border-red-300 focus-visible:ring-red-300" : ""}`}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estado</Label>
                <Select value={item.status} onValueChange={(v) => updateItem(idx, "status", v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Observação</Label>
                <Input
                  value={item.action}
                  onChange={(e) => updateItem(idx, "action", e.target.value)}
                  placeholder="Ex: Express, SCC..."
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addBlankItem} className="w-full border-dashed">
        + Adicionar linha manual
      </Button>

      <div className="flex justify-between items-center pt-2">
        <Button variant="outline" onClick={() => { setExtracted([]); }}>← Voltar às imagens</Button>
        <Button
          className="bg-[#F08100] hover:bg-[#d97200] text-white gap-2"
          disabled={!canSave || extracted.length === 0}
          onClick={() => onConfirm(extracted)}
        >
          <CheckCircle className="w-4 h-4" />
          Guardar {extracted.length} equipamento(s)
        </Button>
      </div>
    </div>
  );
}