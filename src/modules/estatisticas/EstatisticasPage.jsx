import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Flame,
  Clock,
  ListChecks,
  Target,
  Sparkles,
  BarChart3,
  TrendingUp,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { db } from '../../db/db'
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Dot,
  Stat,
  Spinner,
  EmptyState,
} from '../../components/ui'
import { useConfig, useNotificar } from '../../store/useStore'
import { formatarData } from '../../lib/utils'
import {
  acertoPorMateria,
  acertoPorTopico,
  evolucaoTemporal,
  heatmap,
  calcularStreak,
  topicosFracos,
  resumoSemana,
  resumoTextoIA,
} from '../../services/stats'
import { analisarEstatisticasIA } from '../../services/gemini'
import { Heatmap } from './Heatmap'

/**
 * Página do módulo Estatísticas: desempenho por matéria/tópico, evolução,
 * constância (heatmap), pontos fracos e análise da IA.
 */
export function EstatisticasPage() {
  // Leitura reativa do banco (sempre com valor inicial p/ evitar undefined).
  const registros = useLiveQuery(() => db.registros.toArray(), [], [])
  const sessoes = useLiveQuery(() => db.sessoes.toArray(), [], [])
  const materias = useLiveQuery(() => db.materias.toArray(), [], [])
  const topicos = useLiveQuery(() => db.topicos.toArray(), [], [])

  const config = useConfig()
  const notificar = useNotificar()
  const metas = config.metas || {}

  // Estado da análise da IA.
  const [carregandoIA, setCarregandoIA] = useState(false)
  const [analiseIA, setAnaliseIA] = useState('')

  // Cálculos derivados (memoizados) usando SEMPRE os serviços de stats.js.
  const resumo = useMemo(() => resumoSemana(registros, sessoes, metas), [registros, sessoes, metas])
  const streak = useMemo(() => calcularStreak(registros, sessoes), [registros, sessoes])
  const porMateria = useMemo(() => acertoPorMateria(registros, materias), [registros, materias])
  const porTopico = useMemo(
    () => acertoPorTopico(registros, topicos, materias),
    [registros, topicos, materias]
  )
  const evolucao = useMemo(() => evolucaoTemporal(registros), [registros])
  const celulasHeatmap = useMemo(() => heatmap(registros, sessoes), [registros, sessoes])
  const fracos = useMemo(
    () => topicosFracos(registros, topicos, materias, 8),
    [registros, topicos, materias]
  )

  // Limita os tópicos do gráfico aos 8 com mais questões (para legibilidade).
  const topicosGrafico = useMemo(
    () => [...porTopico].sort((a, b) => b.total - a.total).slice(0, 8),
    [porTopico]
  )

  /** Dispara a análise da IA a partir do resumo textual das estatísticas. */
  async function gerarAnaliseIA() {
    if (!config.geminiApiKey) {
      notificar('Configure a chave de API do Gemini em Config para usar a análise da IA.', 'aviso')
      return
    }
    setCarregandoIA(true)
    setAnaliseIA('')
    try {
      const resumoTexto = resumoTextoIA({ registros, sessoes, materias, topicos, metas })
      const texto = await analisarEstatisticasIA({
        apiKey: config.geminiApiKey,
        model: config.geminiModel,
        resumo: resumoTexto,
      })
      setAnaliseIA(texto)
    } catch (e) {
      notificar(e.message || 'Não foi possível gerar a análise da IA.', 'erro')
    } finally {
      setCarregandoIA(false)
    }
  }

  // Estado vazio: nenhum registro de questões.
  if (registros.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        titulo="Sem estatísticas ainda"
        descricao="As estatísticas aparecem assim que você registrar questões resolvidas ou simulados. Comece praticando para acompanhar seu desempenho aqui."
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Cards-resumo (KPIs) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={Flame}
          rotulo="Sequência (streak)"
          valor={`${streak} dia${streak === 1 ? '' : 's'}`}
          sub="dias seguidos estudando"
          cor="#dc2626"
        />
        <Stat
          icon={Clock}
          rotulo="Horas na semana"
          valor={`${resumo.horasSemana.toFixed(1)}h`}
          sub={metas.horasSemana ? `meta: ${metas.horasSemana}h` : 'sem meta definida'}
          cor="#2563eb"
        />
        <Stat
          icon={ListChecks}
          rotulo="Questões na semana"
          valor={resumo.questoesSemana}
          sub={metas.questoesSemana ? `meta: ${metas.questoesSemana}` : 'sem meta definida'}
          cor="#0d9488"
        />
        <Stat
          icon={Target}
          rotulo="% médio (semana)"
          valor={`${resumo.pctMedio}%`}
          sub="acerto médio na semana"
          cor="#7c3aed"
        />
      </div>

      {/* Botão + resultado da Análise da IA */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles size={15} className="text-marca-600" /> Análise da IA
            </span>
          </CardTitle>
          <Button size="sm" onClick={gerarAnaliseIA} disabled={carregandoIA}>
            <Sparkles size={15} /> {carregandoIA ? 'Analisando...' : 'Analisar com IA'}
          </Button>
        </CardHeader>
        <CardBody>
          {carregandoIA ? (
            <Spinner label="A IA está analisando seu desempenho..." className="py-6" />
          ) : analiseIA ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {analiseIA}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              Gere um diagnóstico do seu desempenho e um plano de foco para a próxima semana,
              priorizando seus pontos fracos.
            </p>
          )}
        </CardBody>
      </Card>

      {/* % de acerto por matéria */}
      <Card>
        <CardHeader>
          <CardTitle>% de acerto por matéria</CardTitle>
        </CardHeader>
        <CardBody>
          {porMateria.length === 0 ? (
            <p className="text-sm text-slate-400">Sem dados de matérias ainda.</p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porMateria} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
                  <XAxis
                    dataKey="nome"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={56}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip
                    formatter={(v, _n, p) => [`${v}% (${p.payload.acertos}/${p.payload.total})`, 'Acerto']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                    {porMateria.map((m) => (
                      <Cell key={m.materiaId || m.nome} fill={m.cor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Acerto por tópico (top tópicos por volume de questões) */}
      <Card>
        <CardHeader>
          <CardTitle>Acerto por tópico</CardTitle>
          <span className="text-xs text-slate-400">tópicos com mais questões</span>
        </CardHeader>
        <CardBody>
          {topicosGrafico.length === 0 ? (
            <p className="text-sm text-slate-400">
              Nenhum registro vinculado a tópicos ainda. Registre questões informando o tópico para
              ver este gráfico.
            </p>
          ) : (
            <div style={{ height: Math.max(160, topicosGrafico.length * 38) }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topicosGrafico}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={120}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                  />
                  <Tooltip
                    formatter={(v, _n, p) => [`${v}% (${p.payload.acertos}/${p.payload.total})`, 'Acerto']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                    {topicosGrafico.map((t) => (
                      <Cell key={t.topicoId} fill={t.cor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Evolução no tempo */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-1.5">
              <TrendingUp size={15} className="text-marca-600" /> Evolução no tempo
            </span>
          </CardTitle>
        </CardHeader>
        <CardBody>
          {evolucao.length < 2 ? (
            <p className="text-sm text-slate-400">
              Registre questões em pelo menos dois dias diferentes para ver sua evolução.
            </p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolucao} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
                  <XAxis
                    dataKey="data"
                    tickFormatter={formatarData}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip
                    labelFormatter={formatarData}
                    formatter={(v, _n, p) => [`${v}% (${p.payload.questoes} questões)`, 'Acerto']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pct"
                    stroke="#0d9488"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Heatmap de constância */}
      <Card>
        <CardHeader>
          <CardTitle>Constância de estudos</CardTitle>
          <span className="text-xs text-slate-400">últimos meses</span>
        </CardHeader>
        <CardBody>
          <Heatmap celulas={celulasHeatmap} />
        </CardBody>
      </Card>

      {/* Tópicos para focar */}
      <Card>
        <CardHeader>
          <CardTitle>Tópicos para focar</CardTitle>
          <span className="text-xs text-slate-400">pontos fracos</span>
        </CardHeader>
        <CardBody>
          {fracos.length === 0 ? (
            <p className="text-sm text-slate-400">
              Sem tópicos com questões registradas ainda. Pratique informando o tópico para receber
              recomendações de foco.
            </p>
          ) : (
            <ol className="space-y-2">
              {fracos.map((t, i) => (
                <li
                  key={t.topicoId}
                  className="flex flex-col gap-1 rounded-lg border border-slate-100 p-3 dark:border-slate-800 sm:flex-row sm:items-start sm:gap-3"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {t.nome}
                      </span>
                      {t.materiaNome && (
                        <Badge cor="cinza" style={{ color: t.cor }}>
                          <Dot cor={t.cor} /> {t.materiaNome}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.recomendacao}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-0.5">
                    <span
                      className="text-base font-bold"
                      style={{ color: t.pct < 50 ? '#dc2626' : t.pct < 70 ? '#d97706' : '#059669' }}
                    >
                      {t.pct}%
                    </span>
                    <span className="text-xs text-slate-400">{t.total} questões</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
