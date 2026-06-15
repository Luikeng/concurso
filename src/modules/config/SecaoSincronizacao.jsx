import { useState } from 'react'
import {
  Cloud,
  CloudOff,
  RefreshCw,
  LogIn,
  LogOut,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useAuth } from '../../store/useAuth'
import { useNotificar } from '../../store/useStore'
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Button,
  Field,
  Input,
  Badge,
  Spinner,
} from '../../components/ui'

/**
 * Seção "Conta e sincronização" da página de Configurações.
 * - Sem Supabase configurado: explica que está desligado (app segue local).
 * - Configurado e deslogado: formulário de login/cadastro.
 * - Logado: status da sincronização + ações.
 */
export function SecaoSincronizacao() {
  const configurado = useAuth((s) => s.configurado)
  const user = useAuth((s) => s.user)

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Cloud size={16} className="text-marca-600" />
            Conta e sincronização
          </span>
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        {!configurado ? (
          <NaoConfigurado />
        ) : user ? (
          <Logado />
        ) : (
          <FormularioAuth />
        )}
      </CardBody>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Supabase ainda não configurado                                      */
/* ------------------------------------------------------------------ */
function NaoConfigurado() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
      <CloudOff size={16} className="mt-0.5 shrink-0 text-slate-400" />
      <p>
        A sincronização na nuvem ainda não foi configurada. Enquanto isso, seus
        dados ficam salvos <strong>neste aparelho</strong> normalmente. Para
        ativar o sync entre aparelhos, veja o arquivo{' '}
        <code className="rounded bg-slate-200 px-1 dark:bg-slate-700">
          docs/SINCRONIZACAO.md
        </code>
        .
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Logado: status + ações                                              */
/* ------------------------------------------------------------------ */
function Logado() {
  const user = useAuth((s) => s.user)
  const status = useAuth((s) => s.status)
  const ultimaSync = useAuth((s) => s.ultimaSync)
  const erro = useAuth((s) => s.erro)
  const sincronizarAgora = useAuth((s) => s.sincronizarAgora)
  const sair = useAuth((s) => s.sair)
  const notificar = useNotificar()

  const sincronizando = status === 'sincronizando'

  async function aoSincronizar() {
    await sincronizarAgora()
    const st = useAuth.getState().status
    if (st === 'sincronizado') notificar('Sincronizado com sucesso.', 'sucesso')
    else if (st === 'offline') notificar('Sem internet: vai sincronizar quando voltar.', 'aviso')
    else if (st === 'erro') notificar('Falha ao sincronizar.', 'erro')
  }

  async function aoSair() {
    await sair()
    notificar('Você saiu da conta. Os dados continuam neste aparelho.', 'info')
  }

  return (
    <div className="space-y-4">
      {/* Identificação + selo de status */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-slate-400">Conectado como</p>
          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
            {user?.email}
          </p>
        </div>
        <SeloStatus status={status} />
      </div>

      {/* Última sincronização */}
      <p className="text-xs text-slate-400">
        {ultimaSync
          ? `Última sincronização: ${new Date(ultimaSync).toLocaleString('pt-BR')}`
          : 'Ainda não sincronizado neste aparelho.'}
      </p>

      {erro && status === 'erro' && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={aoSincronizar} disabled={sincronizando}>
          <RefreshCw size={16} className={sincronizando ? 'animate-spin' : ''} />
          {sincronizando ? 'Sincronizando...' : 'Sincronizar agora'}
        </Button>
        <Button variant="ghost" onClick={aoSair} disabled={sincronizando}>
          <LogOut size={16} /> Sair
        </Button>
      </div>

      <p className="text-[11px] text-slate-400">
        Seu progresso é salvo neste aparelho e na nuvem ao mesmo tempo. Faça
        login com o mesmo e-mail em outro aparelho para continuar de onde parou.
      </p>
    </div>
  )
}

/** Selo colorido conforme o status de sincronização. */
function SeloStatus({ status }) {
  const mapa = {
    sincronizando: { cor: 'azul', icone: RefreshCw, texto: 'Sincronizando', girar: true },
    sincronizado: { cor: 'verde', icone: CheckCircle2, texto: 'Sincronizado' },
    offline: { cor: 'cinza', icone: CloudOff, texto: 'Offline' },
    erro: { cor: 'vermelho', icone: AlertCircle, texto: 'Erro' },
    desconectado: { cor: 'cinza', icone: CloudOff, texto: 'Desconectado' },
  }
  const it = mapa[status] || mapa.desconectado
  const Icone = it.icone
  return (
    <Badge cor={it.cor}>
      <Icone size={11} className={it.girar ? 'animate-spin' : ''} /> {it.texto}
    </Badge>
  )
}

/* ------------------------------------------------------------------ */
/* Deslogado: login / cadastro                                         */
/* ------------------------------------------------------------------ */
function FormularioAuth() {
  const entrar = useAuth((s) => s.entrar)
  const cadastrar = useAuth((s) => s.cadastrar)
  const notificar = useNotificar()

  const [modo, setModo] = useState('entrar') // 'entrar' | 'cadastrar'
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)

  const ehCadastro = modo === 'cadastrar'

  async function aoEnviar(e) {
    e.preventDefault()
    if (!email.trim() || !senha) {
      notificar('Preencha e-mail e senha.', 'aviso')
      return
    }
    setCarregando(true)
    try {
      if (ehCadastro) {
        const { precisaConfirmar } = await cadastrar(email, senha)
        if (precisaConfirmar) {
          notificar(
            'Conta criada! Confirme o e-mail que enviamos para entrar.',
            'sucesso'
          )
        } else {
          notificar('Conta criada e conectada! Sincronizando...', 'sucesso')
        }
      } else {
        await entrar(email, senha)
        notificar('Login efetuado! Sincronizando seus dados...', 'sucesso')
      }
    } catch (err) {
      notificar(err.message || 'Não foi possível continuar.', 'erro')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-marca-200 bg-marca-50 p-3 text-xs text-marca-800 dark:border-marca-900 dark:bg-marca-950/40 dark:text-marca-200">
        <Cloud size={16} className="mt-0.5 shrink-0" />
        <p>
          Crie uma conta (ou entre) para <strong>sincronizar seu progresso</strong>{' '}
          entre o computador e o celular. O login é opcional — sem ele, os dados
          ficam só neste aparelho.
        </p>
      </div>

      {/* Abas entrar / cadastrar */}
      <div className="inline-flex w-full overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
        {[
          { id: 'entrar', rotulo: 'Entrar' },
          { id: 'cadastrar', rotulo: 'Criar conta' },
        ].map((op, i) => (
          <button
            key={op.id}
            type="button"
            onClick={() => setModo(op.id)}
            className={
              'flex-1 px-4 py-2 text-sm font-medium transition-colors ' +
              (i > 0 ? 'border-l border-slate-300 dark:border-slate-700 ' : '') +
              (modo === op.id
                ? 'bg-marca-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800')
            }
          >
            {op.rotulo}
          </button>
        ))}
      </div>

      <form onSubmit={aoEnviar} className="space-y-3">
        <Field label="E-mail">
          <div className="relative">
            <Mail
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              autoComplete="email"
              className="pl-9"
            />
          </div>
        </Field>

        <Field
          label="Senha"
          hint={ehCadastro ? 'Mínimo de 6 caracteres.' : undefined}
        >
          <div className="relative">
            <Lock
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              type={mostrarSenha ? 'text' : 'password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Sua senha"
              autoComplete={ehCadastro ? 'new-password' : 'current-password'}
              className="pl-9 pr-10"
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-marca-600"
              aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>

        <Button type="submit" disabled={carregando} className="w-full">
          {carregando ? (
            <Spinner label={ehCadastro ? 'Criando...' : 'Entrando...'} />
          ) : ehCadastro ? (
            <>
              <UserPlus size={16} /> Criar conta e sincronizar
            </>
          ) : (
            <>
              <LogIn size={16} /> Entrar
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
