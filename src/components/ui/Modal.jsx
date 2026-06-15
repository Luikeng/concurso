import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './Button'
import { IconButton } from './Button'

/**
 * Modal acessível e responsivo. Fecha no ESC e no clique fora.
 */
export function Modal({ aberto, onFechar, titulo, children, tamanho = 'md', rodape }) {
  useEffect(() => {
    if (!aberto) return
    const onKey = (e) => e.key === 'Escape' && onFechar?.()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [aberto, onFechar])

  if (!aberto) return null
  const larguras = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onFechar} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl',
          'dark:bg-slate-900',
          larguras[tamanho]
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{titulo}</h2>
          <IconButton label="Fechar" onClick={onFechar}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-4 py-4">{children}</div>
        {rodape && (
          <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
            {rodape}
          </div>
        )}
      </div>
    </div>
  )
}

/** Diálogo de confirmação. */
export function ConfirmDialog({
  aberto,
  onFechar,
  onConfirmar,
  titulo = 'Confirmar',
  mensagem,
  textoConfirmar = 'Confirmar',
  variante = 'danger',
}) {
  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={titulo}
      tamanho="sm"
      rodape={
        <>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            variant={variante}
            onClick={() => {
              onConfirmar?.()
              onFechar?.()
            }}
          >
            {textoConfirmar}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">{mensagem}</p>
    </Modal>
  )
}
