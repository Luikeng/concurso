// Geração de flashcards (frente/verso/tags) a partir de tópicos ou questões.
// Os cards alimentam a exportação para o Anki (services/anki.js).

/** Limpa quebras de linha para HTML (Anki usa #html:true). */
function paraHtml(txt) {
  return String(txt || '').replace(/\r?\n/g, '<br>').trim()
}

/** Letras das alternativas (A, B, C, ...). */
const LETRAS = 'ABCDEFGHIJ'.split('')

/**
 * Card a partir de uma questão: frente = enunciado + alternativas;
 * verso = gabarito + comentário.
 * @param {object} q questão
 * @param {object} [opts] { materiaNome, topicoNome }
 */
export function cardDeQuestao(q, opts = {}) {
  const alternativas = (q.alternativas || [])
    .map((alt, i) => `${LETRAS[i]}) ${alt}`)
    .join('<br>')
  const frente = paraHtml(
    `${q.enunciado}${alternativas ? '<br><br>' + alternativas : ''}`
  )
  const letraGab =
    q.gabarito != null && LETRAS[q.gabarito] ? `${LETRAS[q.gabarito]}) ` : ''
  const textoGab =
    q.gabarito != null && q.alternativas?.[q.gabarito]
      ? q.alternativas[q.gabarito]
      : ''
  const verso = paraHtml(
    `<b>Gabarito:</b> ${letraGab}${textoGab}` +
      (q.comentario ? `<br><br><b>Comentário:</b> ${q.comentario}` : '')
  )
  const tags = montarTags(['questao', opts.materiaNome, opts.topicoNome, q.banca, ...(q.tags || [])])
  return { frente, verso, tags }
}

/**
 * Card simples a partir de um tópico (frente = pergunta, verso = resumo).
 * @param {object} topico { nome }
 * @param {string} resumo texto do verso (pode vir da IA)
 * @param {object} [opts] { materiaNome }
 */
export function cardDeTopico(topico, resumo, opts = {}) {
  return {
    frente: paraHtml(`Explique o tópico: <b>${topico.nome}</b>`),
    verso: paraHtml(resumo || '(adicione um resumo ou gere com a IA)'),
    tags: montarTags(['topico', opts.materiaNome, topico.nome]),
  }
}

/** Normaliza um card vindo da IA para o formato padrão. */
export function cardDeIA({ frente, verso, tags = [] }, extraTags = []) {
  return {
    frente: paraHtml(frente),
    verso: paraHtml(verso),
    tags: montarTags(['ia', ...tags, ...extraTags]),
  }
}

/** Monta string de tags do Anki (sem espaços; separadas por espaço). */
function montarTags(partes) {
  return partes
    .filter(Boolean)
    .map((t) =>
      String(t)
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^\wÀ-ÿ_:-]/g, '')
    )
    .filter(Boolean)
    .join(' ')
}
