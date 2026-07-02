import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const BANCAS_IBGE = [
  'CEBRASPE (CESPE)',
  'CESGRANRIO',
  'CONSULPLAN',
  'FGV',
  'IBADE',
  'IBFC',
  'IDECAN',
  'Instituto AOCP',
  'SELECON',
  'Tec Concursos',
]

interface FiltroState {
  bancas: string[]
  anos: string[]
  soNaoRespondidas: boolean
}

export function FiltrosPage() {
  const { slug, disciplina } = useParams<{ slug: string; disciplina: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const disciplinaDecoded = decodeURIComponent(disciplina!)

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

  // Carrega anos disponíveis e total de questões da disciplina
  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [{ data: questoes }, { data: respondidas }] = await Promise.all([
        supabase
          .from('questoes')
          .select('id, ano, banca')
          .eq('disciplina', disciplinaDecoded)
          .eq('anulada', false)
          .eq('desatualizada', false),
        supabase
          .from('progresso_questoes')
          .select('questao_id')
          .eq('usuario_id', user.id),
      ])

      const rows = (questoes ?? []) as { id: string; ano: number | null; banca: string | null }[]
      const anos = [...new Set(rows.map((q) => q.ano).filter(Boolean) as number[])].sort((a, b) => b - a)
      setAnosDisponiveis(anos)
      setTotalQuestoes(rows.length)

      const ids = new Set(((respondidas ?? []) as { questao_id: string }[]).map((r) => r.questao_id))
      setRespondidaIds(ids)
    }
    load()
  }, [disciplinaDecoded, user])

  // Recalcula total filtrado sempre que filtros mudam
  useEffect(() => {
    if (!user || totalQuestoes === 0) return
    setLoadingCount(true)

    const count = async () => {
      let query = supabase
        .from('questoes')
        .select('id')
        .eq('disciplina', disciplinaDecoded)
        .eq('anulada', false)
        .eq('desatualizada', false)

      if (filtros.bancas.length > 0) query = query.in('banca', filtros.bancas)
      if (filtros.anos.length > 0) query = query.in('ano', filtros.anos.map(Number))

      const { data } = await query
      const rows = (data ?? []) as { id: string }[]

      const resultado = filtros.soNaoRespondidas
        ? rows.filter((q) => !respondidaIds.has(q.id)).length
        : rows.length

      setTotalFiltradas(resultado)
      setLoadingCount(false)
    }

    count()
  }, [filtros, disciplinaDecoded, user, respondidaIds, totalQuestoes])

  const toggleBanca = (banca: string) => {
    setFiltros((f) => ({
      ...f,
      bancas: f.bancas.includes(banca) ? f.bancas.filter((b) => b !== banca) : [...f.bancas, banca],
    }))
  }

  const toggleAno = (ano: string) => {
    setFiltros((f) => ({
      ...f,
      anos: f.anos.includes(ano) ? f.anos.filter((a) => a !== ano) : [...f.anos, ano],
    }))
  }

  const iniciarSessao = () => {
    const params = new URLSearchParams()
    if (filtros.bancas.length > 0) params.set('bancas', filtros.bancas.join(','))
    if (filtros.anos.length > 0) params.set('anos', filtros.anos.join(','))
    params.set('soNaoRespondidas', String(filtros.soNaoRespondidas))

    navigate(`/trilha/${slug}/disciplina/${disciplina}/sessao?${params.toString()}`)
  }

  const qtd = totalFiltradas ?? (filtros.soNaoRespondidas ? totalQuestoes - respondidaIds.size : totalQuestoes)
  const semQuestoes = qtd === 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(`/trilha/${slug}`)} className="text-gray-500 hover:text-gray-700 text-xl">
            ‹
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">{disciplinaDecoded}</h1>
            <p className="text-xs text-gray-400">{totalQuestoes} questões no total</p>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-6">

        {/* Só não respondidas */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">Só questões não respondidas</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {totalQuestoes - respondidaIds.size} disponíveis
              </p>
            </div>
            <button
              onClick={() => setFiltros((f) => ({ ...f, soNaoRespondidas: !f.soNaoRespondidas }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                filtros.soNaoRespondidas ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  filtros.soNaoRespondidas ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Filtro por banca */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Banca <span className="text-gray-400 font-normal normal-case">(todas se nenhuma selecionada)</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {BANCAS_IBGE.map((banca) => {
              const ativo = filtros.bancas.includes(banca)
              return (
                <button
                  key={banca}
                  onClick={() => toggleBanca(banca)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
                    ativo
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {banca}
                </button>
              )
            })}
          </div>
        </section>

        {/* Filtro por ano */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Ano <span className="text-gray-400 font-normal normal-case">(todos se nenhum selecionado)</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {anosDisponiveis.map((ano) => {
              const ativo = filtros.anos.includes(String(ano))
              return (
                <button
                  key={ano}
                  onClick={() => toggleAno(String(ano))}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
                    ativo
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {ano}
                </button>
              )
            })}
          </div>
        </section>

        {/* Limpar filtros */}
        {(filtros.bancas.length > 0 || filtros.anos.length > 0) && (
          <button
            onClick={() => setFiltros((f) => ({ ...f, bancas: [], anos: [] }))}
            className="text-sm text-gray-400 hover:text-gray-600 underline"
          >
            Limpar filtros de banca e ano
          </button>
        )}
      </main>

      {/* Footer fixo com botão */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
        <div className="max-w-xl mx-auto">
          <button
            onClick={iniciarSessao}
            disabled={semQuestoes}
            className="btn-primary w-full"
          >
            {loadingCount ? (
              'Calculando...'
            ) : semQuestoes ? (
              'Nenhuma questão com esses filtros'
            ) : (
              `Iniciar sessão · ${qtd} questão${qtd !== 1 ? 'ões' : ''}`
            )}
          </button>
        </div>
      </div>
      <div className="h-20" />
    </div>
  )
}
