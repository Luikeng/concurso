// Registro central de módulos (arquitetura plugável).
// Para adicionar um módulo novo: crie a pasta em src/modules/<nome> com um
// index.js exportando { id, rotulo, descricao, icone, path, ordem, Component }
// e adicione uma linha aqui. Mais nada precisa mudar.
import plano from './plano'
import conteudo from './conteudo'
import banco from './banco'
import simulado from './simulado'
import estatisticas from './estatisticas'
import revisao from './revisao'
import sessoes from './sessoes'
import ia from './ia'
import dados from './dados'
import config from './config'

/** Lista de módulos ativos, ordenada por `ordem`. */
export const modules = [
  plano,
  conteudo,
  banco,
  simulado,
  estatisticas,
  revisao,
  sessoes,
  ia,
  dados,
  config,
].sort((a, b) => a.ordem - b.ordem)

/** Caminho do primeiro módulo (rota inicial). */
export const rotaInicial = modules[0]?.path || '/plano'
