import { cn } from '../../lib/utils'

/** Cartão base. */
export function Card({ className, children, ...rest }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white shadow-sm',
        'dark:border-slate-800 dark:bg-slate-900',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children }) {
  return <h3 className={cn('text-sm font-semibold text-slate-800 dark:text-slate-100', className)}>{children}</h3>
}

export function CardBody({ className, children }) {
  return <div className={cn('p-4', className)}>{children}</div>
}
