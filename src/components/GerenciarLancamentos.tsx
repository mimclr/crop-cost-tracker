import { useMemo, useState } from "react";
import type { Lancamento } from "@/lib/db";
import { ATIVIDADES, deleteLancamento } from "@/lib/db";
import { brl, fmtDate, num } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  lancamentos: Lancamento[];
  onChange: () => void;
  onEdit: (l: Lancamento) => void;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function GerenciarLancamentos({ lancamentos, onChange, onEdit }: Props) {
  const [busca, setBusca] = useState("");
  const [mes, setMes] = useState<string>("todos");
  const [ano, setAno] = useState<string>("todos");
  const [atividade, setAtividade] = useState<string>("todas");
  const [confirmDel, setConfirmDel] = useState<Lancamento | null>(null);

  const anos = useMemo(
    () => Array.from(new Set(lancamentos.map((l) => l.data.slice(0, 4)))).sort().reverse(),
    [lancamentos],
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return lancamentos.filter((l) => {
      if (ano !== "todos" && l.data.slice(0, 4) !== ano) return false;
      if (mes !== "todos" && l.data.slice(5, 7) !== mes) return false;
      if (atividade !== "todas" && l.atividade !== atividade) return false;
      if (termo) {
        const blob = `${l.elemento_despesa} ${l.atividade} ${l.observacao} ${l.data}`.toLowerCase();
        if (!blob.includes(termo)) return false;
      }
      return true;
    });
  }, [lancamentos, mes, ano, atividade, busca]);

  const total = filtrados.reduce((s, l) => s + l.valor_total, 0);
  const hasFiltro =
    busca.trim() !== "" || mes !== "todos" || ano !== "todos" || atividade !== "todas";

  const limparFiltros = () => {
    setBusca("");
    setMes("todos");
    setAno("todos");
    setAtividade("todas");
  };

  const confirmarExclusao = async () => {
    if (!confirmDel) return;
    await deleteLancamento(confirmDel.id);
    toast.success("Lançamento excluído");
    setConfirmDel(null);
    onChange();
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por elemento, atividade, observação..."
          className="pl-9 pr-9"
        />
        {busca && (
          <button
            type="button"
            onClick={() => setBusca("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            aria-label="Limpar busca"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Select value={ano} onValueChange={setAno}>
          <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos anos</SelectItem>
            {anos.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos meses</SelectItem>
            {MESES.map((m, i) => (
              <SelectItem key={m} value={String(i + 1).padStart(2, "0")}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={atividade} onValueChange={setAtividade}>
          <SelectTrigger><SelectValue placeholder="Atividade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            {ATIVIDADES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card
        className="p-4 flex justify-between items-center"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div>
          <p className="text-xs text-primary-foreground/80">Total filtrado</p>
          <p className="text-2xl font-bold text-primary-foreground">{brl(total)}</p>
        </div>
        <div className="text-right">
          <p className="text-primary-foreground/90 text-sm">
            {filtrados.length} {filtrados.length === 1 ? "item" : "itens"}
          </p>
          {hasFiltro && (
            <button
              type="button"
              onClick={limparFiltros}
              className="text-[11px] text-primary-foreground/80 underline mt-1"
            >
              limpar filtros
            </button>
          )}
        </div>
      </Card>

      {filtrados.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          {lancamentos.length === 0
            ? "Nenhum lançamento ainda. Use o botão + para adicionar."
            : "Nenhum resultado para os filtros aplicados."}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtrados.map((l) => (
            <Card key={l.id} className="p-3">
              <div className="flex justify-between items-start gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span>{fmtDate(l.data)}</span>
                    <span>•</span>
                    <span className="truncate">{l.atividade}</span>
                  </div>
                  <p className="font-medium truncate">{l.elemento_despesa}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                    <span>Qtd: {num(l.quantidade)}</span>
                    <span>Unit: {brl(l.valor_unitario)}</span>
                  </div>
                  {l.observacao && (
                    <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">
                      {l.observacao}
                    </p>
                  )}
                </div>
                <p className="font-bold text-primary shrink-0">{brl(l.valor_total)}</p>
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8"
                  onClick={() => onEdit(l)}
                >
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmDel(l)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDel && (
                <>
                  Esta ação não pode ser desfeita. Lançamento de{" "}
                  <strong>{confirmDel.elemento_despesa}</strong> em{" "}
                  <strong>{fmtDate(confirmDel.data)}</strong> ({brl(confirmDel.valor_total)}).
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExclusao}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
