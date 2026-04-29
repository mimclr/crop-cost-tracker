import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type Cultura = "Café" | "Cacau";

export interface Talhao {
  id: string;
  nome: string;
  area: number; // hectares
}

export interface Produtor {
  id: "default";
  nomeCompleto: string;
  nomePropriedade: string;
  cultura: Cultura;
  email: string;
  talhoes: Talhao[];
  atualizadoEm: string;
}

export interface Rateio {
  talhao_id: string;
  talhao_nome: string;
  area: number;
  quantidade: number;
  valor: number;
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
  /** ids dos talhões selecionados (vazio = nenhum, todos = informado pela UI) */
  talhao_ids: string[];
  /** distribuição proporcional pela área no momento do lançamento */
  rateios: Rateio[];
  criadoEm: string;
}

export interface Compra {
  id: string;
  data: string; // ISO yyyy-mm-dd
  insumo: string; // nome do insumo (também vira elemento_despesa)
  unidade: string; // ex: kg, L, sc, un
  quantidade: number; // quantidade adquirida
  preco_unitario: number; // R$ por unidade
  fornecedor: string;
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
  compras: {
    key: string;
    value: Compra;
    indexes: { "by-data": string; "by-insumo": string };
  };
}

let dbPromise: Promise<IDBPDatabase<CustosDB>> | null = null;

function getDB() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB unavailable on server");
  }
  if (!dbPromise) {
    dbPromise = openDB<CustosDB>("custos-agro", 3, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains("produtor")) {
            db.createObjectStore("produtor", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("lancamentos")) {
            const store = db.createObjectStore("lancamentos", { keyPath: "id" });
            store.createIndex("by-data", "data");
            store.createIndex("by-atividade", "atividade");
          }
        }
        // v2: campos opcionais talhoes/rateios (normalizados em runtime)
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains("compras")) {
            const store = db.createObjectStore("compras", { keyPath: "id" });
            store.createIndex("by-data", "data");
            store.createIndex("by-insumo", "insumo");
          }
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

function normalizarProdutor(p: Produtor | undefined): Produtor | undefined {
  if (!p) return p;
  if (!Array.isArray(p.talhoes)) p.talhoes = [];
  return p;
}

export async function getProdutor(): Promise<Produtor | undefined> {
  const db = await getDB();
  return normalizarProdutor(await db.get("produtor", "default"));
}

export async function saveProdutor(
  p: Omit<Produtor, "id" | "atualizadoEm">,
): Promise<void> {
  const db = await getDB();
  await db.put("produtor", {
    ...p,
    talhoes: Array.isArray(p.talhoes) ? p.talhoes : [],
    id: "default",
    atualizadoEm: new Date().toISOString(),
  });
}

export async function listLancamentos(): Promise<Lancamento[]> {
  const db = await getDB();
  const all = await db.getAll("lancamentos");
  // normaliza registros antigos sem talhao_ids/rateios
  for (const l of all) {
    if (!Array.isArray(l.talhao_ids)) l.talhao_ids = [];
    if (!Array.isArray(l.rateios)) l.rateios = [];
  }
  return all.sort((a, b) => b.data.localeCompare(a.data));
}

/** Calcula rateios proporcionais pela área de cada talhão selecionado. */
export function calcularRateios(
  talhoes: Talhao[],
  selecionadosIds: string[],
  quantidade: number,
  valorTotal: number,
): Rateio[] {
  const sel = talhoes.filter((t) => selecionadosIds.includes(t.id) && t.area > 0);
  const areaTotal = sel.reduce((s, t) => s + t.area, 0);
  if (areaTotal <= 0) return [];
  return sel.map((t) => {
    const peso = t.area / areaTotal;
    return {
      talhao_id: t.id,
      talhao_nome: t.nome,
      area: t.area,
      quantidade: quantidade * peso,
      valor: valorTotal * peso,
    };
  });
}

export type LancamentoInput = Omit<
  Lancamento,
  "id" | "valor_unitario" | "criadoEm" | "rateios"
> & { rateios?: Rateio[] };

export async function addLancamento(
  l: LancamentoInput,
  talhoes: Talhao[],
): Promise<Lancamento> {
  const db = await getDB();
  const rateios =
    l.rateios ?? calcularRateios(talhoes, l.talhao_ids, l.quantidade, l.valor_total);
  const novo: Lancamento = {
    ...l,
    rateios,
    id: crypto.randomUUID(),
    valor_unitario: l.quantidade > 0 ? l.valor_total / l.quantidade : 0,
    criadoEm: new Date().toISOString(),
  };
  await db.put("lancamentos", novo);
  return novo;
}

export async function updateLancamento(
  id: string,
  patch: LancamentoInput,
  talhoes: Talhao[],
): Promise<Lancamento> {
  const db = await getDB();
  const existing = await db.get("lancamentos", id);
  if (!existing) throw new Error("Lançamento não encontrado");
  const rateios =
    patch.rateios ??
    calcularRateios(talhoes, patch.talhao_ids, patch.quantidade, patch.valor_total);
  const atualizado: Lancamento = {
    ...existing,
    ...patch,
    rateios,
    valor_unitario: patch.quantidade > 0 ? patch.valor_total / patch.quantidade : 0,
  };
  await db.put("lancamentos", atualizado);
  return atualizado;
}

export async function deleteLancamento(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("lancamentos", id);
}
