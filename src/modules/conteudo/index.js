import { BookOpen } from 'lucide-react'
import { ConteudoPage } from './ConteudoPage'

// Módulo Conteúdo — teoria do edital (resumos, pontos-chave, pegadinhas),
// vídeo-aulas embutidas e flashcards por tópico.
export default {
  id: 'conteudo',
  rotulo: 'Conteúdo',
  descricao: 'Teoria do edital: resumos, vídeo-aulas e flashcards por tópico',
  icone: BookOpen,
  path: '/conteudo',
  ordem: 1.5,
  Component: ConteudoPage,
}
