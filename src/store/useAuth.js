// Store de autenticação + sincronização (Zustand).
//
// Mantém o usuário logado e o estado da sincronização para a UI reagir.
// A lógica de banco/nuvem fica em ../services/sync.js. Login é OPCIONAL:
// sem configurar o Supabase (src/config.js), tudo continua local como antes.
import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../services/supabase'
import * as sync from '../services/sync'

// Estados possíveis de `status`:
//   'desligado'      → Supabase não configurado (app só local)
//   'desconectado'   → configurado, mas sem login
//   'sincronizando'  → enviando/recebendo agora
//   'sincronizado'   → tudo em dia
//   'offline'        → sem internet
//   'erro'           → falhou (ver `erro`)

let debouncePush = null
let iniciado = false

/** Traduz mensagens de erro comuns do Supabase Auth para português. */
function traduzErro(error) {
  const msg = (error?.message || '').toLowerCase()
  if (msg.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (msg.includes('user already registered')) return 'Este e-mail já está cadastrado. Faça login.'
  if (msg.includes('password should be at least')) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (msg.includes('unable to validate email') || msg.includes('invalid email'))
    return 'E-mail inválido.'
  if (msg.includes('email not confirmed'))
    return 'E-mail ainda não confirmado. Verifique sua caixa de entrada (ou desative a confirmação no Supabase).'
  if (msg.includes('rate limit') || msg.includes('too many'))
    return 'Muitas tentativas. Aguarde um momento e tente de novo.'
  return error?.message || 'Ocorreu um erro inesperado.'
}

export const useAuth = create((set, get) => ({
  configurado: isSupabaseConfigured(),
  user: null,
  status: isSupabaseConfigured() ? 'desconectado' : 'desligado',
  ultimaSync: sync.getLastSync() || null,
  erro: null,

  /** Inicializa: sessão atual, listeners de auth/rede/foco. Idempotente. */
  init: async () => {
    if (iniciado || !isSupabaseConfigured()) return
    iniciado = true

    sync.registrarHooks()
    sync.setOnDirty(() => get().agendarEnvio())

    // Sessão já existente?
    const { data } = await supabase.auth.getSession()
    const user = data?.session?.user || null
    set({ user })

    // Reage a login/logout (inclusive vindo de outra aba).
    supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user || null
      const anterior = get().user
      set({ user: u })
      if (u && (!anterior || anterior.id !== u.id)) {
        get().sincronizar()
      } else if (!u) {
        set({ status: 'desconectado' })
      }
    })

    // Sincroniza ao abrir, se já estiver logado.
    if (user) get().sincronizar()

    // Puxa novidades ao voltar o foco / a internet.
    window.addEventListener('online', () => get().sincronizar())
    window.addEventListener('focus', () => get().puxar())
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) get().puxar()
    })
  },

  /** Agenda um envio após a última alteração (debounce ~2,5s). */
  agendarEnvio: () => {
    if (!get().user) return
    if (debouncePush) clearTimeout(debouncePush)
    debouncePush = setTimeout(() => get().enviar(), 2500)
  },

  /** Decide a direção na primeira sincronização (ou no login). */
  sincronizar: async () => {
    const user = get().user
    if (!user || !isSupabaseConfigured()) return
    set({ status: 'sincronizando', erro: null })
    try {
      const remoto = await sync.fetchRemote(user.id)
      const localTs = sync.getLocalTs()
      const mesmoUsuario = sync.getLastUserId() === user.id

      if (!remoto || remoto.data == null) {
        // Nuvem vazia. Só sobe os dados locais se forem deste usuário ou se
        // este navegador nunca sincronizou (caso típico: criar a conta agora).
        const primeiroUsoNoNavegador = !sync.getLastUserId()
        if (mesmoUsuario || primeiroUsoNoNavegador) {
          await sync.pushRemote(user.id)
        }
        get().marcarSucesso()
      } else {
        const remotoTs = remoto.client_updated_at || remoto.updated_at || ''
        if (!localTs || !mesmoUsuario || remotoTs > localTs) {
          // Nuvem mais nova (ou primeiro acesso deste usuário aqui): aplica.
          await sync.aplicarDump(remoto.data)
          sync.setLocalTs(remotoTs)
          get().marcarSucesso()
        } else if (localTs > remotoTs) {
          await sync.pushRemote(user.id)
          get().marcarSucesso()
        } else {
          get().marcarSucesso()
        }
      }
      sync.setLastUserId(user.id)
    } catch (e) {
      set({ status: navigator.onLine ? 'erro' : 'offline', erro: e.message })
    }
  },

  /** Envia o estado local para a nuvem. */
  enviar: async () => {
    const user = get().user
    if (!user || !isSupabaseConfigured()) return
    if (!navigator.onLine) {
      set({ status: 'offline' })
      return
    }
    set({ status: 'sincronizando', erro: null })
    try {
      await sync.pushRemote(user.id)
      get().marcarSucesso()
    } catch (e) {
      set({ status: 'erro', erro: e.message })
    }
  },

  /** Puxa da nuvem e aplica SE for mais nova (usado em foco/visibilidade). */
  puxar: async () => {
    const user = get().user
    if (!user || !isSupabaseConfigured() || !navigator.onLine) return
    try {
      const remoto = await sync.fetchRemote(user.id)
      if (!remoto || remoto.data == null) return
      const localTs = sync.getLocalTs()
      const remotoTs = remoto.client_updated_at || remoto.updated_at || ''
      if (remotoTs && remotoTs > localTs) {
        set({ status: 'sincronizando' })
        await sync.aplicarDump(remoto.data)
        sync.setLocalTs(remotoTs)
        get().marcarSucesso()
      }
    } catch {
      // Silencioso: foco/visibilidade não deve incomodar o usuário.
    }
  },

  /** Sincronização manual (botão "Sincronizar agora"). */
  sincronizarAgora: async () => {
    await get().sincronizar()
  },

  marcarSucesso: () => {
    const agora = new Date().toISOString()
    sync.setLastSync(agora)
    set({ status: 'sincronizado', ultimaSync: agora, erro: null })
  },

  /* -------------------- Autenticação -------------------- */

  entrar: async (email, senha) => {
    set({ erro: null })
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    })
    if (error) throw new Error(traduzErro(error))
  },

  cadastrar: async (email, senha) => {
    set({ erro: null })
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
    })
    if (error) throw new Error(traduzErro(error))
    // Se a confirmação de e-mail estiver ligada, não há sessão imediata.
    const precisaConfirmar = !data?.session
    return { precisaConfirmar }
  },

  sair: async () => {
    if (debouncePush) clearTimeout(debouncePush)
    await supabase.auth.signOut()
    set({ user: null, status: 'desconectado', erro: null })
  },
}))
