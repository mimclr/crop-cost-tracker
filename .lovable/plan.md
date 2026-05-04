
# Plano: migrar para Supabase próprio + auth com aprovação por admin

## Visão geral

O app hoje guarda tudo no IndexedDB do navegador. Vamos:
1. Trocar o armazenamento local por **um Supabase externo seu** (não o Lovable Cloud).
2. Adicionar **login/cadastro** com fluxo de aprovação: novo usuário se registra, fica `pendente`, o admin (`admin@laborrural.com`) aprova, só então o usuário acessa o app e preenche cadastro de produtor.
3. Descartar dados antigos do IndexedDB (começa do zero no banco novo).

Limitação importante deste caminho: eu **não tenho acesso ao seu Supabase**. Toda mudança de banco vira "te passo o SQL, você cola no SQL Editor do Supabase". Eu não consigo rodar migrations, ver dados reais nem debugar RLS por dentro.

---

## Etapa 1 — Você executa no Supabase (uma única vez)

Vou te entregar **um único bloco de SQL** para colar em **SQL Editor → New query → Run** no seu projeto Supabase. Esse SQL cria:

- `app_role` enum (`admin`, `user`)
- `user_status` enum (`pending`, `approved`, `rejected`)
- Tabela `user_roles` (id, user_id, role) — roles em tabela separada (segurança)
- Tabela `user_approvals` (user_id, status, requested_at, decided_at, decided_by)
- Tabela `produtores` (1 linha por user: nome, propriedade, cultura, email)
- Tabela `talhoes` (produtor_id, nome, area)
- Tabela `lancamentos` (produtor_id, data, atividade, elemento_despesa, quantidade, valor_total, valor_unitario, observacao, talhao_ids text[], rateios jsonb)
- Tabela `compras` (produtor_id, data, insumo, unidade, quantidade, preco_unitario, fornecedor, observacao)
- Função `has_role(uuid, app_role)` `SECURITY DEFINER` (evita recursão de RLS)
- Função `is_approved(uuid)` `SECURITY DEFINER`
- RLS em todas as tabelas:
  - usuário só vê/edita seus próprios dados (`produtor_id = auth.uid()`)
  - apenas se `is_approved(auth.uid())`
  - admin vê tudo e gerencia `user_approvals`
- Trigger `on_auth_user_created` em `auth.users`: cria automaticamente linha em `user_approvals` com status `pending` e role `user`

Depois você executa um **segundo SQL curto** que:
- Insere o usuário admin via `auth.users` (e-mail `admin@laborrural.com`, senha `Labor@123`, e-mail confirmado)
- Marca-o em `user_roles` como `admin` e em `user_approvals` como `approved`

(Vou te entregar o SQL completo já formatado quando começarmos. Não escrevo aqui para não estourar o plano.)

---

## Etapa 2 — Você me passa duas coisas

No painel do seu Supabase, em **Project Settings → API**:
- **Project URL** (algo como `https://xxxxx.supabase.co`)
- **anon public key** (a chave pública, não a `service_role`)

Você cola essas duas como **secrets** do projeto Lovable, com os nomes:
- `VITE_MY_SUPABASE_URL`
- `VITE_MY_SUPABASE_ANON_KEY`

Eu não consigo definir isso por você — esse passo é manual, em **Cloud → Secrets** (apesar do nome, é onde ficam variáveis do projeto).

Aviso de segurança: a anon key é pública por design, sem problema de expor no frontend. A `service_role` **nunca** deve ser colada em lugar nenhum.

---

## Etapa 3 — Eu refatoro o código

### Substituir o cliente Supabase

- `src/lib/supabase.ts` (novo): cria cliente apontando para `VITE_MY_SUPABASE_URL` / `VITE_MY_SUPABASE_ANON_KEY` do **seu** projeto, com `persistSession: true` e `storage: localStorage`.
- `src/integrations/supabase/client.ts` continua existindo (gerado pelo Lovable Cloud, intocável), mas o app inteiro deixa de importar dele. Fica órfão e inofensivo.
- `src/integrations/supabase/types.ts` do Lovable Cloud não serve para o seu banco. Vou criar tipos manuais em `src/lib/supabase-types.ts` (Database, Tables, Inserts, Updates) batendo com o schema do SQL da Etapa 1.

### Substituir camada de dados

`src/lib/db.ts` (IndexedDB) é apagado. No lugar:
- `src/lib/api/produtor.ts` — getProdutor, upsertProdutor, addTalhao, removeTalhao
- `src/lib/api/lancamentos.ts` — list/add/update/delete
- `src/lib/api/compras.ts` — list/add/update/delete
- `src/lib/api/estoque.ts` — `calcularEstoque(compras, lancamentos)` (lógica pura, fica igual)
- `src/lib/api/admin.ts` — listPending, approveUser, rejectUser

Mesma assinatura externa que os componentes já usam, então `Compras.tsx`, `Estoque.tsx`, `GerenciarLancamentos.tsx`, `NovoLancamentoSheet.tsx`, `Dashboard.tsx`, `CadastroForm.tsx` mudam só os imports (de `@/lib/db` para `@/lib/api/...`) e viram `async` onde já não eram.

### Auth e rotas

Estrutura nova de rotas (TanStack file-based):

```text
src/routes/
  __root.tsx             (já existe, sem mudança grande)
  index.tsx              (redireciona conforme estado de auth)
  login.tsx              (público)
  signup.tsx             (público — só email + senha)
  pending.tsx            (logado mas não aprovado)
  reset-password.tsx     (público — para fluxo de recuperação)
  _authenticated.tsx     (layout: exige login + aprovação)
  _authenticated/
    cadastro.tsx         (CadastroForm — só se ainda não tem produtor)
    app.tsx              (Dashboard)
    admin.tsx            (lista de pendentes, botões aprovar/rejeitar — só admin)
```

Fluxos:
- **Signup**: e-mail + senha → `supabase.auth.signUp` → trigger cria `user_approvals=pending` + `user_roles=user` → tela `/pending` ("Aguardando aprovação do administrador").
- **Login**: e-mail + senha → checa `is_approved`. Se não aprovado, vai pra `/pending`. Se aprovado e ainda não tem produtor cadastrado, vai pra `/cadastro`. Senão, `/app`.
- **Admin**: `admin@laborrural.com` loga normalmente, vê item extra "Administração" no menu, abre `/admin`, lista pendentes com botões **Aprovar** / **Rejeitar**.
- **Logout**: `supabase.auth.signOut()` no header.
- **Esqueci minha senha**: link em `/login` → `resetPasswordForEmail` → e-mail com link → `/reset-password` (obrigatório existir).

Proteção de rotas via `beforeLoad` no `_authenticated.tsx` checando sessão e `is_approved`. Sem flash de conteúdo protegido.

### Limpeza

- Apagar `src/lib/auth.ts` (auth fake atual)
- Apagar `src/lib/db.ts`
- Remover dependência `idb` do `package.json`
- `src/integrations/supabase/auth-middleware.ts` e `client.server.ts` ficam, mas não são usados (seu Supabase não passa pelo runtime do TanStack server functions com middleware do Lovable Cloud — chamadas vão direto do browser via SDK).

---

## Detalhes técnicos

- **Auth**: `supabase.auth` direto do browser, com `onAuthStateChange` configurado **antes** do `getSession` (regra padrão Supabase para não perder evento inicial).
- **RLS**: toda query do app passa por RLS. Se algo "sumir" depois, é quase sempre policy faltando — eu te peço pra rodar `supabase--linter` mentalmente (no seu painel: Database → Advisors).
- **Realtime**: não vou habilitar agora. Se quiser ver lançamentos atualizando em tempo real entre dispositivos, é um próximo passo (precisa `ALTER PUBLICATION supabase_realtime ADD TABLE ...`).
- **Migração de dados antigos**: descartada conforme você pediu. O IndexedDB do navegador continua existindo até o usuário limpar, mas o app ignora.
- **E-mail de confirmação no signup**: vou deixar **desligado** no SQL inicial (auto-confirma), porque a aprovação do admin já é o gate. Senão o usuário precisa confirmar e-mail **e** esperar admin, virando duas barreiras. Você confirma esse comportamento ao revisar.
- **Tipagem**: types manuais em `src/lib/supabase-types.ts`. Toda vez que o schema do banco mudar, eu te entrego novo SQL **e** atualizo esse arquivo no mesmo passo.

---

## O que eu vou entregar quando você aprovar este plano

Em **uma resposta só**, na ordem:

1. **SQL #1** (schema + RLS + trigger) — você cola no SQL Editor.
2. **SQL #2** (cria admin) — você cola depois do #1.
3. Instruções exatas de onde pegar URL/anon key e como adicionar os 2 secrets.
4. Aí **paro e espero** você confirmar que rodou os SQLs e adicionou os secrets.

Só depois da sua confirmação eu mexo no código (refator do db.ts, criação das rotas de auth, admin, etc.), pra não deixar o app quebrado entre passos.

---

Pode aprovar?
