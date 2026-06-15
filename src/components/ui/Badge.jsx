import { cn } from '../../lib/utils'

const CORES = {
  cinza: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  marca: 'bg-marca-100 text-marca-700 dark:bg-marca-900/40 dark:text-marca-300',
  verde: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  ambar: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  vermelho: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  azul: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
}

/** Etiqueta pequena. Pode receber `cor` (preset) ou `style` (cor custom). */
export function Badge({ cor = 'cinza', className, children, ...rest }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        CORES[cor],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  )
}

/** Etiqueta com cor sólida (ex.: cor da matéria). */
export function Dot({ cor, className }) {
  return (
    <span
      className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', className)}
      style={{ backgroundColor: cor }}
    />
  )
}
