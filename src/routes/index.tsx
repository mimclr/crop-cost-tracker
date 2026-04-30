import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getProdutor, type Produtor } from "@/lib/db";
import { CadastroForm } from "@/components/CadastroForm";
import { Dashboard } from "@/components/Dashboard";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  component: Index,
});

type Stage = "loading" | "cadastro" | "dashboard";

const DEFAULT_EMAIL = "produtor@laborrural.com";

function Index() {
  const [stage, setStage] = useState<Stage>("loading");
  const [produtor, setProdutor] = useState<Produtor | null>(null);

  useEffect(() => {
    (async () => {
      const p = await getProdutor();
      if (p) {
        setProdutor(p);
        setStage("dashboard");
      } else {
        setStage("cadastro");
      }
    })();
  }, []);

  return (
    <>
      {stage === "loading" && (
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: "var(--gradient-soft)" }}
        >
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      )}
      {stage === "cadastro" && (
        <CadastroForm
          email={DEFAULT_EMAIL}
          onSaved={async () => {
            const p = await getProdutor();
            if (p) {
              setProdutor(p);
              setStage("dashboard");
            }
          }}
        />
      )}
      {stage === "dashboard" && produtor && (
        <Dashboard
          email={produtor.email || DEFAULT_EMAIL}
          produtor={produtor}
          onProdutorChange={setProdutor}
          onLogout={() => {
            setProdutor(null);
            setStage("cadastro");
          }}
        />
      )}
      <Toaster position="top-center" />
    </>
  );
}
