import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ClipboardList,
  Play,
  Shuffle,
  Timer,
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Send,
  Download,
  Trophy,
  Target,
  Clock,
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
  Spinner,
  Stat,
  Field,
  Input,
  Select,
  Checkbox,
  ConfirmDialog,
} from '../../components/ui'
import { useNotificar } from '../../store/useStore'
import { cn, pct, embaralhar, formatarSegundos, ROTULO_DIFICULDADE } from '../../lib/utils'
import { cardDeQuestao } from '../../services/flashcards'
import { exportarAnki } from '../../services/anki'

// Letras das alternativas (A, B, C, ...).
const LETRAS = 'ABCDEFGHIJ'.split('')

/**
 * Página do módulo Simulado.
 * Máquina de estados: 'config' (monta o simulado) → 'rodando' (responde) → 'resultado' (correção).
 */
export function SimuladoPage() {
  // Estado da máquina e dados do simulado em andamento/finalizado.
  const [etapa, setEtapa] = useState('config') // 'config' | 'rodando' | 'resultado'
  const [questoes, setQuestoes] = useState([]) // questões sorteadas para a rodada
  const [respostas, setRespostas] = useState({}) // { [questaoId]: indiceEscolhido }
  const [resultado, setResultado] = useState(null) // { acertos, total, duracaoSeg }

  // Inicia uma nova rodada com o pool montado na tela de config.
  function iniciar(pool) {
    setQuestoes(pool)
    setRespostas({})
    setResultado(null)
    setEtapa('rodando')
  }

  // Recebe o resultado já calculado/persistido da tela "rodando".
  function finalizar({ acertos, total, duracaoSeg, respostas: resp }) {
    setRespostas(resp)
    setResultado({ acertos, total, duracaoSeg })
    setEtapa('resultado')
  }

  // Volta ao início para montar um novo simulado.
  function reiniciar() {
    setQuestoes([])
    setRespostas({})
    setResultado(null)
    setEtapa('config')
  }

  if (etapa === 'rodando') {
    return <TelaRodando questoes={questoes} onFinalizar={finalizar} />
  }
  if (etapa === 'resultado') {
    return (
      <TelaResultado
        questoes={questoes}
        respostas={respostas}
        resultado={resultado}
        onNovoSimulado={reiniciar}
      />
    )
  }
  return <TelaConfig onIniciar={iniciar} />
}

/* ============================================================
 * TELA 1 — CONFIG (monta o simulado)
 * ========================================================== */
function TelaConfig({ onIniciar }) {
  const notificar = useNotificar()
  // Leitura reativa do banco (sempre com valor inicial).
  const questoes = useLiveQuery(() => db.questoes.toArray(), [], undefined)
  const materias = useLiveQuery(() => db.materias.toArray(), [], [])
  const carregando = questoes === undefined // 1º render do useLiveQuery

  // Filtros do formulário.
  const [materiaId, setMateriaId] = useState('')
  const [banca, setBanca] = useState('')
  const [dificuldade, setDificuldade] = useState('')
  const [quantidade, setQuantidade] = useState(10)
  const [aleatorio, setAleatorio] = useState(false)
  const [montando, setMontando] = useState(false)

  const lista = questoes || []

  // Lista de bancas distintas presentes no banco (para o Select).
  const bancas = useMemo(() => {
    const set = new Set()
    lista.forEach((q) => q.banca && set.add(q.banca))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [lista])

  // Pool filtrado (sem embaralhar) — usado só para contar quantas estão disponíveis.
  const poolFiltrado = useMemo(() => {
    if (aleatorio) return lista
    return lista.filter((q) => {
      if (materiaId && q.materiaId !== materiaId) return false
      if (banca && q.banca !== banca) return false
      if (dificuldade && Number(q.dificuldade) !== Number(dificuldade)) return false
      return true
    })
  }, [lista, materiaId, banca, dificuldade, aleatorio])

  const qtd = Math.max(1, Number(quantidade) || 1)
  const disponiveis = poolFiltrado.length
  const suficiente = disponiveis >= qtd

  // Monta o pool: filtra → embaralha → fatia pela quantidade.
  function montar() {
    if (disponiveis === 0) {
      notificar('Nenhuma questão encontrada com esses filtros.', 'aviso')
      return
    }
    if (!suficiente) {
      notificar(
        `Só há ${disponiveis} ${disponiveis === 1 ? 'questão disponível' : 'questões disponíveis'} para esses filtros.`,
        'aviso'
      )
      return
    }
    setMontando(true)
    // Pequeno atraso para o feedback de loading aparecer mesmo com poucos itens.
    setTimeout(() => {
      const pool = embaralhar(poolFiltrado).slice(0, qtd)
      setMontando(false)
      onIniciar(pool)
    }, 150)
  }

  if (carregando) {
    return (
      <div className="py-16">
        <Spinner label="Carregando banco de questões..." />
      </div>
    )
  }

  if (lista.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        titulo="Sem questões cadastradas"
        descricao="Cadastre questões no módulo Banco para montar um simulado."
      />
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList size={20} className="text-marca-600" />
        <h1 className="text-lg font-semibold">Montar simulado</h1>
      </div>

      <Card>
        <CardBody className="space-y-4">
          {/* Modo aleatório: ignora os filtros. */}
          <Checkbox
            label="Aleatório (ignora os filtros e sorteia de todo o banco)"
            checked={aleatorio}
            onChange={(e) => setAleatorio(e.target.checked)}
          />

          <fieldset
            disabled={aleatorio}
            className={cn('space-y-3 transition-opacity', aleatorio && 'opacity-50')}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Matéria (opcional)">
                <Select value={materiaId} onChange={(e) => setMateriaId(e.target.value)}>
                  <option value="">Todas</option>
                  {materias.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Banca (opcional)">
                <Select value={banca} onChange={(e) => setBanca(e.target.value)}>
                  <option value="">Todas</option>
                  {bancas.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Dificuldade (opcional)">
              <Select value={dificuldade} onChange={(e) => setDificuldade(e.target.value)}>
                <option value="">Todas</option>
                <option value="1">{ROTULO_DIFICULDADE[1]}</option>
                <option value="2">{ROTULO_DIFICULDADE[2]}</option>
                <option value="3">{ROTULO_DIFICULDADE[3]}</option>
              </Select>
            </Field>
          </fieldset>

          <Field label="Quantidade de questões" hint="Padrão: 10">
            <Input
              type="number"
              min={1}
              max={Math.max(1, disponiveis) || 100}
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </Field>

          {/* Resumo de disponibilidade. */}
          <div
            className={cn(
              'rounded-lg border px-3 py-2 text-sm',
              suficiente
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
            )}
          >
            {disponiveis === 0 ? (
              <>Nenhuma questão disponível com esses filtros.</>
            ) : suficiente ? (
              <>
                {disponiveis} {disponiveis === 1 ? 'questão disponível' : 'questões disponíveis'} •
                sortearemos {qtd}.
              </>
            ) : (
              <>
                Só há {disponiveis} {disponiveis === 1 ? 'questão disponível' : 'questões disponíveis'}
                . Reduza a quantidade ou ajuste os filtros.
              </>
            )}
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={montar}
            disabled={montando || disponiveis === 0 || !suficiente}
          >
            {montando ? (
              <Spinner label="Montando..." />
            ) : (
              <>
                {aleatorio ? <Shuffle size={18} /> : <Play size={18} />} Iniciar simulado
              </>
            )}
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}

/* ============================================================
 * TELA 2 — RODANDO (responde as questões)
 * ========================================================== */
function TelaRodando({ questoes, onFinalizar }) {
  const notificar = useNotificar()
  const [atual, setAtual] = useState(0) // índice da questão exibida
  const [respostas, setRespostas] = useState({}) // { [questaoId]: indiceEscolhido }
  const [segundos, setSegundos] = useState(0) // cronômetro crescente
  const [confirmarFim, setConfirmarFim] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const inicioRef = useRef(Date.now()) // marco para calcular a duração real

  // Cronômetro crescente: atualiza a cada segundo enquanto a tela está montada.
  useEffect(() => {
    const id = setInterval(() => {
      setSegundos(Math.round((Date.now() - inicioRef.current) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const questao = questoes[atual]
  const total = questoes.length
  const respondidas = Object.keys(respostas).length
  const naoRespondidas = total - respondidas

  // Marca a alternativa escolhida na questão atual.
  function escolher(indice) {
    setRespostas((r) => ({ ...r, [questao.id]: indice }))
  }

  function anterior() {
    setAtual((i) => Math.max(0, i - 1))
  }
  function proxima() {
    setAtual((i) => Math.min(total - 1, i + 1))
  }

  // Calcula acertos, persiste tentativa + registros e devolve o resultado à página.
  async function finalizar() {
    setSalvando(true)
    try {
      const duracaoSeg = Math.round((Date.now() - inicioRef.current) / 1000)
      let acertos = 0
      // Acumuladores por matéria e por tópico para alimentar as Estatísticas.
      const porMateria = new Map() // materiaId -> { total, acertos }
      const porTopico = new Map() // topicoId -> { materiaId, total, acertos }

      for (const q of questoes) {
        const escolhido = respostas[q.id]
        const acertou = escolhido != null && escolhido === q.gabarito
        if (acertou) acertos++

        // Agrupa por matéria.
        if (q.materiaId) {
          const m = porMateria.get(q.materiaId) || { total: 0, acertos: 0 }
          m.total++
          if (acertou) m.acertos++
          porMateria.set(q.materiaId, m)
        }
        // Agrupa por tópico (quando houver).
        if (q.topicoId) {
          const t = porTopico.get(q.topicoId) || { materiaId: q.materiaId || null, total: 0, acertos: 0 }
          t.total++
          if (acertou) t.acertos++
          porTopico.set(q.topicoId, t)
        }
      }

      // 1) Tentativa do simulado (histórico completo).
      await dbApi.addTentativa({
        questoesIds: questoes.map((q) => q.id),
        respostas,
        acertos,
        total,
        duracaoSeg,
      })

      // 2) Registros de desempenho por matéria (alimentam as Estatísticas).
      for (const [mId, v] of porMateria.entries()) {
        await dbApi.addRegistro({
          materiaId: mId,
          topicoId: null,
          total: v.total,
          acertos: v.acertos,
        })
      }
      // 3) Registros por tópico (quando houver tópico associado).
      for (const [tId, v] of porTopico.entries()) {
        await dbApi.addRegistro({
          materiaId: v.materiaId,
          topicoId: tId,
          total: v.total,
          acertos: v.acertos,
        })
      }

      onFinalizar({ acertos, total, duracaoSeg, respostas })
    } catch (e) {
      console.error(e)
      notificar('Erro ao salvar o simulado. Tente novamente.', 'erro')
      setSalvando(false)
    }
  }

  // Guarda contra um pool vazio (não deveria ocorrer, mas evita travar).
  if (!questao) {
    return (
      <EmptyState
        icon={ClipboardList}
        titulo="Simulado vazio"
        descricao="Não há questões nesta rodada."
      />
    )
  }

  const escolhido = respostas[questao.id]

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Cabeçalho fixo: cronômetro, progresso e finalizar. */}
      <div className="sticky top-0 z-10 -mx-3 bg-slate-50/90 px-3 py-2 backdrop-blur dark:bg-slate-950/90 sm:mx-0 sm:rounded-xl sm:px-3">
        <div className="flex items-center justify-between gap-2">
          <Badge cor="marca">
            <Timer size={13} /> {formatarSegundos(segundos)}
          </Badge>
          <span className="text-xs text-slate-500">
            {respondidas}/{total} respondidas
          </span>
          <Button size="sm" variant="danger" onClick={() => setConfirmarFim(true)} disabled={salvando}>
            <Flag size={15} /> Finalizar
          </Button>
        </div>
        <ProgressBar valor={respondidas} total={total} className="mt-2" />
      </div>

      {/* Grade de navegação (números das questões). */}
      <div className="flex flex-wrap gap-1.5">
        {questoes.map((q, i) => {
          const feita = respostas[q.id] != null
          const ativa = i === atual
          return (
            <button
              key={q.id}
              onClick={() => setAtual(i)}
              aria-label={`Ir para a questão ${i + 1}`}
              className={cn(
                'h-8 w-8 rounded-lg border text-xs font-semibold transition-colors',
                ativa
                  ? 'border-marca-600 bg-marca-600 text-white'
                  : feita
                    ? 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'border-slate-300 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              {i + 1}
            </button>
          )
        })}
      </div>

      {/* Questão atual. */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wide">
              Questão {atual + 1} de {total}
            </span>
            <div className="flex items-center gap-1.5">
              {questao.banca && <Badge cor="cinza">{questao.banca}</Badge>}
              {questao.dificuldade && (
                <Badge cor="cinza">{ROTULO_DIFICULDADE[questao.dificuldade]}</Badge>
              )}
            </div>
          </div>

          <p className="whitespace-pre-line text-sm text-slate-800 dark:text-slate-100">
            {questao.enunciado}
          </p>

          {/* Alternativas (radio). */}
          <ul className="space-y-2">
            {(questao.alternativas || []).map((alt, i) => {
              const selecionada = escolhido === i
              return (
                <li key={i}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors',
                      selecionada
                        ? 'border-marca-500 bg-marca-50 dark:bg-marca-900/30'
                        : 'border-slate-200 hover:border-marca-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60'
                    )}
                  >
                    <input
                      type="radio"
                      name={`questao-${questao.id}`}
                      className="mt-0.5 h-4 w-4 shrink-0 text-marca-600 focus:ring-marca-500"
                      checked={selecionada}
                      onChange={() => escolher(i)}
                    />
                    <span className="font-semibold text-slate-500">{LETRAS[i]})</span>
                    <span className="flex-1 text-slate-700 dark:text-slate-200">{alt}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </CardBody>
      </Card>

      {/* Navegação Anterior / Próxima. */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={anterior} disabled={atual === 0}>
          <ChevronLeft size={16} /> Anterior
        </Button>
        {atual < total - 1 ? (
          <Button variant="outline" onClick={proxima}>
            Próxima <ChevronRight size={16} />
          </Button>
        ) : (
          <Button variant="danger" onClick={() => setConfirmarFim(true)} disabled={salvando}>
            <Flag size={16} /> Finalizar
          </Button>
        )}
      </div>

      <ConfirmDialog
        aberto={confirmarFim}
        onFechar={() => setConfirmarFim(false)}
        onConfirmar={finalizar}
        titulo="Finalizar simulado"
        mensagem={
          naoRespondidas > 0
            ? `Você deixou ${naoRespondidas} ${naoRespondidas === 1 ? 'questão' : 'questões'} sem responder. Finalizar mesmo assim?`
            : 'Deseja finalizar e corrigir o simulado agora?'
        }
        textoConfirmar="Finalizar"
        variante="danger"
      />
    </div>
  )
}

/* ============================================================
 * TELA 3 — RESULTADO (correção)
 * ========================================================== */
function TelaResultado({ questoes, respostas, resultado, onNovoSimulado }) {
  const notificar = useNotificar()
  const materias = useLiveQuery(() => db.materias.toArray(), [], [])
  const topicos = useLiveQuery(() => db.topicos.toArray(), [], [])
  const [enviandoRevisao, setEnviandoRevisao] = useState(false)

  const { acertos, total, duracaoSeg } = resultado
  const percentual = pct(acertos, total)

  // Mapas auxiliares para exibir nomes de matéria/tópico.
  const nomeMateria = useMemo(() => {
    const m = new Map()
    materias.forEach((x) => m.set(x.id, x.nome))
    return m
  }, [materias])
  const nomeTopico = useMemo(() => {
    const m = new Map()
    topicos.forEach((x) => m.set(x.id, x.nome))
    return m
  }, [topicos])

  // Questões erradas = escolha diferente do gabarito OU em branco.
  const erradas = useMemo(
    () => questoes.filter((q) => respostas[q.id] !== q.gabarito),
    [questoes, respostas]
  )

  // Envia cada questão errada para a revisão espaçada (refTipo 'questao').
  async function enviarParaRevisao() {
    if (erradas.length === 0) {
      notificar('Nenhuma questão errada para revisar. Parabéns!', 'info')
      return
    }
    setEnviandoRevisao(true)
    try {
      for (const q of erradas) {
        const titulo = (q.enunciado || 'Questão').slice(0, 80)
        await dbApi.agendarRevisao({ refTipo: 'questao', refId: q.id, titulo })
      }
      notificar(
        `${erradas.length} ${erradas.length === 1 ? 'questão enviada' : 'questões enviadas'} para revisão.`,
        'sucesso'
      )
    } catch (e) {
      console.error(e)
      notificar('Erro ao agendar revisão.', 'erro')
    } finally {
      setEnviandoRevisao(false)
    }
  }

  // Gera flashcards (frente/verso) das erradas e exporta para o Anki.
  function gerarFlashcards() {
    if (erradas.length === 0) {
      notificar('Nenhuma questão errada para gerar flashcards.', 'info')
      return
    }
    try {
      const cards = erradas.map((q) =>
        cardDeQuestao(q, {
          materiaNome: nomeMateria.get(q.materiaId),
          topicoNome: nomeTopico.get(q.topicoId),
        })
      )
      exportarAnki(cards, 'simulado-erradas-anki.txt')
      notificar(
        `${cards.length} ${cards.length === 1 ? 'flashcard gerado' : 'flashcards gerados'} para o Anki.`,
        'sucesso'
      )
    } catch (e) {
      console.error(e)
      notificar(e.message || 'Erro ao gerar flashcards.', 'erro')
    }
  }

  // Cor do KPI de aproveitamento conforme a faixa.
  const corNota = percentual >= 70 ? '#059669' : percentual >= 50 ? '#d97706' : '#dc2626'

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Trophy size={20} className="text-marca-600" />
        <h1 className="text-lg font-semibold">Resultado do simulado</h1>
      </div>

      {/* KPIs: nota, % de acerto e tempo. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat
          icon={CheckCircle2}
          rotulo="Nota"
          valor={`${acertos}/${total}`}
          sub={`${erradas.length} ${erradas.length === 1 ? 'erro' : 'erros'}`}
          cor={corNota}
        />
        <Stat icon={Target} rotulo="Aproveitamento" valor={`${percentual}%`} cor={corNota} />
        <Stat icon={Clock} rotulo="Tempo total" valor={formatarSegundos(duracaoSeg)} cor="#2563eb" />
      </div>

      <Card>
        <CardBody>
          <ProgressBar valor={acertos} total={total} cor={corNota} mostrarTexto />
        </CardBody>
      </Card>

      {/* Ações sobre as erradas. */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          variant="outline"
          onClick={enviarParaRevisao}
          disabled={enviandoRevisao || erradas.length === 0}
        >
          {enviandoRevisao ? <Spinner label="Enviando..." /> : (
            <>
              <Send size={16} /> Enviar erradas para revisão
            </>
          )}
        </Button>
        <Button variant="outline" onClick={gerarFlashcards} disabled={erradas.length === 0}>
          <Download size={16} /> Gerar flashcards das erradas
        </Button>
      </div>

      {/* Lista de questões erradas. */}
      {erradas.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={Trophy}
              titulo="Gabaritou o simulado!"
              descricao="Você acertou todas as questões. Excelente desempenho!"
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Questões erradas ({erradas.length})
          </h2>
          {erradas.map((q, idx) => {
            const escolhido = respostas[q.id]
            const emBranco = escolhido == null
            return (
              <Card key={q.id}>
                <CardBody className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold uppercase tracking-wide">Errada #{idx + 1}</span>
                    {q.materiaId && nomeMateria.get(q.materiaId) && (
                      <Badge cor="cinza">{nomeMateria.get(q.materiaId)}</Badge>
                    )}
                  </div>

                  <p className="whitespace-pre-line text-sm text-slate-800 dark:text-slate-100">
                    {q.enunciado}
                  </p>

                  {/* Sua resposta. */}
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm dark:border-red-900 dark:bg-red-950/40">
                    <XCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
                    <div>
                      <p className="text-xs font-semibold text-red-700 dark:text-red-300">Sua resposta</p>
                      <p className="text-red-800 dark:text-red-200">
                        {emBranco
                          ? 'Em branco'
                          : `${LETRAS[escolhido]}) ${q.alternativas?.[escolhido] ?? ''}`}
                      </p>
                    </div>
                  </div>

                  {/* Gabarito correto. */}
                  <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        Gabarito
                      </p>
                      <p className="text-emerald-800 dark:text-emerald-200">
                        {q.gabarito != null
                          ? `${LETRAS[q.gabarito]}) ${q.alternativas?.[q.gabarito] ?? ''}`
                          : 'Não informado'}
                      </p>
                    </div>
                  </div>

                  {/* Comentário (quando houver). */}
                  {q.comentario && (
                    <div className="rounded-lg bg-slate-50 p-2.5 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                      <p className="mb-0.5 text-xs font-semibold text-slate-500">Comentário</p>
                      <p className="whitespace-pre-line">{q.comentario}</p>
                    </div>
                  )}
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      {/* Novo simulado. */}
      <Button className="w-full" size="lg" onClick={onNovoSimulado}>
        <RotateCcw size={18} /> Novo simulado
      </Button>
    </div>
  )
}
