// Cliente Supabase (auth + sincronização). É criado apenas se a config
// estiver preenchida (ver src/config.js). Enquanto não estiver, o app roda
// normalmente 100% local, e a área de sincronização fica desabilitada.
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from '../config'

export { isSupabaseConfigured }

/**
 * Instância única do cliente (ou null se não configurado).
 * @type {import('@supabase/supabase-js').SupabaseClient | null}
 */
export const supabase = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Não usamos links de confirmação por URL; a sessão fica no localStorage.
        detectSessionInUrl: false,
      },
    })
  : null

/** Nome da tabela que guarda o backup completo (um registro por usuário). */
export const TABELA_SYNC = 'estudos_sync'
