import { useState } from "react";
import { saveProdutor, type Cultura, type Produtor } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveProdutor({ nomeCompleto, nomePropriedade, cultura, email });
      toast.success("Cadastro salvo");
      onSaved();
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--gradient-soft)" }}
    >
      <Card className="w-full max-w-md shadow-[var(--shadow-soft)]">
        <CardHeader>
          <CardTitle>{title ?? "Cadastro Inicial"}</CardTitle>
          <CardDescription>Informe os dados do produtor e propriedade</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="flex gap-2 pt-2">
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
        </CardContent>
      </Card>
    </div>
  );
}
