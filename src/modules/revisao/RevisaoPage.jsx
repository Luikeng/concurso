import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Trash2,
  CalendarClock,
  FileQuestion,
  BookOpen,
  Layers,
  PartyPopper,
} from 'lucide-react'
import { db, dbApi } from '../../db/db'
import {
  Card,
  CardBody,
  Button,
  Badge,
  Dot,
  EmptyState,
  Tabs,
  ConfirmDialog,
} from '../../components/ui'
import { hojeISO, formatarData, cn } from '../../lib/utils'
import { rotuloIntervalo } from '../../services/srs'
import { useNotificar } from '../../store/useStore'

/**
 * Página principal do módulo Revisão espaçada.
 * Duas abas: "Para revisar hoje" e "Agendadas".
 * Resolve a referência de cada item de revisão (questão/tópico) em memória.
 */
export function RevisaoPage() {
  // Leituras reativas (sempre com valor inicial para evitar undefined no 1º render).
  const revisoes = useLiveQuery(() => db.revisoes.toArray(), [], [])
  const questoes = useLiveQuery(() => db.questoes.toArray(), [], [])
  const topicos = useLiveQuery(() => db.topicos.toArray(), [], [])
  const materias = useLiveQuery(() => db.materias.toArray(), [], [])
  const flashcards = useLiveQuery(() => db.flashcards.toArray(), [], [])

  // Índices em memória para resolver as referências rapidamente.
  const mapaQuestoes = useMemo(() => {
    const m = new Map()
    questoes.forEach((q) => m.set(q.id, q))
    return m
  }, [questoes])

  const mapaTopicos = useMemo(() => {
    const m = new Map()
    topicos.forEach((t) => m.set(t.id, t))
    return m
  }, [topicos])

  const mapaMaterias = useMemo(() => {
    const m = new Map()
    materias.forEach((mt) => m.set(mt.id, mt))
    return m
  }, [materias])

  const mapaFlashcards = useMemo(() => {
    const m = new Map()
    flashcards.forEach((f) => m.set(f.id, f))
    return m
  }, [flashcards])

  /** Resolve o conteúdo de um item de revisão (com fallback no .titulo). */
  function resolver(item) {
    if (item.refTipo === 'questao') {
      const questao = mapaQuestoes.get(item.refId)
      return { tipo: 'questao', questao, titulo: item.titulo }
    }
    if (item.refTipo === 'flashcard') {
      const flashcard = mapaFlashcards.get(item.refId)
      return { tipo: 'flashcard', flashcard, titulo: item.titulo }
    }
    const topico = mapaTopicos.get(item.refId)
    const materia = topico ? mapaMaterias.get(topico.materiaId) : null
    return { tipo: 'topico', topico, materia, titulo: item.titulo }
  }

  const hoje = hojeISO()
  const paraHoje = useMemo(
    () => revisoes.filter((r) => r.proximaRevisao <= hoje),
    [revisoes, hoje]
  )
  const agendadas = useMemo(
    () => [...revisoes].sort((a, b) => a.proximaRevisao.localeCompare(b.proximaRevisao)),
    [revisoes]
  )

  return (
    <Tabs
      abas={[
        {
          id: 'hoje',
          label: 'Para revisar hoje',
          conteudo: <ParaHoje itens={paraHoje} resolver={resolver} />,
        },
        {
          id: 'agendadas',
          label: 'Agendadas',
          conteudo: <Agendadas itens={agendadas} resolver={resolver} hoje={hoje} />,
        },
      ]}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Aba: Para revisar hoje                                                      */
/* -------------------------------------------------------------------------- */

function ParaHoje({ itens, resolver }) {
  const [excluir, setExcluir] = useState(null)

  if (itens.length === 0) {
    return (
      <EmptyState
        icon={PartyPopper}
        titulo="Tudo em dia! 🎉"
        descricao="Você não tem itens para revisar hoje. Volte amanhã ou marque novos itens para revisão."
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Contagem no topo */}
      <p className="text-sm text-slate-500 dark:text-slate-400">
        <span className="font-semibold text-slate-700 dark:text-slate-200">{itens.length}</span>{' '}
        {itens.length === 1 ? 'item para revisar' : 'itens para revisar'} hoje
      </p>

      <ul className="space-y-3">
        {itens.map((item) => (
          <ItemRevisaoHoje
            key={item.id}
            item={item}
            conteudo={resolver(item)}
            onExcluir={() => setExcluir(item)}
          />
        ))}
      </ul>

      <ConfirmDialog
        aberto={!!excluir}
        onFechar={() => setExcluir(null)}
        onConfirmar={() => dbApi.deleteRevisao(excluir.id)}
        titulo="Remover da revisão"
        mensagem="Remover este item da revisão espaçada? Esta ação não pode ser desfeita."
        textoConfirmar="Remover"
      />
    </div>
  )
}

/** Um item da lista "Para revisar hoje", com ações de acerto/erro. */
function ItemRevisaoHoje({ item, conteudo, onExcluir }) {
  const notificar = useNotificar()
  const [revelado, setRevelado] = useState(false)
  const [respondendo, setRespondendo] = useState(false)

  const tipo = conteudo.tipo
  const ehQuestao = tipo === 'questao'
  const ehFlashcard = tipo === 'flashcard'
  const questao = conteudo.questao
  const topico = conteudo.topico
  const flashcard = conteudo.flashcard

  // Configuração visual por tipo.
  const meta = {
    questao: { rotulo: 'Questão', cor: 'azul', Icone: FileQuestion },
    flashcard: { rotulo: 'Flashcard', cor: 'verde', Icone: Layers },
    topico: { rotulo: 'Tópico', cor: 'marca', Icone: BookOpen },
  }[tipo]

  // Referência ausente (item órfão: conteúdo referenciado foi excluído).
  const semReferencia =
    (ehQuestao && !questao) || (ehFlashcard && !flashcard) || (tipo === 'topico' && !topico)

  async function responder(acertou) {
    setRespondendo(true)
    try {
      await dbApi.responderRevisao(item.id, acertou)
      notificar(
        acertou ? 'Boa! Revisão reagendada.' : 'Reagendado para revisar em breve.',
        acertou ? 'sucesso' : 'info'
      )
    } catch (e) {
      notificar('Não foi possível registrar a resposta.', 'erro')
      setRespondendo(false)
    }
    // Em caso de sucesso o item sai da lista (proximaRevisao no futuro),
    // então não precisamos reativar o estado.
  }

  return (
    <li>
      <Card>
        <CardBody>
          {/* Cabeçalho: tipo + remover */}
          <div className="mb-2 flex items-start justify-between gap-2">
            <Badge cor={meta.cor}>
              <meta.Icone size={12} />
              {meta.rotulo}
            </Badge>
            <button
              onClick={onExcluir}
              className="rounded p-1 text-slate-400 transition-colors hover:text-red-600"
              aria-label="Remover da revisão"
            >
              <Trash2 size={15} />
            </button>
          </div>

          {/* Conteúdo */}
          {semReferencia ? (
            <p className="text-sm italic text-slate-500 dark:text-slate-400">
              {item.titulo || 'Item indisponível (referência removida).'}
            </p>
          ) : ehQuestao ? (
            <QuestaoConteudo
              questao={questao}
              titulo={item.titulo}
              revelado={revelado}
              onRevelar={() => setRevelado((v) => !v)}
            />
          ) : ehFlashcard ? (
            <FlashcardConteudo
              flashcard={flashcard}
              revelado={revelado}
              onRevelar={() => setRevelado((v) => !v)}
            />
          ) : (
            <TopicoConteudo
              topico={topico}
              materia={conteudo.materia}
              titulo={item.titulo}
            />
          )}

          {/* Ações de revisão */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="success"
              size="sm"
              onClick={() => responder(true)}
              disabled={respondendo}
              className="flex-1 sm:flex-none"
            >
              <CheckCircle2 size={16} /> Acertei
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => responder(false)}
              disabled={respondendo}
              className="flex-1 sm:flex-none"
            >
              <XCircle size={16} /> Errei
            </Button>
          </div>
        </CardBody>
      </Card>
    </li>
  )
}

/** Conteúdo de uma questão na revisão, com "Mostrar resposta". */
function QuestaoConteudo({ questao, titulo, revelado, onRevelar }) {
  // Letra da alternativa correta (A, B, C, ...).
  const letraGabarito =
    questao.gabarito != null && questao.gabarito >= 0
      ? String.fromCharCode(65 + questao.gabarito)
      : null
  const textoGabarito =
    questao.gabarito != null ? questao.alternativas?.[questao.gabarito] : null

  return (
    <div>
      <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
        {questao.enunciado || titulo || 'Questão sem enunciado.'}
      </p>

      <Button variant="outline" size="sm" onClick={onRevelar} className="mt-2">
        {revelado ? <EyeOff size={15} /> : <Eye size={15} />}
        {revelado ? 'Ocultar resposta' : 'Mostrar resposta'}
      </Button>

      {revelado && (
        <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
            Gabarito:{' '}
            {letraGabarito ? (
              <>
                <span className="font-bold">{letraGabarito}</span>
                {textoGabarito ? ` — ${textoGabarito}` : ''}
              </>
            ) : (
              'não informado'
            )}
          </p>
          {questao.comentario && (
            <p className="mt-1.5 whitespace-pre-wrap text-sm text-emerald-900/80 dark:text-emerald-100/80">
              {questao.comentario}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/** Conteúdo de um flashcard na revisão (frente + revelar verso). */
function FlashcardConteudo({ flashcard, revelado, onRevelar }) {
  return (
    <div>
      <p className="whitespace-pre-wrap text-sm font-medium text-slate-700 dark:text-slate-200">
        {flashcard.frente || 'Flashcard'}
      </p>
      <Button variant="outline" size="sm" onClick={onRevelar} className="mt-2">
        {revelado ? <EyeOff size={15} /> : <Eye size={15} />}
        {revelado ? 'Ocultar resposta' : 'Mostrar resposta'}
      </Button>
      {revelado && (
        <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="whitespace-pre-wrap text-sm text-emerald-900/90 dark:text-emerald-100/90">
            {flashcard.verso}
          </p>
        </div>
      )}
    </div>
  )
}

/** Conteúdo de um tópico na revisão (nome + matéria). */
function TopicoConteudo({ topico, materia, titulo }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {topico.nome || titulo || 'Tópico'}
      </p>
      {materia && (
        <div className="mt-1 inline-flex items-center gap-1.5">
          <Dot cor={materia.cor} />
          <span className="text-xs text-slate-500 dark:text-slate-400">{materia.nome}</span>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Aba: Agendadas                                                             */
/* -------------------------------------------------------------------------- */

function Agendadas({ itens, resolver, hoje }) {
  if (itens.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        titulo="Nenhum item agendado"
        descricao="Itens entram aqui ao marcar 'Errei' no Banco ou no Simulado, ou ao enviar tópicos para revisão pelo Plano."
      />
    )
  }

  return (
    <ul className="space-y-2">
      {itens.map((item) => {
        const conteudo = resolver(item)
        const atrasada = item.proximaRevisao <= hoje

        // Texto de exibição com fallback no .titulo.
        let texto = item.titulo || ''
        if (conteudo.tipo === 'questao') {
          texto = conteudo.questao?.enunciado || item.titulo || 'Questão removida'
        } else if (conteudo.tipo === 'flashcard') {
          texto = conteudo.flashcard?.frente || item.titulo || 'Flashcard removido'
        } else {
          texto = conteudo.topico?.nome || item.titulo || 'Tópico removido'
        }

        const IconeTipo =
          conteudo.tipo === 'questao'
            ? FileQuestion
            : conteudo.tipo === 'flashcard'
              ? Layers
              : BookOpen

        return (
          <li key={item.id}>
            <Card>
              <CardBody className="flex items-start gap-3 py-3">
                <div className="mt-0.5 shrink-0 text-slate-400">
                  <IconeTipo size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm text-slate-700 dark:text-slate-200">
                    {texto}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock size={13} />
                      {formatarData(item.proximaRevisao)}
                    </span>
                    <Badge cor="cinza">{rotuloIntervalo(item.intervaloAtual)}</Badge>
                    {atrasada && <Badge cor="ambar">Para hoje</Badge>}
                  </div>
                </div>
              </CardBody>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
