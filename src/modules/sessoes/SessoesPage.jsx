import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Clock, Timer, Target, CalendarRange } from 'lucide-react'
import { db } from '../../db/db'
import { useConfig } from '../../store/useStore'
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ProgressBar,
  EmptyState,
  Stat,
  Tabs,
  Dot,
} from '../../components/ui'
import {
  formatarMinutos,
  inicioSemanaISO,
  formatarData,
  addDias,
  pct,
} from '../../lib/utils'
import { horasPorMateriaSemana, resumoSemana } from '../../services/stats'
import { Pomodoro } from './Pomodoro'

/** Página do módulo Sessões: Pomodoro + Relatório semanal. */
export function SessoesPage() {
  return (
    <Tabs
      abas={[
        { id: 'pomodoro', label: 'Pomodoro', conteudo: <Pomodoro /> },
        { id: 'relatorio', label: 'Relatório', conteudo: <Relatorio /> },
      ]}
    />
  )
}

/** Relatório de horas de estudo da semana atual. */
function Relatorio() {
  const sessoes = useLiveQuery(() => db.sessoes.toArray(), [], [])
  const materias = useLiveQuery(() => db.materias.toArray(), [], [])
  const config = useConfig()

  // Horas/minutos por matéria nesta semana (já com a cor de cada matéria).
  const porMateria = useMemo(
    () => horasPorMateriaSemana(sessoes, materias),
    [sessoes, materias]
  )

  // Resumo da semana (usamos só as horas; registros não são necessários aqui).
  const resumo = useMemo(
    () => resumoSemana([], sessoes, config.metas),
    [sessoes, config.metas]
  )

  const metaHoras = Number(config.metas?.horasSemana) || 0
  const inicio = inicioSemanaISO()
  const fim = addDias(inicio, 6)

  // Total de minutos da semana (soma das matérias).
  const minutosSemana = porMateria.reduce((acc, m) => acc + m.minutos, 0)

  // Dados prontos para o gráfico de barras.
  const dadosGrafico = porMateria.map((m) => ({
    nome: m.nome,
    horas: m.horas,
    cor: m.cor,
    minutos: m.minutos,
  }))

  // Sem nenhuma sessão registrada na semana.
  if (porMateria.length === 0) {
    return (
      <div className="space-y-4">
        <MetaHoras
          horasSemana={resumo.horasSemana}
          metaHoras={metaHoras}
          inicio={inicio}
          fim={fim}
        />
        <Card>
          <CardBody>
            <EmptyState
              icon={Timer}
              titulo="Nenhuma sessão nesta semana"
              descricao="Use o Pomodoro ou registre uma sessão manual para ver suas horas de estudo por matéria aqui."
            />
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <MetaHoras
        horasSemana={resumo.horasSemana}
        metaHoras={metaHoras}
        inicio={inicio}
        fim={fim}
      />

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          icon={Clock}
          rotulo="Tempo na semana"
          valor={formatarMinutos(minutosSemana)}
          sub={`${resumo.horasSemana.toFixed(1)}h no total`}
          cor="#0d9488"
        />
        <Stat
          icon={Timer}
          rotulo="Matérias estudadas"
          valor={porMateria.length}
          sub="com sessões registradas"
          cor="#2563eb"
        />
        <Stat
          icon={Target}
          rotulo="Meta de horas"
          valor={metaHoras > 0 ? `${pct(resumo.horasSemana, metaHoras)}%` : '—'}
          sub={metaHoras > 0 ? `de ${metaHoras}h` : 'sem meta definida'}
          cor="#d97706"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* Gráfico de horas por matéria */}
      <Card>
        <CardHeader>
          <CardTitle>Horas por matéria</CardTitle>
          <span className="text-xs text-slate-400">esta semana</span>
        </CardHeader>
        <CardBody>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dadosGrafico}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
                <XAxis
                  dataKey="nome"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  allowDecimals
                  unit="h"
                />
                <Tooltip content={<TooltipGrafico />} cursor={{ fill: '#94a3b822' }} />
                <Bar dataKey="horas" radius={[6, 6, 0, 0]} maxBarSize={56}>
                  {dadosGrafico.map((d) => (
                    <Cell key={d.nome} fill={d.cor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      {/* Lista detalhada por matéria */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento</CardTitle>
        </CardHeader>
        <CardBody className="pt-0">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {porMateria.map((m) => (
              <li key={m.materiaId || m.nome} className="flex items-center gap-2 py-2.5">
                <Dot cor={m.cor} />
                <span className="flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
                  {m.nome}
                </span>
                <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                  {formatarMinutos(m.minutos)}
                </span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  )
}

/** Card de meta de horas da semana (horasSemana vs metas.horasSemana). */
function MetaHoras({ horasSemana, metaHoras, inicio, fim }) {
  const percentual = metaHoras > 0 ? pct(horasSemana, metaHoras) : 0
  const atingiu = metaHoras > 0 && horasSemana >= metaHoras

  return (
    <Card>
      <CardBody>
        <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-400">
          <CalendarRange size={13} />
          Semana de {formatarData(inicio)} a {formatarData(fim)}
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Meta de horas
            </p>
            <p className="text-xs text-slate-400">
              {horasSemana.toFixed(1)}h
              {metaHoras > 0 ? ` de ${metaHoras}h` : ' estudadas (sem meta definida)'}
            </p>
          </div>
          {metaHoras > 0 && (
            <span
              className={`text-2xl font-bold ${
                atingiu ? 'text-emerald-500' : 'text-marca-600'
              }`}
            >
              {percentual}%
            </span>
          )}
        </div>
        {metaHoras > 0 && (
          <ProgressBar
            percentual={percentual}
            cor={atingiu ? '#10b981' : '#0d9488'}
            className="mt-3"
          />
        )}
        {atingiu && (
          <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Meta da semana atingida! Continue assim.
          </p>
        )}
      </CardBody>
    </Card>
  )
}

/** Tooltip customizado do gráfico (compatível com tema claro/escuro). */
function TooltipGrafico({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null
  const dado = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-800">
      <p className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-100">
        <Dot cor={dado.cor} /> {dado.nome}
      </p>
      <p className="mt-0.5 text-slate-500 dark:text-slate-300">
        {formatarMinutos(dado.minutos)} ({dado.horas.toFixed(1)}h)
      </p>
    </div>
  )
}
