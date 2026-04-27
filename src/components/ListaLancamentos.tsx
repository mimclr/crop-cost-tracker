import { useMemo, useState } from "react";
import type { Lancamento } from "@/lib/db";
import { ATIVIDADES, deleteLancamento } from "@/lib/db";
import { brl, fmtDate, num } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  lancamentos: Lancamento[];
  onChange: () => void;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function ListaLancamentos({ lancamentos, onChange }: Props) {
  const [mes, setMes] = useState<string>("todos");
  const [ano, setAno] = useState<string>("todos");
  const [atividade, setAtividade] = useState<string>("todas");

  const anos = useMemo(
    () => Array.from(new Set(lancamentos.map((l) => l.data.slice(0, 4)))).sort().reverse(),
    [lancamentos],
  );

  const filtrados = useMemo(() => {
    return lancamentos.filter((l) => {
      if (ano !== "todos" && l.data.slice(0, 4) !== ano) return false;
      if (mes !== "todos" && l.data.slice(5, 7) !== mes) return false;
      if (atividade !== "todas" && l.atividade !== atividade) return false;
      return true;
    });
  }, [lancamentos, mes, ano, atividade]);

  const total = filtrados.reduce((s, l) => s + l.valor_total, 0);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este lançamento?")) return;
    await deleteLancamento(id);
    toast.success("Lançamento excluído");
    onChange();
  };

  return (
    <div className="space-y-4">
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

      <Card className="p-4 flex justify-between items-center" style={{ background: "var(--gradient-primary)" }}>
        <div>
          <p className="text-xs text-primary-foreground/80">Total filtrado</p>
          <p className="text-2xl font-bold text-primary-foreground">{brl(total)}</p>
        </div>
        <div className="text-right text-primary-foreground/90 text-sm">
          {filtrados.length} {filtrados.length === 1 ? "lançamento" : "lançamentos"}
        </div>
      </Card>

      {filtrados.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhum lançamento encontrado.
        </Card>
      ) : (
        <div className="space-y-2">
          {filtrados.map((l) => {
            const nomesTalhoes = l.rateios.map((r) => r.talhao_nome);
            return (
              <Card key={l.id} className="p-3">
                <div className="flex justify-between items-start gap-2">
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
                    {nomesTalhoes.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        <span className="font-medium text-foreground/70">Talhões: </span>
                        {nomesTalhoes.join(", ")}
                      </p>
                    )}
                    {l.observacao && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{l.observacao}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-primary">{brl(l.valor_total)}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(l.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
