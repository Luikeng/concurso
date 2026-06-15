import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { Toasts, Spinner } from './components/ui'
import { modules, rotaInicial } from './modules/registry'
import { ensureSeed } from './db/seed'
import { useStore } from './store/useStore'
import { useAuth } from './store/useAuth'
import { beginBulkApply, endBulkApply } from './services/sync'

export default function App() {
  const tema = useStore((s) => s.config.tema)
  const initSync = useAuth((s) => s.init)
  const [pronto, setPronto] = useState(false)
  const [erroSeed, setErroSeed] = useState(null)

  // Carga inicial (trilha) na primeira execução. Envolvemos em
  // begin/endBulkApply para que a carga (seed) NÃO seja tratada como uma
  // alteração do usuário a ser enviada para a nuvem.
  useEffect(() => {
    beginBulkApply()
    ensureSeed()
      .catch((e) => setErroSeed(e?.message || 'Falha ao carregar dados iniciais.'))
      .finally(() => {
        endBulkApply()
        setPronto(true)
      })
  }, [])

  // Inicia a sincronização (se configurada) só depois do seed terminar.
  useEffect(() => {
    if (pronto) initSync()
  }, [pronto, initSync])

  // Aplica o tema (classe `dark` no <html>).
  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'dark')
    document.documentElement.style.colorScheme = tema
  }, [tema])

  if (!pronto) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Spinner label="Carregando seus dados..." />
      </div>
    )
  }

  return (
    <AppShell>
      {erroSeed && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {erroSeed}
        </div>
      )}
      <Routes>
        {modules.map((m) => (
          <Route key={m.id} path={m.path} element={<m.Component />} />
        ))}
        <Route path="/" element={<Navigate to={rotaInicial} replace />} />
        <Route path="*" element={<Navigate to={rotaInicial} replace />} />
      </Routes>
      <Toasts />
    </AppShell>
  )
}
