// Parser do arquivo `trilha_diaria_trt_fase1.md`.
//
// Formato esperado:
//   ## Semana N — Título da semana
//   ### Dia N — (descrição livre opcional)
//   - Matéria | Tópico | Descrição | Recurso (opcional) | Meta de questões (opcional)
//
// Linhas fora desse padrão (cabeçalhos, citações `>`, separadores `---`) são ignoradas.

/**
 * Faz o parse do markdown da trilha.
 * @param {string} md conteúdo do arquivo .md
 * @returns {{semanas: Array<{numero:number, titulo:string, dias:Array<{numero:number, descricao:string, tarefas:Array}>}>}}
 */
export function parseTrilha(md) {
  const linhas = (md || '').split(/\r?\n/)
  const semanas = []
  let semanaAtual = null
  let diaAtual = null

  const reSemana = /^##\s+Semana\s+(\d+)\s*(?:[—\-–:]\s*(.*))?$/i
  const reDia = /^###\s+Dia\s+(\d+)\s*(?:[—\-–:]\s*(.*))?$/i
  const reTarefa = /^[-*]\s+(.*)$/

  for (const raw of linhas) {
    const linha = raw.trim()
    if (!linha) continue

    const mSemana = linha.match(reSemana)
    if (mSemana) {
      semanaAtual = {
        numero: Number(mSemana[1]),
        titulo: (mSemana[2] || `Semana ${mSemana[1]}`).trim(),
        dias: [],
      }
      semanas.push(semanaAtual)
      diaAtual = null
      continue
    }

    const mDia = linha.match(reDia)
    if (mDia && semanaAtual) {
      diaAtual = {
        numero: Number(mDia[1]),
        descricao: (mDia[2] || '').trim(),
        tarefas: [],
      }
      semanaAtual.dias.push(diaAtual)
      continue
    }

    const mTarefa = linha.match(reTarefa)
    if (mTarefa && diaAtual) {
      const tarefa = parseLinhaTarefa(mTarefa[1])
      if (tarefa) diaAtual.tarefas.push(tarefa)
    }
  }

  return { semanas }
}

/** Converte uma linha "A | B | C | D | E" em um objeto de tarefa. */
function parseLinhaTarefa(conteudo) {
  const partes = conteudo.split('|').map((p) => p.trim())
  const [materia, topico, descricao, recurso, meta] = partes
  if (!materia) return null

  const recursoLimpo = recurso && recurso !== '—' && recurso !== '-' ? recurso : ''
  const metaNum = meta ? parseInt(meta.replace(/\D/g, ''), 10) : 0

  return {
    materia,
    topico: topico || '',
    descricao: descricao || '',
    recursoUrl: recursoLimpo,
    metaQuestoes: Number.isFinite(metaNum) ? metaNum : 0,
  }
}

/** Achata a estrutura de semanas numa lista plana de tarefas (com semana/dia). */
export function tarefasDaTrilha(parsed) {
  const tarefas = []
  for (const semana of parsed.semanas) {
    for (const dia of semana.dias) {
      for (const t of dia.tarefas) {
        tarefas.push({ semana: semana.numero, dia: dia.numero, ...t })
      }
    }
  }
  return tarefas
}
