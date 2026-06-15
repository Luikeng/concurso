// Configuração da sincronização na nuvem (Supabase).
//
// Estes DOIS valores são PÚBLICOS por design — a "anon key" do Supabase é
// feita para ficar no front-end. A segurança vem das políticas RLS no banco
// (cada usuário só acessa os próprios dados). NÃO coloque aqui a senha do
// banco nem a "service_role key": essas são secretas.
//
// Onde achar (no painel do Supabase):
//   Project Settings → API
//     • "Project URL"          → cole em URL_FIXA
//     • "Project API keys" → "anon public" (começa com eyJ...) → cole em ANON_FIXA
//
// Depois é só dar commit/push: o deploy do GitHub Pages usa estes valores.
// (Opcionalmente, dá para usar variáveis de ambiente VITE_SUPABASE_URL /
//  VITE_SUPABASE_ANON_KEY no build — elas têm prioridade sobre os valores abaixo.)

const URL_FIXA = 'https://iyqhsfanpkriitgccbnb.supabase.co' // Project URL (público)
const ANON_FIXA = 'sb_publishable_LkmA_HU3BrfN17Dare3ACQ_z--uDYI6' // chave "publishable" (pública)

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || URL_FIXA
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ANON_FIXA

/** True quando os dois valores parecem válidos (URL https + chave longa). */
export function isSupabaseConfigured() {
  return /^https?:\/\/.+/.test(SUPABASE_URL) && (SUPABASE_ANON_KEY || '').length > 20
}
