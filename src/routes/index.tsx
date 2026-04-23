import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSessionEmail } from "@/lib/auth";
import { getProdutor, type Produtor } from "@/lib/db";
import { LoginScreen } from "@/components/LoginScreen";
import { CadastroForm } from "@/components/CadastroForm";
import { Dashboard } from "@/components/Dashboard";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  component: Index,
});

type Stage = "loading" | "login" | "cadastro" | "dashboard";

function Index() {
  const [stage, setStage] = useState<Stage>("loading");
  const [email, setEmail] = useState<string>("");
  const [produtor, setProdutor] = useState<Produtor | null>(null);

  useEffect(() => {
    (async () => {
      const sess = getSessionEmail();
      if (!sess) {
        setStage("login");
        return;
      }
      setEmail(sess);
      const p = await getProdutor();
      if (p) {
        setProdutor(p);
        setStage("dashboard");
      } else {
        setStage("cadastro");
      }
    })();
  }, []);

  const handleAuth = async (e: string) => {
    setEmail(e);
    const p = await getProdutor();
    if (p) {
      setProdutor(p);
      setStage("dashboard");
    } else {
      setStage("cadastro");
    }
  };

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
      {stage === "login" && <LoginScreen onAuthenticated={handleAuth} />}
      {stage === "cadastro" && (
        <CadastroForm
          email={email}
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
          email={email}
          produtor={produtor}
          onProdutorChange={setProdutor}
          onLogout={() => {
            setProdutor(null);
            setEmail("");
            setStage("login");
          }}
        />
      )}
      <Toaster position="top-center" />
    </>
  );
}
