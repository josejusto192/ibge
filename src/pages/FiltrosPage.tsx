import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { IconChevronLeft, IconFilter } from '../components/Icons'

const BANCAS_IBGE = ['CEBRASPE (CESPE)', 'CESGRANRIO', 'CONSULPLAN', 'FGV', 'IBADE', 'IBFC', 'IDECAN', 'Instituto AOCP', 'SELECON', 'Tec Concursos']

interface FiltroState { bancas: string[]; anos: string[]; soNaoRespondidas: boolean }

export function FiltrosPage() {
  const { slug, disciplina } = useParams<{ slug: string; disciplina: string }>()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const disciplinaDecoded = decodeURIComponent(disciplina!)
  const nivelParam = searchParams.get('nivel') ?? undefined

  const [anosDisponiveis, setAnosDisponiveis] = useState<number[]>([])
  const [totalQuestoes, setTotalQuestoes] = useState(0)
  const [totalFiltradas, setTotalFiltradas] = useState<number | null>(null)
  const [loadingCount, setLoadingCount] = useState(false)
  const [respondidaIds, setRespondidaIds] = useState<Set<string>>(new Set())
  const [filtros, setFiltros] = useState<FiltroState>({ bancas: [], anos: [], soNaoRespondidas: true })

  useEffect(() => {
    if (!user) return
    const load = async () => {
      let q = supabase.from('questoes').select('id, ano, banca').eq('disciplina', disciplinaDecoded).eq('anulada', false).eq('desatualizada', false)
      if (nivelParam) q = q.eq('nivel_escolaridade', nivelParam)
      const [{ data: questoes }, { data: respondidas }] = await Promise.all([q, supabase.from('progresso_questoes').select('questao_id').eq('usuario_id', user.id)])
      const rows = (questoes ?? []) as { id: string; ano: number | null; banca: string | null }[]
      setAnosDisponiveis([...new Set(rows.map((q) => q.ano).filter(Boolean) as number[])].sort((a, b) => b - a))
      setTotalQuestoes(rows.length)
      setRespondidaIds(new Set(((respondidas ?? []) as { questao_id: string }[]).map((r) => r.questao_id)))
    }
    load()
  }, [disciplinaDecoded, nivelParam, user])

  useEffect(() => {
    if (!user || totalQuestoes === 0) return
    setLoadingCount(true)
    const count = async () => {
      let query = supabase.from('questoes').select('id').eq('disciplina', disciplinaDecoded).eq('anulada', false).eq('desatualizada', false)
      if (nivelParam) query = query.eq('nivel_escolaridade', nivelParam)
      if (filtros.bancas.length > 0) query = query.in('banca', filtros.bancas)
      if (filtros.anos.length > 0) query = query.in('ano', filtros.anos.map(Number))
      const { data } = await query
      const rows = (data ?? []) as { id: string }[]
      setTotalFiltradas(filtros.soNaoRespondidas ? rows.filter((q) => !respondidaIds.has(q.id)).length : rows.length)
      setLoadingCount(false)
    }
    count()
  }, [filtros, disciplinaDecoded, nivelParam, user, respondidaIds, totalQuestoes])

  const toggleBanca = (b: string) => setFiltros((f) => ({ ...f, bancas: f.bancas.includes(b) ? f.bancas.filter((x) => x !== b) : [...f.bancas, b] }))
  const toggleAno = (a: string) => setFiltros((f) => ({ ...f, anos: f.anos.includes(a) ? f.anos.filter((x) => x !== a) : [...f.anos, a] }))

  const iniciarSessao = () => {
    const params = new URLSearchParams()
    if (nivelParam) params.set('nivel', nivelParam)
    if (filtros.bancas.length > 0) params.set('bancas', filtros.bancas.join(','))
    if (filtros.anos.length > 0) params.set('anos', filtros.anos.join(','))
    params.set('soNaoRespondidas', String(filtros.soNaoRespondidas))
    navigate(`/trilha/${slug}/disciplina/${disciplina}/sessao?${params.toString()}`)
  }

  const qtd = totalFiltradas ?? (filtros.soNaoRespondidas ? totalQuestoes - respondidaIds.size : totalQuestoes)
  const semQuestoes = qtd === 0

  const chipActive = { background: 'linear-gradient(135deg, #F5C33B 0%, #D4A017 100%)', color: '#081529', border: 'none', fontWeight: 600 as const }
  const chipInactive = { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#081529' }}>
      <header style={{ background: '#0C1E3D', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(`/trilha/${slug}`)} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
            <IconChevronLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-white truncate">{disciplinaDecoded}</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {nivelParam && <span style={{ color: '#F5C33B' }}>{nivelParam} · </span>}
              {totalQuestoes} questões
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'rgba(245,195,59,0.1)', color: '#F5C33B' }}>
            <IconFilter size={13} />
            <span className="text-xs font-semibold">Filtros</span>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-5 space-y-4">
        {/* Toggle */}
        <div className="rounded-xl px-4 py-3.5 flex items-center justify-between" style={{ background: '#0C1E3D', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <p className="font-semibold text-white text-sm">Só não respondidas</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{totalQuestoes - respondidaIds.size} disponíveis</p>
          </div>
          <button
            onClick={() => setFiltros((f) => ({ ...f, soNaoRespondidas: !f.soNaoRespondidas }))}
            className="relative rounded-full transition-all"
            style={{ width: 44, height: 24, background: filtros.soNaoRespondidas ? 'linear-gradient(135deg, #F5C33B 0%, #D4A017 100%)' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform" style={{ transform: filtros.soNaoRespondidas ? 'translateX(22px)' : 'translateX(2px)' }} />
          </button>
        </div>

        {/* Banca */}
        <div className="rounded-xl p-4" style={{ background: '#0C1E3D', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '1.5px' }}>Banca</p>
          <div className="flex flex-wrap gap-1.5">
            {BANCAS_IBGE.map((b) => (
              <button key={b} onClick={() => toggleBanca(b)} className="px-2.5 py-1 rounded-lg text-xs transition-all" style={filtros.bancas.includes(b) ? chipActive : chipInactive}>{b}</button>
            ))}
          </div>
          {filtros.bancas.length === 0 && <p className="text-xs mt-2.5" style={{ color: 'rgba(255,255,255,0.25)' }}>Todas as bancas incluídas</p>}
        </div>

        {/* Ano */}
        {anosDisponiveis.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: '#0C1E3D', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '1.5px' }}>Ano</p>
            <div className="flex flex-wrap gap-1.5">
              {anosDisponiveis.map((ano) => (
                <button key={ano} onClick={() => toggleAno(String(ano))} className="px-3 py-1 rounded-lg text-xs transition-all" style={filtros.anos.includes(String(ano)) ? chipActive : chipInactive}>{ano}</button>
              ))}
            </div>
            {filtros.anos.length === 0 && <p className="text-xs mt-2.5" style={{ color: 'rgba(255,255,255,0.25)' }}>Todos os anos incluídos</p>}
          </div>
        )}

        {(filtros.bancas.length > 0 || filtros.anos.length > 0) && (
          <button onClick={() => setFiltros((f) => ({ ...f, bancas: [], anos: [] }))} className="text-xs underline underline-offset-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Limpar filtros de banca e ano
          </button>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 px-4 py-3" style={{ background: '#0C1E3D', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-xl mx-auto">
          <button onClick={iniciarSessao} disabled={semQuestoes} className="btn-primary w-full">
            {loadingCount ? 'Calculando...' : semQuestoes ? 'Nenhuma questão com esses filtros' : `Iniciar sessão · ${qtd} questão${qtd !== 1 ? 'ões' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
