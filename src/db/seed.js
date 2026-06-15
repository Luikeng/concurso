// Carga inicial (seed): no primeiro uso, lê a trilha em markdown e gera
// matérias, tópicos e tarefas. Idempotente — só roda com o banco vazio.
import { db } from './db'
import { uid, hojeISO, PALETA_MATERIAS } from '../lib/utils'
import { parseTrilha, tarefasDaTrilha } from '../services/trilhaParser'
// O arquivo da trilha fica na raiz do projeto e é importado como texto cru.
import trilhaMd from '../../trilha_diaria_trt_fase1.md?raw'
// Conteúdo de estudo (edital, resumos, questões, flashcards, vídeos).
import { EDITAL } from '../data/conteudoEdital'

// Guarda de execução única por carregamento de página. Evita que o
// double-invoke de efeitos do React 18 (StrictMode) dispare o seed duas vezes
// antes de o primeiro commit terminar (o que duplicaria as tarefas).
let seedPromise = null

/**
 * Garante a carga inicial. Se já houver matérias/tarefas, não faz nada.
 * Idempotente e seguro contra chamadas concorrentes.
 * @returns {Promise<boolean>} true se semeou agora, false se já existia.
 */
export function ensureSeed() {
  if (seedPromise) return seedPromise
  seedPromise = (async () => {
    const [qtdMaterias, qtdTarefas] = await Promise.all([
      db.materias.count(),
      db.tarefas.count(),
    ])
    if (qtdMaterias > 0 || qtdTarefas > 0) return false
    if (EDITAL.length > 0) {
      // Carga rica: edital + resumos + questões + flashcards + vídeos é a
      // ÚNICA fonte de matérias/tópicos...
      await seedConteudoEdital()
      // ...e a trilha do Plano entra apenas como TAREFAS (que referenciam
      // matéria/tópico por NOME, sem precisar de entidades próprias).
      await seedTarefasDaTrilha(trilhaMd)
    } else {
      // Fallback (conteúdo ainda não gerado): apenas a trilha (gera tudo).
      await semearDaTrilha(trilhaMd)
    }
    return true
  })()
  return seedPromise
}

/**
 * Semeia o conteúdo de estudo (matérias com vídeos, tópicos com resumo/pontos/
 * pegadinhas, questões e flashcards) a partir do dataset EDITAL.
 */
export async function seedConteudoEdital() {
  const materias = []
  const topicos = []
  const questoes = []
  const flashcards = []

  EDITAL.forEach((m, i) => {
    const materiaId = uid()
    materias.push({
      id: materiaId,
      nome: m.materia,
      cor: m.cor || PALETA_MATERIAS[i % PALETA_MATERIAS.length],
      videos: Array.isArray(m.videos) ? m.videos : [],
      ordem: i,
    })

    ;(m.topicos || []).forEach((t) => {
      const topicoId = uid()
      topicos.push({
        id: topicoId,
        materiaId,
        nome: t.nome,
        coberto: false,
        resumo: t.resumo || '',
        pontosChave: t.pontosChave || [],
        pegadinhas: t.pegadinhas || [],
        videoQuery: t.videoQuery || '',
      })

      ;(t.questoes || []).forEach((q) => {
        questoes.push({
          id: uid(),
          materiaId,
          topicoId,
          enunciado: q.enunciado || '',
          alternativas: q.alternativas || [],
          gabarito: q.gabarito ?? 0,
          comentario: q.comentario || '',
          banca: q.banca || '',
          dificuldade: q.dificuldade || 2,
          tags: [m.materia, t.nome].filter(Boolean),
          origem: 'seed',
          criadaEm: hojeISO(),
        })
      })

      ;(t.flashcards || []).forEach((fc) => {
        flashcards.push({
          id: uid(),
          materiaId,
          topicoId,
          frente: fc.frente || '',
          verso: fc.verso || '',
          tags: [m.materia, t.nome].filter(Boolean),
          origem: 'seed',
          criadoEm: hojeISO(),
        })
      })
    })
  })

  await db.transaction(
    'rw',
    db.materias,
    db.topicos,
    db.questoes,
    db.flashcards,
    async () => {
      if (materias.length) await db.materias.bulkAdd(materias)
      if (topicos.length) await db.topicos.bulkAdd(topicos)
      if (questoes.length) await db.questoes.bulkAdd(questoes)
      if (flashcards.length) await db.flashcards.bulkAdd(flashcards)
    }
  )

  return {
    materias: materias.length,
    topicos: topicos.length,
    questoes: questoes.length,
    flashcards: flashcards.length,
  }
}

/** Adiciona SOMENTE as tarefas da trilha (não cria matérias/tópicos). */
export async function seedTarefasDaTrilha(md) {
  const parsed = parseTrilha(md)
  const tarefas = tarefasDaTrilha(parsed).map((t) => ({
    id: uid(),
    semana: t.semana,
    dia: t.dia,
    materia: t.materia,
    topico: t.topico || '',
    descricao: t.descricao || '',
    recursoUrl: t.recursoUrl || '',
    metaQuestoes: t.metaQuestoes || 0,
    concluida: false,
  }))
  if (tarefas.length) await db.tarefas.bulkAdd(tarefas)
  return tarefas.length
}

/** (Re)cria matérias, tópicos e tarefas a partir de um markdown de trilha. */
export async function semearDaTrilha(md) {
  const parsed = parseTrilha(md)
  const tarefas = tarefasDaTrilha(parsed)

  // 1) Matérias distintas, na ordem de aparição.
  const nomesMaterias = []
  for (const t of tarefas) {
    if (t.materia && !nomesMaterias.includes(t.materia)) nomesMaterias.push(t.materia)
  }
  const materiaPorNome = new Map()
  const materias = nomesMaterias.map((nome, i) => {
    const m = { id: uid(), nome, cor: PALETA_MATERIAS[i % PALETA_MATERIAS.length] }
    materiaPorNome.set(nome, m)
    return m
  })

  // 2) Tópicos distintos por (matéria, tópico).
  const topicoPorChave = new Map()
  const topicos = []
  for (const t of tarefas) {
    if (!t.topico) continue
    const chave = `${t.materia}::${t.topico}`
    if (topicoPorChave.has(chave)) continue
    const materia = materiaPorNome.get(t.materia)
    const topico = {
      id: uid(),
      materiaId: materia ? materia.id : null,
      nome: t.topico,
      coberto: false,
    }
    topicoPorChave.set(chave, topico)
    topicos.push(topico)
  }

  // 3) Tarefas com referência textual de matéria/tópico (conforme o modelo).
  const registrosTarefa = tarefas.map((t) => ({
    id: uid(),
    semana: t.semana,
    dia: t.dia,
    materia: t.materia,
    topico: t.topico || '',
    descricao: t.descricao || '',
    recursoUrl: t.recursoUrl || '',
    metaQuestoes: t.metaQuestoes || 0,
    concluida: false,
  }))

  await db.transaction('rw', db.materias, db.topicos, db.tarefas, async () => {
    await db.materias.bulkAdd(materias)
    await db.topicos.bulkAdd(topicos)
    await db.tarefas.bulkAdd(registrosTarefa)
  })

  return {
    materias: materias.length,
    topicos: topicos.length,
    tarefas: registrosTarefa.length,
  }
}

/**
 * (Re)importa uma trilha a partir de texto markdown SEM apagar matérias/tópicos
 * já existentes (faz merge por nome, evitando órfãos em questões/estatísticas).
 * As TAREFAS do plano são substituídas pelas da trilha informada.
 */
export async function importarTrilhaDeTexto(md) {
  const parsed = parseTrilha(md)
  const tarefas = tarefasDaTrilha(parsed)

  const materiasExist = await db.materias.toArray()
  const matPorNome = new Map(materiasExist.map((m) => [m.nome, m]))
  let corIdx = materiasExist.length
  const novasMaterias = []
  for (const nome of [...new Set(tarefas.map((t) => t.materia).filter(Boolean))]) {
    if (!matPorNome.has(nome)) {
      const m = { id: uid(), nome, cor: PALETA_MATERIAS[corIdx++ % PALETA_MATERIAS.length] }
      matPorNome.set(nome, m)
      novasMaterias.push(m)
    }
  }

  const topicosExist = await db.topicos.toArray()
  const topKey = new Set(topicosExist.map((t) => `${t.materiaId}::${t.nome}`))
  const novosTopicos = []
  for (const t of tarefas) {
    if (!t.topico) continue
    const materia = matPorNome.get(t.materia)
    if (!materia) continue
    const key = `${materia.id}::${t.topico}`
    if (topKey.has(key)) continue
    topKey.add(key)
    novosTopicos.push({ id: uid(), materiaId: materia.id, nome: t.topico, coberto: false })
  }

  const novasTarefas = tarefas.map((t) => ({
    id: uid(),
    semana: t.semana,
    dia: t.dia,
    materia: t.materia,
    topico: t.topico || '',
    descricao: t.descricao || '',
    recursoUrl: t.recursoUrl || '',
    metaQuestoes: t.metaQuestoes || 0,
    concluida: false,
  }))

  await db.transaction('rw', db.materias, db.topicos, db.tarefas, async () => {
    await db.tarefas.clear()
    if (novasMaterias.length) await db.materias.bulkAdd(novasMaterias)
    if (novosTopicos.length) await db.topicos.bulkAdd(novosTopicos)
    await db.tarefas.bulkAdd(novasTarefas)
  })

  return {
    materias: novasMaterias.length,
    topicos: novosTopicos.length,
    tarefas: novasTarefas.length,
  }
}

/** Recarrega a trilha padrão (arquivo embutido): substitui só as tarefas. */
export async function recarregarTrilhaPadrao() {
  await db.tarefas.clear()
  const tarefas = await seedTarefasDaTrilha(trilhaMd)
  return { tarefas }
}
