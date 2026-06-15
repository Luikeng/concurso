// Utilitários gerais usados em todo o app.

/** Combina classes condicionalmente (mini clsx, sem dependência). */
export function cn(...args) {
  return args
    .flat()
    .filter((x) => typeof x === 'string' && x.trim() !== '')
    .join(' ')
}

/** Gera um id único (usa crypto quando disponível). */
export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/** Data de hoje em formato ISO curto (YYYY-MM-DD), no fuso local. */
export function hojeISO() {
  return dataISO(new Date())
}

/** Converte um Date para YYYY-MM-DD no fuso local. */
export function dataISO(d) {
  const dt = d instanceof Date ? d : new Date(d)
  const ano = dt.getFullYear()
  const mes = String(dt.getMonth() + 1).padStart(2, '0')
  const dia = String(dt.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

/** Soma (ou subtrai) dias a uma data ISO e retorna nova string ISO. */
export function addDias(iso, dias) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + dias)
  return dataISO(d)
}

/** Diferença em dias inteiros entre duas datas ISO (b - a). */
export function diffDias(aIso, bIso) {
  const a = new Date(aIso + 'T00:00:00')
  const b = new Date(bIso + 'T00:00:00')
  return Math.round((b - a) / 86400000)
}

/** Formata data ISO para dd/mm/aaaa. */
export function formatarData(iso) {
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

/** Formata número de minutos para "Xh YYmin" ou "YYmin". */
export function formatarMinutos(min) {
  const m = Math.round(min || 0)
  const h = Math.floor(m / 60)
  const r = m % 60
  return h > 0 ? `${h}h ${String(r).padStart(2, '0')}min` : `${r}min`
}

/** Formata segundos para mm:ss. */
export function formatarSegundos(seg) {
  const s = Math.max(0, Math.round(seg || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

/** Percentual inteiro seguro (evita divisão por zero). */
export function pct(parte, total) {
  if (!total) return 0
  return Math.round((parte / total) * 100)
}

/** Embaralha um array (Fisher-Yates) sem mutar o original. */
export function embaralhar(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Retorna a segunda-feira (início) da semana de uma data ISO. */
export function inicioSemanaISO(iso = hojeISO()) {
  const d = new Date(iso + 'T00:00:00')
  const diaSemana = (d.getDay() + 6) % 7 // 0 = segunda
  d.setDate(d.getDate() - diaSemana)
  return dataISO(d)
}

/** Dispara o download de um conteúdo de texto como arquivo (com BOM UTF-8). */
export function baixarArquivo(nomeArquivo, conteudo, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob(['﻿' + conteudo], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Baixa um objeto como arquivo JSON formatado. */
export function baixarJSON(nomeArquivo, objeto) {
  baixarArquivo(nomeArquivo, JSON.stringify(objeto, null, 2), 'application/json;charset=utf-8')
}

/** Lê um File (input type=file) como texto. Retorna Promise<string>. */
export function lerArquivoComoTexto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'))
    reader.readAsText(file, 'utf-8')
  })
}

/** Rótulos legíveis de dificuldade. */
export const ROTULO_DIFICULDADE = { 1: 'Fácil', 2: 'Média', 3: 'Difícil' }

/** Paleta de cores para matérias (atribuída ciclicamente). */
export const PALETA_MATERIAS = [
  '#0d9488', // teal
  '#2563eb', // azul
  '#dc2626', // vermelho
  '#d97706', // âmbar
  '#7c3aed', // roxo
  '#db2777', // rosa
  '#059669', // verde
  '#0891b2', // ciano
  '#ca8a04', // ouro
  '#4f46e5', // índigo
  '#be123c', // carmim
  '#65a30d', // lima
]
