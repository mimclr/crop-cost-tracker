import { useEffect, useMemo, useState } from "react";
import {
  ATIVIDADES,
  ELEMENTOS_SUGERIDOS,
  addLancamento,
  calcularRateios,
  updateLancamento,
  type Lancamento,
  type Talhao,
} from "@/lib/db";
import { brl, todayISO } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (l: Lancamento) => void;
  elementosUsados: string[];
  insumosComprados?: string[];
  talhoes: Talhao[];
  /** Quando definido, abre em modo edição */
  editing?: Lancamento | null;
}

export function NovoLancamentoSheet({
  open,
  onOpenChange,
  onSaved,
  elementosUsados,
  insumosComprados = [],
  talhoes,
  editing,
}: Props) {
  const isEdit = !!editing;
  const [data, setData] = useState(todayISO());
  const [atividade, setAtividade] = useState<string>(ATIVIDADES[0]);
  const [elemento, setElemento] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [observacao, setObservacao] = useState("");
  const [talhaoIds, setTalhaoIds] = useState<string[]>([]);
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
      // mantém apenas ids ainda existentes
      const validos = editing.talhao_ids.filter((id) => talhoes.some((t) => t.id === id));
      setTalhaoIds(validos.length ? validos : talhoes.map((t) => t.id));
    } else {
      setData(todayISO());
      setAtividade(ATIVIDADES[0]);
      setElemento("");
      setQuantidade("");
      setValorTotal("");
      setObservacao("");
      // padrão: todos os talhões
      setTalhaoIds(talhoes.map((t) => t.id));
    }
  }, [open, editing, talhoes]);

  const qtd = parseFloat(quantidade.replace(",", "."));
  const vt = parseFloat(valorTotal.replace(",", "."));
  const vu = qtd > 0 && !isNaN(vt) ? vt / qtd : 0;

  const todosSelecionados = talhoes.length > 0 && talhaoIds.length === talhoes.length;

  const toggleTodos = (checked: boolean) => {
    setTalhaoIds(checked ? talhoes.map((t) => t.id) : []);
  };

  const toggleTalhao = (id: string, checked: boolean) => {
    setTalhaoIds((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id),
    );
  };

  const previewRateios = useMemo(() => {
    if (!(qtd > 0) || isNaN(vt)) return [];
    return calcularRateios(talhoes, talhaoIds, qtd, vt);
  }, [talhoes, talhaoIds, qtd, vt]);

  const sugestoes = Array.from(
    new Set([...insumosComprados, ...ELEMENTOS_SUGERIDOS, ...elementosUsados]),
  );

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
    if (talhaoIds.length === 0) {
      toast.error("Selecione ao menos um talhão");
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
        talhao_ids: talhaoIds,
      };
      const result = isEdit
        ? await updateLancamento(editing!.id, payload, talhoes)
        : await addLancamento(payload, talhoes);
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
              {vu > 0 ? brl(vu) : "—"}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Talhões aplicados</Label>
              {talhoes.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {talhaoIds.length}/{talhoes.length} selecionados
                </span>
              )}
            </div>
            {talhoes.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-md border p-3">
                Cadastre talhões em "Editar cadastro" para aplicar despesas.
              </p>
            ) : (
              <div className="rounded-md border divide-y">
                <label className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                  <Checkbox
                    checked={todosSelecionados}
                    onCheckedChange={(c) => toggleTodos(c === true)}
                  />
                  <span className="text-sm font-medium">Todos os talhões</span>
                </label>
                {talhoes.map((t) => {
                  const checked = talhaoIds.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) => toggleTalhao(t.id, c === true)}
                      />
                      <div className="flex-1 min-w-0 flex justify-between items-center gap-2">
                        <span className="text-sm truncate">{t.nome}</span>
                        <span className="text-xs text-muted-foreground">
                          {t.area.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ha
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {previewRateios.length > 0 && (
              <div
                className="rounded-md border p-3 text-xs space-y-1"
                style={{ background: "var(--muted)" }}
              >
                <p className="font-semibold text-foreground mb-1">Rateio proporcional por área</p>
                {previewRateios.map((r) => (
                  <div key={r.talhao_id} className="flex justify-between gap-2">
                    <span className="truncate">
                      {r.talhao_nome}{" "}
                      <span className="text-muted-foreground">
                        ({r.area.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ha)
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="text-muted-foreground">
                        {r.quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} •{" "}
                      </span>
                      <span className="font-medium">{brl(r.valor)}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
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
