import { useState } from "react";
import { isAuthorized, setSessionEmail, authorizedEmails } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sprout, Mail } from "lucide-react";

interface Props {
  onAuthenticated: (email: string) => void;
}

export function LoginScreen({ onAuthenticated }: Props) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthorized(email)) {
      setSessionEmail(email);
      onAuthenticated(email.trim().toLowerCase());
    } else {
      setError(true);
    }
  };

  const mailtoLink = (to: string) => {
    const subject = encodeURIComponent("Solicitação de acesso ao app");
    const body = encodeURIComponent(
      "Nome completo: \nNome da propriedade: \nCultura: \n",
    );
    return `mailto:${to}?subject=${subject}&body=${body}`;
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--gradient-soft)" }}
    >
      <Card className="w-full max-w-md shadow-[var(--shadow-elevated)]">
        <CardHeader className="text-center">
          <div
            className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Sprout className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Custos Agro</CardTitle>
          <CardDescription>
            Gestão de custos operacionais — Café & Cacau
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail autorizado</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(false);
                }}
                placeholder="seu.nome@laborrural.com"
              />
            </div>
            <Button type="submit" className="w-full" size="lg">
              Entrar
            </Button>
          </form>

          {error && (
            <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <p className="text-sm font-medium text-destructive">
                Usuário não autorizado. Solicite acesso.
              </p>
              <div className="flex flex-col gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={mailtoLink("iago.parmanhani@laborrural.com")}>
                    <Mail className="h-4 w-4" /> Solicitar a Iago Parmanhani
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={mailtoLink("analistas@laborrural.com")}>
                    <Mail className="h-4 w-4" /> Solicitar aos Analistas
                  </a>
                </Button>
              </div>
            </div>
          )}

          <p className="mt-6 text-xs text-muted-foreground text-center">
            {authorizedEmails.length} e-mails autorizados configurados
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
