import { useEffect, useState } from "react";
import { clearSession } from "@/lib/auth";
import {
  getProdutor,
  listCompras,
  listLancamentos,
  type Compra,
  type Lancamento,
  type Produtor,
} from "@/lib/db";
import { exportPDF, exportCSV } from "@/lib/exporters";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Download, MoreVertical, LogOut, UserCog, FileSpreadsheet, FileText } from "lucide-react";
import { ListaLancamentos } from "@/components/ListaLancamentos";
import { Relatorios } from "@/components/Relatorios";
import { NovoLancamentoSheet } from "@/components/NovoLancamentoSheet";
import { GerenciarLancamentos } from "@/components/GerenciarLancamentos";
import { CadastroForm } from "@/components/CadastroForm";
import { Compras } from "@/components/Compras";
import { Estoque } from "@/components/Estoque";
import logoLabor from "@/assets/logo-labor-rural.png";
import { toast } from "sonner";

interface Props {
  email: string;
  produtor: Produtor;
  onProdutorChange: (p: Produtor) => void;
  onLogout: () => void;
}

export function Dashboard({ email, produtor, onProdutorChange, onLogout }: Props) {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingLancamento, setEditingLancamento] = useState<Lancamento | null>(null);
  const [editing, setEditing] = useState(false);
  const [comprasVersion, setComprasVersion] = useState(0);

  const reload = async () => {
    const [l, c] = await Promise.all([listLancamentos(), listCompras()]);
    setLancamentos(l);
    setCompras(c);
  };

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    clearSession();
    onLogout();
  };

  const elementosUsados = Array.from(new Set(lancamentos.map((l) => l.elemento_despesa)));
  const insumosComprados = Array.from(new Set(compras.map((c) => c.insumo)));
  const precoPorInsumo: Record<string, { preco: number; unidade: string }> = (() => {
    const acc: Record<string, { qtd: number; total: number; unidade: string }> = {};
    for (const c of compras) {
      const k = c.insumo.trim().toLowerCase();
      const cur = acc[k] ?? { qtd: 0, total: 0, unidade: c.unidade };
      cur.qtd += c.quantidade;
      cur.total += c.quantidade * c.preco_unitario;
      if (!cur.unidade) cur.unidade = c.unidade;
      acc[k] = cur;
    }
    const out: Record<string, { preco: number; unidade: string }> = {};
    for (const [k, v] of Object.entries(acc)) {
      out[k] = { preco: v.qtd > 0 ? v.total / v.qtd : 0, unidade: v.unidade };
    }
    return out;
  })();

  if (editing) {
    return (
      <CadastroForm
        email={email}
        initial={produtor}
        title="Editar cadastro"
        onCancel={() => setEditing(false)}
        onSaved={async () => {
          const p = await getProdutor();
          if (p) onProdutorChange(p);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: "var(--gradient-soft)" }}>
      <header
        className="sticky top-0 z-10 px-4 py-3 shadow-[var(--shadow-soft)]"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex-shrink-0 h-11 w-11 rounded-lg bg-white/95 p-1 flex items-center justify-center shadow-sm">
              <img src={logoLabor} alt="Labor Rural" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-primary-foreground/70 font-semibold">Labor Rural</p>
              <h1 className="text-sm font-bold text-primary-foreground truncate leading-tight">
                {produtor.nomeCompleto}
              </h1>
              <p className="text-xs text-primary-foreground/80 truncate">
                {produtor.nomePropriedade} · <span className="font-medium">{produtor.cultura}</span>
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditing(true)}>
                <UserCog className="h-4 w-4 mr-2" /> Editar cadastro
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (lancamentos.length === 0) return toast.error("Sem dados para exportar");
                  exportCSV(lancamentos, produtor);
                }}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (lancamentos.length === 0) return toast.error("Sem dados para exportar");
                  exportPDF(lancamentos, produtor);
                }}
              >
                <FileText className="h-4 w-4 mr-2" /> Exportar PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="px-4 pt-4">
        <Tabs defaultValue="compras">
          <TabsList className="grid grid-cols-5 w-full h-auto">
            <TabsTrigger value="compras" className="text-xs px-1 py-1.5">Compras</TabsTrigger>
            <TabsTrigger value="gerenciar" className="text-xs px-1 py-1.5">Registros</TabsTrigger>
            <TabsTrigger value="estoque" className="text-xs px-1 py-1.5">Estoque</TabsTrigger>
            <TabsTrigger value="resumo" className="text-xs px-1 py-1.5">Resumo</TabsTrigger>
            <TabsTrigger value="relatorios" className="text-xs px-1 py-1.5">Relat.</TabsTrigger>
          </TabsList>
          <TabsContent value="compras" className="mt-4">
            <Compras
              key={`compras-${comprasVersion}`}
              onChange={() => {
                setComprasVersion((v) => v + 1);
                reload();
              }}
            />
          </TabsContent>
          <TabsContent value="gerenciar" className="mt-4">
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : (
              <GerenciarLancamentos
                lancamentos={lancamentos}
                onChange={reload}
                onEdit={(l) => {
                  setEditingLancamento(l);
                  setSheetOpen(true);
                }}
              />
            )}
          </TabsContent>
          <TabsContent value="estoque" className="mt-4">
            <Estoque key={`estoque-${comprasVersion}-${lancamentos.length}`} />
          </TabsContent>
          <TabsContent value="resumo" className="mt-4">
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : (
              <ListaLancamentos lancamentos={lancamentos} onChange={reload} />
            )}
          </TabsContent>
          <TabsContent value="relatorios" className="mt-4">
            <Relatorios lancamentos={lancamentos} />
            {lancamentos.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-4">
                <Button variant="outline" onClick={() => exportCSV(lancamentos, produtor)}>
                  <Download className="h-4 w-4" /> CSV
                </Button>
                <Button variant="outline" onClick={() => exportPDF(lancamentos, produtor)}>
                  <Download className="h-4 w-4" /> PDF
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Button
        size="lg"
        onClick={() => {
          setEditingLancamento(null);
          setSheetOpen(true);
        }}
        className="fixed bottom-5 right-5 left-5 sm:left-auto sm:right-6 sm:bottom-6 h-14 rounded-full shadow-[var(--shadow-elevated)] text-base font-semibold"
        style={{ background: "var(--gradient-primary)" }}
      >
        <Plus className="h-5 w-5" /> Novo Lançamento
      </Button>

      <NovoLancamentoSheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setEditingLancamento(null);
        }}
        elementosUsados={elementosUsados}
        insumosComprados={insumosComprados}
        precoPorInsumo={precoPorInsumo}
        talhoes={produtor.talhoes ?? []}
        editing={editingLancamento}
        onSaved={reload}
      />
    </div>
  );
}
