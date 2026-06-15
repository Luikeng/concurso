import { useState } from 'react'
import { Loader2, Inbox, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react'
import { cn, pct as pctFn } from '../../lib/utils'
import { useStore } from '../../store/useStore'

/** Indicador de carregamento. */
export function Spinner({ className, label }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 text-slate-500', className)}>
      <Loader2 className="animate-spin" size={18} />
      {label && <span className="text-sm">{label}</span>}
    </div>
  )
}

/** Estado vazio com ícone, título e ação opcional. */
export function EmptyState({ icon: Icon = Inbox, titulo, descricao, acao, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-12 text-center', className)}>
      <div className="rounded-full bg-slate-100 p-3 text-slate-400 dark:bg-slate-800">
        <Icon size={24} />
      </div>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{titulo}</p>
      {descricao && <p className="max-w-sm text-sm text-slate-400">{descricao}</p>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  )
}

/** Barra de progresso. `valor` e `total` ou `percentual` direto. */
export function ProgressBar({ valor = 0, total = 100, percentual, cor = '#0d9488', className, mostrarTexto = false }) {
  const p = percentual != null ? percentual : pctFn(valor, total)
  return (
    <div className={cn('w-full', className)}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, p)}%`, backgroundColor: cor }}
        />
      </div>
      {mostrarTexto && <p className="mt-1 text-right text-xs text-slate-400">{p}%</p>}
    </div>
  )
}

/** Cartão-resumo de estatística (KPI). */
export function Stat({ icon: Icon, rotulo, valor, sub, cor = '#0d9488', className }) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{rotulo}</span>
        {Icon && (
          <span className="rounded-lg p-1.5" style={{ backgroundColor: cor + '22', color: cor }}>
            <Icon size={16} />
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-800 dark:text-slate-100">{valor}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

/** Abas simples controladas internamente. `abas` = [{id, label, conteudo}] */
export function Tabs({ abas, inicial }) {
  const [ativa, setAtiva] = useState(inicial || abas[0]?.id)
  const atual = abas.find((a) => a.id === ativa)
  return (
    <div>
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        {abas.map((a) => (
          <button
            key={a.id}
            onClick={() => setAtiva(a.id)}
            className={cn(
              'whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors',
              ativa === a.id
                ? 'border-b-2 border-marca-600 text-marca-700 dark:text-marca-300'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
            )}
          >
            {a.label}
          </button>
        ))}
      </div>
      <div className="pt-4">{atual?.conteudo}</div>
    </div>
  )
}

const ICONES_TOAST = {
  info: Info,
  sucesso: CheckCircle2,
  erro: XCircle,
  aviso: AlertTriangle,
}
const CORES_TOAST = {
  info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200',
  sucesso: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  erro: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200',
  aviso: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
}

/** Container global de toasts (renderizado uma vez no App). */
export function Toasts() {
  const toasts = useStore((s) => s.toasts)
  const remover = useStore((s) => s.removerToast)
  return (
    <div className="pointer-events-none fixed bottom-20 right-3 z-[60] flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2 sm:bottom-4">
      {toasts.map((t) => {
        const Icon = ICONES_TOAST[t.tipo] || Info
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2 text-sm shadow-md',
              CORES_TOAST[t.tipo] || CORES_TOAST.info
            )}
            onClick={() => remover(t.id)}
            role="status"
          >
            <Icon size={16} className="mt-0.5 shrink-0" />
            <span className="flex-1">{t.mensagem}</span>
          </div>
        )
      })}
    </div>
  )
}
