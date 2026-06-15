import { Moon, Sun } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { IconButton } from '../ui/Button'

/** Alterna entre tema claro e escuro. */
export function ThemeToggle() {
  const tema = useStore((s) => s.config.tema)
  const alternar = useStore((s) => s.alternarTema)
  return (
    <IconButton label={tema === 'dark' ? 'Tema claro' : 'Tema escuro'} onClick={alternar}>
      {tema === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </IconButton>
  )
}
