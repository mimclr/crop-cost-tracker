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

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCSV(rows: Array<Record<string, unknown>>, headers: string[]): string {
  const lines = [headers.map(csvEscape).join(";")];
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape(r[h])).join(";"));
  }
  return lines.join("\r\n");
}

function downloadCSV(content: string, filename: string) {
  // BOM para Excel reconhecer UTF-8 corretamente
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportCSV(lancamentos: Lancamento[], produtor: Produtor | undefined) {
  const sections: string[] = [];

  // Cabeçalho informativo
  const info: string[] = [
    "Labor Rural - Gestão de Custos Operacionais Agrícolas",
    `Gerado em;${new Date().toLocaleString("pt-BR")}`,
  ];
  if (produtor) {
    info.push(
      `Produtor;${produtor.nomeCompleto}`,
      `Propriedade;${produtor.nomePropriedade}`,
      `Cultura;${produtor.cultura}`,
      `E-mail;${produtor.email}`,
    );
  }
  sections.push(info.map((l) => l.split(";").map(csvEscape).join(";")).join("\r\n"));

  // Talhões
  if (produtor && produtor.talhoes && produtor.talhoes.length > 0) {
    const talhHeaders = ["Talhão", "Área (ha)"];
    const talhRows = produtor.talhoes.map((t) => ({
      "Talhão": t.nome,
      "Área (ha)": t.area.toFixed(2).replace(".", ","),
    }));
    sections.push("TALHÕES\r\n" + toCSV(talhRows, talhHeaders));
  }

  // Lançamentos
  const lancHeaders = [
    "Data",
    "Atividade",
    "Elemento de Despesa",
    "Quantidade",
    "Valor Total (R$)",
    "Valor Unitário (R$)",
    "Talhões",
    "Observação",
  ];
  const lancRows = lancamentos.map((l) => ({
    Data: fmtDate(l.data),
    Atividade: l.atividade,
    "Elemento de Despesa": l.elemento_despesa,
    Quantidade: l.quantidade.toFixed(2).replace(".", ","),
    "Valor Total (R$)": l.valor_total.toFixed(2).replace(".", ","),
    "Valor Unitário (R$)": l.valor_unitario.toFixed(2).replace(".", ","),
    "Talhões": l.rateios.map((r) => r.talhao_nome).join(" | "),
    Observação: l.observacao,
  }));
  sections.push("LANÇAMENTOS\r\n" + toCSV(lancRows, lancHeaders));

  // Rateio por talhão (linha por talhão de cada lançamento)
  const rateioHeaders = [
    "Data",
    "Atividade",
    "Elemento de Despesa",
    "Talhão",
    "Área (ha)",
    "Quantidade Rateada",
    "Valor Rateado (R$)",
  ];
  const rateioRows: Array<Record<string, unknown>> = [];
  for (const l of lancamentos) {
    for (const r of l.rateios) {
      rateioRows.push({
        Data: fmtDate(l.data),
        Atividade: l.atividade,
        "Elemento de Despesa": l.elemento_despesa,
        "Talhão": r.talhao_nome,
        "Área (ha)": r.area.toFixed(2).replace(".", ","),
        "Quantidade Rateada": r.quantidade.toFixed(2).replace(".", ","),
        "Valor Rateado (R$)": r.valor.toFixed(2).replace(".", ","),
      });
    }
  }
  if (rateioRows.length > 0) {
    sections.push("RATEIO POR TALHÃO\r\n" + toCSV(rateioRows, rateioHeaders));
  }

  // Totais por talhão
  const totaisTalhao = new Map<string, { nome: string; area: number; quantidade: number; valor: number }>();
  for (const l of lancamentos) {
    for (const r of l.rateios) {
      const cur = totaisTalhao.get(r.talhao_id) ?? {
        nome: r.talhao_nome,
        area: r.area,
        quantidade: 0,
        valor: 0,
      };
      cur.quantidade += r.quantidade;
      cur.valor += r.valor;
      totaisTalhao.set(r.talhao_id, cur);
    }
  }
  if (totaisTalhao.size > 0) {
    const totHeaders = ["Talhão", "Área (ha)", "Quantidade Total", "Valor Total (R$)", "Custo por ha (R$)"];
    const totRows = Array.from(totaisTalhao.values()).map((t) => ({
      "Talhão": t.nome,
      "Área (ha)": t.area.toFixed(2).replace(".", ","),
      "Quantidade Total": t.quantidade.toFixed(2).replace(".", ","),
      "Valor Total (R$)": t.valor.toFixed(2).replace(".", ","),
      "Custo por ha (R$)": (t.area > 0 ? t.valor / t.area : 0).toFixed(2).replace(".", ","),
    }));
    sections.push("TOTAIS POR TALHÃO\r\n" + toCSV(totRows, totHeaders));
  }

  // Resumo Mensal
  const mensalRows = resumoMensal(lancamentos).map((r) => ({
    Mês: r.chave,
    "Quantidade Total": r.quantidade.toFixed(2).replace(".", ","),
    "Valor Total (R$)": r.total.toFixed(2).replace(".", ","),
    "Custo Médio Pond.": (r.quantidade > 0 ? r.total / r.quantidade : 0)
      .toFixed(2)
      .replace(".", ","),
  }));
  sections.push(
    "RESUMO MENSAL\r\n" +
      toCSV(mensalRows, ["Mês", "Quantidade Total", "Valor Total (R$)", "Custo Médio Pond."]),
  );

  // Resumo Anual
  const anualRows = resumoAnual(lancamentos).map((r) => ({
    Ano: r.chave,
    "Quantidade Total": r.quantidade.toFixed(2).replace(".", ","),
    "Valor Total (R$)": r.total.toFixed(2).replace(".", ","),
    "Custo Médio Pond.": (r.quantidade > 0 ? r.total / r.quantidade : 0)
      .toFixed(2)
      .replace(".", ","),
  }));
  sections.push(
    "RESUMO ANUAL\r\n" +
      toCSV(anualRows, ["Ano", "Quantidade Total", "Valor Total (R$)", "Custo Médio Pond."]),
  );

  const filename = `labor-rural-custos-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCSV(sections.join("\r\n\r\n"), filename);
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

