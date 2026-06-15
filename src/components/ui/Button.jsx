import { cn } from '../../lib/utils'

const VARIANTES = {
  primary:
    'bg-marca-600 text-white hover:bg-marca-700 focus-visible:ring-marca-500 shadow-sm',
  secondary:
    'bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600',
  outline:
    'border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800',
  ghost:
    'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500',
}

const TAMANHOS = {
  sm: 'text-xs px-2.5 py-1.5 gap-1.5',
  md: 'text-sm px-3.5 py-2 gap-2',
  lg: 'text-base px-5 py-2.5 gap-2',
  icon: 'p-2',
}

/**
 * Botão padrão do app.
 * @param {'primary'|'secondary'|'outline'|'ghost'|'danger'|'success'} variant
 * @param {'sm'|'md'|'lg'|'icon'} size
 */
export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANTES[variant],
        TAMANHOS[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/** Botão somente ícone. */
export function IconButton({ className, label, children, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-lg p-2 text-slate-500 transition-colors',
        'hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-marca-500',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
