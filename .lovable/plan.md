
# Migração para Supabase + Aprovação por Admin

## Visão geral

Hoje o app guarda tudo em IndexedDB local (sem login real). Vamos:

1. Ativar **Lovable Cloud (Supabase)** para banco real e autenticação por e‑mail/senha.
2. Criar fluxo: **cadastro de e-mail/senha → aguarda aprovação do admin → após aprovado, usuário preenche nome/fazenda/talhões → entra no dashboard**.
3. Criar conta administradora `admin@laborrural.com` / `Labor@123` que vê e aprova solicitações.
4. Migrar `produtor`, `talhoes`, `lancamentos`, `compras` para tabelas Postgres com RLS, isolando dados por usuário.

## Fluxo de telas

```text
[Não logado]
   │
   ├─ Login  (e-mail + senha)            → se admin → /admin
   │                                     → se aprovado + tem produtor → /dashboard
   │                                     → se aprovado + sem produtor → /cadastro
   │                                     → se pendente/rejeitado → tela "aguardando aprovação"
   │
   └─ Criar conta (e-mail + senha)       → cria auth user + linha em profiles (status=pending)
                                         → mostra tela "aguardando aprovação"
[Admin logado]
   └─ /admin  → lista solicitações pendentes → Aprovar / Rejeitar
[Produtor aprovado sem cadastro]
   └─ /cadastro → CadastroForm (nome, propriedade, cultura, talhões) → /dashboard
[Produtor aprovado com cadastro]
   └─ /dashboard (atual, mas lendo do Supabase)
```

## Modelo de dados (Supabase)

Enum:
- `app_role`: `admin`, `produtor`
- `approval_status`: `pending`, `approved`, `rejected`

Tabelas (todas com RLS habilitada):

- `profiles` — `id (uuid, FK auth.users)`, `email`, `status approval_status default 'pending'`, `created_at`, `approved_at`, `approved_by`.
- `user_roles` — `id`, `user_id (FK auth.users)`, `role app_role`, único `(user_id, role)`. Roles ficam **fora** de `profiles` (regra de segurança obrigatória).
- `produtores` — `user_id (PK, FK auth.users)`, `nome_completo`, `nome_propriedade`, `cultura`, `atualizado_em`.
- `talhoes` — `id`, `user_id`, `nome`, `area numeric`, `criado_em`.
- `compras` — `id`, `user_id`, `data`, `insumo`, `unidade`, `quantidade`, `preco_unitario`, `fornecedor`, `observacao`, `criado_em`.
- `lancamentos` — `id`, `user_id`, `data`, `atividade`, `elemento_despesa`, `quantidade`, `valor_total`, `valor_unitario`, `observacao`, `criado_em`.
- `lancamento_rateios` — `id`, `lancamento_id (FK cascade)`, `talhao_id`, `talhao_nome`, `area`, `quantidade`, `valor`.

Função SECURITY DEFINER `has_role(_user_id, _role)` para uso nas policies (evita recursão).

Trigger `on_auth_user_created` → insere `profiles` com `status='pending'` e `user_roles` com role `produtor`. Conta `admin@laborrural.com` recebe role `admin` e `status='approved'` via seed.

### RLS resumida

- `profiles`: usuário lê/atualiza só o próprio; admin (`has_role(auth.uid(),'admin')`) lê todos e atualiza `status`.
- `user_roles`: leitura pelo próprio usuário; só admin insere/atualiza.
- `produtores`, `talhoes`, `compras`, `lancamentos`, `lancamento_rateios`: `user_id = auth.uid()` para todas as operações; admin lê tudo (read-only).
- Bloqueio extra: policies de `INSERT/UPDATE` em produtores/talhoes/compras/lancamentos exigem `EXISTS (select 1 from profiles where id=auth.uid() and status='approved')`, garantindo que pendentes não consigam gravar mesmo se contornarem o front.

## Mudanças no código

### Auth e roteamento

- Habilitar Lovable Cloud → cliente Supabase em `src/integrations/supabase/client.ts`.
- Substituir `src/lib/auth.ts` (lista hardcoded) por funções baseadas em `supabase.auth`.
- Reorganizar `src/routes/`:
  - `login.tsx` — formulário login + link "criar conta".
  - `signup.tsx` — cria conta (e-mail/senha), mostra "aguardando aprovação" após sucesso.
  - `pending.tsx` — tela informativa quando `status != 'approved'`.
  - `_authenticated.tsx` — layout que checa sessão Supabase via `beforeLoad` e redireciona para `/login`.
  - `_authenticated/cadastro.tsx` — `CadastroForm` para quem ainda não tem `produtores`.
  - `_authenticated/index.tsx` — Dashboard atual.
  - `_authenticated/admin.tsx` — protegido por role `admin`; lista pendentes com botões Aprovar/Rejeitar.
- `src/routes/index.tsx` deixa de fazer toda a orquestração; vira só a home autenticada.

### Camada de dados

- Reescrever `src/lib/db.ts` para usar Supabase no lugar de IndexedDB. Manter mesma API exportada (`getProdutor`, `saveProdutor`, `listLancamentos`, `addLancamento`, `updateLancamento`, `deleteLancamento`, `listCompras`, `addCompra`, `updateCompra`, `deleteCompra`, `calcularEstoque`, `calcularRateios`) para minimizar mudanças nos componentes.
- `Talhao` deixa de viver dentro de `Produtor.talhoes` no banco; passa a ser tabela própria. Em runtime, `getProdutor()` continua devolvendo objeto com `talhoes: Talhao[]` (faz join), preservando contrato usado por `Dashboard`, `CadastroForm`, `NovoLancamentoSheet`.
- `saveProdutor` faz upsert em `produtores` + diff de `talhoes` (insere novos, remove sumidos, atualiza alterados) numa transação lógica.
- `addLancamento`/`updateLancamento` gravam o lançamento e seus `rateios` (delete+insert) atomicamente via RPC ou via duas chamadas com tratamento de erro.

### Conta admin e seed

- Criar admin via SQL: inserir em `auth.users` com `admin@laborrural.com` / hash de `Labor@123`, marcar `email_confirmed_at`, e inserir `user_roles(role='admin')` + `profiles(status='approved')`. (Feito em migration usando `supabase_admin` helpers; alternativa segura: instruir o usuário a criar a conta pelo Auth do Supabase e rodar uma migration que promove esse e-mail a admin/aprovado quando ele aparecer.)
- Recomendação: trocar a senha após o primeiro login.

### UI

- `Dashboard`: remover dependência de `clearSession()` local; usar `supabase.auth.signOut()`.
- Mostrar e-mail logado e, se admin, link para `/admin`.
- `CadastroForm`: continua igual, só passa a usar a versão Supabase de `saveProdutor`.

### Limpeza

- Remover `src/lib/auth.ts` (lista de e-mails) e usos de `localStorage` para sessão.
- Remover dependência `idb` do `package.json`.
- Não há migração automática de dados do IndexedDB → como o app está em uso pessoal/preview, dados locais antigos serão descartados (avisar no chat).

## Aspectos técnicos chave

- Roles em tabela separada + função `has_role` SECURITY DEFINER (padrão obrigatório do projeto).
- `beforeLoad` no layout `_authenticated` checa sessão **e** `profiles.status='approved'`; se pendente, redireciona para `/pending`. Para `/admin`, checa `has_role`.
- Todos os selects do dashboard passam a filtrar implicitamente por `user_id = auth.uid()` via RLS — não precisa filtrar no cliente.
- `client.server.ts` (service role) só usado se precisarmos criar o admin programaticamente; nunca importado em componente.
- Manter `createServerFn` não é necessário aqui — as queries vão direto pelo cliente Supabase autenticado no browser, respeitando RLS.

## Confirmação necessária

Vou ativar **Lovable Cloud** (Supabase gerenciado pela Lovable) para autenticação e banco. A senha `Labor@123` é fraca para um admin de produção — recomendo trocá‑la após o primeiro login. Posso seguir?
