import { cn } from '../../lib/utils'

const baseCampo =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 ' +
  'focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-500/30 ' +
  'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500'

export function Input({ className, ...rest }) {
  return <input className={cn(baseCampo, className)} {...rest} />
}

export function Textarea({ className, rows = 3, ...rest }) {
  return <textarea rows={rows} className={cn(baseCampo, 'resize-y', className)} {...rest} />
}

export function Select({ className, children, ...rest }) {
  return (
    <select className={cn(baseCampo, 'pr-8', className)} {...rest}>
      {children}
    </select>
  )
}

/** Rótulo + campo, com mensagem de ajuda opcional. */
export function Field({ label, hint, children, className }) {
  return (
    <label className={cn('block space-y-1', className)}>
      {label && (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      )}
      {children}
      {hint && <span className="block text-xs text-slate-400">{hint}</span>}
    </label>
  )
}

/** Checkbox estilizado simples. */
export function Checkbox({ className, label, ...rest }) {
  return (
    <label className={cn('inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200', className)}>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-marca-600 focus:ring-marca-500 dark:border-slate-600 dark:bg-slate-700"
        {...rest}
      />
      {label}
    </label>
  )
}
