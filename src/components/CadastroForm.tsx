import { useEffect, useState } from "react";
import { saveProdutor, type Cultura, type Produtor, type Talhao } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, MapPinned } from "lucide-react";
import { toast } from "sonner";

interface Props {
  email: string;
  initial?: Produtor;
  onSaved: () => void;
  onCancel?: () => void;
  title?: string;
}

export function CadastroForm({ email, initial, onSaved, onCancel, title }: Props) {
  const [nomeCompleto, setNomeCompleto] = useState(initial?.nomeCompleto ?? "");
  const [nomePropriedade, setNomePropriedade] = useState(initial?.nomePropriedade ?? "");
  const [cultura, setCultura] = useState<Cultura>(initial?.cultura ?? "Café");
  const [talhoes, setTalhoes] = useState<Talhao[]>(
    Array.isArray(initial?.talhoes) ? initial!.talhoes : [],
  );
  const [novoNome, setNovoNome] = useState("");
  const [novaArea, setNovaArea] = useState("");
  const [saving, setSaving] = useState(false);

  // Sincroniza com initial caso o pai recarregue o produtor
  useEffect(() => {
    if (initial) {
      setNomeCompleto(initial.nomeCompleto);
      setNomePropriedade(initial.nomePropriedade);
      setCultura(initial.cultura);
      setTalhoes(Array.isArray(initial.talhoes) ? initial.talhoes : []);
    }
  }, [initial]);

  const adicionarTalhao = () => {
    const nome = novoNome.trim();
    const area = parseFloat(novaArea.replace(",", "."));
    if (!nome) {
      toast.error("Informe o nome do talhão");
      return;
    }
    if (!(area > 0)) {
      toast.error("Área deve ser maior que zero");
      return;
    }
    if (talhoes.some((t) => t.nome.toLowerCase() === nome.toLowerCase())) {
      toast.error("Já existe um talhão com esse nome");
      return;
    }
    setTalhoes((prev) => [...prev, { id: crypto.randomUUID(), nome, area }]);
    setNovoNome("");
    setNovaArea("");
  };

  const removerTalhao = (id: string) => {
    setTalhoes((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (talhoes.length === 0) {
      toast.error("Cadastre ao menos um talhão");
      return;
    }
    setSaving(true);
    try {
      await saveProdutor({ nomeCompleto, nomePropriedade, cultura, email, talhoes });
      toast.success("Cadastro salvo");
      onSaved();
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const areaTotal = talhoes.reduce((s, t) => s + t.area, 0);

  return (
    <div
      className="min-h-screen flex items-start justify-center p-4"
      style={{ background: "var(--gradient-soft)" }}
    >
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 my-6">
        <Card className="shadow-[var(--shadow-soft)]">
          <CardHeader>
            <CardTitle>{title ?? "Cadastro Inicial"}</CardTitle>
            <CardDescription>
              Informe os dados do produtor e da propriedade
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                required
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop">Nome da propriedade</Label>
              <Input
                id="prop"
                required
                value={nomePropriedade}
                onChange={(e) => setNomePropriedade(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Cultura</Label>
              <Select value={cultura} onValueChange={(v) => setCultura(v as Cultura)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Café">Café</SelectItem>
                  <SelectItem value="Cacau">Cacau</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-soft)]">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPinned className="h-4 w-4" /> Talhões
                </CardTitle>
                <CardDescription>
                  Cadastre cada talhão da propriedade com nome e área
                </CardDescription>
              </div>
              {talhoes.length > 0 && (
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Área total
                  </p>
                  <p className="text-sm font-semibold">
                    {areaTotal.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ha
                  </p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {talhoes.length > 0 ? (
              <div className="space-y-1.5">
                {talhoes.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{t.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.area.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ha
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => removerTalhao(t.id)}
                      aria-label={`Remover ${t.nome}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3 text-center">
                Nenhum talhão cadastrado ainda.
              </p>
            )}

            <div className="grid grid-cols-[1fr_110px_auto] gap-2 items-end pt-2 border-t">
              <div className="space-y-1">
                <Label htmlFor="t-nome" className="text-xs">Nome</Label>
                <Input
                  id="t-nome"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex.: Talhão 1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      adicionarTalhao();
                    }
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="t-area" className="text-xs">Área (ha)</Label>
                <Input
                  id="t-area"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  value={novaArea}
                  onChange={(e) => setNovaArea(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      adicionarTalhao();
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                onClick={adicionarTalhao}
                aria-label="Adicionar talhão"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
          )}
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
