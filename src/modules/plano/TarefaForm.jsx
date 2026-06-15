import { useState } from 'react'
import { Modal, Field, Input, Textarea, Select, Button } from '../../components/ui'
import { db, dbApi } from '../../db/db'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNotificar } from '../../store/useStore'

/** Formulário de criação/edição de tarefa do plano. */
export function TarefaForm({ aberto, onFechar, tarefa }) {
  const materias = useLiveQuery(() => db.materias.toArray(), [], [])
  const notificar = useNotificar()
  const editando = !!tarefa

  const [form, setForm] = useState(() => ({
    semana: tarefa?.semana || 1,
    dia: tarefa?.dia || 1,
    materia: tarefa?.materia || '',
    topico: tarefa?.topico || '',
    descricao: tarefa?.descricao || '',
    recursoUrl: tarefa?.recursoUrl || '',
    metaQuestoes: tarefa?.metaQuestoes || 0,
  }))

  const set = (campo) => (e) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }))

  async function salvar() {
    if (!form.materia.trim()) {
      notificar('Informe a matéria.', 'aviso')
      return
    }
    const dados = {
      ...form,
      semana: Number(form.semana) || 1,
      dia: Number(form.dia) || 1,
      metaQuestoes: Number(form.metaQuestoes) || 0,
    }
    if (editando) {
      await dbApi.updateTarefa(tarefa.id, dados)
      notificar('Tarefa atualizada.', 'sucesso')
    } else {
      await dbApi.addTarefa(dados)
      notificar('Tarefa adicionada.', 'sucesso')
    }
    onFechar()
  }

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={editando ? 'Editar tarefa' : 'Nova tarefa'}
      rodape={
        <>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button onClick={salvar}>{editando ? 'Salvar' : 'Adicionar'}</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Semana">
            <Input type="number" min={1} value={form.semana} onChange={set('semana')} />
          </Field>
          <Field label="Dia">
            <Input type="number" min={1} value={form.dia} onChange={set('dia')} />
          </Field>
        </div>
        <Field label="Matéria">
          <Input
            list="lista-materias"
            value={form.materia}
            onChange={set('materia')}
            placeholder="Ex.: Língua Portuguesa"
          />
          <datalist id="lista-materias">
            {materias.map((m) => (
              <option key={m.id} value={m.nome} />
            ))}
          </datalist>
        </Field>
        <Field label="Tópico">
          <Input value={form.topico} onChange={set('topico')} placeholder="Ex.: Crase" />
        </Field>
        <Field label="Descrição">
          <Textarea value={form.descricao} onChange={set('descricao')} placeholder="O que fazer nesta tarefa" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Link do recurso (opcional)">
            <Input value={form.recursoUrl} onChange={set('recursoUrl')} placeholder="https://..." />
          </Field>
          <Field label="Meta de questões">
            <Input type="number" min={0} value={form.metaQuestoes} onChange={set('metaQuestoes')} />
          </Field>
        </div>
      </div>
    </Modal>
  )
}
