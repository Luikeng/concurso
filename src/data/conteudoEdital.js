// Conteúdo de estudo (edital, resumos, questões, flashcards, vídeos).
// Montado a partir dos JSONs em src/data/conteudo/<materia>.json (um por matéria).
// Carregado no primeiro uso pelo seed (src/db/seed.js).
//
// Cada item: { materia, videos:[{titulo, youtubeId, url}],
//   topicos:[{ nome, resumo, pontosChave[], pegadinhas[], videoQuery,
//     flashcards:[{frente,verso}], questoes:[{enunciado, alternativas[5], gabarito, comentario, banca, dificuldade}] }] }
//
// Para editar/expandir: altere o JSON da matéria correspondente.
import portugues from './conteudo/portugues.json'
import rlm from './conteudo/rlm.json'
import constitucional from './conteudo/constitucional.json'
import administrativo from './conteudo/administrativo.json'
import trabalho from './conteudo/trabalho.json'
import procTrabalho from './conteudo/proc-trabalho.json'
import admPublica from './conteudo/adm-publica.json'
import informatica from './conteudo/informatica.json'
import legislacao from './conteudo/legislacao.json'

// Ordem de exibição (alinhada à relevância no edital).
export const EDITAL = [
  portugues,
  rlm,
  constitucional,
  administrativo,
  trabalho,
  procTrabalho,
  admPublica,
  informatica,
  legislacao,
]
