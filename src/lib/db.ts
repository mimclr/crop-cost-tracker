import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type Cultura = "Café" | "Cacau";

export interface Produtor {
  id: "default";
  nomeCompleto: string;
  nomePropriedade: string;
  cultura: Cultura;
  email: string;
  atualizadoEm: string;
}

export interface Lancamento {
  id: string;
  data: string; // ISO yyyy-mm-dd
  atividade: string;
  elemento_despesa: string;
  quantidade: number;
  valor_total: number;
  valor_unitario: number;
  observacao: string;
  criadoEm: string;
}

interface CustosDB extends DBSchema {
  produtor: {
    key: string;
    value: Produtor;
  };
  lancamentos: {
    key: string;
    value: Lancamento;
    indexes: { "by-data": string; "by-atividade": string };
  };
}

let dbPromise: Promise<IDBPDatabase<CustosDB>> | null = null;

function getDB() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB unavailable on server");
  }
  if (!dbPromise) {
    dbPromise = openDB<CustosDB>("custos-agro", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("produtor")) {
          db.createObjectStore("produtor", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("lancamentos")) {
          const store = db.createObjectStore("lancamentos", { keyPath: "id" });
          store.createIndex("by-data", "data");
          store.createIndex("by-atividade", "atividade");
        }
      },
    });
  }
  return dbPromise;
}

export const ATIVIDADES = [
  "Administração",
  "Adubação via folha",
  "Adubação via solo",
  "Colheita e Pós-colheita",
  "Irrigação",
  "Condução de Lavoura",
  "Controle de pragas e doenças",
  "Controle de plantas daninhas",
  "Plantio",
] as const;

export const ELEMENTOS_SUGERIDOS = [
  "Mão de obra",
  "Fertilizantes",
  "Defensivos",
  "Combustível",
  "Máquinas/equipamentos",
  "Irrigação/energia",
  "Serviços terceirizados",
  "Outros",
];

export async function getProdutor(): Promise<Produtor | undefined> {
  const db = await getDB();
  return db.get("produtor", "default");
}

export async function saveProdutor(p: Omit<Produtor, "id" | "atualizadoEm">): Promise<void> {
  const db = await getDB();
  await db.put("produtor", {
    ...p,
    id: "default",
    atualizadoEm: new Date().toISOString(),
  });
}

export async function listLancamentos(): Promise<Lancamento[]> {
  const db = await getDB();
  const all = await db.getAll("lancamentos");
  return all.sort((a, b) => b.data.localeCompare(a.data));
}

export async function addLancamento(l: Omit<Lancamento, "id" | "valor_unitario" | "criadoEm">): Promise<Lancamento> {
  const db = await getDB();
  const novo: Lancamento = {
    ...l,
    id: crypto.randomUUID(),
    valor_unitario: l.quantidade > 0 ? l.valor_total / l.quantidade : 0,
    criadoEm: new Date().toISOString(),
  };
  await db.put("lancamentos", novo);
  return novo;
}

export async function updateLancamento(
  id: string,
  patch: Omit<Lancamento, "id" | "valor_unitario" | "criadoEm">,
): Promise<Lancamento> {
  const db = await getDB();
  const existing = await db.get("lancamentos", id);
  if (!existing) throw new Error("Lançamento não encontrado");
  const atualizado: Lancamento = {
    ...existing,
    ...patch,
    valor_unitario: patch.quantidade > 0 ? patch.valor_total / patch.quantidade : 0,
  };
  await db.put("lancamentos", atualizado);
  return atualizado;
}

export async function deleteLancamento(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("lancamentos", id);
}
