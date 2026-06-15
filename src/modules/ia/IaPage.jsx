// Módulo "IA": assistente baseado no Google Gemini.
// Cinco ações em abas: gerar questões, explicar, flashcards, examinador (quiz)
// e análise de pontos fracos. A chave de API e o modelo vêm de useConfig().
// Toda chamada à IA exige internet e a chave configurada em Config.
import { useState, useRef, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  Settings,
  Wand2,
  CheckCircle2,
  Save,
  BookOpen,
  Layers,
  GraduationCap,
  BarChart3,
  Send,
  RotateCcw,
  Download,
  Loader2,
} from 'lucide-react'
import { db, dbApi } from '../../db/db'
import { useConfig, useNotificar } from '../../store/useStore'
import {
  Card,
  CardBody,
  Button,
  Badge,
  Field,
  Input,
  Select,
  Textarea,
  EmptyState,
  Spinner,
  Tabs,
} from '../../components/ui'
import {
  gerarQuestoesIA,
  gerarFlashcardsIA,
  explicarIA,
  analisarEstatisticasIA,
  chamarGemini,
} from '../../services/gemini'
import { cardDeIA } from '../../services/flashcards'
import { exportarAnki, PASSOS_IMPORTACAO_ANKI } from '../../services/anki'
import { resumoTextoIA } from '../../services/stats'
import { cn, ROTULO_DIFICULDADE } from '../../lib/utils'

const LETRAS = 'ABCDE'.split('')

/** Página principal do módulo IA. */
export function IaPage() {
  const config = useConfig()
  const apiKey = config?.geminiApiKey || ''
  const model = config?.geminiModel || 'gemini-2.0-flash'
  const temChave = !!apiKey.trim()

  return (
    <div className="space-y-4">
      {/* Aviso quando a chave não está configurada. */}
      {!temChave && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
          <CardBody>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <AlertTriangle className="shrink-0 text-amber-500" size={20} />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  Chave de API do Gemini não configurada
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300/90">
                  As ações de IA só funcionam com uma chave válida. Configure-a na aba Config
                  para começar a gerar questões, flashcards e explicações.
                </p>
              </div>
              <Link to="/config" className="shrink-0">
                <Button variant="outline" size="sm">
                  <Settings size={15} /> Ir para Config
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Aviso de privacidade, sempre visível. */}
      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
        <ShieldCheck size={15} className="mt-0.5 shrink-0 text-marca-500" />
        <span>
          A chave fica só no seu navegador. Não cole dados sensíveis nas mensagens.
        </span>
      </div>

      <Tabs
        abas={[
          { id: 'questoes', label: 'Gerar questões', conteudo: <GerarQuestoes apiKey={apiKey} model={model} /> },
          { id: 'explicar', label: 'Explicar', conteudo: <Explicar apiKey={apiKey} model={model} /> },
          { id: 'flashcards', label: 'Flashcards', conteudo: <Flashcards apiKey={apiKey} model={model} /> },
          { id: 'examinador', label: 'Examinador (quiz)', conteudo: <Examinador apiKey={apiKey} model={model} /> },
          { id: 'analise', label: 'Análise de pontos fracos', conteudo: <Analise apiKey={apiKey} model={model} /> },
        ]}
      />
    </div>
  )
}

/** Garante que a chave existe antes de uma ação; notifica caso contrário. */
function exigirChave(apiKey, notificar) {
  if (!apiKey || !apiKey.trim()) {
    notificar('Configure a chave de API do Gemini em Config.', 'aviso')
    return false
  }
  return true
}

/** Bloco padrão para exibir o erro de uma ação. */
function MensagemErro({ erro }) {
  if (!erro) return null
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span>{erro}</span>
    </div>
  )
}

// ----------------------------------------------------------------------------
// (a) Gerar questões
// ----------------------------------------------------------------------------
function GerarQuestoes({ apiKey, model }) {
  const notificar = useNotificar()
  const materias = useLiveQuery(() => db.materias.toArray(), [], [])
  const topicos = useLiveQuery(() => db.topicos.toArray(), [], [])

  const [form, setForm] = useState({
    materia: '',
    topico: '',
    quantidade: 5,
    dificuldade: 2,
    banca: 'FCC',
  })
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [preview, setPreview] = useState([])

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  async function gerar() {
    if (!exigirChave(apiKey, notificar)) return
    if (!form.materia.trim() || !form.topico.trim()) {
      notificar('Informe a matéria e o tópico.', 'aviso')
      return
    }
    setCarregando(true)
    setErro('')
    setPreview([])
    try {
      const questoes = await gerarQuestoesIA({
        apiKey,
        model,
        materia: form.materia.trim(),
        topico: form.topico.trim(),
        quantidade: Number(form.quantidade) || 5,
        dificuldade: Number(form.dificuldade) || 2,
        banca: form.banca.trim() || 'FCC',
      })
      if (questoes.length === 0) {
        setErro('A IA não retornou questões. Tente novamente ou ajuste o pedido.')
      } else {
        setPreview(questoes)
        notificar(`${questoes.length} questão(ões) gerada(s).`, 'sucesso')
      }
    } catch (e) {
      setErro(e.message)
      notificar(e.message, 'erro')
    } finally {
      setCarregando(false)
    }
  }

  // Resolve materiaId/topicoId quando o nome casar com o banco (case-insensitive).
  function resolverIds(materiaNome, topicoNome) {
    const m = materias.find(
      (x) => x.nome.trim().toLowerCase() === materiaNome.trim().toLowerCase()
    )
    const materiaId = m ? m.id : null
    let topicoId = null
    if (topicoNome) {
      const t = topicos.find(
        (x) =>
          x.nome.trim().toLowerCase() === topicoNome.trim().toLowerCase() &&
          (!materiaId || x.materiaId === materiaId)
      )
      topicoId = t ? t.id : null
    }
    return { materiaId, topicoId }
  }

  async function salvar() {
    if (preview.length === 0) return
    setSalvando(true)
    setErro('')
    try {
      const { materiaId, topicoId } = resolverIds(form.materia, form.topico)
      const lista = preview.map((q) => ({
        materiaId,
        topicoId,
        enunciado: q.enunciado,
        alternativas: q.alternativas,
        gabarito: q.gabarito,
        comentario: q.comentario,
        banca: q.banca || form.banca,
        dificuldade: q.dificuldade,
        tags: q.tags,
        origem: 'ia',
      }))
      const ids = await dbApi.addQuestoes(lista)
      notificar(`${ids.length} questão(ões) salva(s) no banco.`, 'sucesso')
      setPreview([])
    } catch (e) {
      setErro(e.message)
      notificar(e.message, 'erro')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Matéria">
              <Input
                list="ia-materias"
                value={form.materia}
                onChange={set('materia')}
                placeholder="Ex.: Língua Portuguesa"
              />
              <datalist id="ia-materias">
                {materias.map((m) => (
                  <option key={m.id} value={m.nome} />
                ))}
              </datalist>
            </Field>
            <Field label="Tópico">
              <Input
                list="ia-topicos"
                value={form.topico}
                onChange={set('topico')}
                placeholder="Ex.: Crase"
              />
              <datalist id="ia-topicos">
                {topicos.map((t) => (
                  <option key={t.id} value={t.nome} />
                ))}
              </datalist>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Quantidade">
              <Input type="number" min={1} max={20} value={form.quantidade} onChange={set('quantidade')} />
            </Field>
            <Field label="Dificuldade">
              <Select value={form.dificuldade} onChange={set('dificuldade')}>
                <option value={1}>{ROTULO_DIFICULDADE?.[1] || 'Fácil'}</option>
                <option value={2}>{ROTULO_DIFICULDADE?.[2] || 'Médio'}</option>
                <option value={3}>{ROTULO_DIFICULDADE?.[3] || 'Difícil'}</option>
              </Select>
            </Field>
            <Field label="Banca">
              <Input value={form.banca} onChange={set('banca')} placeholder="FCC" />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button onClick={gerar} disabled={carregando || salvando}>
              {carregando ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              {carregando ? 'Gerando...' : 'Gerar questões'}
            </Button>
          </div>
        </CardBody>
      </Card>

      <MensagemErro erro={erro} />

      {carregando && <Spinner label="Gerando questões com a IA..." className="py-6" />}

      {!carregando && preview.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Pré-visualização ({preview.length})
            </p>
            <Button onClick={salvar} variant="success" disabled={salvando}>
              {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {salvando ? 'Salvando...' : 'Salvar no banco'}
            </Button>
          </div>

          {preview.map((q, i) => (
            <Card key={i}>
              <CardBody className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-slate-400">{i + 1}.</span>
                  <p className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">{q.enunciado}</p>
                </div>
                <ul className="space-y-1">
                  {q.alternativas.map((alt, j) => {
                    const certa = j === q.gabarito
                    return (
                      <li
                        key={j}
                        className={cn(
                          'flex items-start gap-2 rounded-md px-2 py-1 text-sm',
                          certa
                            ? 'bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'text-slate-600 dark:text-slate-300'
                        )}
                      >
                        <span className="shrink-0">{LETRAS[j]})</span>
                        <span className="flex-1">{alt}</span>
                        {certa && <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" />}
                      </li>
                    )
                  })}
                </ul>
                {q.comentario && (
                  <p className="rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                    <span className="font-semibold">Comentário: </span>
                    {q.comentario}
                  </p>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {!carregando && preview.length === 0 && !erro && (
        <EmptyState
          icon={Sparkles}
          titulo="Nenhuma questão gerada ainda"
          descricao="Preencha matéria e tópico e clique em Gerar questões para ver a pré-visualização."
        />
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// (b) Explicar
// ----------------------------------------------------------------------------
function Explicar({ apiKey, model }) {
  const notificar = useNotificar()
  const [assunto, setAssunto] = useState('')
  const [contexto, setContexto] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [resposta, setResposta] = useState('')

  async function explicar() {
    if (!exigirChave(apiKey, notificar)) return
    if (!assunto.trim()) {
      notificar('Informe o assunto a explicar.', 'aviso')
      return
    }
    setCarregando(true)
    setErro('')
    setResposta('')
    try {
      const texto = await explicarIA({
        apiKey,
        model,
        assunto: assunto.trim(),
        contexto: contexto.trim(),
      })
      setResposta(texto)
    } catch (e) {
      setErro(e.message)
      notificar(e.message, 'erro')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-3">
          <Field label="Assunto">
            <Textarea
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder="Ex.: Regência verbal — verbos que mudam de sentido"
            />
          </Field>
          <Field label="Contexto ou erro (opcional)" hint="Descreva o que não entendeu ou onde errou.">
            <Textarea
              value={contexto}
              onChange={(e) => setContexto(e.target.value)}
              placeholder="Ex.: Errei uma questão que dizia 'assistir o filme' x 'assistir ao filme'."
            />
          </Field>
          <div className="flex justify-end">
            <Button onClick={explicar} disabled={carregando}>
              {carregando ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
              {carregando ? 'Explicando...' : 'Explicar'}
            </Button>
          </div>
        </CardBody>
      </Card>

      <MensagemErro erro={erro} />

      {carregando && <Spinner label="Preparando a explicação..." className="py-6" />}

      {!carregando && resposta && (
        <Card>
          <CardBody>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {resposta}
            </p>
          </CardBody>
        </Card>
      )}

      {!carregando && !resposta && !erro && (
        <EmptyState
          icon={BookOpen}
          titulo="Sua explicação aparecerá aqui"
          descricao="Descreva o assunto (e opcionalmente o seu erro) para receber uma explicação didática."
        />
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// (c) Flashcards
// ----------------------------------------------------------------------------
function Flashcards({ apiKey, model }) {
  const notificar = useNotificar()
  const materias = useLiveQuery(() => db.materias.toArray(), [], [])
  const topicos = useLiveQuery(() => db.topicos.toArray(), [], [])

  const [form, setForm] = useState({ materia: '', topico: '', quantidade: 8 })
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [preview, setPreview] = useState([])

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  async function gerar() {
    if (!exigirChave(apiKey, notificar)) return
    if (!form.materia.trim() || !form.topico.trim()) {
      notificar('Informe a matéria e o tópico.', 'aviso')
      return
    }
    setCarregando(true)
    setErro('')
    setPreview([])
    try {
      const cards = await gerarFlashcardsIA({
        apiKey,
        model,
        materia: form.materia.trim(),
        topico: form.topico.trim(),
        quantidade: Number(form.quantidade) || 8,
      })
      if (cards.length === 0) {
        setErro('A IA não retornou flashcards. Tente novamente.')
      } else {
        setPreview(cards)
        notificar(`${cards.length} flashcard(s) gerado(s).`, 'sucesso')
      }
    } catch (e) {
      setErro(e.message)
      notificar(e.message, 'erro')
    } finally {
      setCarregando(false)
    }
  }

  function exportar() {
    if (preview.length === 0) return
    try {
      // Normaliza cada card da IA para o formato padrão e exporta para o Anki.
      const cards = preview.map((c) =>
        cardDeIA(c, [form.materia.trim(), form.topico.trim()].filter(Boolean))
      )
      exportarAnki(cards)
      notificar('Arquivo do Anki baixado.', 'sucesso')
    } catch (e) {
      setErro(e.message)
      notificar(e.message, 'erro')
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Matéria">
              <Input
                list="ia-fc-materias"
                value={form.materia}
                onChange={set('materia')}
                placeholder="Ex.: Direito Constitucional"
              />
              <datalist id="ia-fc-materias">
                {materias.map((m) => (
                  <option key={m.id} value={m.nome} />
                ))}
              </datalist>
            </Field>
            <Field label="Tópico">
              <Input
                list="ia-fc-topicos"
                value={form.topico}
                onChange={set('topico')}
                placeholder="Ex.: Direitos fundamentais"
              />
              <datalist id="ia-fc-topicos">
                {topicos.map((t) => (
                  <option key={t.id} value={t.nome} />
                ))}
              </datalist>
            </Field>
            <Field label="Quantidade">
              <Input type="number" min={1} max={30} value={form.quantidade} onChange={set('quantidade')} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button onClick={gerar} disabled={carregando}>
              {carregando ? <Loader2 size={16} className="animate-spin" /> : <Layers size={16} />}
              {carregando ? 'Gerando...' : 'Gerar flashcards'}
            </Button>
          </div>
        </CardBody>
      </Card>

      <MensagemErro erro={erro} />

      {carregando && <Spinner label="Gerando flashcards..." className="py-6" />}

      {!carregando && preview.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Pré-visualização ({preview.length})
            </p>
            <Button onClick={exportar} variant="outline">
              <Download size={16} /> Exportar para Anki
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {preview.map((c, i) => (
              <Card key={i}>
                <CardBody className="space-y-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Frente</p>
                    <p className="text-sm text-slate-700 dark:text-slate-200">{c.frente}</p>
                  </div>
                  <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Verso</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{c.verso}</p>
                  </div>
                  {Array.isArray(c.tags) && c.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t, j) => (
                        <Badge key={j} cor="cinza">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Passo a passo de importação no Anki. */}
          <Card>
            <CardBody>
              <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Como importar no Anki
              </p>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
                {PASSOS_IMPORTACAO_ANKI.map((passo, i) => (
                  <li key={i}>{passo}</li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>
      )}

      {!carregando && preview.length === 0 && !erro && (
        <EmptyState
          icon={Layers}
          titulo="Nenhum flashcard gerado ainda"
          descricao="Gere flashcards de um tópico e exporte-os prontos para o Anki."
        />
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// (d) Examinador (quiz) — modo conversa
// ----------------------------------------------------------------------------
const SYSTEM_EXAMINADOR =
  'Você é um examinador de concursos públicos para o TRT (Analista Judiciário). ' +
  'Conduza uma sabatina em português do Brasil fazendo UMA pergunta por vez sobre as ' +
  'matérias do edital. Espere a resposta do candidato; então avalie de forma breve ' +
  '(se acertou, errou ou parcialmente), corrija o que for necessário e, em seguida, ' +
  'faça a PRÓXIMA pergunta. Nunca faça mais de uma pergunta por mensagem. Seja direto ' +
  'e objetivo. Comece se apresentando rapidamente e fazendo a primeira pergunta.'

function Examinador({ apiKey, model }) {
  const notificar = useNotificar()
  // Histórico simples: [{ de: 'ia' | 'voce', texto }]
  const [historico, setHistorico] = useState([])
  const [resposta, setResposta] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const fimRef = useRef(null)

  // Rola para a última mensagem sempre que o histórico muda.
  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [historico])

  // Monta o prompt incluindo todo o histórico da conversa.
  function montarPrompt(hist, proximaResposta) {
    const linhas = hist.map((m) => `${m.de === 'ia' ? 'Examinador' : 'Candidato'}: ${m.texto}`)
    if (proximaResposta) linhas.push(`Candidato: ${proximaResposta}`)
    const corpo = linhas.join('\n')
    return hist.length === 0
      ? 'Inicie a sabatina: apresente-se em uma frase e faça a primeira pergunta.'
      : `Conversa até agora:\n${corpo}\n\nAvalie a última resposta do candidato e faça a próxima pergunta.`
  }

  async function enviarParaIA(histAtual, respostaUsuario) {
    setCarregando(true)
    setErro('')
    try {
      const texto = await chamarGemini({
        apiKey,
        model,
        prompt: montarPrompt(histAtual, respostaUsuario),
        systemPrompt: SYSTEM_EXAMINADOR,
        temperatura: 0.7,
      })
      setHistorico((h) => [...h, { de: 'ia', texto }])
    } catch (e) {
      setErro(e.message)
      notificar(e.message, 'erro')
    } finally {
      setCarregando(false)
    }
  }

  async function iniciar() {
    if (!exigirChave(apiKey, notificar)) return
    setHistorico([])
    await enviarParaIA([], '')
  }

  async function enviar() {
    if (!exigirChave(apiKey, notificar)) return
    const texto = resposta.trim()
    if (!texto) {
      notificar('Escreva uma resposta antes de enviar.', 'aviso')
      return
    }
    const histComResposta = [...historico, { de: 'voce', texto }]
    setHistorico(histComResposta)
    setResposta('')
    await enviarParaIA(histComResposta, '')
  }

  function reiniciar() {
    setHistorico([])
    setResposta('')
    setErro('')
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          {historico.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              titulo="Sabatina com examinador do TRT"
              descricao="A IA faz uma pergunta por vez, avalia sua resposta e segue para a próxima. Comece quando quiser."
              acao={
                <Button onClick={iniciar} disabled={carregando}>
                  {carregando ? <Loader2 size={16} className="animate-spin" /> : <GraduationCap size={16} />}
                  {carregando ? 'Iniciando...' : 'Iniciar sabatina'}
                </Button>
              }
            />
          ) : (
            <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
              {historico.map((m, i) => (
                <div
                  key={i}
                  className={cn('flex', m.de === 'voce' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm',
                      m.de === 'voce'
                        ? 'bg-marca-600 text-white'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    )}
                  >
                    <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide opacity-70">
                      {m.de === 'voce' ? 'Você' : 'Examinador'}
                    </span>
                    {m.texto}
                  </div>
                </div>
              ))}
              {carregando && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 size={15} className="animate-spin" /> Examinador pensando...
                </div>
              )}
              <div ref={fimRef} />
            </div>
          )}
        </CardBody>
      </Card>

      <MensagemErro erro={erro} />

      {historico.length > 0 && (
        <Card>
          <CardBody className="space-y-3">
            <Field label="Sua resposta">
              <Textarea
                value={resposta}
                onChange={(e) => setResposta(e.target.value)}
                placeholder="Digite sua resposta para a pergunta atual..."
                disabled={carregando}
              />
            </Field>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={reiniciar} disabled={carregando}>
                <RotateCcw size={16} /> Reiniciar
              </Button>
              <Button onClick={enviar} disabled={carregando}>
                {carregando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Enviar
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// (e) Análise de pontos fracos
// ----------------------------------------------------------------------------
function Analise({ apiKey, model }) {
  const notificar = useNotificar()
  const config = useConfig()
  const registros = useLiveQuery(() => db.registros.toArray(), [], [])
  const sessoes = useLiveQuery(() => db.sessoes.toArray(), [], [])
  const materias = useLiveQuery(() => db.materias.toArray(), [], [])
  const topicos = useLiveQuery(() => db.topicos.toArray(), [], [])

  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState('')

  // Resumo textual das estatísticas (também exibido para transparência).
  const resumo = useMemo(
    () =>
      resumoTextoIA({
        registros,
        sessoes,
        materias,
        topicos,
        metas: config?.metas || {},
      }),
    [registros, sessoes, materias, topicos, config]
  )

  const semDados = registros.length === 0

  async function analisar() {
    if (!exigirChave(apiKey, notificar)) return
    if (semDados) {
      notificar('Registre algumas questões antes de pedir a análise.', 'aviso')
      return
    }
    setCarregando(true)
    setErro('')
    setResultado('')
    try {
      const texto = await analisarEstatisticasIA({ apiKey, model, resumo })
      setResultado(texto)
    } catch (e) {
      setErro(e.message)
      notificar(e.message, 'erro')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            A IA analisa seu desempenho (matérias, tópicos fracos e metas) e sugere um plano de foco
            para a próxima semana.
          </p>
          {/* Resumo que será enviado à IA (transparência). */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Resumo enviado à IA
            </p>
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap text-xs text-slate-500 dark:text-slate-400">
              {resumo}
            </pre>
          </div>
          <div className="flex justify-end">
            <Button onClick={analisar} disabled={carregando || semDados}>
              {carregando ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />}
              {carregando ? 'Analisando...' : 'Analisar pontos fracos'}
            </Button>
          </div>
        </CardBody>
      </Card>

      {semDados && (
        <EmptyState
          icon={BarChart3}
          titulo="Sem dados de desempenho"
          descricao="Resolva questões nos módulos de Banco/Simulado para gerar estatísticas e habilitar a análise."
        />
      )}

      <MensagemErro erro={erro} />

      {carregando && <Spinner label="Analisando seu desempenho..." className="py-6" />}

      {!carregando && resultado && (
        <Card>
          <CardBody>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {resultado}
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
