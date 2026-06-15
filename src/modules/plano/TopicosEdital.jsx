import { useLiveQuery } from 'dexie-react-hooks'
import { CheckCircle2, Circle } from 'lucide-react'
import { db, dbApi } from '../../db/db'
import { Card, CardBody, ProgressBar, Dot, EmptyState } from '../../components/ui'
import { cn, pct } from '../../lib/utils'

/** Aba "Tópicos do edital": marcar cobertura por matéria. */
export function TopicosEdital() {
  const materias = useLiveQuery(() => db.materias.toArray(), [], [])
  const topicos = useLiveQuery(() => db.topicos.toArray(), [], [])

  if (topicos.length === 0) {
    return <EmptyState titulo="Nenhum tópico cadastrado" descricao="Os tópicos são gerados a partir da trilha." />
  }

  const cobertos = topicos.filter((t) => t.coberto).length
  const porMateria = materias
    .map((m) => ({
      materia: m,
      topicos: topicos.filter((t) => t.materiaId === m.id).sort((a, b) => a.nome.localeCompare(b.nome)),
    }))
    .filter((g) => g.topicos.length > 0)

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">Cobertura do edital</span>
            <span className="text-slate-500">
              {cobertos}/{topicos.length} tópicos
            </span>
          </div>
          <ProgressBar valor={cobertos} total={topicos.length} className="mt-2" mostrarTexto />
        </CardBody>
      </Card>

      {porMateria.map(({ materia, topicos: lista }) => {
        const cob = lista.filter((t) => t.coberto).length
        return (
          <Card key={materia.id}>
            <CardBody>
              <div className="mb-2 flex items-center gap-2">
                <Dot cor={materia.cor} />
                <h3 className="flex-1 text-sm font-semibold">{materia.nome}</h3>
                <span className="text-xs text-slate-400">
                  {cob}/{lista.length} • {pct(cob, lista.length)}%
                </span>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {lista.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => dbApi.toggleTopicoCoberto(t.id)}
                      className="flex w-full items-center gap-2 py-2 text-left text-sm transition-colors hover:text-marca-600"
                    >
                      {t.coberto ? (
                        <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
                      ) : (
                        <Circle size={18} className="shrink-0 text-slate-300 dark:text-slate-600" />
                      )}
                      <span className={cn(t.coberto && 'text-slate-400 line-through')}>{t.nome}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}
