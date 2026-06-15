import { useNavigate } from 'react-router-dom'
import { Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle2, CloudCog } from 'lucide-react'
import { useAuth } from '../../store/useAuth'

/**
 * Indicador compacto de sincronização no cabeçalho. Mostra o estado atual
 * (sincronizado/erro/offline/deslogado) e leva para a tela de Config ao clicar.
 * Some quando o Supabase não está configurado.
 */
export function SyncStatus() {
  const navigate = useNavigate()
  const configurado = useAuth((s) => s.configurado)
  const user = useAuth((s) => s.user)
  const status = useAuth((s) => s.status)

  if (!configurado) return null

  let Icone = CloudOff
  let cor = 'text-slate-400'
  let titulo = 'Não conectado — toque para entrar e sincronizar'

  if (!user) {
    Icone = CloudCog
    cor = 'text-slate-400'
    titulo = 'Entrar para sincronizar entre aparelhos'
  } else if (status === 'sincronizando') {
    Icone = RefreshCw
    cor = 'text-blue-500 animate-spin'
    titulo = 'Sincronizando...'
  } else if (status === 'sincronizado') {
    Icone = CheckCircle2
    cor = 'text-emerald-500'
    titulo = 'Sincronizado'
  } else if (status === 'offline') {
    Icone = CloudOff
    cor = 'text-amber-500'
    titulo = 'Offline — sincroniza quando a internet voltar'
  } else if (status === 'erro') {
    Icone = AlertCircle
    cor = 'text-red-500'
    titulo = 'Erro ao sincronizar — toque para ver'
  } else {
    Icone = Cloud
    cor = 'text-slate-400'
  }

  return (
    <button
      type="button"
      onClick={() => navigate('/config')}
      title={titulo}
      aria-label={titulo}
      className="inline-flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <Icone size={18} className={cor} />
    </button>
  )
}
