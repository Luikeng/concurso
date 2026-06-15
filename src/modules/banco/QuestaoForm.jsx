import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Trash2 } from 'lucide-react'
import { db, dbApi } from '../../db/db'
import { Modal, Field, Input, Textarea, Select, Button } from '../../components/ui'
import { useNotificar } from '../../store/useStore'
import { ROTULO_DIFICULDADE, cn } from '../../lib/utils'

/**
 * Formulário de criação/edição de questão do banco.
 *
 * Campos: matéria, tópico (filtrado pela matéria), enunciado, alternativas
 * dinâmicas (um radio marca a correta -> gabarito = índice), comentário,
 * banca, dificuldade (1-3), tags (separadas por vírgula -> array).
 * A origem fica oculta: 'manual' ao criar manualmente; mantém a original ao editar.
 */
export function QuestaoForm({ aberto, onFechar, questao }) {
  const materias = useLiveQuery(() => db.materias.toArray(), [], [])
  const topicos = useLiveQuery(() => db.topicos.toArray(), [], [])
  const notificar = useNotificar()
  const editando = !!questao

  // Estado inicial do formulário (a partir da questão em edição ou vazio).
  const [form, setForm] = useState(() => ({
    materiaId: questao?.materiaId || '',
    topicoId: questao?.topicoId || '',
    enunciado: questao?.enunciado || '',
    comentario: questao?.comentario || '',
    banca: questao?.banca || '',
    dificuldade: questao?.dificuldade || 2,
    tags: Array.isArray(questao?.tags) ? questao.tags.join(', ') : '',
  }))

  // Alternativas como lista editável; garante ao menos 2 linhas em branco.
  const [alternativas, setAlternativas] = useState(() => {
    const base = Array.isArray(questao?.alternativas) ? [...questao.alternativas] : []
    while (base.length < 2) base.push('')
    return base
  })
  // Índice da alternativa correta (gabarito).
  const [correta, setCorreta] = useState(() =>
    typeof questao?.gabarito === 'number' ? questao.gabarito : 0,
  )
  const [salvando, setSalvando] = useState(false)

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  // Tópicos da matéria escolhida (para o Select de tópico).
  const topicosDaMateria = useMemo(
    () => topicos.filter((t) => t.materiaId === form.materiaId),
    [topicos, form.materiaId],
  )

  // Ao trocar a matéria, limpa o tópico para evitar combinação inválida.
  function trocarMateria(e) {
    const materiaId = e.target.value
    setForm((f) => ({ ...f, materiaId, topicoId: '' }))
  }

  function alterarAlternativa(i, valor) {
    setAlternativas((alts) => alts.map((a, idx) => (idx === i ? valor : a)))
  }

  function adicionarAlternativa() {
    setAlternativas((alts) => [...alts, ''])
  }

  function removerAlternativa(i) {
    setAlternativas((alts) => {
      const novas = alts.filter((_, idx) => idx !== i)
      return novas.length >= 1 ? novas : alts
    })
    // Reajusta o índice da correta após a remoção.
    setCorreta((c) => {
      if (i === c) return 0
      return i < c ? c - 1 : c
    })
  }

  async function salvar() {
    const enunciado = form.enunciado.trim()
    if (!enunciado) {
      notificar('Informe o enunciado da questão.', 'aviso')
      return
    }
    // Considera apenas alternativas com texto.
    const alts = alternativas.map((a) => a.trim())
    const preenchidas = alts.filter((a) => a !== '')
    if (preenchidas.length < 2) {
      notificar('Cadastre pelo menos 2 alternativas.', 'aviso')
      return
    }
    if (!alts[correta] || alts[correta].trim() === '') {
      notificar('A alternativa marcada como correta está vazia.', 'aviso')
      return
    }

    // Remove alternativas vazias e recalcula o índice do gabarito.
    const alternativasFinais = []
    let gabarito = 0
    alts.forEach((a, idx) => {
      if (a !== '') {
        if (idx === correta) gabarito = alternativasFinais.length
        alternativasFinais.push(a)
      }
    })

    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const dados = {
      materiaId: form.materiaId || null,
      topicoId: form.topicoId || null,
      enunciado,
      alternativas: alternativasFinais,
      gabarito,
      comentario: form.comentario.trim(),
      banca: form.banca.trim(),
      dificuldade: Number(form.dificuldade) || 2,
      tags,
      // Mantém a origem ao editar; novas questões manuais nascem como 'manual'.
      origem: questao?.origem || 'manual',
    }

    setSalvando(true)
    try {
      if (editando) {
        await dbApi.updateQuestao(questao.id, dados)
        notificar('Questão atualizada.', 'sucesso')
      } else {
        await dbApi.addQuestao(dados)
        notificar('Questão adicionada.', 'sucesso')
      }
      onFechar()
    } catch (err) {
      notificar('Erro ao salvar a questão.', 'erro')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={editando ? 'Editar questão' : 'Nova questão'}
      tamanho="lg"
      rodape={
        <>
          <Button variant="ghost" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : editando ? 'Salvar' : 'Adicionar'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {/* Matéria e tópico */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Matéria">
            <Select value={form.materiaId} onChange={trocarMateria}>
              <option value="">Sem matéria</option>
              {materias.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tópico">
            <Select
              value={form.topicoId}
              onChange={set('topicoId')}
              disabled={!form.materiaId}
            >
              <option value="">
                {form.materiaId ? 'Sem tópico' : 'Escolha a matéria'}
              </option>
              {topicosDaMateria.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {/* Enunciado */}
        <Field label="Enunciado">
          <Textarea
            rows={4}
            value={form.enunciado}
            onChange={set('enunciado')}
            placeholder="Digite o enunciado da questão"
          />
        </Field>

        {/* Alternativas dinâmicas */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Alternativas
            </span>
            <span className="text-xs text-slate-400">Marque a correta</span>
          </div>
          <div className="space-y-2">
            {alternativas.map((alt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="alternativa-correta"
                  checked={correta === i}
                  onChange={() => setCorreta(i)}
                  className="h-4 w-4 shrink-0 text-marca-600 focus:ring-marca-500"
                  aria-label={`Marcar alternativa ${i + 1} como correta`}
                />
                <Input
                  value={alt}
                  onChange={(e) => alterarAlternativa(i, e.target.value)}
                  placeholder={`Alternativa ${String.fromCharCode(65 + i)}`}
                  className={cn(correta === i && 'border-marca-500 ring-1 ring-marca-500/30')}
                />
                <button
                  type="button"
                  onClick={() => removerAlternativa(i)}
                  disabled={alternativas.length <= 2}
                  className="shrink-0 rounded p-1.5 text-slate-400 transition-colors hover:text-red-600 disabled:opacity-30 disabled:hover:text-slate-400"
                  aria-label="Remover alternativa"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={adicionarAlternativa}
          >
            <Plus size={15} /> Adicionar alternativa
          </Button>
        </div>

        {/* Comentário */}
        <Field label="Comentário (opcional)">
          <Textarea
            value={form.comentario}
            onChange={set('comentario')}
            placeholder="Explicação ou observações sobre a questão"
          />
        </Field>

        {/* Banca e dificuldade */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Banca">
            <Input
              value={form.banca}
              onChange={set('banca')}
              placeholder="Ex.: FCC, Cebraspe, FGV"
            />
          </Field>
          <Field label="Dificuldade">
            <Select value={form.dificuldade} onChange={set('dificuldade')}>
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {ROTULO_DIFICULDADE[n]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {/* Tags */}
        <Field label="Tags (separadas por vírgula)" hint="Ex.: crase, concordância">
          <Input
            value={form.tags}
            onChange={set('tags')}
            placeholder="tag1, tag2, tag3"
          />
        </Field>
      </div>
    </Modal>
  )
}
