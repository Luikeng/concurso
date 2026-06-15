import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Play, Pause, RotateCcw, Plus, Coffee, BrainCircuit, Timer } from 'lucide-react'
import { db, dbApi } from '../../db/db'
import { useConfig, useNotificar } from '../../store/useStore'
import {
  Card,
  CardBody,
  Button,
  Field,
  Select,
  Input,
  Badge,
  Dot,
  EmptyState,
  Modal,
} from '../../components/ui'
import { formatarSegundos } from '../../lib/utils'

/**
 * Cronômetro Pomodoro regressivo.
 * - Usa config.pomodoro = {foco, pausa, ciclos}.
 * - Antes de iniciar, o usuário escolhe a matéria da sessão.
 * - Ao terminar um bloco de FOCO: registra a sessão (dbApi.addSessao),
 *   notifica, incrementa o ciclo e troca para a PAUSA.
 * - Ao terminar a PAUSA: volta para o FOCO. Pausas não registram minutos.
 */
export function Pomodoro() {
  const config = useConfig()
  const notificar = useNotificar()
  const materias = useLiveQuery(() => db.materias.toArray(), [], [])

  // Duração (em minutos) de cada fase, vinda da config.
  const minutosFoco = Math.max(1, Number(config.pomodoro?.foco) || 25)
  const minutosPausa = Math.max(1, Number(config.pomodoro?.pausa) || 5)
  const totalCiclos = Math.max(1, Number(config.pomodoro?.ciclos) || 4)

  const [materiaId, setMateriaId] = useState('')
  const [fase, setFase] = useState('foco') // 'foco' | 'pausa'
  const [segundosRestantes, setSegundosRestantes] = useState(minutosFoco * 60)
  const [rodando, setRodando] = useState(false)
  const [cicloAtual, setCicloAtual] = useState(1)

  // Modal de sessão manual.
  const [manualAberto, setManualAberto] = useState(false)

  // Guarda o título original da aba para restaurar depois.
  const tituloOriginal = useRef(typeof document !== 'undefined' ? document.title : '')

  // Seleciona a primeira matéria automaticamente quando a lista carrega.
  useEffect(() => {
    if (!materiaId && materias.length > 0) setMateriaId(materias[0].id)
  }, [materias, materiaId])

  // Se a duração de foco mudar na config enquanto o timer está parado/em foco,
  // mantém o relógio coerente com a nova configuração.
  useEffect(() => {
    if (!rodando && fase === 'foco') setSegundosRestantes(minutosFoco * 60)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minutosFoco])

  // Cronômetro regressivo: decrementa 1s a cada segundo enquanto "rodando".
  useEffect(() => {
    if (!rodando) return
    const intervalo = setInterval(() => {
      setSegundosRestantes((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(intervalo)
  }, [rodando])

  // Detecta o fim do bloco (chegou a 0) e faz a transição de fase.
  useEffect(() => {
    if (!rodando || segundosRestantes > 0) return

    if (fase === 'foco') {
      // Bloco de foco concluído: registra a sessão da matéria escolhida.
      if (materiaId) {
        dbApi
          .addSessao({ materiaId, minutos: minutosFoco })
          .then(() => notificar('Sessão registrada', 'sucesso'))
          .catch(() => notificar('Não foi possível registrar a sessão.', 'erro'))
      }
      // Próximo ciclo e troca para a pausa.
      setCicloAtual((c) => c + 1)
      setFase('pausa')
      setSegundosRestantes(minutosPausa * 60)
    } else {
      // Pausa concluída: volta para o foco (sem registrar minutos).
      setFase('foco')
      setSegundosRestantes(minutosFoco * 60)
      notificar('Hora de focar novamente!', 'info')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segundosRestantes, rodando])

  // Avisa pelo título da aba quando o cronômetro está ativo.
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (rodando) {
      const rotulo = fase === 'foco' ? 'Foco' : 'Pausa'
      document.title = `${formatarSegundos(segundosRestantes)} • ${rotulo}`
    } else {
      document.title = tituloOriginal.current
    }
    return () => {
      document.title = tituloOriginal.current
    }
  }, [rodando, fase, segundosRestantes])

  function iniciarOuPausar() {
    if (!materiaId) {
      notificar('Escolha a matéria da sessão antes de iniciar.', 'aviso')
      return
    }
    setRodando((r) => !r)
  }

  function reiniciar() {
    setRodando(false)
    setFase('foco')
    setCicloAtual(1)
    setSegundosRestantes(minutosFoco * 60)
  }

  // Progresso (0..1) da fase atual, para o anel visual.
  const segundosFase = (fase === 'foco' ? minutosFoco : minutosPausa) * 60
  const progresso = segundosFase > 0 ? 1 - segundosRestantes / segundosFase : 0
  const corFase = fase === 'foco' ? '#0d9488' : '#d97706'

  const materiaSelecionada = materias.find((m) => m.id === materiaId)

  // Sem matérias cadastradas: não há como rodar o pomodoro.
  if (materias.length === 0) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            icon={Timer}
            titulo="Cadastre uma matéria primeiro"
            descricao="O Pomodoro registra o tempo de estudo por matéria. Adicione matérias no módulo Banco para começar."
          />
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-col items-center gap-5 py-8">
          {/* Fase atual e ciclo */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge cor={fase === 'foco' ? 'marca' : 'ambar'}>
              {fase === 'foco' ? <BrainCircuit size={12} /> : <Coffee size={12} />}
              {fase === 'foco' ? 'Foco' : 'Pausa'}
            </Badge>
            <span className="text-xs text-slate-400">
              Ciclo {Math.min(cicloAtual, totalCiclos)} de {totalCiclos}
            </span>
          </div>

          {/* Relógio grande com anel de progresso (conic-gradient sobre track) */}
          <div className="relative h-52 w-52 rounded-full bg-slate-200 dark:bg-slate-700 sm:h-60 sm:w-60">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(${corFase} ${progresso * 360}deg, transparent 0deg)`,
              }}
            />
            <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white dark:bg-slate-900">
              <span className="font-mono text-5xl font-bold tabular-nums text-slate-800 dark:text-slate-100 sm:text-6xl">
                {formatarSegundos(segundosRestantes)}
              </span>
              <span className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                {fase === 'foco' ? 'Concentração' : 'Descanso'}
              </span>
            </div>
          </div>

          {/* Seleção da matéria */}
          <div className="w-full max-w-xs">
            <Field label="Matéria da sessão">
              <Select
                value={materiaId}
                onChange={(e) => setMateriaId(e.target.value)}
                disabled={rodando}
              >
                {materias.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </Select>
            </Field>
            {materiaSelecionada && (
              <p className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <Dot cor={materiaSelecionada.cor} /> Estudando {materiaSelecionada.nome}
              </p>
            )}
          </div>

          {/* Controles */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              onClick={iniciarOuPausar}
              variant={rodando ? 'secondary' : 'primary'}
              size="lg"
            >
              {rodando ? (
                <>
                  <Pause size={18} /> Pausar
                </>
              ) : (
                <>
                  <Play size={18} /> Iniciar
                </>
              )}
            </Button>
            <Button onClick={reiniciar} variant="outline" size="lg">
              <RotateCcw size={18} /> Reiniciar
            </Button>
          </div>

          <p className="text-center text-xs text-slate-400">
            Foco de {minutosFoco} min • pausa de {minutosPausa} min. Ajuste em Configurações.
          </p>
        </CardBody>
      </Card>

      {/* Atalho para registro manual */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setManualAberto(true)}>
          <Plus size={15} /> Registrar sessão manual
        </Button>
      </div>

      {manualAberto && (
        <SessaoManualForm
          aberto={manualAberto}
          onFechar={() => setManualAberto(false)}
          materias={materias}
          materiaPadrao={materiaId}
        />
      )}
    </div>
  )
}

/** Formulário (modal) para registrar uma sessão de estudo manualmente. */
function SessaoManualForm({ aberto, onFechar, materias, materiaPadrao }) {
  const notificar = useNotificar()
  const [materiaId, setMateriaId] = useState(materiaPadrao || materias[0]?.id || '')
  const [minutos, setMinutos] = useState(25)
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!materiaId) {
      notificar('Escolha a matéria.', 'aviso')
      return
    }
    const min = Number(minutos)
    if (!min || min <= 0) {
      notificar('Informe um número de minutos válido.', 'aviso')
      return
    }
    setSalvando(true)
    try {
      await dbApi.addSessao({ materiaId, minutos: min })
      notificar('Sessão registrada', 'sucesso')
      onFechar()
    } catch {
      notificar('Não foi possível registrar a sessão.', 'erro')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo="Registrar sessão manual"
      rodape={
        <>
          <Button variant="ghost" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Registrar'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Matéria">
          <Select value={materiaId} onChange={(e) => setMateriaId(e.target.value)}>
            {materias.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Minutos estudados" hint="Tempo total dedicado a esta matéria.">
          <Input
            type="number"
            min={1}
            value={minutos}
            onChange={(e) => setMinutos(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  )
}
