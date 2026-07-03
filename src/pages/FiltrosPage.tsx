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

  const [filtros, setFiltros] = useState<FiltroState>({
    bancas: [],
    anos: [],
    soNaoRespondidas: true,
  })

  useEffect(() => {
    if (!user) return
    const load = async () => {
      let q = supabase
        .from('questoes').select('id, ano, banca')
        .eq('disciplina', disciplinaDecoded)
        .eq('anulada', false).eq('desatualizada', false)
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
      let query = supabase.from('questoes').select('id')
        .eq('disciplina', disciplinaDecoded)
        .eq('anulada', false).eq('desatualizada', false)
      if (nivelParam) query = query.eq('nivel_escolaridade', nivelParam)
      if (filtros.bancas.length > 0) query = query.in('banca', filtros.bancas)
      if (filtros.anos.length > 0) query = query.in('ano', filtros.anos.map(Number))
      const { data } = await query
      const rows = (data ?? []) as { id: string }[]
      const resultado = filtros.soNaoRespondidas ? rows.filter((q) => !respondidaIds.has(q.id)).length : rows.length
      setTotalFiltradas(resultado)
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

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-navy-900 px-4 py-5">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(`/trilha/${slug}`)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-navy-800 hover:bg-navy-700 text-white transition-colors"
          >
            ‹
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white leading-tight truncate">{disciplinaDecoded}</h1>
            <p className="text-navy-400 text-xs mt-0.5">
              {nivelParam && <span className="text-gold-400 mr-1">🎓 {nivelParam} ·</span>}
              {totalQuestoes} questões no total
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-5 space-y-5">
        {/* Toggle só não respondidas */}
        <div className="bg-white border border-navy-100 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-navy-900">Só não respondidas</p>
            <p className="text-sm text-navy-400 mt-0.5">{totalQuestoes - respondidaIds.size} disponíveis</p>
          </div>
          <button
            onClick={() => setFiltros((f) => ({ ...f, soNaoRespondidas: !f.soNaoRespondidas }))}
            className={`relative w-13 h-7 rounded-full transition-colors ${filtros.soNaoRespondidas ? 'bg-navy-800' : 'bg-gray-200'}`}
            style={{ width: 52, height: 28 }}
          >
            <span
              className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                filtros.soNaoRespondidas ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
            {filtros.soNaoRespondidas && (
              <span className="absolute left-2 top-1 w-5 h-5 flex items-center justify-center">
                <span className="w-2 h-2 bg-gold-400 rounded-full" />
              </span>
            )}
          </button>
        </div>

        {/* Filtro banca */}
        <div className="bg-white border border-navy-100 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-navy-700 uppercase tracking-wide mb-3">Banca</h3>
          <div className="flex flex-wrap gap-2">
            {BANCAS_IBGE.map((banca) => {
              const ativo = filtros.bancas.includes(banca)
              return (
                <button
                  key={banca}
                  onClick={() => toggleBanca(banca)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border-2 transition-all ${
                    ativo
                      ? 'border-navy-800 bg-navy-800 text-white'
                      : 'border-navy-100 bg-navy-50 text-navy-600 hover:border-navy-300'
                  }`}
                >
                  {banca}
                </button>
              )
            })}
          </div>
          {filtros.bancas.length === 0 && (
            <p className="text-xs text-navy-400 mt-2">Todas as bancas incluídas</p>
          )}
        </div>

        {/* Filtro ano */}
        {anosDisponiveis.length > 0 && (
          <div className="bg-white border border-navy-100 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-navy-700 uppercase tracking-wide mb-3">Ano</h3>
            <div className="flex flex-wrap gap-2">
              {anosDisponiveis.map((ano) => {
                const ativo = filtros.anos.includes(String(ano))
                return (
                  <button
                    key={ano}
                    onClick={() => toggleAno(String(ano))}
                    className={`px-4 py-1.5 rounded-xl text-sm font-medium border-2 transition-all ${
                      ativo
                        ? 'border-navy-800 bg-navy-800 text-white'
                        : 'border-navy-100 bg-navy-50 text-navy-600 hover:border-navy-300'
                    }`}
                  >
                    {ano}
                  </button>
                )
              })}
            </div>
            {filtros.anos.length === 0 && (
              <p className="text-xs text-navy-400 mt-2">Todos os anos incluídos</p>
            )}
          </div>
        )}

        {/* Limpar filtros */}
        {(filtros.bancas.length > 0 || filtros.anos.length > 0) && (
          <button
            onClick={() => setFiltros((f) => ({ ...f, bancas: [], anos: [] }))}
            className="text-sm text-navy-400 hover:text-navy-700 underline underline-offset-2"
          >
            Limpar filtros de banca e ano
          </button>
        )}
      </main>

      {/* Footer fixo */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-navy-100 px-4 py-4 shadow-lg">
        <div className="max-w-xl mx-auto">
          <button onClick={iniciarSessao} disabled={semQuestoes} className="btn-primary w-full text-base">
            {loadingCount
              ? 'Calculando...'
              : semQuestoes
              ? 'Nenhuma questão com esses filtros'
              : `Iniciar sessão · ${qtd} questão${qtd !== 1 ? 'ões' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
