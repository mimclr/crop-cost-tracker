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

export function exportXLSX(lancamentos: Lancamento[], produtor: Produtor | undefined) {
  const wb = XLSX.utils.book_new();

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

  if (produtor) {
    const info = [
      { Campo: "Produtor", Valor: produtor.nomeCompleto },
      { Campo: "Propriedade", Valor: produtor.nomePropriedade },
      { Campo: "Cultura", Valor: produtor.cultura },
      { Campo: "E-mail", Valor: produtor.email },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(info), "Produtor");
  }

  const filename = `custos-agro-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportPDF(lancamentos: Lancamento[], produtor: Produtor | undefined) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Relatório de Custos Operacionais Agrícolas", 14, 18);
  doc.setFontSize(10);
  let y = 28;
  if (produtor) {
    doc.text(`Produtor: ${produtor.nomeCompleto}`, 14, y);
    doc.text(`Propriedade: ${produtor.nomePropriedade}`, 14, y + 6);
    doc.text(`Cultura: ${produtor.cultura}`, 14, y + 12);
    y += 20;
  }

  autoTable(doc, {
    startY: y,
    head: [["Mês", "Qtd Total", "Valor Total", "Custo Médio"]],
    body: resumoMensal(lancamentos).map((r) => [
      r.chave,
      r.quantidade.toFixed(2),
      brl(r.total),
      r.quantidade > 0 ? brl(r.total / r.quantidade) : "-",
    ]),
    headStyles: { fillColor: [61, 107, 58] },
    didDrawPage: () => {
      doc.setFontSize(12);
      doc.text("Resumo Mensal", 14, y - 4);
    },
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
    headStyles: { fillColor: [61, 107, 58] },
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
    headStyles: { fillColor: [61, 107, 58] },
  });

  doc.save(`custos-agro-${new Date().toISOString().slice(0, 10)}.pdf`);
}
