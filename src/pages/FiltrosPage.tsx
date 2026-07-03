import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const BANCAS_IBGE = [
  'CEBRASPE (CESPE)', 'CESGRANRIO', 'CONSULPLAN', 'FGV',
  'IBADE', 'IBFC', 'IDECAN', 'Instituto AOCP', 'SELECON', 'Tec Concursos',
]

interface FiltroState {
  bancas: string[]
  anos: string[]
  soNaoRespondidas: boolean
}

const goldGrad = 'linear-gradient(98.37deg, #FBE07A 0%, #F5C33B 45%, #EAA42A 100%)'

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
      const [{ data: questoes }, { data: respondidas }] = await Promise.all([
        q,
        supabase.from('progresso_questoes').select('questao_id').eq('usuario_id', user.id),
      ])
      const rows = (questoes ?? []) as { id: string; ano: number | null; banca: string | null }[]
      const anos = [...new Set(rows.map((q) => q.ano).filter(Boolean) as number[])].sort((a, b) => b - a)
      setAnosDisponiveis(anos)
      setTotalQuestoes(rows.length)
      const ids = new Set(((respondidas ?? []) as { questao_id: string }[]).map((r) => r.questao_id))
      setRespondidaIds(ids)
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

  const toggleBanca = (banca: string) =>
    setFiltros((f) => ({ ...f, bancas: f.bancas.includes(banca) ? f.bancas.filter((b) => b !== banca) : [...f.bancas, banca] }))

  const toggleAno = (ano: string) =>
    setFiltros((f) => ({ ...f, anos: f.anos.includes(ano) ? f.anos.filter((a) => a !== ano) : [...f.anos, ano] }))

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

  const chipStyle = (ativo: boolean) => ativo
    ? { background: goldGrad, color: '#000312', border: '1px solid rgba(255,255,255,0.4)', fontWeight: 700 as const }
    : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.13)' }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#000213' }}>
      <header className="px-4 py-5" style={{ background: 'radial-gradient(35.05% 100% at 50% 0%, #001338 0%, #000213 100%)' }}>
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(`/trilha/${slug}`)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-white text-lg"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.13)' }}
          >‹</button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white leading-tight truncate">{disciplinaDecoded}</h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {nivelParam && <span style={{ color: '#F5C33B' }} className="mr-1">🎓 {nivelParam} ·</span>}
              {totalQuestoes} questões no total
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-5 space-y-4">
        <div className="rounded-2xl p-5 flex items-center justify-between" style={{ background: '#080A1A', border: '1px solid rgba(255,255,255,0.13)' }}>
          <div>
            <p className="font-semibold text-white">Só não respondidas</p>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{totalQuestoes - respondidaIds.size} disponíveis</p>
          </div>
          <button
            onClick={() => setFiltros((f) => ({ ...f, soNaoRespondidas: !f.soNaoRespondidas }))}
            className="relative rounded-full transition-colors"
            style={{ width: 52, height: 28, background: filtros.soNaoRespondidas ? goldGrad : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <span
              className="absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform"
              style={{ transform: filtros.soNaoRespondidas ? 'translateX(28px)' : 'translateX(4px)' }}
            />
          </button>
        </div>

        <div className="rounded-2xl p-5" style={{ background: '#080A1A', border: '1px solid rgba(255,255,255,0.13)' }}>
          <h3 className="text-xs font-bold uppercase mb-3" style={{ color: '#F6D365', letterSpacing: '2.534px' }}>Banca</h3>
          <div className="flex flex-wrap gap-2">
            {BANCAS_IBGE.map((banca) => (
              <button key={banca} onClick={() => toggleBanca(banca)} className="px-3 py-1.5 rounded-xl text-sm transition-all" style={chipStyle(filtros.bancas.includes(banca))}>{banca}</button>
            ))}
          </div>
          {filtros.bancas.length === 0 && <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Todas as bancas incluídas</p>}
        </div>

        {anosDisponiveis.length > 0 && (
          <div className="rounded-2xl p-5" style={{ background: '#080A1A', border: '1px solid rgba(255,255,255,0.13)' }}>
            <h3 className="text-xs font-bold uppercase mb-3" style={{ color: '#F6D365', letterSpacing: '2.534px' }}>Ano</h3>
            <div className="flex flex-wrap gap-2">
              {anosDisponiveis.map((ano) => (
                <button key={ano} onClick={() => toggleAno(String(ano))} className="px-4 py-1.5 rounded-xl text-sm transition-all" style={chipStyle(filtros.anos.includes(String(ano)))}>{ano}</button>
              ))}
            </div>
            {filtros.anos.length === 0 && <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Todos os anos incluídos</p>}
          </div>
        )}

        {(filtros.bancas.length > 0 || filtros.anos.length > 0) && (
          <button onClick={() => setFiltros((f) => ({ ...f, bancas: [], anos: [] }))} className="text-sm underline underline-offset-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Limpar filtros de banca e ano
          </button>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 px-4 py-4" style={{ background: '#000213', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="max-w-xl mx-auto">
          <button onClick={iniciarSessao} disabled={semQuestoes} className="btn-primary w-full text-base">
            {loadingCount ? 'Calculando...' : semQuestoes ? 'Nenhuma questão com esses filtros' : `Iniciar sessão · ${qtd} questão${qtd !== 1 ? 'ões' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
