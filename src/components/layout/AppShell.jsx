import { NavLink, useLocation } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { cn } from '../../lib/utils'
import { modules } from '../../modules/registry'
import { ThemeToggle } from './ThemeToggle'

/** Item de navegação (compartilhado entre sidebar e bottom nav). */
function NavItem({ mod, onNavigate, compacto = false }) {
  const Icon = mod.icone
  return (
    <NavLink
      to={mod.path}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center rounded-lg font-medium transition-colors',
          compacto
            ? 'min-w-[64px] flex-col gap-0.5 px-2 py-1.5 text-[10px]'
            : 'gap-3 px-3 py-2 text-sm',
          isActive
            ? 'bg-marca-50 text-marca-700 dark:bg-marca-900/30 dark:text-marca-300'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
        )
      }
    >
      <Icon size={compacto ? 20 : 18} className="shrink-0" />
      <span className={compacto ? '' : ''}>{mod.rotulo}</span>
    </NavLink>
  )
}

/** Casca do app: sidebar (desktop), header e bottom nav (mobile). */
export function AppShell({ children }) {
  const location = useLocation()
  const moduloAtual = modules.find((m) => location.pathname.startsWith(m.path))

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 md:flex">
        <div className="mb-4 flex items-center gap-2 px-2 py-1">
          <span className="rounded-lg bg-marca-600 p-1.5 text-white">
            <GraduationCap size={20} />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold">Estudos TRT</p>
            <p className="text-[11px] text-slate-400">Analista Judiciário</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {modules.map((m) => (
            <NavItem key={m.id} mod={m} />
          ))}
        </nav>
        <p className="px-2 pt-2 text-[10px] text-slate-400">v1.0 • dados salvos no navegador</p>
      </aside>

      {/* Conteúdo */}
      <div className="md:pl-60">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-marca-600 p-1 text-white md:hidden">
              <GraduationCap size={18} />
            </span>
            <h1 className="text-base font-semibold">
              {moduloAtual ? moduloAtual.rotulo : 'Estudos TRT'}
            </h1>
          </div>
          <ThemeToggle />
        </header>

        {/* Página */}
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-4 md:pb-10">{children}</main>
      </div>

      {/* Bottom nav — mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex gap-1 overflow-x-auto border-t border-slate-200 bg-white px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900 md:hidden">
        {modules.map((m) => (
          <NavItem key={m.id} mod={m} compacto />
        ))}
      </nav>
    </div>
  )
}
