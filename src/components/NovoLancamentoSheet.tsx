import { useEffect, useState } from "react";
import {
  ATIVIDADES,
  ELEMENTOS_SUGERIDOS,
  addLancamento,
  updateLancamento,
  type Lancamento,
} from "@/lib/db";
import { todayISO } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (l: Lancamento) => void;
  elementosUsados: string[];
  /** Quando definido, abre em modo edição */
  editing?: Lancamento | null;
}

export function NovoLancamentoSheet({ open, onOpenChange, onSaved, elementosUsados, editing }: Props) {
  const isEdit = !!editing;
  const [data, setData] = useState(todayISO());
  const [atividade, setAtividade] = useState<string>(ATIVIDADES[0]);
  const [elemento, setElemento] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setData(editing.data);
      setAtividade(editing.atividade);
      setElemento(editing.elemento_despesa);
      setQuantidade(String(editing.quantidade));
      setValorTotal(String(editing.valor_total));
      setObservacao(editing.observacao);
    } else {
      setData(todayISO());
      setAtividade(ATIVIDADES[0]);
      setElemento("");
      setQuantidade("");
      setValorTotal("");
      setObservacao("");
    }
  }, [open, editing]);

  const qtd = parseFloat(quantidade.replace(",", "."));
  const vt = parseFloat(valorTotal.replace(",", "."));
  const vu = qtd > 0 && !isNaN(vt) ? vt / qtd : 0;

  const sugestoes = Array.from(new Set([...ELEMENTOS_SUGERIDOS, ...elementosUsados]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!elemento.trim()) {
      toast.error("Informe o elemento de despesa");
      return;
    }
    if (!(qtd > 0)) {
      toast.error("Quantidade deve ser maior que zero");
      return;
    }
    if (isNaN(vt) || vt < 0) {
      toast.error("Valor total inválido");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        data,
        atividade,
        elemento_despesa: elemento.trim(),
        quantidade: qtd,
        valor_total: vt,
        observacao: observacao.trim(),
      };
      const result = isEdit
        ? await updateLancamento(editing!.id, payload)
        : await addLancamento(payload);
      toast.success(isEdit ? "Lançamento atualizado" : "Lançamento salvo");
      onSaved(result);
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>{isEdit ? "Editar Lançamento" : "Novo Lançamento"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Altere os dados e salve" : "Preencha os dados do gasto operacional"}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="data">Data</Label>
            <Input
              id="data"
              type="date"
              required
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Atividade</Label>
            <Select value={atividade} onValueChange={setAtividade}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ATIVIDADES.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="elem">Elemento de despesa</Label>
            <Input
              id="elem"
              list="elementos-list"
              required
              value={elemento}
              onChange={(e) => setElemento(e.target.value)}
              placeholder="Ex.: Mão de obra"
            />
            <datalist id="elementos-list">
              {sugestoes.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="qtd">Quantidade</Label>
              <Input
                id="qtd"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                required
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vt">Valor total (R$)</Label>
              <Input
                id="vt"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                required
                value={valorTotal}
                onChange={(e) => setValorTotal(e.target.value)}
              />
            </div>
          </div>
          <div
            className="rounded-lg border p-3 text-sm flex justify-between items-center"
            style={{ background: "var(--muted)" }}
          >
            <span className="text-muted-foreground">Valor unitário</span>
            <span className="font-semibold">
              {vu > 0
                ? vu.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                : "—"}
            </span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="obs">Observação</Label>
            <Textarea
              id="obs"
              rows={2}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>
          <div className="flex gap-2 pt-2 pb-6">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? "Salvando..." : isEdit ? "Atualizar" : "Salvar"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
