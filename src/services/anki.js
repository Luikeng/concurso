// Exportação para o Anki em formato TSV compatível com a importação nativa.
// Cabeçalho com diretivas: separador TAB, HTML habilitado e coluna de tags.
import { baixarArquivo } from '../lib/utils'

export { baixarArquivo }

/** Escapa um campo para TSV (remove TAB e normaliza quebras de linha). */
function campo(txt) {
  return String(txt ?? '')
    .replace(/\t/g, ' ')
    .replace(/\r?\n/g, '<br>')
    .trim()
}

/**
 * Gera o conteúdo TSV a partir de uma lista de cards {frente, verso, tags}.
 * Inclui o cabeçalho exigido pelo Anki.
 */
export function gerarTSV(cards) {
  const cabecalho = ['#separator:tab', '#html:true', '#tags column:3']
  const linhas = cards.map(
    (c) => `${campo(c.frente)}\t${campo(c.verso)}\t${campo(c.tags)}`
  )
  return cabecalho.join('\n') + '\n' + linhas.join('\n') + '\n'
}

/** Exporta os cards para um arquivo .txt pronto para importar no Anki. */
export function exportarAnki(cards, nomeArquivo = 'flashcards-trt-anki.txt') {
  if (!cards || cards.length === 0) throw new Error('Nenhum flashcard para exportar.')
  baixarArquivo(nomeArquivo, gerarTSV(cards), 'text/tab-separated-values;charset=utf-8')
}

/** Passo a passo curto de importação (exibido na UI). */
export const PASSOS_IMPORTACAO_ANKI = [
  'Abra o Anki no computador e escolha o baralho desejado (ou crie um novo).',
  'Menu Arquivo → Importar e selecione o arquivo .txt baixado.',
  'Confirme: Tipo "Básico", separador "Tabulação" e "Permitir HTML nos campos".',
  'Verifique o mapeamento: Campo 1 = Frente, Campo 2 = Verso, Coluna 3 = Tags.',
  'Clique em Importar. Pronto: os cards entram com as tags já organizadas.',
]
