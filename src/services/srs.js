// Serviço de Revisão Espaçada (SRS).
// Regra: intervalos crescentes 1 → 7 → 30 → 90 dias.
// Acertou: avança para o próximo intervalo. Errou: reinicia em 1 dia.
import { addDias } from '../lib/utils'

export const INTERVALOS = [1, 7, 30, 90]

/**
 * Calcula o próximo intervalo (em dias) a partir do atual.
 * @param {number} intervaloAtual dias do intervalo atual
 * @param {boolean} acertou se o usuário acertou a revisão
 */
export function proximoIntervalo(intervaloAtual, acertou) {
  if (!acertou) return INTERVALOS[0]
  const idx = INTERVALOS.indexOf(intervaloAtual)
  if (idx === -1) return INTERVALOS[1] // valor fora da escala: avança um nível padrão
  return INTERVALOS[Math.min(idx + 1, INTERVALOS.length - 1)]
}

/** Retorna a data ISO da próxima revisão a partir de uma data base + dias. */
export function calcularProximaRevisao(dataBaseIso, dias) {
  return addDias(dataBaseIso, dias)
}

/** Rótulo legível do intervalo. */
export function rotuloIntervalo(dias) {
  if (dias >= 30) return `${Math.round(dias / 30)} mês(es)`
  if (dias >= 7) return `${Math.round(dias / 7)} semana(s)`
  return `${dias} dia(s)`
}
