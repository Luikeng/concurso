// Banco local (IndexedDB via Dexie). É a fonte de verdade das entidades.
// Leituras reativas nos componentes: use `useLiveQuery` apontando para `db.<tabela>`.
// Escritas: prefira os helpers de `dbApi` (padronizam SRS, registros, etc.).
import Dexie from 'dexie'
import { uid, hojeISO } from '../lib/utils'
import { proximoIntervalo, calcularProximaRevisao, INTERVALOS } from '../services/srs'

export const db = new Dexie('estudos_trt')

// Esquema. Índices declarados permitem filtros/ordenação eficientes.
// `*tags` é multiEntry (permite filtrar questões por tag).
db.version(1).stores({
  materias: 'id, nome',
  topicos: 'id, materiaId, coberto',
  questoes: 'id, materiaId, topicoId, banca, dificuldade, origem, criadaEm, *tags',
  tarefas: 'id, semana, dia, materia, concluida',
  registros: 'id, data, materiaId, topicoId',
  tentativas: 'id, data',
  sessoes: 'id, data, materiaId',
  revisoes: 'id, refTipo, refId, proximaRevisao',
  metas: 'id, tipo, periodo',
})

// v2: tabela de flashcards (conteúdo inicial + gerados pela IA + manuais).
db.version(2).stores({
  flashcards: 'id, materiaId, topicoId, origem, *tags',
})

/**
 * API de alto nível. Todos os módulos devem escrever no banco por aqui,
 * garantindo consistência (ids, timestamps, agendamento de revisão).
 */
export const dbApi = {
  // ---------- Matérias ----------
  async addMateria({ nome, cor }) {
    const id = uid()
    await db.materias.add({ id, nome, cor })
    return id
  },
  updateMateria: (id, patch) => db.materias.update(id, patch),
  async deleteMateria(id) {
    await db.transaction('rw', db.materias, db.topicos, db.questoes, async () => {
      await db.materias.delete(id)
      await db.topicos.where('materiaId').equals(id).delete()
      await db.questoes.where('materiaId').equals(id).delete()
    })
  },

  // ---------- Tópicos ----------
  async addTopico({ materiaId, nome, coberto = false }) {
    const id = uid()
    await db.topicos.add({ id, materiaId, nome, coberto })
    return id
  },
  updateTopico: (id, patch) => db.topicos.update(id, patch),
  deleteTopico: (id) => db.topicos.delete(id),
  async toggleTopicoCoberto(id) {
    const t = await db.topicos.get(id)
    if (t) await db.topicos.update(id, { coberto: !t.coberto })
  },

  // ---------- Questões ----------
  async addQuestao(q) {
    const questao = {
      id: q.id || uid(),
      materiaId: q.materiaId || null,
      topicoId: q.topicoId || null,
      enunciado: q.enunciado || '',
      alternativas: q.alternativas || [],
      gabarito: q.gabarito ?? null, // índice da alternativa correta
      comentario: q.comentario || '',
      banca: q.banca || '',
      dificuldade: q.dificuldade || 2,
      tags: q.tags || [],
      origem: q.origem || 'manual',
      criadaEm: q.criadaEm || hojeISO(),
    }
    await db.questoes.add(questao)
    return questao.id
  },
  async addQuestoes(lista) {
    const itens = lista.map((q) => ({
      id: q.id || uid(),
      materiaId: q.materiaId || null,
      topicoId: q.topicoId || null,
      enunciado: q.enunciado || '',
      alternativas: q.alternativas || [],
      gabarito: q.gabarito ?? null,
      comentario: q.comentario || '',
      banca: q.banca || '',
      dificuldade: q.dificuldade || 2,
      tags: q.tags || [],
      origem: q.origem || 'manual',
      criadaEm: q.criadaEm || hojeISO(),
    }))
    await db.questoes.bulkAdd(itens)
    return itens.map((q) => q.id)
  },
  updateQuestao: (id, patch) => db.questoes.update(id, patch),
  deleteQuestao: (id) => db.questoes.delete(id),

  // ---------- Tarefas (plano) ----------
  async addTarefa(t) {
    const id = t.id || uid()
    await db.tarefas.add({
      id,
      semana: t.semana || 1,
      dia: t.dia || 1,
      materia: t.materia || '',
      topico: t.topico || '',
      descricao: t.descricao || '',
      recursoUrl: t.recursoUrl || '',
      metaQuestoes: t.metaQuestoes || 0,
      concluida: !!t.concluida,
    })
    return id
  },
  updateTarefa: (id, patch) => db.tarefas.update(id, patch),
  deleteTarefa: (id) => db.tarefas.delete(id),
  async toggleTarefa(id) {
    const t = await db.tarefas.get(id)
    if (t) await db.tarefas.update(id, { concluida: !t.concluida })
  },

  // ---------- Registros de questões (desempenho diário) ----------
  async addRegistro({ data, materiaId, topicoId, total, acertos }) {
    const id = uid()
    await db.registros.add({
      id,
      data: data || hojeISO(),
      materiaId: materiaId || null,
      topicoId: topicoId || null,
      total: Number(total) || 0,
      acertos: Number(acertos) || 0,
    })
    return id
  },
  deleteRegistro: (id) => db.registros.delete(id),

  // ---------- Tentativas de simulado ----------
  async addTentativa(t) {
    const id = t.id || uid()
    await db.tentativas.add({
      id,
      data: t.data || hojeISO(),
      questoesIds: t.questoesIds || [],
      respostas: t.respostas || {},
      acertos: t.acertos || 0,
      total: t.total || 0,
      duracaoSeg: t.duracaoSeg || 0,
    })
    return id
  },
  deleteTentativa: (id) => db.tentativas.delete(id),

  // ---------- Sessões de estudo (pomodoro) ----------
  async addSessao({ data, materiaId, minutos }) {
    const id = uid()
    await db.sessoes.add({
      id,
      data: data || hojeISO(),
      materiaId: materiaId || null,
      minutos: Number(minutos) || 0,
    })
    return id
  },
  deleteSessao: (id) => db.sessoes.delete(id),

  // ---------- Revisão espaçada (SRS) ----------
  /** Agenda (ou reinicia) a revisão de um tópico/questão para hoje. */
  async agendarRevisao({ refTipo, refId, titulo = '' }) {
    const existente = await db.revisoes
      .where('refTipo')
      .equals(refTipo)
      .filter((r) => r.refId === refId)
      .first()
    if (existente) {
      await db.revisoes.update(existente.id, {
        proximaRevisao: hojeISO(),
        intervaloAtual: INTERVALOS[0],
      })
      return existente.id
    }
    const id = uid()
    await db.revisoes.add({
      id,
      refTipo,
      refId,
      titulo,
      proximaRevisao: hojeISO(),
      intervaloAtual: INTERVALOS[0],
    })
    return id
  },
  /** Responde uma revisão: acertou aumenta o intervalo; errou reinicia. */
  async responderRevisao(id, acertou) {
    const r = await db.revisoes.get(id)
    if (!r) return
    const novoIntervalo = proximoIntervalo(r.intervaloAtual, acertou)
    await db.revisoes.update(id, {
      intervaloAtual: novoIntervalo,
      proximaRevisao: calcularProximaRevisao(hojeISO(), novoIntervalo),
    })
  },
  deleteRevisao: (id) => db.revisoes.delete(id),

  // ---------- Flashcards ----------
  async addFlashcard(fc) {
    const id = fc.id || uid()
    await db.flashcards.add({
      id,
      materiaId: fc.materiaId || null,
      topicoId: fc.topicoId || null,
      frente: fc.frente || '',
      verso: fc.verso || '',
      tags: fc.tags || [],
      origem: fc.origem || 'manual',
      criadoEm: fc.criadoEm || hojeISO(),
    })
    return id
  },
  async addFlashcards(lista) {
    const itens = lista.map((fc) => ({
      id: fc.id || uid(),
      materiaId: fc.materiaId || null,
      topicoId: fc.topicoId || null,
      frente: fc.frente || '',
      verso: fc.verso || '',
      tags: fc.tags || [],
      origem: fc.origem || 'manual',
      criadoEm: fc.criadoEm || hojeISO(),
    }))
    await db.flashcards.bulkAdd(itens)
    return itens.map((f) => f.id)
  },
  updateFlashcard: (id, patch) => db.flashcards.update(id, patch),
  deleteFlashcard: (id) => db.flashcards.delete(id),

  // ---------- Metas ----------
  async setMeta({ tipo, periodo = 'semana', alvo }) {
    const existente = await db.metas
      .where('tipo')
      .equals(tipo)
      .filter((m) => m.periodo === periodo)
      .first()
    if (existente) {
      await db.metas.update(existente.id, { alvo: Number(alvo) || 0 })
      return existente.id
    }
    const id = uid()
    await db.metas.add({ id, tipo, periodo, alvo: Number(alvo) || 0 })
    return id
  },

  // ---------- Backup / reset ----------
  /** Exporta todas as tabelas como um objeto serializável. */
  async exportarTudo() {
    const dump = { versao: 2, exportadoEm: new Date().toISOString() }
    for (const t of TABELAS) dump[t] = await db.table(t).toArray()
    return dump
  },
  /** Importa um backup (substitui o conteúdo atual). */
  async importarTudo(dump) {
    await db.transaction('rw', TABELAS.map((t) => db.table(t)), async () => {
      for (const t of TABELAS) {
        if (Array.isArray(dump[t])) {
          await db.table(t).clear()
          await db.table(t).bulkAdd(dump[t])
        }
      }
    })
  },
  /** Apaga todos os dados (reset de fábrica). */
  async resetarTudo() {
    await Promise.all(TABELAS.map((t) => db.table(t).clear()))
  },
}

/** Lista canônica de tabelas (backup/restauração/reset). */
const TABELAS = [
  'materias',
  'topicos',
  'questoes',
  'tarefas',
  'registros',
  'tentativas',
  'sessoes',
  'revisoes',
  'metas',
  'flashcards',
]
