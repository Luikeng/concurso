import { CalendarCheck } from 'lucide-react'
import { PlanoPage } from './PlanoPage'

// Módulo Plano de estudos — trilha por semanas/dias + cobertura do edital.
export default {
  id: 'plano',
  rotulo: 'Plano',
  descricao: 'Trilha de estudos por semanas, com progresso e cobertura do edital',
  icone: CalendarCheck,
  path: '/plano',
  ordem: 1,
  Component: PlanoPage,
}
