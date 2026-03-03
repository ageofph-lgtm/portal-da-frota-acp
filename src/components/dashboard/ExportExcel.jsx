import ExcelJS from "exceljs";

const STATUS_COLORS = {
  "Pronta":           { argb: "FF059669" }, // emerald
  "UTS":              { argb: "FFDC2626" }, // red
  "Aguarda material": { argb: "FFD97706" }, // amber
  "Em progresso":     { argb: "FF2563EB" }, // blue
  "A começar":        { argb: "FF0D9488" }, // teal
  "Avaliar":          { argb: "FF7C3AED" }, // purple
};

const STATUS_BG = {
  "Pronta":           { argb: "FFD1FAE5" },
  "UTS":              { argb: "FFFEE2E2" },
  "Aguarda material": { argb: "FFFEF3C7" },
  "Em progresso":     { argb: "FFDBEAFE" },
  "A começar":        { argb: "FFCCFBF1" },
  "Avaliar":          { argb: "FFEDE9FE" },
};

export async function exportDashboardToExcel(equipment) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "STILL Frota ACP";
  workbook.created = new Date();

  // ─── Sheet 1: Dashboard ───────────────────────────────────────────────
  const dash = workbook.addWorksheet("Dashboard", {
    properties: { tabColor: { argb: "FFF08100" } },
  });

  dash.columns = [
    { width: 28 },
    { width: 18 },
    { width: 18 },
  ];

  // Title block
  dash.mergeCells("A1:C1");
  const titleCell = dash.getCell("A1");
  titleCell.value = "STILL — Portal da Frota ACP";
  titleCell.font = { bold: true, size: 18, color: { argb: "FFF08100" } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A1A" } };
  dash.getRow(1).height = 40;

  dash.mergeCells("A2:C2");
  const subCell = dash.getCell("A2");
  subCell.value = `Exportado em ${new Date().toLocaleString("pt-PT")}`;
  subCell.font = { size: 10, color: { argb: "FF94A3B8" }, italic: true };
  subCell.alignment = { horizontal: "center" };
  subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A1A" } };
  dash.getRow(2).height = 20;

  dash.addRow([]);

  // KPI header
  const kpiHeaderRow = dash.addRow(["Indicador", "Qtd.", "% do Total"]);
  kpiHeaderRow.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF08100" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFE07000" } },
      bottom: { style: "thin", color: { argb: "FFE07000" } },
    };
  });
  dash.getRow(4).height = 24;

  const total = equipment.length;
  const count = (st) => equipment.filter((e) => e.status === st).length;

  const kpis = [
    { label: "Total Equipamentos",  val: total,                       pct: "100%",     color: { argb: "FF475569" } },
    { label: "Máquinas Prontas",    val: count("Pronta"),              status: "Pronta" },
    { label: "UTS (Paradas)",       val: count("UTS"),                 status: "UTS" },
    { label: "Aguardam Material",   val: count("Aguarda material"),    status: "Aguarda material" },
    { label: "Em Progresso",        val: count("Em progresso"),        status: "Em progresso" },
    { label: "A Começar",           val: count("A começar"),           status: "A começar" },
    { label: "Avaliar",             val: count("Avaliar"),             status: "Avaliar" },
  ];

  kpis.forEach(({ label, val, pct, status, color }) => {
    const pctStr = pct || (total > 0 ? ((val / total) * 100).toFixed(1) + "%" : "0%");
    const fg = status ? STATUS_BG[status] : { argb: "FFF8FAFC" };
    const textColor = status ? STATUS_COLORS[status] : color || { argb: "FF1E293B" };
    const row = dash.addRow([label, val, pctStr]);
    row.height = 22;
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: fg };
      cell.font = { color: textColor, bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        bottom: { style: "hair", color: { argb: "FFE2E8F0" } },
      };
    });
    row.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
    row.getCell(1).font = { bold: true, color: { argb: "FF1E293B" } };
  });

  dash.addRow([]);
  dash.addRow([]);

  // Distribution summary (chart-like table)
  dash.mergeCells(`A${dash.lastRow.number}:C${dash.lastRow.number}`);
  const distHeader = dash.lastRow.getCell(1);
  distHeader.value = "Distribuição por Estado";
  distHeader.font = { bold: true, size: 12, color: { argb: "FFF08100" } };
  distHeader.alignment = { horizontal: "left" };
  dash.getRow(dash.lastRow.number).height = 22;

  const statuses = ["Pronta", "UTS", "Aguarda material", "Em progresso", "A começar", "Avaliar"];
  statuses.forEach((st) => {
    const c = count(st);
    const pct = total > 0 ? ((c / total) * 100).toFixed(1) : "0";
    const bar = "█".repeat(Math.round(Number(pct) / 5)); // visual bar (max 20 chars)
    const row = dash.addRow([st, `${c} equipamentos`, `${pct}%  ${bar}`]);
    row.height = 20;
    row.getCell(1).font = { bold: true, color: STATUS_COLORS[st] };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: STATUS_BG[st] };
    row.getCell(2).alignment = { horizontal: "center" };
    row.getCell(3).font = { color: STATUS_COLORS[st] };
    row.eachCell((cell) => {
      cell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } };
    });
  });

  // ─── Sheet 2: Equipamentos ────────────────────────────────────────────
  const eqSheet = workbook.addWorksheet("Equipamentos", {
    properties: { tabColor: { argb: "FF1E293B" } },
  });

  eqSheet.columns = [
    { header: "", key: "estado",     width: 22 },
    { header: "", key: "modelo",     width: 22 },
    { header: "", key: "ns",         width: 20 },
    { header: "", key: "observacao", width: 40 },
    { header: "", key: "data",       width: 22 },
  ];

  // Header row
  const eqHeader = eqSheet.addRow(["Estado", "Modelo", "Nº Série", "Acção / Obs.", "Criado em"]);
  eqHeader.height = 26;
  eqHeader.eachCell((cell) => {
    cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A1A" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = { bottom: { style: "medium", color: { argb: "FFF08100" } } };
  });

  // Auto-filter
  eqSheet.autoFilter = { from: "A1", to: "E1" };

  // Data rows
  equipment.forEach((eq) => {
    const row = eqSheet.addRow([
      eq.status,
      eq.equipment,
      eq.serial_number,
      eq.action || "",
      eq.created_date ? new Date(eq.created_date).toLocaleDateString("pt-PT") : "",
    ]);
    row.height = 20;

    const statusCell = row.getCell(1);
    statusCell.font = { bold: true, color: STATUS_COLORS[eq.status] || { argb: "FF475569" } };
    statusCell.fill = { type: "pattern", pattern: "solid", fgColor: STATUS_BG[eq.status] || { argb: "FFF8FAFC" } };
    statusCell.alignment = { horizontal: "center", vertical: "middle" };

    row.getCell(2).font = { bold: true };
    row.getCell(3).font = { name: "Courier New", size: 10, color: { argb: "FF64748B" } };
    row.getCell(4).font = { italic: true, color: { argb: "FF64748B" } };
    row.getCell(5).alignment = { horizontal: "center" };
    row.getCell(5).font = { color: { argb: "FF94A3B8" } };

    row.eachCell((cell) => {
      cell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } };
    });
  });

  // Freeze top row
  eqSheet.views = [{ state: "frozen", ySplit: 1 }];

  // ─── Download ─────────────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `STILL_Frota_ACP_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}