import { useEffect, useMemo, useState } from "react";
import {
  calcularEstoque,
  listCompras,
  listLancamentos,
  type Compra,
  type EstoqueItem,
  type Lancamento,
} from "@/lib/db";
import { brl, num } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Package, Search, X } from "lucide-react";

export function Estoque() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    (async () => {
      const [c, l] = await Promise.all([listCompras(), listLancamentos()]);
      setCompras(c);
      setLancamentos(l);
      setLoading(false);
    })();
  }, []);

  const itens = useMemo(
    () => calcularEstoque(compras, lancamentos),
    [compras, lancamentos],
  );

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return itens;
    return itens.filter((i) => i.insumo.toLowerCase().includes(t));
  }, [itens, busca]);

  const totais = filtrados.reduce(
    (acc, i) => {
      acc.valorComprado += i.valorComprado;
      acc.valorEstoque += i.saldo > 0 ? i.saldo * i.precoMedio : 0;
      return acc;
    },
    { valorComprado: 0, valorEstoque: 0 },
  );

  const statusCor = (item: EstoqueItem) => {
    if (item.saldo <= 0) return "text-destructive";
    if (item.saldo < item.comprado * 0.2) return "text-amber-600";
    return "text-emerald-700";
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar insumo..."
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

      <Card
        className="p-4 grid grid-cols-2 gap-3"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div>
          <p className="text-xs text-primary-foreground/80">Valor comprado</p>
          <p className="text-lg font-bold text-primary-foreground">{brl(totais.valorComprado)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-primary-foreground/80">Estoque atual (estim.)</p>
          <p className="text-lg font-bold text-primary-foreground">{brl(totais.valorEstoque)}</p>
        </div>
      </Card>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : filtrados.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          {itens.length === 0
            ? "Sem insumos no estoque. Cadastre compras na primeira aba."
            : "Nenhum resultado para a busca."}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtrados.map((i) => {
            const pctConsumido =
              i.comprado > 0 ? Math.min(100, (i.consumido / i.comprado) * 100) : 0;
            return (
              <Card key={i.insumo} className="p-3">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{i.insumo}</p>
                    <p className="text-xs text-muted-foreground">
                      Preço médio: {brl(i.precoMedio)}/{i.unidade}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-bold ${statusCor(i)}`}>
                      {num(i.saldo)} {i.unidade}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      saldo
                    </p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full"
                    style={{
                      width: `${pctConsumido}%`,
                      background:
                        i.saldo <= 0
                          ? "var(--destructive)"
                          : "var(--gradient-primary)",
                    }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Comprado</p>
                    <p className="font-medium">
                      {num(i.comprado)} {i.unidade}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Consumido</p>
                    <p className="font-medium">
                      {num(i.consumido)} {i.unidade}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Valor estoque</p>
                    <p className="font-medium">
                      {brl(Math.max(0, i.saldo) * i.precoMedio)}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground text-center pt-1">
        O consumo é deduzido automaticamente quando você lança um gasto cujo elemento de
        despesa coincide com o nome do insumo.
      </p>
    </div>
  );
}
