// Serviço de sincronização local <-> nuvem.
//
// Estratégia (simples e robusta para 1 usuário em vários aparelhos):
//   • O banco local (Dexie) inteiro é exportado como um único objeto JSON
//     ("dump") e guardado na nuvem em UMA linha por usuário.
//   • "Último a escrever vence" (last-write-wins) comparando timestamps.
//   • Toda alteração local marca um timestamp e agenda um envio (debounce).
//   • Ao abrir o app / focar a aba / voltar a ter internet, puxamos da nuvem
//     e aplicamos se a versão remota for mais nova.
//
// O backup manual (aba "Dados") continua existindo como rede de segurança.
import { db, dbApi } from '../db/db'
import { supabase, TABELA_SYNC } from './supabase'

/** Chaves de controle no localStorage. */
const LS_LOCAL_TS = 'sync:localUpdatedAt' // quando os dados locais mudaram pela última vez
const LS_LAST_USER = 'sync:lastUserId' // último usuário que sincronizou neste navegador
const LS_LAST_SYNC = 'sync:lastAt' // quando sincronizou com sucesso pela última vez

/** Tabelas que compõem o backup (igual à lista canônica de db.js). */
const TABELAS = [
  'materias',
  'topicos',
  'questoes',
  'tarefas',
  'registros',
  'tentativas',
  'sessoes',
  'revisoes',
  'metas',
  'flashcards',
]

/* ------------------------------------------------------------------ */
/* Controle de "alteração local" (dirty)                               */
/* ------------------------------------------------------------------ */

// Enquanto aplicamos um dump remoto, NÃO queremos marcar os dados como
// alterados (senão devolveríamos o que acabamos de receber).
let aplicandoRemoto = false
export function beginBulkApply() {
  aplicandoRemoto = true
}
export function endBulkApply() {
  aplicandoRemoto = false
}

let onDirty = null
/** Define o callback chamado quando há alteração local (para agendar envio). */
export function setOnDirty(fn) {
  onDirty = fn
}

function marcarAlteracaoLocal() {
  if (aplicandoRemoto) return
  localStorage.setItem(LS_LOCAL_TS, new Date().toISOString())
  if (onDirty) onDirty()
}

/* ------------------------------------------------------------------ */
/* Hooks de tabela: detectam qualquer escrita no banco                 */
/* ------------------------------------------------------------------ */

let hooksRegistrados = false
/** Registra hooks de create/update/delete em todas as tabelas (uma vez). */
export function registrarHooks() {
  if (hooksRegistrados) return
  hooksRegistrados = true
  for (const nome of TABELAS) {
    const t = db.table(nome)
    t.hook('creating', () => marcarAlteracaoLocal())
    t.hook('updating', () => marcarAlteracaoLocal())
    t.hook('deleting', () => marcarAlteracaoLocal())
  }
}

/* ------------------------------------------------------------------ */
/* Leitura/escrita dos timestamps de controle                          */
/* ------------------------------------------------------------------ */

export const getLocalTs = () => localStorage.getItem(LS_LOCAL_TS) || ''
export const setLocalTs = (ts) => localStorage.setItem(LS_LOCAL_TS, ts || '')
export const getLastUserId = () => localStorage.getItem(LS_LAST_USER) || ''
export const setLastUserId = (id) => localStorage.setItem(LS_LAST_USER, id || '')
export const getLastSync = () => localStorage.getItem(LS_LAST_SYNC) || ''
export const setLastSync = (ts) => localStorage.setItem(LS_LAST_SYNC, ts || '')

/* ------------------------------------------------------------------ */
/* Aplicar dump remoto (sem disparar "dirty")                          */
/* ------------------------------------------------------------------ */

export async function aplicarDump(dump) {
  beginBulkApply()
  try {
    await dbApi.importarTudo(dump)
  } finally {
    endBulkApply()
  }
}

/* ------------------------------------------------------------------ */
/* Comunicação com a nuvem                                             */
/* ------------------------------------------------------------------ */

/** Busca o registro do usuário na nuvem (ou null). */
export async function fetchRemote(userId) {
  const { data, error } = await supabase
    .from(TABELA_SYNC)
    .select('data, client_updated_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data || null
}

/** Envia o dump local completo para a nuvem. Retorna o timestamp usado. */
export async function pushRemote(userId) {
  const dump = await dbApi.exportarTudo()
  const ts = getLocalTs() || new Date().toISOString()
  const { error } = await supabase.from(TABELA_SYNC).upsert(
    {
      user_id: userId,
      data: dump,
      client_updated_at: ts,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
  if (error) throw error
  setLocalTs(ts)
  return ts
}
