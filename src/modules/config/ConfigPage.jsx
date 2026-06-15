import { useState } from 'react'
import {
  Sparkles,
  Eye,
  EyeOff,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Palette,
  Sun,
  Moon,
  Target,
  Timer,
} from 'lucide-react'
import {
  useStore,
  useConfig,
  useNotificar,
} from '../../store/useStore'
import { MODELOS_GEMINI, chamarGemini } from '../../services/gemini'
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Button,
  Field,
  Input,
  Select,
  Badge,
  Spinner,
} from '../../components/ui'
import { cn } from '../../lib/utils'

/**
 * Página de Configurações.
 * Reúne os ajustes gerais do app: chave/modelo de IA (Gemini), aparência
 * (tema claro/escuro), metas semanais e parâmetros do pomodoro.
 *
 * Tudo é salvo IMEDIATAMENTE no store (Zustand), que persiste sozinho no
 * localStorage — por isso não há botão "Salvar" global. Apenas ações pontuais
 * (como testar a chave) dão feedback via toast.
 */
export function ConfigPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <SecaoIA />
      <SecaoAparencia />
      <SecaoMetas />
      <SecaoPomodoro />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 1) Inteligência Artificial (Gemini)                                 */
/* ------------------------------------------------------------------ */

function SecaoIA() {
  const config = useConfig()
  const setConfig = useStore((s) => s.setConfig)
  const notificar = useNotificar()

  const [mostrarChave, setMostrarChave] = useState(false)
  const [testando, setTestando] = useState(false)

  // Salva a chave a cada digitação (persistência automática via store).
  const aoMudarChave = (e) => setConfig({ geminiApiKey: e.target.value })
  const aoMudarModelo = (e) => setConfig({ geminiModel: e.target.value })

  // Testa a chave atual fazendo uma chamada mínima ao Gemini.
  async function testarChave() {
    if (!config.geminiApiKey?.trim()) {
      notificar('Informe a chave de API antes de testar.', 'aviso')
      return
    }
    setTestando(true)
    try {
      await chamarGemini({
        apiKey: config.geminiApiKey,
        model: config.geminiModel,
        prompt: 'Responda apenas: OK',
      })
      notificar('Chave válida! A IA respondeu com sucesso.', 'sucesso')
    } catch (e) {
      // A mensagem já vem amigável do serviço.
      notificar(e.message || 'Não foi possível validar a chave.', 'erro')
    } finally {
      setTestando(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Sparkles size={16} className="text-marca-600" />
            Inteligência Artificial (Gemini)
          </span>
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        {/* Aviso de segurança da chave */}
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>
            A chave é guardada SOMENTE no seu navegador (localStorage). Não
            compartilhe este dispositivo e não cole dados sensíveis nas conversas
            com a IA.
          </p>
        </div>

        {/* Campo da chave de API */}
        <Field
          label="Chave de API"
          hint="A chave fica salva no navegador e é usada apenas nas chamadas à IA."
        >
          <div className="relative">
            <Input
              type={mostrarChave ? 'text' : 'password'}
              value={config.geminiApiKey}
              onChange={aoMudarChave}
              placeholder="Cole aqui sua chave do Gemini"
              autoComplete="off"
              spellCheck={false}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setMostrarChave((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-marca-600"
              aria-label={mostrarChave ? 'Ocultar chave' : 'Mostrar chave'}
              title={mostrarChave ? 'Ocultar chave' : 'Mostrar chave'}
            >
              {mostrarChave ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>

        {/* Link para obter a chave */}
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-marca-600 hover:underline"
        >
          <ExternalLink size={12} /> Como obter a chave grátis no Google AI Studio
        </a>

        {/* Seleção do modelo */}
        <Field label="Modelo">
          <Select value={config.geminiModel} onChange={aoMudarModelo}>
            {MODELOS_GEMINI.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </Select>
        </Field>

        {/* Botão de teste */}
        <div className="flex items-center justify-end">
          <Button variant="outline" onClick={testarChave} disabled={testando}>
            {testando ? (
              <Spinner label="Testando..." />
            ) : (
              <>
                <CheckCircle2 size={16} /> Testar chave
              </>
            )}
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* 2) Aparência (tema claro/escuro)                                    */
/* ------------------------------------------------------------------ */

function SecaoAparencia() {
  const config = useConfig()
  const setConfig = useStore((s) => s.setConfig)

  const opcoes = [
    { id: 'light', rotulo: 'Claro', icone: Sun },
    { id: 'dark', rotulo: 'Escuro', icone: Moon },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Palette size={16} className="text-marca-600" />
            Aparência
          </span>
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <Field label="Tema" hint="Escolha entre o modo claro e o modo escuro.">
          {/* Botões segmentados de tema */}
          <div className="inline-flex w-full overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700 sm:w-auto">
            {opcoes.map((op, i) => {
              const ativo = config.tema === op.id
              const Icone = op.icone
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setConfig({ tema: op.id })}
                  aria-pressed={ativo}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors sm:flex-none',
                    i > 0 && 'border-l border-slate-300 dark:border-slate-700',
                    ativo
                      ? 'bg-marca-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                  )}
                >
                  <Icone size={16} />
                  {op.rotulo}
                </button>
              )
            })}
          </div>
        </Field>
        <p className="text-xs text-slate-400">
          Tema ativo:{' '}
          <Badge cor="marca">
            {config.tema === 'dark' ? (
              <>
                <Moon size={11} /> Escuro
              </>
            ) : (
              <>
                <Sun size={11} /> Claro
              </>
            )}
          </Badge>
        </p>
      </CardBody>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* 3) Metas semanais                                                   */
/* ------------------------------------------------------------------ */

function SecaoMetas() {
  const config = useConfig()
  const setMetas = useStore((s) => s.setMetas)

  // Garante números válidos (>= 0) ao salvar.
  const aoMudar = (campo) => (e) => {
    const valor = Math.max(0, Number(e.target.value) || 0)
    setMetas({ [campo]: valor })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Target size={16} className="text-marca-600" />
            Metas semanais
          </span>
        </CardTitle>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Questões por semana">
            <Input
              type="number"
              min={0}
              value={config.metas.questoesSemana}
              onChange={aoMudar('questoesSemana')}
            />
          </Field>
          <Field label="Horas por semana">
            <Input
              type="number"
              min={0}
              value={config.metas.horasSemana}
              onChange={aoMudar('horasSemana')}
            />
          </Field>
        </div>
      </CardBody>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* 4) Pomodoro                                                         */
/* ------------------------------------------------------------------ */

function SecaoPomodoro() {
  const config = useConfig()
  const setPomodoro = useStore((s) => s.setPomodoro)

  // Mínimo 1 para foco/pausa/ciclos (valores em minutos / quantidade).
  const aoMudar = (campo) => (e) => {
    const valor = Math.max(1, Number(e.target.value) || 1)
    setPomodoro({ [campo]: valor })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Timer size={16} className="text-marca-600" />
            Pomodoro
          </span>
        </CardTitle>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Foco (min)">
            <Input
              type="number"
              min={1}
              value={config.pomodoro.foco}
              onChange={aoMudar('foco')}
            />
          </Field>
          <Field label="Pausa (min)">
            <Input
              type="number"
              min={1}
              value={config.pomodoro.pausa}
              onChange={aoMudar('pausa')}
            />
          </Field>
          <Field label="Ciclos">
            <Input
              type="number"
              min={1}
              value={config.pomodoro.ciclos}
              onChange={aoMudar('ciclos')}
            />
          </Field>
        </div>
      </CardBody>
    </Card>
  )
}
