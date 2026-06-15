import { useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Download,
  Upload,
  Search,
  Database,
  X,
} from 'lucide-react'
import { db, dbApi } from '../../db/db'
import {
  Card,
  CardBody,
  Button,
  Badge,
  Dot,
  EmptyState,
  ConfirmDialog,
} from '../../components/ui'
import { useNotificar } from '../../store/useStore'
import {
  ROTULO_DIFICULDADE,
  baixarJSON,
  lerArquivoComoTexto,
} from '../../lib/utils'
import { QuestaoForm } from './QuestaoForm'

// Quantidade exibida por "página" (carregamento incremental).
const PAGINA = 50

// Cor do Badge de dificuldade conforme o nível.
const COR_DIFICULDADE = { 1: 'verde', 2: 'ambar', 3: 'vermelho' }

/** Trunca um texto preservando palavras. */
function truncar(texto, max = 140) {
  const t = (texto || '').trim()
  if (t.length <= max) return t
  return t.slice(0, max).trimEnd() + '…'
}

/** Página principal do módulo Banco de questões. */
export function BancoPage() {
  const questoes = useLiveQuery(() => db.questoes.toArray(), [], [])
  const materias = useLiveQuery(() => db.materias.toArray(), [], [])
  const topicos = useLiveQuery(() => db.topicos.toArray(), [], [])
  const notificar = useNotificar()
  const inputArquivo = useRef(null)

  // Estado dos filtros.
  const [busca, setBusca] = useState('')
  const [filtroMateria, setFiltroMateria] = useState('')
  const [filtroTopico, setFiltroTopico] = useState('')
  const [filtroBanca, setFiltroBanca] = useState('')
  const [filtroDificuldade, setFiltroDificuldade] = useState('')
  const [filtroTag, setFiltroTag] = useState('')
  const [filtroOrigem, setFiltroOrigem] = useState('')

  // Estado da UI.
  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [excluir, setExcluir] = useState(null)
  const [visiveis, setVisiveis] = useState(PAGINA)

  // Mapas auxiliares (id -> matéria/tópico) para exibição rápida.
  const mapaMaterias = useMemo(() => {
    const m = new Map()
    materias.forEach((x) => m.set(x.id, x))
    return m
  }, [materias])
  const mapaTopicos = useMemo(() => {
    const m = new Map()
    topicos.forEach((x) => m.set(x.id, x))
    return m
  }, [topicos])

  // Tópicos da matéria escolhida no filtro.
  const topicosDoFiltro = useMemo(
    () => topicos.filter((t) => t.materiaId === filtroMateria),
    [topicos, filtroMateria],
  )

  // Bancas distintas presentes nas questões (para o select de banca).
  const bancas = useMemo(() => {
    const set = new Set()
    questoes.forEach((q) => {
      if (q.banca && q.banca.trim()) set.add(q.banca.trim())
    })
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [questoes])

  // Aplica todos os filtros combinados (AND).
  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const tag = filtroTag.trim().toLowerCase()
    return questoes
      .filter((q) => {
        if (termo && !(q.enunciado || '').toLowerCase().includes(termo)) return false
        if (filtroMateria && q.materiaId !== filtroMateria) return false
        if (filtroTopico && q.topicoId !== filtroTopico) return false
        if (filtroBanca && (q.banca || '').trim() !== filtroBanca) return false
        if (filtroDificuldade && String(q.dificuldade) !== filtroDificuldade) return false
        if (filtroOrigem && q.origem !== filtroOrigem) return false
        if (tag) {
          const tags = Array.isArray(q.tags) ? q.tags : []
          if (!tags.some((x) => String(x).toLowerCase().includes(tag))) return false
        }
        return true
      })
      // Mais recentes primeiro.
      .sort((a, b) => String(b.criadaEm || '').localeCompare(String(a.criadaEm || '')))
  }, [
    questoes,
    busca,
    filtroMateria,
    filtroTopico,
    filtroBanca,
    filtroDificuldade,
    filtroTag,
    filtroOrigem,
  ])

  const exibidas = filtradas.slice(0, visiveis)
  const temFiltro =
    busca ||
    filtroMateria ||
    filtroTopico ||
    filtroBanca ||
    filtroDificuldade ||
    filtroTag ||
    filtroOrigem

  // ---------- Ações ----------
  function abrirNova() {
    setEditando(null)
    setFormAberto(true)
  }
  function abrirEdicao(q) {
    setEditando(q)
    setFormAberto(true)
  }
  function trocarFiltroMateria(e) {
    setFiltroMateria(e.target.value)
    setFiltroTopico('') // tópico depende da matéria
    setVisiveis(PAGINA)
  }
  function limparFiltros() {
    setBusca('')
    setFiltroMateria('')
    setFiltroTopico('')
    setFiltroBanca('')
    setFiltroDificuldade('')
    setFiltroTag('')
    setFiltroOrigem('')
    setVisiveis(PAGINA)
  }

  // "Errei" -> agenda revisão da questão para hoje.
  async function marcarErrei(q) {
    try {
      await dbApi.agendarRevisao({
        refTipo: 'questao',
        refId: q.id,
        titulo: truncar(q.enunciado, 80),
      })
      notificar('Questão enviada para revisão.', 'sucesso')
    } catch (err) {
      notificar('Erro ao enviar para revisão.', 'erro')
    }
  }

  // Exporta as questões filtradas (ou todas, se não houver filtro).
  function exportar() {
    const lista = temFiltro ? filtradas : questoes
    if (lista.length === 0) {
      notificar('Não há questões para exportar.', 'aviso')
      return
    }
    baixarJSON('banco-questoes.json', lista)
    notificar(`${lista.length} questões exportadas.`, 'sucesso')
  }

  // Importa questões de um arquivo JSON (array ou { questoes: [...] }).
  async function importar(e) {
    const file = e.target.files?.[0]
    if (inputArquivo.current) inputArquivo.current.value = '' // permite reimportar o mesmo arquivo
    if (!file) return
    try {
      const texto = await lerArquivoComoTexto(file)
      const dados = JSON.parse(texto)
      const lista = Array.isArray(dados)
        ? dados
        : Array.isArray(dados?.questoes)
          ? dados.questoes
          : null
      if (!lista || lista.length === 0) {
        notificar('Arquivo sem questões válidas.', 'erro')
        return
      }
      const ids = await dbApi.addQuestoes(lista)
      notificar(`${ids.length} questões importadas.`, 'sucesso')
    } catch (err) {
      notificar('Arquivo JSON inválido.', 'erro')
    }
  }

  // ---------- Estado vazio (nenhuma questão cadastrada) ----------
  if (questoes.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={Database}
          titulo="Nenhuma questão no banco"
          descricao="Cadastre questões manualmente ou importe um arquivo JSON."
          acao={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={abrirNova}>
                <Plus size={16} /> Nova questão
              </Button>
              <Button variant="outline" onClick={() => inputArquivo.current?.click()}>
                <Upload size={16} /> Importar
              </Button>
            </div>
          }
        />
        <input
          ref={inputArquivo}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={importar}
        />
        {formAberto && (
          <QuestaoForm
            aberto={formAberto}
            onFechar={() => setFormAberto(false)}
            questao={editando}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Barra de ações */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Banco de questões
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={exportar}>
            <Download size={15} /> Exportar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => inputArquivo.current?.click()}
          >
            <Upload size={15} /> Importar
          </Button>
          <Button size="sm" onClick={abrirNova}>
            <Plus size={15} /> Nova questão
          </Button>
        </div>
      </div>
      <input
        ref={inputArquivo}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={importar}
      />

      {/* Filtros */}
      <Card>
        <CardBody className="space-y-3">
          {/* Busca por texto */}
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value)
                setVisiveis(PAGINA)
              }}
              placeholder="Buscar no enunciado..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Selects de filtro (grade responsiva) */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <select
              value={filtroMateria}
              onChange={trocarFiltroMateria}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Todas as matérias</option>
              {materias.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>

            <select
              value={filtroTopico}
              onChange={(e) => {
                setFiltroTopico(e.target.value)
                setVisiveis(PAGINA)
              }}
              disabled={!filtroMateria}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-500/30 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">
                {filtroMateria ? 'Todos os tópicos' : 'Todos os tópicos'}
              </option>
              {topicosDoFiltro.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>

            <select
              value={filtroBanca}
              onChange={(e) => {
                setFiltroBanca(e.target.value)
                setVisiveis(PAGINA)
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Todas as bancas</option>
              {bancas.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <select
              value={filtroDificuldade}
              onChange={(e) => {
                setFiltroDificuldade(e.target.value)
                setVisiveis(PAGINA)
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Todas as dificuldades</option>
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {ROTULO_DIFICULDADE[n]}
                </option>
              ))}
            </select>

            <select
              value={filtroOrigem}
              onChange={(e) => {
                setFiltroOrigem(e.target.value)
                setVisiveis(PAGINA)
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Todas as origens</option>
              <option value="seed">Conteúdo inicial</option>
              <option value="manual">Manual</option>
              <option value="ia">IA</option>
            </select>

            <input
              value={filtroTag}
              onChange={(e) => {
                setFiltroTag(e.target.value)
                setVisiveis(PAGINA)
              }}
              placeholder="Filtrar por tag..."
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Contagem + limpar filtros */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {filtradas.length} {filtradas.length === 1 ? 'resultado' : 'resultados'}
              {temFiltro && questoes.length !== filtradas.length
                ? ` de ${questoes.length}`
                : ''}
            </span>
            {temFiltro && (
              <Button size="sm" variant="ghost" onClick={limparFiltros}>
                <X size={14} /> Limpar filtros
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Lista de questões */}
      {filtradas.length === 0 ? (
        <EmptyState
          icon={Search}
          titulo="Nenhuma questão encontrada"
          descricao="Tente ajustar ou limpar os filtros."
          acao={
            <Button variant="outline" onClick={limparFiltros}>
              Limpar filtros
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {exibidas.map((q) => (
            <QuestaoItem
              key={q.id}
              questao={q}
              materia={mapaMaterias.get(q.materiaId)}
              topico={mapaTopicos.get(q.topicoId)}
              onEditar={() => abrirEdicao(q)}
              onExcluir={() => setExcluir(q)}
              onErrei={() => marcarErrei(q)}
            />
          ))}

          {/* Carregar mais */}
          {visiveis < filtradas.length && (
            <div className="flex justify-center pt-1">
              <Button
                variant="outline"
                onClick={() => setVisiveis((v) => v + PAGINA)}
              >
                Carregar mais ({filtradas.length - visiveis} restantes)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Modal de criação/edição */}
      {formAberto && (
        <QuestaoForm
          aberto={formAberto}
          onFechar={() => setFormAberto(false)}
          questao={editando}
        />
      )}

      {/* Confirmação de exclusão */}
      <ConfirmDialog
        aberto={!!excluir}
        onFechar={() => setExcluir(null)}
        onConfirmar={() => dbApi.deleteQuestao(excluir.id)}
        titulo="Excluir questão"
        mensagem={`Remover "${truncar(excluir?.enunciado, 60)}"? Esta ação não pode ser desfeita.`}
        textoConfirmar="Excluir"
      />
    </div>
  )
}

/** Cartão de uma questão na lista. */
function QuestaoItem({ questao, materia, topico, onEditar, onExcluir, onErrei }) {
  const tags = Array.isArray(questao.tags) ? questao.tags : []
  const cor = materia?.cor || '#94a3b8'

  return (
    <Card>
      <CardBody className="space-y-2">
        {/* Etiquetas */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge cor="cinza" style={{ color: cor }}>
            <Dot cor={cor} /> {materia?.nome || 'Sem matéria'}
          </Badge>
          {topico && (
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {topico.nome}
            </span>
          )}
          {questao.banca && questao.banca.trim() && (
            <Badge cor="azul">{questao.banca}</Badge>
          )}
          <Badge cor={COR_DIFICULDADE[questao.dificuldade] || 'cinza'}>
            {ROTULO_DIFICULDADE[questao.dificuldade] || '—'}
          </Badge>
          <Badge cor={questao.origem === 'ia' ? 'marca' : questao.origem === 'seed' ? 'azul' : 'cinza'}>
            {questao.origem === 'ia' ? 'IA' : questao.origem === 'seed' ? 'Inicial' : 'Manual'}
          </Badge>
        </div>

        {/* Enunciado truncado */}
        <p className="text-sm text-slate-700 dark:text-slate-200">
          {truncar(questao.enunciado, 140)}
        </p>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((t, i) => (
              <span
                key={i}
                className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onErrei}>
            <RotateCcw size={14} /> Errei
          </Button>
          <Button size="sm" variant="ghost" onClick={onEditar}>
            <Pencil size={14} /> Editar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600 hover:text-red-700"
            onClick={onExcluir}
          >
            <Trash2 size={14} /> Excluir
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
