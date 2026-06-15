import { Construction } from 'lucide-react'
import { EmptyState } from '../components/ui'

/** Placeholder usado pelos módulos ainda não implementados. */
export function EmConstrucao({ nome }) {
  return (
    <EmptyState
      icon={Construction}
      titulo={`Módulo "${nome}" em construção`}
      descricao="Esta seção será ativada em breve."
    />
  )
}

/** Fábrica (sem JSX) para usar no index.js dos módulos stub. */
export function emConstrucao(nome) {
  return function ModuloEmConstrucao() {
    return <EmConstrucao nome={nome} />
  }
}
