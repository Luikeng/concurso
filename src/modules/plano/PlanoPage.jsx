import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Target,
} from 'lucide-react'
import { db, dbApi } from '../../db/db'
import {
  Card,
  CardBody,
  Button,
  Badge,
  Dot,
  ProgressBar,
  EmptyState,
  Tabs,
  ConfirmDialog,
} from '../../components/ui'
import { cn, pct } from '../../lib/utils'
import { TarefaForm } from './TarefaForm'
import { TopicosEdital } from './TopicosEdital'

/** Página principal do módulo Plano. */
export function PlanoPage() {
  return (
    <Tabs
      abas={[
        { id: 'trilha', label: 'Trilha', conteudo: <Trilha /> },
        { id: 'topicos', label: 'Tópicos do edital', conteudo: <TopicosEdital /> },
      ]}
    />
  )
}

function Trilha() {
  const tarefas = useLiveQuery(() => db.tarefas.toArray(), [], [])
  const materias = useLiveQuery(() => db.materias.toArray(), [], [])
  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [excluir, setExcluir] = useState(null)
  const [semanasAbertas, setSemanasAbertas] = useState({})

  const corPorMateria = useMemo(() => {
    const m = new Map()
    materias.forEach((x) => m.set(x.nome, x.cor))
    return m
  }, [materias])

  // Agrupa tarefas por semana → dia.
  const semanas = useMemo(() => {
    const mapa = new Map()
    for (const t of tarefas) {
      if (!mapa.has(t.semana)) mapa.set(t.semana, new Map())
      const dias = mapa.get(t.semana)
      if (!dias.has(t.dia)) dias.set(t.dia, [])
      dias.get(t.dia).push(t)
    }
    return [...mapa.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([semana, dias]) => ({
        semana,
        dias: [...dias.entries()].sort((a, b) => a[0] - b[0]).map(([dia, ts]) => ({ dia, tarefas: ts })),
        tarefas: [...dias.values()].flat(),
      }))
  }, [tarefas])

  const totalGeral = tarefas.length
  const concluidasGeral = tarefas.filter((t) => t.concluida).length

  function abrirNova() {
    setEditando(null)
    setFormAberto(true)
  }
  function abrirEdicao(t) {
    setEditando(t)
    setFormAberto(true)
  }

  if (totalGeral === 0) {
    return (
      <EmptyState
        titulo="Sem tarefas no plano"
        descricao="A trilha inicial é carregada automaticamente. Você também pode adicionar tarefas manualmente."
        acao={
          <Button onClick={abrirNova}>
            <Plus size={16} /> Nova tarefa
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumo geral */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Progresso geral</p>
              <p className="text-xs text-slate-400">
                {concluidasGeral} de {totalGeral} tarefas concluídas
              </p>
            </div>
            <span className="text-2xl font-bold text-marca-600">{pct(concluidasGeral, totalGeral)}%</span>
          </div>
          <ProgressBar valor={concluidasGeral} total={totalGeral} className="mt-3" />
          <div className="mt-3 flex justify-end">
            <Button size="sm" variant="outline" onClick={abrirNova}>
              <Plus size={15} /> Nova tarefa
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Semanas */}
      {semanas.map(({ semana, dias, tarefas: tsSemana }) => {
        const concl = tsSemana.filter((t) => t.concluida).length
        const aberta = semanasAbertas[semana] ?? semana === semanas[0].semana
        return (
          <Card key={semana}>
            <button
              onClick={() => setSemanasAbertas((s) => ({ ...s, [semana]: !aberta }))}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <div className="flex-1">
                <p className="text-sm font-semibold">Semana {semana}</p>
                <p className="text-xs text-slate-400">
                  {concl}/{tsSemana.length} tarefas • {pct(concl, tsSemana.length)}%
                </p>
                <ProgressBar valor={concl} total={tsSemana.length} className="mt-1.5 max-w-xs" />
              </div>
              <ChevronDown
                size={18}
                className={cn('shrink-0 text-slate-400 transition-transform', aberta && 'rotate-180')}
              />
            </button>

            {aberta && (
              <div className="border-t border-slate-100 dark:border-slate-800">
                {dias.map(({ dia, tarefas: tsDia }) => (
                  <div key={dia} className="px-4 py-2">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Dia {dia}</p>
                    <ul className="space-y-1">
                      {tsDia.map((t) => (
                        <TarefaItem
                          key={t.id}
                          tarefa={t}
                          cor={corPorMateria.get(t.materia) || '#94a3b8'}
                          onEditar={() => abrirEdicao(t)}
                          onExcluir={() => setExcluir(t)}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      })}

      {formAberto && (
        <TarefaForm
          aberto={formAberto}
          onFechar={() => setFormAberto(false)}
          tarefa={editando}
        />
      )}
      <ConfirmDialog
        aberto={!!excluir}
        onFechar={() => setExcluir(null)}
        onConfirmar={() => dbApi.deleteTarefa(excluir.id)}
        titulo="Excluir tarefa"
        mensagem={`Remover "${excluir?.descricao || excluir?.topico || 'tarefa'}"? Esta ação não pode ser desfeita.`}
        textoConfirmar="Excluir"
      />
    </div>
  )
}

function TarefaItem({ tarefa, cor, onEditar, onExcluir }) {
  return (
    <li className="group flex items-start gap-2 rounded-lg px-1 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <button onClick={() => dbApi.toggleTarefa(tarefa.id)} className="mt-0.5 shrink-0" aria-label="Concluir tarefa">
        {tarefa.concluida ? (
          <CheckCircle2 size={18} className="text-emerald-500" />
        ) : (
          <Circle size={18} className="text-slate-300 dark:text-slate-600" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge cor="cinza" style={{ color: cor }}>
            <Dot cor={cor} /> {tarefa.materia}
          </Badge>
          {tarefa.topico && <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{tarefa.topico}</span>}
          {tarefa.metaQuestoes > 0 && (
            <Badge cor="marca">
              <Target size={11} /> {tarefa.metaQuestoes} q
            </Badge>
          )}
        </div>
        <p className={cn('mt-0.5 text-sm', tarefa.concluida ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200')}>
          {tarefa.descricao}
        </p>
        {tarefa.recursoUrl && (
          <a
            href={tarefa.recursoUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 inline-flex items-center gap-1 text-xs text-marca-600 hover:underline"
          >
            <ExternalLink size={12} /> Recurso
          </a>
        )}
      </div>
      <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button onClick={onEditar} className="rounded p-1 text-slate-400 hover:text-marca-600" aria-label="Editar">
          <Pencil size={14} />
        </button>
        <button onClick={onExcluir} className="rounded p-1 text-slate-400 hover:text-red-600" aria-label="Excluir">
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  )
}
