// Cliente da API do Google Gemini (free tier), chamado direto do navegador.
// A chave é informada em Config e guardada SÓ no localStorage.
// ATENÇÃO: chamadas de IA exigem internet (não funcionam offline).

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export const MODELOS_GEMINI = [
  { id: 'gemini-2.0-flash', nome: 'Gemini 2.0 Flash (rápido)' },
  { id: 'gemini-2.5-flash', nome: 'Gemini 2.5 Flash (mais capaz)' },
  { id: 'gemini-1.5-flash', nome: 'Gemini 1.5 Flash (alternativo)' },
]

/** Erro amigável a partir do status HTTP da API. */
function mensagemErro(status, detalhe) {
  if (status === 400) return 'Requisição inválida. Verifique o modelo e a chave de API.'
  if (status === 401 || status === 403)
    return 'Chave de API inválida ou sem permissão. Confira a chave em Config.'
  if (status === 429)
    return 'Limite de uso atingido (free tier). Aguarde alguns minutos e tente novamente.'
  if (status >= 500) return 'O serviço de IA está indisponível no momento. Tente mais tarde.'
  return detalhe || `Erro inesperado (HTTP ${status}).`
}

/**
 * Chamada base ao Gemini. Retorna o texto gerado.
 * @param {object} p
 * @param {string} p.apiKey chave de API
 * @param {string} p.model id do modelo
 * @param {string} p.prompt texto do usuário
 * @param {string} [p.systemPrompt] instrução de sistema
 * @param {boolean} [p.json] se true, pede saída em JSON
 * @param {number} [p.temperatura]
 */
export async function chamarGemini({ apiKey, model, prompt, systemPrompt, json = false, temperatura = 0.7 }) {
  if (!apiKey) throw new Error('Configure a chave de API do Gemini em Config.')
  const url = `${BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }]}],
    generationConfig: {
      temperature: temperatura,
      ...(json ? { responseMimeType: 'application/json' } : {}),
    },
  }
  if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] }

  let resp
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (e) {
    throw new Error('Falha de conexão. Verifique sua internet (a IA exige conexão).')
  }

  if (!resp.ok) {
    let detalhe = ''
    try {
      const err = await resp.json()
      detalhe = err?.error?.message
    } catch {
      /* ignora */
    }
    throw new Error(mensagemErro(resp.status, detalhe))
  }

  const data = await resp.json()
  const texto = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || ''
  if (!texto) {
    const motivo = data?.candidates?.[0]?.finishReason
    throw new Error(
      motivo === 'SAFETY'
        ? 'A resposta foi bloqueada por filtros de segurança. Reformule o pedido.'
        : 'A IA não retornou conteúdo. Tente novamente.'
    )
  }
  return texto
}

/** Extrai e faz parse seguro de JSON (tolera cercas ```json e texto ao redor). */
export function parseJSONSeguro(texto) {
  if (!texto) throw new Error('Resposta vazia da IA.')
  let t = texto.trim()
  // Remove cercas de código.
  t = t.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  // Tenta direto; se falhar, busca o primeiro [ ... ] ou { ... }.
  try {
    return JSON.parse(t)
  } catch {
    const inicio = t.search(/[[{]/)
    const fimArr = t.lastIndexOf(']')
    const fimObj = t.lastIndexOf('}')
    const fim = Math.max(fimArr, fimObj)
    if (inicio !== -1 && fim !== -1 && fim > inicio) {
      try {
        return JSON.parse(t.slice(inicio, fim + 1))
      } catch {
        /* cai no throw abaixo */
      }
    }
    throw new Error('Não foi possível interpretar a resposta da IA como JSON. Tente novamente.')
  }
}

// ----------------------------------------------------------------------------
// Ações de alto nível (montam o prompt e tratam a saída).
// ----------------------------------------------------------------------------

const LETRAS = 'ABCDE'.split('')

/**
 * Gera N questões estilo FCC sobre um tópico, já no formato do banco.
 * Retorna um array de questões { enunciado, alternativas[], gabarito, comentario, ... }.
 */
export async function gerarQuestoesIA({ apiKey, model, materia, topico, quantidade = 5, dificuldade = 2, banca = 'FCC' }) {
  const sys =
    'Você é um examinador de concursos públicos brasileiros, especialista em provas para o TRT ' +
    '(Analista Judiciário, Área Administrativa). Crie questões fiéis ao estilo da banca, com 5 ' +
    'alternativas, apenas uma correta, e comentário objetivo justificando o gabarito. Responda ' +
    'SOMENTE com JSON válido, sem texto extra.'
  const prompt = `Gere ${quantidade} questões de múltipla escolha no estilo da banca ${banca}.
Matéria: ${materia}
Tópico: ${topico}
Nível de dificuldade: ${['', 'fácil', 'médio', 'difícil'][dificuldade] || 'médio'}.

Formato EXATO (array JSON):
[
  {
    "enunciado": "texto da questão",
    "alternativas": ["alt A", "alt B", "alt C", "alt D", "alt E"],
    "gabarito": 0,
    "comentario": "explicação do porquê a alternativa correta está certa e as outras erradas",
    "dificuldade": ${dificuldade},
    "tags": ["${topico}"]
  }
]
"gabarito" é o ÍNDICE (0 a 4) da alternativa correta. Use exatamente 5 alternativas.`

  const texto = await chamarGemini({ apiKey, model, prompt, systemPrompt: sys, json: true, temperatura: 0.8 })
  const arr = parseJSONSeguro(texto)
  if (!Array.isArray(arr)) throw new Error('A IA não retornou uma lista de questões.')
  // Normaliza/sanitiza.
  return arr
    .filter((q) => q && q.enunciado && Array.isArray(q.alternativas) && q.alternativas.length >= 2)
    .map((q) => ({
      enunciado: String(q.enunciado),
      alternativas: q.alternativas.map(String),
      gabarito: clampGabarito(q.gabarito, q.alternativas.length),
      comentario: String(q.comentario || ''),
      banca,
      dificuldade: Number(q.dificuldade) || dificuldade,
      tags: Array.isArray(q.tags) ? q.tags.map(String) : [topico],
    }))
}

function clampGabarito(g, len) {
  const n = Number(g)
  if (!Number.isInteger(n) || n < 0 || n >= len) return 0
  return n
}

/**
 * Gera flashcards (frente/verso) sobre um tópico, prontos para o Anki.
 * Retorna array de { frente, verso, tags[] }.
 */
export async function gerarFlashcardsIA({ apiKey, model, materia, topico, quantidade = 8 }) {
  const sys =
    'Você cria flashcards de estudo objetivos para concursos. Frente curta (pergunta/conceito), ' +
    'verso direto e correto. Responda SOMENTE com JSON válido.'
  const prompt = `Crie ${quantidade} flashcards sobre o tópico "${topico}" da matéria "${materia}" para concurso do TRT.
Formato (array JSON):
[{"frente":"pergunta ou conceito","verso":"resposta objetiva","tags":["${materia}","${topico}"]}]`
  const texto = await chamarGemini({ apiKey, model, prompt, systemPrompt: sys, json: true })
  const arr = parseJSONSeguro(texto)
  if (!Array.isArray(arr)) throw new Error('A IA não retornou uma lista de flashcards.')
  return arr
    .filter((c) => c && c.frente && c.verso)
    .map((c) => ({
      frente: String(c.frente),
      verso: String(c.verso),
      tags: Array.isArray(c.tags) ? c.tags.map(String) : [materia, topico],
    }))
}

/** Explica um tópico ou um erro (texto livre em markdown simples). */
export async function explicarIA({ apiKey, model, assunto, contexto = '' }) {
  const sys =
    'Você é um professor de cursinho para concursos do TRT. Explique de forma clara, com exemplos ' +
    'e foco no que mais cai em prova. Use português do Brasil.'
  const prompt = `Explique de forma didática: ${assunto}.${contexto ? `\n\nContexto/erro do aluno:\n${contexto}` : ''}`
  return chamarGemini({ apiKey, model, prompt, systemPrompt: sys, temperatura: 0.6 })
}

/** Análise dos pontos fracos a partir de um resumo das estatísticas. */
export async function analisarEstatisticasIA({ apiKey, model, resumo }) {
  const sys =
    'Você é um mentor de estudos para concursos. A partir das estatísticas do aluno, faça um ' +
    'diagnóstico honesto e um plano de foco para a próxima semana (dia a dia), priorizando os ' +
    'pontos fracos. Seja específico e prático. Português do Brasil.'
  const prompt = `Estatísticas atuais do aluno (concurso TRT, Analista Judiciário):

${resumo}

Entregue:
1) Diagnóstico geral (pontos fortes e fracos).
2) Plano de foco para a semana, dividido por dia, priorizando os tópicos mais fracos.
3) 3 recomendações práticas de estudo.`
  return chamarGemini({ apiKey, model, prompt, systemPrompt: sys, temperatura: 0.6 })
}
