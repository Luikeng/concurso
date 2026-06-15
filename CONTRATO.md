# CONTRATO DE INTEGRAÇÃO (para construção dos módulos)

> Documento técnico interno. Cada módulo é **isolado e plugável**. Ao construir um
> módulo, você só pode CRIAR/EDITAR arquivos dentro de `src/modules/<seu-modulo>/`.
> **NÃO** modifique arquivos compartilhados (db, store, services, components/ui, lib).
> Importe deles. Tudo em **português do Brasil**. Trate loading e erros. Responsivo
> (ótimo no celular) e compatível com tema claro/escuro (classes `dark:` do Tailwind).

## Convenções de módulo

- `src/modules/<nome>/index.js` → **apenas metadados** (SEM JSX). Mantenha exatamente
  os metadados já definidos (id, rotulo, descricao, icone, path, ordem) e aponte
  `Component` para a página real.
- Componentes/páginas ficam em arquivos `.jsx` (JSX só funciona em `.jsx`).
- Exemplo de index.js (banco):

```js
import { Database } from 'lucide-react'
import { BancoPage } from './BancoPage'
export default {
  id: 'banco', rotulo: 'Banco',
  descricao: 'Banco de questões com filtros, CRUD e import/export',
  icone: Database, path: '/banco', ordem: 2,
  Component: BancoPage,
}
```

## Leitura reativa de dados (IMPORTANTE)

Use `useLiveQuery` do `dexie-react-hooks` apontando para `db.<tabela>`. Sempre passe
um valor inicial (3º argumento) para evitar `undefined` no 1º render:

```js
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
const questoes = useLiveQuery(() => db.questoes.toArray(), [], [])
```

## Escrita de dados → use `dbApi` (de `../../db/db`)

```
// Matérias / Tópicos
dbApi.addMateria({nome, cor}) / updateMateria(id, patch) / deleteMateria(id)
dbApi.addTopico({materiaId, nome, coberto}) / updateTopico / deleteTopico / toggleTopicoCoberto(id)

// Questões  (gabarito = ÍNDICE 0..n-1 da alternativa correta)
dbApi.addQuestao(q) -> id        // q: {materiaId, topicoId, enunciado, alternativas[], gabarito, comentario, banca, dificuldade(1-3), tags[], origem}
dbApi.addQuestoes(lista) -> ids[]
dbApi.updateQuestao(id, patch) / deleteQuestao(id)

// Tarefas (plano)
dbApi.addTarefa / updateTarefa / deleteTarefa / toggleTarefa(id)

// Desempenho
dbApi.addRegistro({data?, materiaId, topicoId, total, acertos})   // alimenta Estatísticas
dbApi.addTentativa({data?, questoesIds[], respostas{}, acertos, total, duracaoSeg})
dbApi.addSessao({data?, materiaId, minutos})

// Revisão espaçada (SRS)
dbApi.agendarRevisao({refTipo:'topico'|'questao', refId, titulo?})  // marca p/ revisar hoje
dbApi.responderRevisao(id, acertou)   // acertou=true aumenta intervalo; false reinicia
dbApi.deleteRevisao(id)

// Metas
dbApi.setMeta({tipo:'questoes'|'horas', periodo:'semana', alvo})

// Backup
dbApi.exportarTudo() -> objeto ; dbApi.importarTudo(dump) ; dbApi.resetarTudo()
```

Datas em formato ISO curto `YYYY-MM-DD`. Use helpers de `../../lib/utils`:
`uid, hojeISO, dataISO, addDias, diffDias, formatarData, formatarMinutos,
formatarSegundos, pct, embaralhar, inicioSemanaISO, ROTULO_DIFICULDADE,
PALETA_MATERIAS, baixarArquivo, baixarJSON, lerArquivoComoTexto, cn`.

## Store (Zustand) — `../../store/useStore`

```js
import { useStore, useConfig, useNotificar } from '../../store/useStore'
const config = useConfig()         // {tema, geminiApiKey, geminiModel, pomodoro:{foco,pausa,ciclos}, metas:{questoesSemana,horasSemana}}
const setConfig = useStore(s => s.setConfig)      // (patch)
const setPomodoro = useStore(s => s.setPomodoro)  // (patch)
const setMetas = useStore(s => s.setMetas)        // (patch)
const alternarTema = useStore(s => s.alternarTema)
const notificar = useNotificar()   // (mensagem, tipo:'info'|'sucesso'|'erro'|'aviso')
```

## Serviços compartilhados (`../../services/...`)

- `gemini.js`: `MODELOS_GEMINI`, `chamarGemini({apiKey, model, prompt, systemPrompt?, json?})`,
  `parseJSONSeguro(texto)`, `gerarQuestoesIA({apiKey, model, materia, topico, quantidade, dificuldade, banca})` (retorna questões no formato do banco),
  `gerarFlashcardsIA({apiKey, model, materia, topico, quantidade})` (retorna [{frente,verso,tags}]),
  `explicarIA({apiKey, model, assunto, contexto?})` (texto), `analisarEstatisticasIA({apiKey, model, resumo})` (texto).
- `anki.js`: `gerarTSV(cards)`, `exportarAnki(cards, nomeArquivo?)`, `PASSOS_IMPORTACAO_ANKI` (array de passos), `baixarArquivo`.
- `flashcards.js`: `cardDeQuestao(q, {materiaNome, topicoNome})`, `cardDeTopico(topico, resumo, {materiaNome})`, `cardDeIA({frente,verso,tags}, extraTags)`. Card = `{frente, verso, tags}`.
- `srs.js`: `INTERVALOS` (=[1,7,30,90]), `proximoIntervalo`, `rotuloIntervalo(dias)`.
- `stats.js`: `acertoPorMateria(registros, materias)`, `acertoPorTopico(registros, topicos, materias)`,
  `evolucaoTemporal(registros)`, `heatmap(registros, sessoes?, dias?)` (-> [{data, valor}]),
  `calcularStreak(registros, sessoes?)`, `topicosFracos(registros, topicos, materias, limite)` (-> inclui `.recomendacao`),
  `resumoSemana(registros, sessoes, metas)`, `horasPorMateriaSemana(sessoes, materias)`,
  `resumoTextoIA({registros, sessoes, materias, topicos, metas})` (-> string p/ enviar à IA).

## Componentes de UI — `../../components/ui`

`Button` (variant: primary|secondary|outline|ghost|danger|success; size: sm|md|lg|icon),
`IconButton`, `Card, CardHeader, CardTitle, CardBody`, `Input, Textarea, Select, Field, Checkbox`,
`Badge` (cor: cinza|marca|verde|ambar|vermelho|azul), `Dot` (cor=hex), `Modal` (props: aberto, onFechar, titulo, tamanho, rodape),
`ConfirmDialog` (aberto, onFechar, onConfirmar, titulo, mensagem, textoConfirmar), `Spinner` (label),
`EmptyState` (icon, titulo, descricao, acao), `ProgressBar` (valor,total OU percentual; cor),
`Stat` (icon, rotulo, valor, sub, cor), `Tabs` (abas:[{id,label,conteudo}], inicial).

Ícones: `lucide-react`. Gráficos: `recharts` (`BarChart`, `LineChart`, `ResponsiveContainer`, etc).

## Modelo de dados (entidades no Dexie)

```
Materia        {id, nome, cor}
Topico         {id, materiaId, nome, coberto}
Questao        {id, materiaId, topicoId, enunciado, alternativas[], gabarito(idx), comentario, banca, dificuldade(1-3), tags[], origem('manual'|'ia'), criadaEm}
Tarefa         {id, semana, dia, materia(nome), topico(nome), descricao, recursoUrl, metaQuestoes, concluida}
RegistroQuestoes {id, data, materiaId, topicoId, total, acertos}
TentativaSimulado {id, data, questoesIds[], respostas{}, acertos, total, duracaoSeg}
SessaoEstudo   {id, data, materiaId, minutos}
ItemRevisao    {id, refTipo('topico'|'questao'), refId, titulo, proximaRevisao, intervaloAtual}
Meta           {id, tipo('questoes'|'horas'), periodo('semana'), alvo}
```

## Referência viva

Leia `src/modules/plano/PlanoPage.jsx`, `TarefaForm.jsx` e `TopicosEdital.jsx`: são o
**padrão de qualidade** (useLiveQuery + dbApi + componentes de UI + responsividade).
