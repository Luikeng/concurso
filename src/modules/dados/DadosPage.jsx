import { useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Download,
  Upload,
  RouteOff,
  Route,
  FileUp,
  Layers,
  AlertTriangle,
  Trash2,
  Save,
  ListChecks,
} from 'lucide-react'
import { db, dbApi } from '../../db/db'
import { recarregarTrilhaPadrao, importarTrilhaDeTexto } from '../../db/seed'
import { cardDeQuestao, cardDeTopico } from '../../services/flashcards'
import { exportarAnki, PASSOS_IMPORTACAO_ANKI } from '../../services/anki'
import { useNotificar } from '../../store/useStore'
import {
  Card,
  CardBody,
  Button,
  Select,
  Field,
  Badge,
  ConfirmDialog,
  Spinner,
} from '../../components/ui'
import { baixarJSON, lerArquivoComoTexto } from '../../lib/utils'

/**
 * Módulo "Dados": backup/restauração completa do app, exportação de
 * flashcards para o Anki, recarga/importação da trilha de estudos e
 * o reset de fábrica (zona de perigo).
 */
export function DadosPage() {
  return (
    <div className="space-y-4">
      {/* Resumo do que está salvo no banco local */}
      <ResumoBanco />

      {/* 1) Backup completo */}
      <BackupCompleto />

      {/* 2) Restaurar backup */}
      <RestaurarBackup />

      {/* 3) Trilha de estudos */}
      <TrilhaEstudos />

      {/* 4) Exportar para Anki */}
      <ExportarAnki />

      {/* 5) Zona de perigo */}
      <ZonaDePerigo />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Resumo: contagens de cada tabela (reativas via useLiveQuery)        */
/* ------------------------------------------------------------------ */
function ResumoBanco() {
  const materias = useLiveQuery(() => db.materias.count(), [], null)
  const topicos = useLiveQuery(() => db.topicos.count(), [], null)
  const questoes = useLiveQuery(() => db.questoes.count(), [], null)
  const tarefas = useLiveQuery(() => db.tarefas.count(), [], null)
  const registros = useLiveQuery(() => db.registros.count(), [], null)
  const sessoes = useLiveQuery(() => db.sessoes.count(), [], null)
  const revisoes = useLiveQuery(() => db.revisoes.count(), [], null)

  // null = ainda carregando as contagens.
  const carregando =
    [materias, topicos, questoes, tarefas, registros, sessoes, revisoes].some(
      (x) => x == null
    )

  const itens = [
    { rotulo: 'Matérias', valor: materias },
    { rotulo: 'Tópicos', valor: topicos },
    { rotulo: 'Questões', valor: questoes },
    { rotulo: 'Tarefas', valor: tarefas },
    { rotulo: 'Registros', valor: registros },
    { rotulo: 'Sessões', valor: sessoes },
    { rotulo: 'Revisões', valor: revisoes },
  ]

  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex items-center gap-2">
          <Layers size={18} className="text-marca-600" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            O que está salvo neste dispositivo
          </h2>
        </div>
        {carregando ? (
          <Spinner label="Calculando contagens..." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {itens.map((it) => (
              <div
                key={it.rotulo}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center dark:border-slate-800 dark:bg-slate-800/50"
              >
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {it.valor ?? 0}
                </p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {it.rotulo}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* 1) Backup completo                                                  */
/* ------------------------------------------------------------------ */
function BackupCompleto() {
  const notificar = useNotificar()
  const [exportando, setExportando] = useState(false)

  async function exportar() {
    setExportando(true)
    try {
      const dump = await dbApi.exportarTudo()
      baixarJSON('backup-estudos-trt.json', dump)
      notificar('Backup exportado com sucesso.', 'sucesso')
    } catch (e) {
      console.error(e)
      notificar('Não foi possível exportar o backup.', 'erro')
    } finally {
      setExportando(false)
    }
  }

  return (
    <Card>
      <CardBody>
        <div className="mb-2 flex items-center gap-2">
          <Save size={18} className="text-marca-600" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Backup completo
          </h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Salva <strong>tudo</strong> em um único arquivo: questões, plano de
          estudos, tópicos do edital, registros de desempenho, sessões, revisões
          e metas. Guarde o arquivo em local seguro para restaurar depois ou
          migrar para outro dispositivo.
        </p>
        <div className="mt-3">
          <Button onClick={exportar} disabled={exportando}>
            <Download size={16} />
            {exportando ? 'Exportando...' : 'Exportar backup (.json)'}
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* 2) Restaurar backup                                                 */
/* ------------------------------------------------------------------ */
function RestaurarBackup() {
  const notificar = useNotificar()
  const inputRef = useRef(null)
  const [dump, setDump] = useState(null) // backup lido, aguardando confirmação
  const [importando, setImportando] = useState(false)

  // Lê o arquivo escolhido e faz o parse antes de pedir confirmação.
  async function aoEscolherArquivo(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite reescolher o mesmo arquivo
    if (!file) return
    try {
      const texto = await lerArquivoComoTexto(file)
      const objeto = JSON.parse(texto)
      if (!objeto || typeof objeto !== 'object') {
        throw new Error('Conteúdo inválido.')
      }
      setDump(objeto)
    } catch (err) {
      console.error(err)
      notificar('Arquivo inválido: não é um backup JSON válido.', 'erro')
    }
  }

  async function confirmarRestauracao() {
    if (!dump) return
    setImportando(true)
    try {
      await dbApi.importarTudo(dump)
      notificar('Backup restaurado com sucesso.', 'sucesso')
    } catch (err) {
      console.error(err)
      notificar('Falha ao restaurar o backup.', 'erro')
    } finally {
      setImportando(false)
      setDump(null)
    }
  }

  return (
    <Card>
      <CardBody>
        <div className="mb-2 flex items-center gap-2">
          <Upload size={18} className="text-marca-600" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Restaurar backup
          </h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Selecione um arquivo de backup (.json). Ao confirmar, os dados atuais
          serão <strong>substituídos</strong> pelos do arquivo.
        </p>
        <div className="mt-3">
          <input
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            onChange={aoEscolherArquivo}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={importando}
          >
            <FileUp size={16} />
            {importando ? 'Restaurando...' : 'Escolher arquivo (.json)'}
          </Button>
        </div>
      </CardBody>

      <ConfirmDialog
        aberto={!!dump}
        onFechar={() => setDump(null)}
        onConfirmar={confirmarRestauracao}
        titulo="Restaurar backup"
        mensagem="Isto vai SUBSTITUIR todos os dados atuais pelos do arquivo selecionado. Os dados que estão no app agora serão perdidos. Deseja continuar?"
        textoConfirmar="Substituir e restaurar"
      />
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* 3) Trilha de estudos                                                */
/* ------------------------------------------------------------------ */
function TrilhaEstudos() {
  const notificar = useNotificar()
  const inputRef = useRef(null)
  const [confirmarPadrao, setConfirmarPadrao] = useState(false)
  const [trabalhando, setTrabalhando] = useState(false)

  // Mensagem de sucesso padronizada com as quantidades retornadas.
  function notificarResultado(res) {
    notificar(
      `Trilha aplicada: ${res.tarefas} tarefas, ${res.materias} matérias novas, ${res.topicos} tópicos novos.`,
      'sucesso'
    )
  }

  async function recarregarPadrao() {
    setTrabalhando(true)
    try {
      const res = await recarregarTrilhaPadrao()
      notificarResultado(res)
    } catch (e) {
      console.error(e)
      notificar('Falha ao recarregar a trilha padrão.', 'erro')
    } finally {
      setTrabalhando(false)
    }
  }

  async function aoEscolherMd(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setTrabalhando(true)
    try {
      const texto = await lerArquivoComoTexto(file)
      const res = await importarTrilhaDeTexto(texto)
      notificarResultado(res)
    } catch (err) {
      console.error(err)
      notificar('Não foi possível importar o arquivo de trilha (.md).', 'erro')
    } finally {
      setTrabalhando(false)
    }
  }

  return (
    <Card>
      <CardBody>
        <div className="mb-2 flex items-center gap-2">
          <Route size={18} className="text-marca-600" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Trilha de estudos
          </h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Recarregar ou importar uma trilha <strong>substitui as tarefas</strong>{' '}
          do plano e <strong>adiciona</strong> matérias e tópicos novos (por
          nome), sem apagar os já existentes. Suas questões e estatísticas não
          são afetadas.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setConfirmarPadrao(true)}
            disabled={trabalhando}
          >
            <RouteOff size={16} /> Recarregar trilha padrão
          </Button>

          <input
            ref={inputRef}
            type="file"
            accept=".md,text/markdown"
            onChange={aoEscolherMd}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={trabalhando}
          >
            <FileUp size={16} /> Importar trilha (.md)
          </Button>
        </div>
        {trabalhando && <Spinner className="mt-3" label="Aplicando trilha..." />}
      </CardBody>

      <ConfirmDialog
        aberto={confirmarPadrao}
        onFechar={() => setConfirmarPadrao(false)}
        onConfirmar={recarregarPadrao}
        variante="primary"
        titulo="Recarregar trilha padrão"
        mensagem="As tarefas atuais do plano serão substituídas pela trilha padrão do app. Matérias e tópicos novos serão adicionados. Deseja continuar?"
        textoConfirmar="Recarregar"
      />
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* 4) Exportar para Anki                                               */
/* ------------------------------------------------------------------ */
const FONTES = {
  TODAS: 'todas',
  MATERIA: 'materia',
  TOPICOS: 'topicos',
  FLASHCARDS: 'flashcards',
}

function ExportarAnki() {
  const notificar = useNotificar()
  const materias = useLiveQuery(() => db.materias.toArray(), [], [])

  const [fonte, setFonte] = useState(FONTES.TODAS)
  const [materiaId, setMateriaId] = useState('')
  const [exportando, setExportando] = useState(false)

  async function exportar() {
    setExportando(true)
    try {
      // Mapas auxiliares para resolver nomes de matéria/tópico.
      const listaMaterias = await db.materias.toArray()
      const listaTopicos = await db.topicos.toArray()
      const nomeMateria = new Map(listaMaterias.map((m) => [m.id, m.nome]))
      const nomeTopico = new Map(listaTopicos.map((t) => [t.id, t.nome]))

      let cards = []

      if (fonte === FONTES.TODAS) {
        const questoes = await db.questoes.toArray()
        cards = questoes.map((q) =>
          cardDeQuestao(q, {
            materiaNome: nomeMateria.get(q.materiaId) || '',
            topicoNome: nomeTopico.get(q.topicoId) || '',
          })
        )
      } else if (fonte === FONTES.MATERIA) {
        if (!materiaId) {
          notificar('Escolha uma matéria para exportar.', 'aviso')
          setExportando(false)
          return
        }
        const questoes = await db.questoes
          .where('materiaId')
          .equals(materiaId)
          .toArray()
        cards = questoes.map((q) =>
          cardDeQuestao(q, {
            materiaNome: nomeMateria.get(q.materiaId) || '',
            topicoNome: nomeTopico.get(q.topicoId) || '',
          })
        )
      } else if (fonte === FONTES.TOPICOS) {
        const cobertos = listaTopicos.filter((t) => t.coberto)
        cards = cobertos.map((t) =>
          cardDeTopico(t, '', { materiaNome: nomeMateria.get(t.materiaId) || '' })
        )
      } else if (fonte === FONTES.FLASHCARDS) {
        const listaFlashcards = await db.flashcards.toArray()
        cards = listaFlashcards.map((f) => ({
          frente: f.frente,
          verso: f.verso,
          tags: (f.tags || [])
            .map((t) => String(t).trim().replace(/\s+/g, '_'))
            .filter(Boolean)
            .join(' '),
        }))
      }

      if (cards.length === 0) {
        notificar('Nenhum card para exportar com essa fonte.', 'aviso')
        return
      }

      // exportarAnki lança erro se a lista vier vazia (já tratamos acima).
      exportarAnki(cards, 'flashcards-trt-anki.txt')
      notificar(`${cards.length} card(s) exportado(s) para o Anki.`, 'sucesso')
    } catch (e) {
      console.error(e)
      notificar('Falha ao exportar os flashcards.', 'erro')
    } finally {
      setExportando(false)
    }
  }

  return (
    <Card>
      <CardBody>
        <div className="mb-2 flex items-center gap-2">
          <Layers size={18} className="text-marca-600" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Exportar para o Anki (flashcards)
          </h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Gera um arquivo .txt (TSV) pronto para importar no Anki. Escolha a
          fonte dos cards abaixo.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Fonte dos cards">
            <Select value={fonte} onChange={(e) => setFonte(e.target.value)}>
              <option value={FONTES.TODAS}>Todas as questões</option>
              <option value={FONTES.MATERIA}>Questões de uma matéria</option>
              <option value={FONTES.TOPICOS}>Tópicos cobertos do edital</option>
              <option value={FONTES.FLASHCARDS}>Flashcards (banco de flashcards)</option>
            </Select>
          </Field>

          {fonte === FONTES.MATERIA && (
            <Field label="Matéria">
              <Select
                value={materiaId}
                onChange={(e) => setMateriaId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {materias.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>

        <div className="mt-3">
          <Button onClick={exportar} disabled={exportando}>
            <Download size={16} />
            {exportando ? 'Exportando...' : 'Exportar flashcards (.txt)'}
          </Button>
        </div>

        {/* Passo a passo de importação no Anki */}
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="mb-2 flex items-center gap-2">
            <ListChecks size={16} className="text-slate-500" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Como importar no Anki
            </p>
          </div>
          <ol className="ml-1 list-inside list-decimal space-y-1 text-sm text-slate-600 dark:text-slate-300">
            {PASSOS_IMPORTACAO_ANKI.map((passo, i) => (
              <li key={i}>{passo}</li>
            ))}
          </ol>
        </div>
      </CardBody>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* 5) Zona de perigo                                                   */
/* ------------------------------------------------------------------ */
function ZonaDePerigo() {
  const notificar = useNotificar()
  const [confirmar, setConfirmar] = useState(false)
  const [resetando, setResetando] = useState(false)

  async function resetar() {
    setResetando(true)
    try {
      await dbApi.resetarTudo()
      notificar('Todos os dados foram apagados.', 'sucesso')
    } catch (e) {
      console.error(e)
      notificar('Falha ao apagar os dados.', 'erro')
    } finally {
      setResetando(false)
    }
  }

  return (
    <Card className="border-red-200 dark:border-red-900/60">
      <CardBody>
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-600" />
          <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">
            Zona de perigo
          </h2>
          <Badge cor="vermelho">Irreversível</Badge>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Apaga <strong>todos</strong> os dados deste dispositivo (questões,
          plano, registros, sessões, revisões e metas). Esta ação{' '}
          <strong>não pode ser desfeita</strong>. Faça um backup antes, se
          quiser preservar algo.
        </p>
        <div className="mt-3">
          <Button
            variant="danger"
            onClick={() => setConfirmar(true)}
            disabled={resetando}
          >
            <Trash2 size={16} />
            {resetando ? 'Apagando...' : 'Apagar todos os dados'}
          </Button>
        </div>
      </CardBody>

      <ConfirmDialog
        aberto={confirmar}
        onFechar={() => setConfirmar(false)}
        onConfirmar={resetar}
        titulo="Apagar TODOS os dados"
        mensagem="Esta ação é IRREVERSÍVEL. Todos os dados (questões, plano, registros, sessões, revisões e metas) serão apagados permanentemente deste dispositivo. Tem certeza absoluta?"
        textoConfirmar="Sim, apagar tudo"
      />
    </Card>
  )
}
