# Sincronização entre aparelhos (Supabase)

Este app salva tudo **localmente no navegador** (IndexedDB). Para sincronizar o
progresso entre o computador e o celular, ele usa o **Supabase** (gratuito):
login com e-mail/senha e uma cópia do seu backup na nuvem.

> O login é **opcional**. Sem configurar o Supabase, o app continua funcionando
> 100% local (e offline), como sempre. Quem fizer login passa a sincronizar.

---

## Visão geral

- Cada usuário tem **uma linha** na tabela `estudos_sync`, com o backup completo
  (mesmo formato do "Exportar backup" da aba **Dados**) em uma coluna `jsonb`.
- Estratégia: **"último a escrever vence"** (comparando data/hora).
  - Toda alteração local agenda um envio (debounce de ~2,5s).
  - Ao abrir o app, focar a aba ou a internet voltar, o app puxa da nuvem e
    aplica se a versão de lá for mais nova.
- A segurança vem do **RLS** (Row Level Security): cada usuário só lê/escreve a
  própria linha.

---

## Passo a passo (só o dono do app faz, uma vez)

### 1. Criar o projeto no Supabase
1. Acesse <https://supabase.com> e crie uma conta (grátis, sem cartão).
2. **New project** → escolha um nome, uma senha do banco (guarde-a em segredo) e
   a região (ex.: `South America (São Paulo)`).

### 2. Criar a tabela e as políticas de segurança
No painel do projeto: **SQL Editor** → **New query** → cole e rode o SQL abaixo:

```sql
-- Tabela com o backup completo de cada usuário (1 linha por usuário).
create table if not exists public.estudos_sync (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  client_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Liga o Row Level Security (cada um só vê o que é seu).
alter table public.estudos_sync enable row level security;

create policy "ler o proprio registro"
  on public.estudos_sync for select
  using (auth.uid() = user_id);

create policy "inserir o proprio registro"
  on public.estudos_sync for insert
  with check (auth.uid() = user_id);

create policy "atualizar o proprio registro"
  on public.estudos_sync for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### 3. (Recomendado) Login imediato, sem confirmar e-mail
Para o cadastro já entrar direto (sem precisar clicar num link no e-mail):
**Authentication → Sign In / Providers → Email** → **desligue** a opção
**"Confirm email"** → salve.

> Se preferir manter a confirmação de e-mail ligada, tudo bem — o app avisa o
> usuário para confirmar antes de entrar.

### 4. Pegar as duas chaves PÚBLICAS
**Project Settings → API** (ou a aba **Framework** em "Connect"):

| O que copiar | Onde fica | Exemplo |
|---|---|---|
| **Project URL** | Project Settings → API → "Project URL" | `https://xxxx.supabase.co` |
| **anon public** (ou "publishable key") | Project Settings → API → "Project API keys" | `eyJ...` ou `sb_publishable_...` |

> ⚠️ **NÃO** use a *connection string* do Postgres (`postgresql://...`) nem a
> chave **`service_role`**: essas são **secretas**. No front-end só vão a
> **Project URL** e a **anon/publishable key**, que são públicas por design — o
> RLS é quem protege os dados.

### 5. Colar no app
Abra [`src/config.js`](../src/config.js) e preencha:

```js
const URL_FIXA = 'https://xxxx.supabase.co'      // Project URL
const ANON_FIXA = 'eyJ... (ou sb_publishable_...)' // anon public
```

Depois é só `git add -A && git commit -m "Configura Supabase" && git push`.
O deploy do GitHub Pages republica e a opção **Config → Conta e sincronização**
fica ativa.

---

## Como o usuário usa
1. Abre o app → **Config** → **Conta e sincronização**.
2. **Criar conta** (e-mail + senha) ou **Entrar**.
3. Estuda normalmente — salva local e na nuvem ao mesmo tempo.
4. Em outro aparelho, entra com o mesmo e-mail → o progresso aparece.

O ícone de nuvem no canto superior mostra o estado (sincronizado, sincronizando,
offline ou erro).

---

## Limitações (honestas)
- **Mesmo usuário em 2 aparelhos ao mesmo tempo:** vale o último que salvar
  (não há mesclagem campo a campo). Para 1 pessoa alternando entre aparelhos,
  funciona bem.
- **Pessoas diferentes no mesmo navegador:** use perfis/navegadores separados,
  ou faça login/logout — ao entrar, o app baixa os dados da conta.
- O backup manual (aba **Dados**) continua valendo como rede de segurança.
