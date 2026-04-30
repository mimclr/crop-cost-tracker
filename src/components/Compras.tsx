import { useEffect, useMemo, useState } from "react";
import {
  addCompra,
  deleteCompra,
  listCompras,
  updateCompra,
  type Compra,
} from "@/lib/db";
import { brl, fmtDate, num, todayISO } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Pencil, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const UNIDADES_SUGERIDAS = ["kg", "g", "L", "mL", "sc", "un", "t", "ha"];

interface Props {
  onChange: () => void;
}

export function Compras({ onChange }: Props) {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Compra | null>(null);
  const [confirmDel, setConfirmDel] = useState<Compra | null>(null);

  const reload = async () => {
    const data = await listCompras();
    setCompras(data);
  };

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  const insumosUnicos = useMemo(() => {
    const set = new Set<string>();
    for (const c of compras) {
      const v = c.insumo?.trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [compras]);

  const filtradas = useMemo(() => {
    if (!busca) return compras;
    const t = busca.toLowerCase();
    return compras.filter((c) => c.insumo.trim().toLowerCase() === t);
  }, [compras, busca]);

  const totalGasto = filtradas.reduce((s, c) => s + c.quantidade * c.preco_unitario, 0);

  const handleSaved = async () => {
    await reload();
    onChange();
  };

  const confirmarExclusao = async () => {
    if (!confirmDel) return;
    await deleteCompra(confirmDel.id);
    toast.success("Compra excluída");
    setConfirmDel(null);
    await handleSaved();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Select
          value={busca || "__all__"}
          onValueChange={(v) => setBusca(v === "__all__" ? "" : v)}
          disabled={insumosUnicos.length === 0}
        >
          <SelectTrigger className="flex-1">
            <SelectValue
              placeholder={
                insumosUnicos.length === 0
                  ? "Nenhum insumo registrado"
                  : "Filtrar por insumo..."
              }
            />
          </SelectTrigger>
          <SelectContent>
            {insumosUnicos.map((i) => (
              <SelectItem key={i} value={i}>
                {i}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {busca && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setBusca("")}
            aria-label="Limpar filtro"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Card
        className="p-4 flex justify-between items-center"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div>
          <p className="text-xs text-primary-foreground/80">Total em compras</p>
          <p className="text-2xl font-bold text-primary-foreground">{brl(totalGasto)}</p>
        </div>
        <div className="text-right text-primary-foreground/90 text-sm">
          {filtradas.length} {filtradas.length === 1 ? "compra" : "compras"}
        </div>
      </Card>

      <Button
        onClick={() => {
          setEditing(null);
          setSheetOpen(true);
        }}
        className="w-full"
        style={{ background: "var(--gradient-primary)" }}
      >
        <Plus className="h-4 w-4" /> Nova compra de insumo
      </Button>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : filtradas.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
          {compras.length === 0
            ? "Nenhuma compra registrada. Cadastre seus insumos adquiridos."
            : "Nenhum resultado para a busca."}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtradas.map((c) => {
            const total = c.quantidade * c.preco_unitario;
            return (
              <Card key={c.id} className="p-3">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <span>{fmtDate(c.data)}</span>
                      {c.fornecedor && (
                        <>
                          <span>•</span>
                          <span className="truncate">{c.fornecedor}</span>
                        </>
                      )}
                    </div>
                    <p className="font-medium truncate">{c.insumo}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                      <span>
                        Qtd: {num(c.quantidade)} {c.unidade}
                      </span>
                      <span>
                        {brl(c.preco_unitario)}/{c.unidade}
                      </span>
                    </div>
                    {c.observacao && (
                      <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">
                        {c.observacao}
                      </p>
                    )}
                  </div>
                  <p className="font-bold text-primary shrink-0">{brl(total)}</p>
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8"
                    onClick={() => {
                      setEditing(c);
                      setSheetOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setConfirmDel(c)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CompraSheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
        onSaved={handleSaved}
      />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir compra?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDel && (
                <>
                  Esta ação não pode ser desfeita. Compra de{" "}
                  <strong>{confirmDel.insumo}</strong> em{" "}
                  <strong>{fmtDate(confirmDel.data)}</strong>.
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

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Compra | null;
  onSaved: () => void;
}

function CompraSheet({ open, onOpenChange, editing, onSaved }: SheetProps) {
  const isEdit = !!editing;
  const [data, setData] = useState(todayISO());
  const [insumo, setInsumo] = useState("");
  const [unidade, setUnidade] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [precoUnit, setPrecoUnit] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setData(editing.data);
      setInsumo(editing.insumo);
      setUnidade(editing.unidade);
      setQuantidade(String(editing.quantidade));
      setPrecoUnit(String(editing.preco_unitario));
      setFornecedor(editing.fornecedor);
      setObservacao(editing.observacao);
    } else {
      setData(todayISO());
      setInsumo("");
      setUnidade("");
      setQuantidade("");
      setPrecoUnit("");
      setFornecedor("");
      setObservacao("");
    }
  }, [open, editing]);

  const qtd = parseFloat(quantidade.replace(",", "."));
  const pu = parseFloat(precoUnit.replace(",", "."));
  const total = qtd > 0 && pu >= 0 ? qtd * pu : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!insumo.trim()) return toast.error("Informe o nome do insumo");
    if (!unidade.trim()) return toast.error("Informe a unidade de medida");
    if (!(qtd > 0)) return toast.error("Quantidade deve ser maior que zero");
    if (isNaN(pu) || pu < 0) return toast.error("Preço unitário inválido");

    setSaving(true);
    try {
      const payload = {
        data,
        insumo: insumo.trim(),
        unidade: unidade.trim(),
        quantidade: qtd,
        preco_unitario: pu,
        fornecedor: fornecedor.trim(),
        observacao: observacao.trim(),
      };
      if (isEdit) await updateCompra(editing!.id, payload);
      else await addCompra(payload);
      toast.success(isEdit ? "Compra atualizada" : "Compra registrada");
      onSaved();
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
          <SheetTitle>{isEdit ? "Editar compra" : "Nova compra de insumo"}</SheetTitle>
          <SheetDescription>
            Informe quantidade adquirida e preço pago pela unidade
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="c-data">Data da compra</Label>
            <Input
              id="c-data"
              type="date"
              required
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-insumo">Insumo</Label>
            <Input
              id="c-insumo"
              required
              value={insumo}
              onChange={(e) => setInsumo(e.target.value)}
              placeholder="Ex.: Ureia, Glifosato, NPK 20-05-20"
            />
          </div>
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div className="space-y-2">
              <Label htmlFor="c-qtd">Quantidade adquirida</Label>
              <Input
                id="c-qtd"
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
              <Label htmlFor="c-un">Unidade</Label>
              <Input
                id="c-un"
                list="unidades-list"
                required
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                placeholder="kg"
              />
              <datalist id="unidades-list">
                {UNIDADES_SUGERIDAS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-pu">Preço por {unidade || "unidade"} (R$)</Label>
            <Input
              id="c-pu"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              value={precoUnit}
              onChange={(e) => setPrecoUnit(e.target.value)}
            />
          </div>
          <div
            className="rounded-lg border p-3 text-sm flex justify-between items-center"
            style={{ background: "var(--muted)" }}
          >
            <span className="text-muted-foreground">Total da compra</span>
            <span className="font-semibold">{total > 0 ? brl(total) : "—"}</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-forn">Fornecedor (opcional)</Label>
            <Input
              id="c-forn"
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
              placeholder="Ex.: Agropecuária X"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-obs">Observação</Label>
            <Textarea
              id="c-obs"
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
