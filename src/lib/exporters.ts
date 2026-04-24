import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Lancamento, Produtor } from "./db";
import { brl, fmtDate } from "./format";
import logoLabor from "@/assets/logo-labor-rural.png";

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(logoLabor);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

interface Resumo {
  chave: string;
  total: number;
  quantidade: number;
}

function agrupar(lancamentos: Lancamento[], keyFn: (l: Lancamento) => string): Resumo[] {
  const map = new Map<string, Resumo>();
  for (const l of lancamentos) {
    const k = keyFn(l);
    const cur = map.get(k) ?? { chave: k, total: 0, quantidade: 0 };
    cur.total += l.valor_total;
    cur.quantidade += l.quantidade;
    map.set(k, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.chave.localeCompare(b.chave));
}

export function resumoMensal(l: Lancamento[]) {
  return agrupar(l, (x) => x.data.slice(0, 7));
}
export function resumoAnual(l: Lancamento[]) {
  return agrupar(l, (x) => x.data.slice(0, 4));
}
export function resumoAtividade(l: Lancamento[]) {
  return agrupar(l, (x) => x.atividade);
}

export async function exportXLSX(lancamentos: Lancamento[], produtor: Produtor | undefined) {
  const wb = XLSX.utils.book_new();
  wb.Props = {
    Title: "Gestão de Custos - Labor Rural",
    Subject: "Custos operacionais agrícolas",
    Author: "Labor Rural",
    Company: "Labor Rural",
    CreatedDate: new Date(),
  };

  const lancRows = lancamentos.map((l) => ({
    Data: fmtDate(l.data),
    Atividade: l.atividade,
    "Elemento de Despesa": l.elemento_despesa,
    Quantidade: l.quantidade,
    "Valor Total (R$)": l.valor_total,
    "Valor Unitário (R$)": l.valor_unitario,
    Observação: l.observacao,
  }));
  const ws1 = XLSX.utils.json_to_sheet(lancRows);
  XLSX.utils.book_append_sheet(wb, ws1, "Lançamentos");

  const mensal = resumoMensal(lancamentos).map((r) => ({
    Mês: r.chave,
    "Quantidade Total": r.quantidade,
    "Valor Total (R$)": r.total,
    "Custo Médio Pond.": r.quantidade > 0 ? r.total / r.quantidade : 0,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mensal), "Resumo Mensal");

  const anual = resumoAnual(lancamentos).map((r) => ({
    Ano: r.chave,
    "Quantidade Total": r.quantidade,
    "Valor Total (R$)": r.total,
    "Custo Médio Pond.": r.quantidade > 0 ? r.total / r.quantidade : 0,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(anual), "Resumo Anual");

  const infoRows: Array<{ Campo: string; Valor: string }> = [
    { Campo: "Empresa", Valor: "Labor Rural" },
    { Campo: "Relatório", Valor: "Gestão de Custos Operacionais Agrícolas" },
    { Campo: "Gerado em", Valor: new Date().toLocaleString("pt-BR") },
  ];
  if (produtor) {
    infoRows.push(
      { Campo: "Produtor", Valor: produtor.nomeCompleto },
      { Campo: "Propriedade", Valor: produtor.nomePropriedade },
      { Campo: "Cultura", Valor: produtor.cultura },
      { Campo: "E-mail", Valor: produtor.email },
    );
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(infoRows), "Informações");

  const filename = `labor-rural-custos-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export async function exportPDF(lancamentos: Lancamento[], produtor: Produtor | undefined) {
  const doc = new jsPDF();
  const logo = await loadLogoDataUrl();

  // Cabeçalho com logo
  if (logo) {
    try {
      doc.addImage(logo, "PNG", 14, 10, 22, 22);
    } catch {
      // ignora se falhar
    }
  }
  doc.setFontSize(15);
  doc.setTextColor(15, 76, 74);
  doc.text("Gestão de Custos — Labor Rural", 40, 20);
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text("Relatório de Custos Operacionais Agrícolas", 40, 27);
  doc.setTextColor(0, 0, 0);

  let y = 40;
  if (produtor) {
    doc.setFontSize(10);
    doc.text(`Produtor: ${produtor.nomeCompleto}`, 14, y);
    doc.text(`Propriedade: ${produtor.nomePropriedade}`, 14, y + 6);
    doc.text(`Cultura: ${produtor.cultura}`, 14, y + 12);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, y + 18);
    y += 26;
  }

  const headColor: [number, number, number] = [15, 76, 74];

  doc.setFontSize(12);
  doc.text("Resumo Mensal", 14, y - 2);
  autoTable(doc, {
    startY: y,
    head: [["Mês", "Qtd Total", "Valor Total", "Custo Médio"]],
    body: resumoMensal(lancamentos).map((r) => [
      r.chave,
      r.quantidade.toFixed(2),
      brl(r.total),
      r.quantidade > 0 ? brl(r.total / r.quantidade) : "-",
    ]),
    headStyles: { fillColor: headColor },
  });

  let lastY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text("Resumo Anual", 14, lastY - 2);
  autoTable(doc, {
    startY: lastY,
    head: [["Ano", "Qtd Total", "Valor Total", "Custo Médio"]],
    body: resumoAnual(lancamentos).map((r) => [
      r.chave,
      r.quantidade.toFixed(2),
      brl(r.total),
      r.quantidade > 0 ? brl(r.total / r.quantidade) : "-",
    ]),
    headStyles: { fillColor: headColor },
  });

  lastY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text("Total por Atividade", 14, lastY - 2);
  autoTable(doc, {
    startY: lastY,
    head: [["Atividade", "Qtd", "Valor Total", "Custo Médio"]],
    body: resumoAtividade(lancamentos).map((r) => [
      r.chave,
      r.quantidade.toFixed(2),
      brl(r.total),
      r.quantidade > 0 ? brl(r.total / r.quantidade) : "-",
    ]),
    headStyles: { fillColor: headColor },
  });

  // Rodapé em todas as páginas
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Labor Rural — Gestão de Custos", 14, pageHeight - 8);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 8, { align: "right" });
  }

  doc.save(`labor-rural-custos-${new Date().toISOString().slice(0, 10)}.pdf`);
}

