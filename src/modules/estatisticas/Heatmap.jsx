import { useMemo } from 'react'
import { formatarData } from '../../lib/utils'

// Dias da semana (segunda a domingo) usados nas legendas das linhas.
const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

/**
 * Define a faixa/cor da célula a partir do valor (nº de atividades no dia).
 * 0 = cinza claro; quanto maior, mais verde/teal (estilo GitHub).
 */
function corDaCelula(valor) {
  if (valor <= 0) return 'bg-slate-100 dark:bg-slate-800'
  if (valor < 5) return 'bg-teal-200 dark:bg-teal-900'
  if (valor < 15) return 'bg-teal-300 dark:bg-teal-700'
  if (valor < 30) return 'bg-teal-400 dark:bg-teal-600'
  return 'bg-teal-600 dark:bg-teal-400'
}

/**
 * Heatmap de constância estilo GitHub.
 * Recebe `celulas` = [{data, valor}] já ordenadas (saída de stats.heatmap).
 * Renderiza uma grade de 7 linhas (dias da semana) x N colunas (semanas).
 */
export function Heatmap({ celulas = [] }) {
  // Organiza as células em colunas (semanas). Cada coluna tem 7 posições
  // (segunda a domingo). Posições sem dado ficam null.
  const { colunas, totalAtivos } = useMemo(() => {
    const cols = []
    let colAtual = []
    let ativos = 0

    celulas.forEach((c, i) => {
      // Calcula o índice do dia da semana (0 = segunda ... 6 = domingo).
      const d = new Date(c.data + 'T00:00:00')
      const idxDia = (d.getDay() + 6) % 7

      // Na primeira célula, preenche os dias anteriores da semana com vazios
      // para alinhar a grade corretamente.
      if (i === 0 && idxDia > 0) {
        for (let k = 0; k < idxDia; k++) colAtual.push(null)
      }

      colAtual.push(c)
      if (c.valor > 0) ativos++

      // Domingo encerra a coluna (semana).
      if (idxDia === 6) {
        cols.push(colAtual)
        colAtual = []
      }
    })
    if (colAtual.length > 0) cols.push(colAtual)

    return { colunas: cols, totalAtivos: ativos }
  }, [celulas])

  if (celulas.length === 0) {
    return <p className="text-sm text-slate-400">Sem dados de constância ainda.</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {/* Legendas das linhas (dias da semana) */}
        <div className="flex shrink-0 flex-col gap-1 pr-1 pt-0.5">
          {DIAS_SEMANA.map((dia, i) => (
            <span
              key={dia}
              className="h-3 text-[9px] leading-3 text-slate-400"
              // Mostra rótulo apenas em segunda, quarta e sexta para não poluir.
              style={{ visibility: i % 2 === 0 ? 'visible' : 'hidden' }}
            >
              {dia}
            </span>
          ))}
        </div>

        {/* Colunas = semanas */}
        {colunas.map((semana, ci) => (
          <div key={ci} className="flex shrink-0 flex-col gap-1">
            {Array.from({ length: 7 }).map((_, ri) => {
              const cel = semana[ri]
              if (!cel) {
                // Posição vazia (fora do intervalo de dados).
                return <div key={ri} className="h-3 w-3 rounded-sm" />
              }
              return (
                <div
                  key={ri}
                  className={`h-3 w-3 rounded-sm ${corDaCelula(cel.valor)}`}
                  title={`${formatarData(cel.data)} — ${cel.valor} atividade(s)`}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Rodapé com legenda de intensidade */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{totalAtivos} dia(s) com estudo no período</span>
        <div className="flex items-center gap-1">
          <span>Menos</span>
          <span className="h-3 w-3 rounded-sm bg-slate-100 dark:bg-slate-800" />
          <span className="h-3 w-3 rounded-sm bg-teal-200 dark:bg-teal-900" />
          <span className="h-3 w-3 rounded-sm bg-teal-300 dark:bg-teal-700" />
          <span className="h-3 w-3 rounded-sm bg-teal-400 dark:bg-teal-600" />
          <span className="h-3 w-3 rounded-sm bg-teal-600 dark:bg-teal-400" />
          <span>Mais</span>
        </div>
      </div>
    </div>
  )
}
