// Store central (Zustand). Guarda PREFERÊNCIAS/CONFIG (persistidas no
// localStorage) e estado de UI efêmero (toasts). As ENTIDADES ficam no
// Dexie (ver src/db/db.js) e são lidas com useLiveQuery nos componentes.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uid } from '../lib/utils'

/** Configuração padrão. */
const CONFIG_PADRAO = {
  tema: 'dark', // 'dark' | 'light'
  geminiApiKey: '',
  geminiModel: 'gemini-2.0-flash',
  pomodoro: { foco: 25, pausa: 5, ciclos: 4 },
  metas: { questoesSemana: 100, horasSemana: 12 },
}

export const useStore = create(
  persist(
    (set, get) => ({
      // -------- Config (persistida) --------
      config: CONFIG_PADRAO,

      setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
      setPomodoro: (patch) =>
        set((s) => ({ config: { ...s.config, pomodoro: { ...s.config.pomodoro, ...patch } } })),
      setMetas: (patch) =>
        set((s) => ({ config: { ...s.config, metas: { ...s.config.metas, ...patch } } })),

      setTema: (tema) => set((s) => ({ config: { ...s.config, tema } })),
      alternarTema: () =>
        set((s) => ({ config: { ...s.config, tema: s.config.tema === 'dark' ? 'light' : 'dark' } })),

      // -------- Toasts (efêmero, não persistido) --------
      toasts: [],
      notificar: (mensagem, tipo = 'info', duracao = 3500) => {
        const id = uid()
        set((s) => ({ toasts: [...s.toasts, { id, mensagem, tipo }] }))
        if (duracao) setTimeout(() => get().removerToast(id), duracao)
        return id
      },
      removerToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'config-estudos-trt',
      // Persiste apenas a config (não os toasts).
      partialize: (s) => ({ config: s.config }),
      version: 1,
    }
  )
)

/** Seletores utilitários. */
export const useConfig = () => useStore((s) => s.config)
export const useNotificar = () => useStore((s) => s.notificar)
