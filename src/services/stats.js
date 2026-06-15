// Funções puras de estatística. Recebem arrays de entidades e devolvem dados
// prontos para gráficos/resumos. Sem efeitos colaterais.
import { pct, hojeISO, dataISO, addDias, inicioSemanaISO, diffDias } from '../lib/utils'

/** Agrupa registros por matéria: total, acertos e percentual. */
export function acertoPorMateria(registros, materias) {
  const mapa = new Map()
  for (const r of registros) {
    const k = r.materiaId || 'sem-materia'
    const cur = mapa.get(k) || { materiaId: r.materiaId, total: 0, acertos: 0 }
    cur.total += r.total
    cur.acertos += r.acertos
    mapa.set(k, cur)
  }
  return [...mapa.values()]
    .map((c) => {
      const m = materias.find((x) => x.id === c.materiaId)
      return {
        materiaId: c.materiaId,
        nome: m ? m.nome : 'Sem matéria',
        cor: m ? m.cor : '#94a3b8',
        total: c.total,
        acertos: c.acertos,
        pct: pct(c.acertos, c.total),
      }
    })
    .sort((a, b) => b.pct - a.pct)
}

/** Agrupa registros por tópico: total, acertos e percentual. */
export function acertoPorTopico(registros, topicos, materias = []) {
  const mapa = new Map()
  for (const r of registros) {
    if (!r.topicoId) continue
    const cur = mapa.get(r.topicoId) || { topicoId: r.topicoId, total: 0, acertos: 0 }
    cur.total += r.total
    cur.acertos += r.acertos
    mapa.set(r.topicoId, cur)
  }
  return [...mapa.values()]
    .map((c) => {
      const t = topicos.find((x) => x.id === c.topicoId)
      const m = t ? materias.find((x) => x.id === t.materiaId) : null
      return {
        topicoId: c.topicoId,
        nome: t ? t.nome : 'Tópico removido',
        materiaNome: m ? m.nome : '',
        cor: m ? m.cor : '#94a3b8',
        total: c.total,
        acertos: c.acertos,
        pct: pct(c.acertos, c.total),
      }
    })
    .sort((a, b) => b.pct - a.pct)
}

/** Evolução do percentual de acerto ao longo do tempo (por data). */
export function evolucaoTemporal(registros) {
  const mapa = new Map()
  for (const r of registros) {
    const cur = mapa.get(r.data) || { data: r.data, total: 0, acertos: 0 }
    cur.total += r.total
    cur.acertos += r.acertos
    mapa.set(r.data, cur)
  }
  return [...mapa.values()]
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((c) => ({ data: c.data, pct: pct(c.acertos, c.total), questoes: c.total }))
}

/**
 * Dados do heatmap de constância (estilo GitHub) para os últimos `dias` dias.
 * Conta questões feitas por dia (registros) + minutos estudados (sessões).
 */
export function heatmap(registros, sessoes = [], dias = 119) {
  const hoje = hojeISO()
  const inicio = addDias(hoje, -dias)
  const contagem = new Map()
  for (const r of registros) {
    if (r.data >= inicio && r.data <= hoje) {
      contagem.set(r.data, (contagem.get(r.data) || 0) + r.total)
    }
  }
  for (const s of sessoes) {
    if (s.data >= inicio && s.data <= hoje) {
      // cada 25 min conta como ~5 "atividades" para colorir o dia
      contagem.set(s.data, (contagem.get(s.data) || 0) + Math.round(s.minutos / 5))
    }
  }
  const celulas = []
  for (let i = 0; i <= dias; i++) {
    const d = addDias(inicio, i)
    celulas.push({ data: d, valor: contagem.get(d) || 0 })
  }
  return celulas
}

/** Calcula o streak (dias consecutivos com atividade) terminando hoje/ontem. */
export function calcularStreak(registros, sessoes = []) {
  const diasComAtividade = new Set()
  for (const r of registros) if (r.total > 0) diasComAtividade.add(r.data)
  for (const s of sessoes) if (s.minutos > 0) diasComAtividade.add(s.data)
  if (diasComAtividade.size === 0) return 0

  let streak = 0
  let cursor = hojeISO()
  // Permite que o streak conte mesmo que hoje ainda não tenha atividade (começa por ontem).
  if (!diasComAtividade.has(cursor)) cursor = addDias(cursor, -1)
  while (diasComAtividade.has(cursor)) {
    streak++
    cursor = addDias(cursor, -1)
  }
  return streak
}

/**
 * Ranking de tópicos mais fracos.
 * Regra: prioriza menor % de acerto e, em empate, menos questões feitas.
 * Inclui apenas tópicos com ao menos 1 questão registrada.
 */
export function topicosFracos(registros, topicos, materias = [], limite = 8) {
  const lista = acertoPorTopico(registros, topicos, materias).filter((t) => t.total > 0)
  lista.sort((a, b) => a.pct - b.pct || a.total - b.total)
  return lista.slice(0, limite).map((t) => ({
    ...t,
    recomendacao: recomendarFoco(t),
  }))
}

function recomendarFoco(t) {
  if (t.pct < 50) return 'Prioridade máxima: revise a teoria e refaça questões básicas.'
  if (t.pct < 70) return 'Atenção: pratique mais questões e revise os erros recorrentes.'
  if (t.total < 10) return 'Pouca prática: aumente o volume de questões para confirmar o domínio.'
  return 'Bom desempenho: mantenha com revisões espaçadas.'
}

/** Resumo da semana atual: questões, horas, % médio e streak. */
export function resumoSemana(registros, sessoes, metas = {}) {
  const inicio = inicioSemanaISO()
  const fim = addDias(inicio, 6)
  const regSemana = registros.filter((r) => r.data >= inicio && r.data <= fim)
  const sesSemana = sessoes.filter((s) => s.data >= inicio && s.data <= fim)

  const questoesSemana = regSemana.reduce((acc, r) => acc + r.total, 0)
  const acertosSemana = regSemana.reduce((acc, r) => acc + r.acertos, 0)
  const minutosSemana = sesSemana.reduce((acc, s) => acc + s.minutos, 0)

  return {
    questoesSemana,
    horasSemana: minutosSemana / 60,
    minutosSemana,
    pctMedio: pct(acertosSemana, questoesSemana),
    streak: calcularStreak(registros, sessoes),
    metaQuestoes: metas.questoesSemana || 0,
    metaHoras: metas.horasSemana || 0,
  }
}

/**
 * Monta um resumo textual das estatísticas para enviar à IA.
 * Usado tanto pelo módulo Estatísticas quanto pelo módulo IA.
 */
export function resumoTextoIA({ registros, sessoes = [], materias = [], topicos = [], metas = {} }) {
  const rs = resumoSemana(registros, sessoes, metas)
  const porMateria = acertoPorMateria(registros, materias)
  const fracos = topicosFracos(registros, topicos, materias, 8)
  const totalQuestoes = registros.reduce((a, r) => a + r.total, 0)

  const linhas = []
  linhas.push('### Visão geral')
  linhas.push(`- Total de questões registradas: ${totalQuestoes}`)
  linhas.push(`- Questões nesta semana: ${rs.questoesSemana} (meta: ${rs.metaQuestoes || '—'})`)
  linhas.push(`- Horas estudadas nesta semana: ${rs.horasSemana.toFixed(1)}h (meta: ${rs.metaHoras || '—'}h)`)
  linhas.push(`- Percentual médio na semana: ${rs.pctMedio}%`)
  linhas.push(`- Sequência (streak): ${rs.streak} dia(s)`)

  linhas.push('\n### Desempenho por matéria')
  if (porMateria.length === 0) linhas.push('- (sem dados ainda)')
  for (const m of porMateria) {
    linhas.push(`- ${m.nome}: ${m.pct}% de acerto em ${m.total} questões`)
  }

  linhas.push('\n### Tópicos mais fracos (prioridade de foco)')
  if (fracos.length === 0) linhas.push('- (sem dados ainda)')
  for (const t of fracos) {
    linhas.push(`- ${t.nome}${t.materiaNome ? ` (${t.materiaNome})` : ''}: ${t.pct}% em ${t.total} questões`)
  }
  return linhas.join('\n')
}

/** Horas/minutos de estudo por matéria na semana atual (para o módulo Sessões). */
export function horasPorMateriaSemana(sessoes, materias) {
  const inicio = inicioSemanaISO()
  const fim = addDias(inicio, 6)
  const mapa = new Map()
  for (const s of sessoes) {
    if (s.data < inicio || s.data > fim) continue
    mapa.set(s.materiaId, (mapa.get(s.materiaId) || 0) + s.minutos)
  }
  return [...mapa.entries()]
    .map(([materiaId, minutos]) => {
      const m = materias.find((x) => x.id === materiaId)
      return {
        materiaId,
        nome: m ? m.nome : 'Sem matéria',
        cor: m ? m.cor : '#94a3b8',
        minutos,
        horas: +(minutos / 60).toFixed(2),
      }
    })
    .sort((a, b) => b.minutos - a.minutos)
}
