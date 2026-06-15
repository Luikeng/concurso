# 📚 Estudos TRT — Analista Judiciário (Área Administrativa)

Web app **modular** para acompanhar seus estudos para o concurso do **TRT (Analista Judiciário, Área Administrativa)**. Funciona **100% no navegador**, **sem backend** e **offline** (PWA). Seus dados ficam salvos **localmente** no seu dispositivo.

> Feito com **React + Vite + TailwindCSS**, gráficos com **Recharts**, ícones **lucide-react**, banco local com **Dexie (IndexedDB)** e preferências em **localStorage** (estado central com **Zustand**).

---

## ✨ Funcionalidades

| Módulo | O que faz |
| --- | --- |
| **Plano** | Trilha de estudos por semanas/dias com checkboxes, progresso por semana e geral, e marcação de cobertura do edital. Carrega a trilha inicial automaticamente. |
| **Conteúdo** | Teoria do edital por tópico: resumo, pontos-chave, "cuidado em prova" (pegadinhas), **vídeo-aulas embutidas (YouTube)** e flashcards. Já vem **pré-carregado**. |
| **Banco de questões** | CRUD completo com filtros (matéria, tópico, banca, dificuldade, tags, origem), import/export em JSON. "Errei" envia a questão para a revisão. |
| **Simulado** | Monta por filtro ou aleatório, com cronômetro, navegação e correção automática. Envia erradas para revisão e gera flashcards. |
| **Estatísticas** | % de acerto por matéria e tópico, evolução no tempo, *heatmap* de constância, ranking de pontos fracos e **análise por IA**. |
| **Revisão** | Revisão espaçada (1/7/30/90 dias): acertou aumenta o intervalo, errou reinicia. Lista "para revisar hoje". |
| **Sessões** | Pomodoro configurável que registra minutos por matéria, com gráfico de horas e meta semanal. |
| **IA** | Assistente Google Gemini: gera questões e flashcards, explica tópicos/erros, modo examinador e análise de pontos fracos. |
| **Dados** | Backup/restauração geral em JSON, **exportação para o Anki**, recarregar trilha e reset. |
| **Config** | Chave de IA, modelo, tema (claro/escuro), metas e Pomodoro. |

---

## 🚀 Rodar localmente

Pré-requisitos: **Node.js 18+** (recomendado 20) e **npm**.

```bash
# 1. Instalar dependências
npm install

# 2. Rodar em modo desenvolvimento
npm run dev
# abra o endereço mostrado (ex.: http://localhost:5173)

# 3. Gerar build de produção
npm run build

# 4. Pré-visualizar o build
npm run preview
```

### 📦 Conteúdo que já vem carregado

Na primeira execução, o app monta automaticamente (offline, sem precisar de IA):

- **9 matérias** e **74 tópicos** do edital, com **resumo teórico**, **pontos-chave** e **pegadinhas** por tópico;
- **122 questões** originais no estilo das bancas (FCC/FGV/CESPE), com gabarito e comentário;
- **100 flashcards** prontos (para estudar, revisar e exportar ao Anki);
- **vídeo-aulas do YouTube** embutidas por matéria;
- a **trilha de 8 semanas** do Plano (tarefas).

> O conteúdo fica em [`src/data/conteudo/`](./src/data/conteudo/) (um JSON por matéria), montado por [`src/data/conteudoEdital.js`](./src/data/conteudoEdital.js). É **editável**: ajuste os JSONs para corrigir, ampliar ou trocar o conteúdo. As questões iniciais aparecem no Banco com a etiqueta **"Inicial"**.

O app também lê o arquivo [`trilha_diaria_trt_fase1.md`](./trilha_diaria_trt_fase1.md) (na raiz) para criar as **tarefas** do Plano. Você pode editar esse arquivo e recarregá-lo na tela **Dados**.

> **Sobre a trilha incluída:** o arquivo `trilha_diaria_trt_fase1.md` é um **plano de 8 semanas de exemplo**, com o conteúdo típico do edital (Língua Portuguesa, Raciocínio Lógico, Direito Constitucional, Administrativo, do Trabalho, Processo do Trabalho, Administração Pública e legislação específica). Sinta-se à vontade para substituí-lo pelo seu cronograma — basta manter o formato (veja o topo do próprio arquivo).

---

## 🔑 Obter a chave grátis do Google Gemini (para a IA)

Os recursos de IA usam a **API do Google Gemini** (há um nível gratuito). A chave é **opcional** — todo o resto do app funciona sem ela.

1. Acesse **[Google AI Studio → API Keys](https://aistudio.google.com/app/apikey)** e faça login com sua conta Google.
2. Clique em **"Create API key"** (Criar chave de API) e copie a chave gerada.
3. No app, vá em **Config** e cole a chave no campo **Chave de API**. Escolha o modelo (ex.: `gemini-2.0-flash`).
4. Use o botão **"Testar chave"** para confirmar.

> 🔒 **Privacidade:** a chave é guardada **apenas no seu navegador** (localStorage) e as chamadas vão **direto do seu navegador** para o Google. **Não** cole dados sensíveis nas conversas com a IA. As funções de IA **exigem internet** (não funcionam offline).

---

## 🃏 Importar flashcards no Anki

O app exporta flashcards em **TSV** compatível com a importação nativa do Anki (UTF-8, com cabeçalho `#separator:tab`, `#html:true` e `#tags column:3`). Você gera o arquivo em **Dados → Exportar para Anki**, em **Simulado** (erradas) ou na **IA**.

Para importar no Anki (computador):

1. Abra o **Anki** e selecione (ou crie) o baralho desejado.
2. Menu **Arquivo → Importar** e selecione o arquivo `.txt` baixado.
3. Confirme: tipo de nota **"Básico"**, separador **"Tabulação"** e marque **"Permitir HTML nos campos"**.
4. Verifique o mapeamento: **Campo 1 = Frente**, **Campo 2 = Verso**, **Coluna 3 = Tags**.
5. Clique em **Importar**. As tags (matéria, tópico, banca) já vêm organizadas.

---

## 🌐 Publicar no GitHub Pages

O projeto já vem com `base: './'` (caminhos relativos) e **HashRouter**, então funciona em **qualquer** repositório do GitHub Pages, sem ajustes e sem erro 404 ao recarregar.

### Opção A — Automático (GitHub Actions, recomendado)

1. Suba o projeto para um repositório no GitHub.
2. No GitHub: **Settings → Pages → Build and deployment → Source = "GitHub Actions"**.
3. A cada `push` na branch `main`/`master`, o workflow [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) faz o build e publica.
4. O endereço aparece em **Settings → Pages** (ex.: `https://SEU-USUARIO.github.io/SEU-REPO/`).

### Opção B — Manual (pacote `gh-pages`)

```bash
npm run deploy
```

Isso roda o build e envia a pasta `dist/` para a branch `gh-pages`. Depois, em **Settings → Pages**, escolha a branch `gh-pages` como origem.

---

## 🧩 Arquitetura modular

```
src/
├── components/
│   ├── layout/       # casca do app (sidebar, header, bottom nav, tema)
│   └── ui/           # biblioteca de componentes (Button, Card, Modal, ...)
├── data/             # conteúdo do edital (JSON por matéria) + montagem
│   ├── conteudo/*.json
│   └── conteudoEdital.js
├── db/               # Dexie (IndexedDB): db.js, seed.js
├── lib/              # utilitários (datas, downloads, helpers)
├── modules/          # 1 pasta por FEATURE (plugável)
│   ├── plano/  conteudo/  banco/  simulado/  estatisticas/
│   ├── revisao/  sessoes/  ia/  dados/  config/
│   └── registry.js   # lista central de módulos
├── services/         # lógica compartilhada: gemini, anki, srs, stats, flashcards, trilhaParser
└── store/            # Zustand (config/preferências) + toasts
```

### Como adicionar um novo módulo

1. Crie `src/modules/<seu-modulo>/index.js` exportando os metadados e o componente:
   ```js
   import { Star } from 'lucide-react'
   import { MinhaPagina } from './MinhaPagina'
   export default {
     id: 'meu', rotulo: 'Meu', descricao: '...',
     icone: Star, path: '/meu', ordem: 10, Component: MinhaPagina,
   }
   ```
2. Adicione uma linha em [`src/modules/registry.js`](./src/modules/registry.js). **Pronto** — a navegação e a rota aparecem sozinhas.

As regras de integração (APIs de dados, store, serviços e componentes) estão em [`CONTRATO.md`](./CONTRATO.md).

---

## 💾 Dados, backup e privacidade

- Tudo é salvo **localmente** (IndexedDB + localStorage). Nada é enviado a servidores (exceto as chamadas que **você** fizer à IA).
- Faça **backup** regularmente em **Dados → Exportar backup (.json)** e restaure quando quiser.
- Limpar os dados do site no navegador **apaga** o conteúdo. Use o backup para não perder o progresso.

---

## 🛠️ Scripts

| Comando | Ação |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (gera `dist/`) |
| `npm run preview` | Pré-visualiza o build |
| `npm run deploy` | Publica no GitHub Pages via `gh-pages` |
| `node scripts/gerar-icones.mjs` | Regenera os ícones do PWA |

---

Feito para estudar com foco. Bons estudos e boa prova! 🎯
