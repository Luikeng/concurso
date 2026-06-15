import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ChevronDown,
  Youtube,
  CheckCircle2,
  Circle,
  Lightbulb,
  AlertTriangle,
  Layers,
  Repeat,
  ListChecks,
  BookOpen,
} from 'lucide-react'
import { db, dbApi } from '../../db/db'
import {
  Card,
  CardBody,
  Button,
  Badge,
  Dot,
  EmptyState,
  ProgressBar,
} from '../../components/ui'
import { cn, pct } from '../../lib/utils'
import { useNotificar } from '../../store/useStore'

/** Link de busca de vídeo-aulas no YouTube (sempre funciona). */
function buscaYoutube(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' concurso')}`
}

/** Player do YouTube embutido (privacy-enhanced). */
function VideoEmbed({ video }) {
  if (!video?.youtubeId) return null
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
      <div className="aspect-video w-full">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
          title={video.titulo || 'Vídeo-aula'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
      {video.titulo && (
        <p className="bg-slate-50 px-3 py-1.5 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          {video.titulo}
        </p>
      )}
    </div>
  )
}

/** Página principal do módulo Conteúdo. */
export function ConteudoPage() {
  const materias = useLiveQuery(() => db.materias.toArray(), [], [])
  const topicos = useLiveQuery(() => db.topicos.toArray(), [], [])
  const questoes = useLiveQuery(() => db.questoes.toArray(), [], [])
  const flashcards = useLiveQuery(() => db.flashcards.toArray(), [], [])

  // Só matérias que possuem tópicos com conteúdo teórico (resumo),
  // na ordem definida no edital (campo `ordem`).
  const materiasComConteudo = useMemo(() => {
    const idsComResumo = new Set(
      topicos.filter((t) => (t.resumo || '').trim()).map((t) => t.materiaId)
    )
    return materias
      .filter((m) => idsComResumo.has(m.id))
      .sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999) || a.nome.localeCompare(b.nome))
  }, [materias, topicos])

  const [materiaSelId, setMateriaSelId] = useState(null)
  const materiaSel =
    materiasComConteudo.find((m) => m.id === materiaSelId) || materiasComConteudo[0]

  if (materias.length === 0) {
    return <EmptyState icon={BookOpen} titulo="Carregando conteúdo..." />
  }
  if (materiasComConteudo.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        titulo="Conteúdo de estudo não disponível"
        descricao="O conteúdo teórico do edital ainda não foi carregado neste navegador. Você pode recarregá-lo na tela Dados."
        acao={
          <Link to="/dados">
            <Button variant="outline">Ir para Dados</Button>
          </Link>
        }
      />
    )
  }

  const topicosMateria = topicos
    .filter((t) => t.materiaId === materiaSel.id && (t.resumo || '').trim())
    .sort((a, b) => a.nome.localeCompare(b.nome))

  return (
    <div className="space-y-4">
      {/* Seletor de matérias (chips roláveis) */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {materiasComConteudo.map((m) => (
          <button
            key={m.id}
            onClick={() => setMateriaSelId(m.id)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              m.id === materiaSel.id
                ? 'border-transparent bg-marca-600 text-white'
                : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            )}
          >
            <Dot cor={m.id === materiaSel.id ? '#fff' : m.cor} />
            {m.nome}
          </button>
        ))}
      </div>

      {/* Vídeo da matéria */}
      {materiaSel.videos?.length > 0 && (
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2">
              <Youtube size={18} className="text-red-600" />
              <h3 className="text-sm font-semibold">Vídeo-aula — {materiaSel.nome}</h3>
            </div>
            <VideoEmbed video={materiaSel.videos[0]} />
          </CardBody>
        </Card>
      )}

      {/* Tópicos do edital (com conteúdo) */}
      {topicosMateria.map((t) => (
        <TopicoConteudo
          key={t.id}
          topico={t}
          materia={materiaSel}
          qtdQuestoes={questoes.filter((q) => q.topicoId === t.id).length}
          flashcardsTopico={flashcards.filter((f) => f.topicoId === t.id)}
        />
      ))}
    </div>
  )
}

/** Card expansível de um tópico com toda a teoria e ações. */
function TopicoConteudo({ topico, materia, qtdQuestoes, flashcardsTopico }) {
  const notificar = useNotificar()
  const [aberto, setAberto] = useState(false)
  const [verFlashcards, setVerFlashcards] = useState(false)

  async function enviarFlashcardsRevisao() {
    if (flashcardsTopico.length === 0) {
      notificar('Este tópico não tem flashcards.', 'aviso')
      return
    }
    for (const f of flashcardsTopico) {
      await dbApi.agendarRevisao({
        refTipo: 'flashcard',
        refId: f.id,
        titulo: (f.frente || '').slice(0, 80),
      })
    }
    notificar(`${flashcardsTopico.length} flashcard(s) enviados para revisão.`, 'sucesso')
  }

  return (
    <Card>
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {topico.coberto ? (
              <CheckCircle2 size={16} className="text-emerald-500" />
            ) : (
              <Circle size={16} className="text-slate-300 dark:text-slate-600" />
            )}
            <span className="text-sm font-semibold">{topico.nome}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {qtdQuestoes > 0 && <Badge cor="azul">{qtdQuestoes} questões</Badge>}
            {flashcardsTopico.length > 0 && (
              <Badge cor="marca">{flashcardsTopico.length} flashcards</Badge>
            )}
          </div>
        </div>
        <ChevronDown
          size={18}
          className={cn('shrink-0 text-slate-400 transition-transform', aberto && 'rotate-180')}
        />
      </button>

      {aberto && (
        <div className="space-y-4 border-t border-slate-100 px-4 py-4 dark:border-slate-800">
          {/* Resumo */}
          {topico.resumo && (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Resumo
              </h4>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {topico.resumo}
              </p>
            </div>
          )}

          {/* Pontos-chave */}
          {topico.pontosChave?.length > 0 && (
            <div className="rounded-lg bg-marca-50 p-3 dark:bg-marca-900/20">
              <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-marca-700 dark:text-marca-300">
                <Lightbulb size={14} /> Pontos-chave
              </h4>
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-700 dark:text-slate-200">
                {topico.pontosChave.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Pegadinhas */}
          {topico.pegadinhas?.length > 0 && (
            <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
              <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                <AlertTriangle size={14} /> Cuidado em prova
              </h4>
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-700 dark:text-slate-200">
                {topico.pegadinhas.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Flashcards do tópico */}
          {flashcardsTopico.length > 0 && (
            <div>
              <button
                onClick={() => setVerFlashcards((v) => !v)}
                className="flex items-center gap-1.5 text-sm font-medium text-marca-700 hover:underline dark:text-marca-300"
              >
                <Layers size={15} />
                {verFlashcards ? 'Ocultar' : 'Estudar'} flashcards ({flashcardsTopico.length})
              </button>
              {verFlashcards && (
                <ul className="mt-2 space-y-2">
                  {flashcardsTopico.map((f) => (
                    <Flashcard key={f.id} fc={f} />
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Ações */}
          <div className="flex flex-wrap gap-2 pt-1">
            <a href={buscaYoutube(topico.videoQuery || topico.nome)} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <Youtube size={15} className="text-red-600" /> Vídeo-aulas
              </Button>
            </a>
            {flashcardsTopico.length > 0 && (
              <Button variant="outline" size="sm" onClick={enviarFlashcardsRevisao}>
                <Repeat size={15} /> Revisar flashcards
              </Button>
            )}
            <Link to="/simulado">
              <Button variant="outline" size="sm">
                <ListChecks size={15} /> Praticar questões
              </Button>
            </Link>
            <Button
              variant={topico.coberto ? 'success' : 'secondary'}
              size="sm"
              onClick={() => dbApi.toggleTopicoCoberto(topico.id)}
            >
              <CheckCircle2 size={15} />
              {topico.coberto ? 'Estudado' : 'Marcar como estudado'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

/** Flashcard com efeito de "virar" (clique revela o verso). */
function Flashcard({ fc }) {
  const [virado, setVirado] = useState(false)
  return (
    <li>
      <button
        onClick={() => setVirado((v) => !v)}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-sm transition-colors hover:border-marca-300 dark:border-slate-700 dark:bg-slate-800/50"
      >
        <p className="font-medium text-slate-800 dark:text-slate-100">{fc.frente}</p>
        {virado ? (
          <p className="mt-2 border-t border-slate-200 pt-2 text-slate-600 dark:border-slate-700 dark:text-slate-300">
            {fc.verso}
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-400">Clique para ver a resposta</p>
        )}
      </button>
    </li>
  )
}
