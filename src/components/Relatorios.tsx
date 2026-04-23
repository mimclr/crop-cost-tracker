import type { Lancamento } from "@/lib/db";
import { brl, num } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { resumoAnual, resumoAtividade, resumoMensal } from "@/lib/exporters";

interface Props {
  lancamentos: Lancamento[];
}

const MES_LABEL: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr", "05": "Mai", "06": "Jun",
  "07": "Jul", "08": "Ago", "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
};

function formatMes(yyyymm: string) {
  const [y, m] = yyyymm.split("-");
  return `${MES_LABEL[m] ?? m}/${y.slice(2)}`;
}

export function Relatorios({ lancamentos }: Props) {
  if (lancamentos.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Adicione lançamentos para ver os relatórios.
      </Card>
    );
  }

  const mensal = resumoMensal(lancamentos).reverse();
  const anual = resumoAnual(lancamentos).reverse();
  const atividades = resumoAtividade(lancamentos).sort((a, b) => b.total - a.total);

  const totalGeral = lancamentos.reduce((s, l) => s + l.valor_total, 0);
  const maxAtiv = Math.max(...atividades.map((a) => a.total), 1);

  return (
    <div className="space-y-5">
      <Card className="p-4" style={{ background: "var(--gradient-primary)" }}>
        <p className="text-xs text-primary-foreground/80">Custo total acumulado</p>
        <p className="text-3xl font-bold text-primary-foreground">{brl(totalGeral)}</p>
      </Card>

      <section>
        <h3 className="text-sm font-semibold mb-2 text-foreground">Por atividade</h3>
        <div className="space-y-2">
          {atividades.map((a) => (
            <Card key={a.chave} className="p-3">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium truncate pr-2">{a.chave}</span>
                <span className="font-semibold text-primary shrink-0">{brl(a.total)}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(a.total / maxAtiv) * 100}%`,
                    background: "var(--gradient-primary)",
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                <span>Qtd: {num(a.quantidade)}</span>
                <span>
                  Médio: {a.quantidade > 0 ? brl(a.total / a.quantidade) : "—"}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-2 text-foreground">Resumo mensal</h3>
        <Card className="overflow-hidden">
          <div className="divide-y">
            {mensal.map((m) => (
              <div key={m.chave} className="flex justify-between items-center p-3 text-sm">
                <span className="font-medium">{formatMes(m.chave)}</span>
                <div className="text-right">
                  <p className="font-semibold text-primary">{brl(m.total)}</p>
                  <p className="text-xs text-muted-foreground">
                    Médio: {m.quantidade > 0 ? brl(m.total / m.quantidade) : "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-2 text-foreground">Resumo anual</h3>
        <Card className="overflow-hidden">
          <div className="divide-y">
            {anual.map((a) => (
              <div key={a.chave} className="flex justify-between items-center p-3 text-sm">
                <span className="font-medium">{a.chave}</span>
                <div className="text-right">
                  <p className="font-semibold text-primary">{brl(a.total)}</p>
                  <p className="text-xs text-muted-foreground">
                    Médio: {a.quantidade > 0 ? brl(a.total / a.quantidade) : "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
