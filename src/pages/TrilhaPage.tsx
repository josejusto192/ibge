import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface DisciplinaInfo {
  disciplina: string
  total: number
  respondidas: number
  acertos: number
}

interface NivelInfo {
  nivel: string
  disciplinas: DisciplinaInfo[]
}

export function TrilhaPage() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [trilhaNome, setTrilhaNome] = useState('')
  const [niveis, setNiveis] = useState<NivelInfo[]>([])
  const [nivelSelecionado, setNivelSelecionado] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data: trilha } = await supabase
        .from('trilhas').select('nome').eq('slug', slug!).single()
      setTrilhaNome((trilha as { nome: string } | null)?.nome ?? '')

      const [{ data: questoes }, { data: respondidas }] = await Promise.all([
        supabase
          .from('questoes')
          .select('id, disciplina, nivel_escolaridade')
          .eq('anulada', false)
          .eq('desatualizada', false),
        supabase
          .from('progresso_questoes')
          .select('questao_id, acertou')
          .eq('usuario_id', user.id),
      ])

      const respondidaMap = new Map(
        ((respondidas ?? []) as { questao_id: string; acertou: boolean }[]).map(
          (r) => [r.questao_id, r.acertou]
        )
      )

      const niveisMap = new Map<string, Map<string, DisciplinaInfo>>()
      for (const q of (questoes ?? []) as { id: string; disciplina: string; nivel_escolaridade: string | null }[]) {
        const nivel = q.nivel_escolaridade ?? 'Geral'
        if (!niveisMap.has(nivel)) niveisMap.set(nivel, new Map())
        const discMap = niveisMap.get(nivel)!
        if (!discMap.has(q.disciplina)) discMap.set(q.disciplina, { disciplina: q.disciplina, total: 0, respondidas: 0, acertos: 0 })
        const info = discMap.get(q.disciplina)!
        info.total++
        if (respondidaMap.has(q.id)) {
          info.respondidas++
          if (respondidaMap.get(q.id)) info.acertos++
        }
      }

      const resultado: NivelInfo[] = Array.from(niveisMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([nivel, discMap]) => ({
          nivel,
          disciplinas: Array.from(discMap.values()).sort((a, b) => a.disciplina.localeCompare(b.disciplina)),
        }))

      setNiveis(resultado)
      if (resultado.length >= 1) setNivelSelecionado(resultado[0].nivel)
      setLoading(false)
    }
    load()
  }, [slug, user])

  const niveisDisponiveis = niveis.map((n) => n.nivel)
  const disciplinasExibidas = niveis.find((n) => n.nivel === nivelSelecionado)?.disciplinas ?? []

  const totalDisc = disciplinasExibidas.reduce((s, d) => s + d.total, 0)
  const totalResp = disciplinasExibidas.reduce((s, d) => s + d.respondidas, 0)
  const pctGeral = totalDisc > 0 ? Math.round((totalResp / totalDisc) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-navy-900 px-4 py-5">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-navy-800 hover:bg-navy-700 text-white transition-colors"
          >
            ‹
          </button>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">{trilhaNome}</h1>
            {!loading && <p className="text-navy-400 text-xs">{totalDisc} questões disponíveis</p>}
          </div>
        </div>
      </header>

      {/* Seletor de escolaridade */}
      {!loading && niveisDisponiveis.length > 0 && (
        <div className="bg-navy-800 px-4 pb-4">
          <div className="max-w-xl mx-auto">
            {niveisDisponiveis.length > 1 ? (
              <div className="flex flex-wrap gap-2 pt-3">
                {niveisDisponiveis.map((nivel) => (
                  <button
                    key={nivel}
                    onClick={() => setNivelSelecionado(nivel)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      nivelSelecionado === nivel
                        ? 'bg-gold-400 text-navy-900 shadow'
                        : 'bg-navy-700 text-navy-300 hover:bg-navy-600'
                    }`}
                  >
                    🎓 {nivel}
                  </button>
                ))}
              </div>
            ) : (
              <div className="pt-3">
                <span className="inline-flex items-center gap-1.5 bg-gold-400 text-navy-900 text-sm font-semibold px-3 py-1.5 rounded-xl">
                  🎓 {niveisDisponiveis[0]}
                </span>
              </div>
            )}

            {/* Barra de progresso geral */}
            {totalDisc > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-navy-400 mb-1.5">
                  <span>Progresso neste nível</span>
                  <span>{totalResp}/{totalDisc} · {pctGeral}%</span>
                </div>
                <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold-400 rounded-full transition-all duration-500"
                    style={{ width: `${pctGeral}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="max-w-xl mx-auto px-4 py-5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-2/3 mb-3" />
                <div className="h-2 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {disciplinasExibidas.map((disc, idx) => {
              const pct = disc.total > 0 ? Math.round((disc.respondidas / disc.total) * 100) : 0
              const concluida = disc.total > 0 && disc.respondidas >= disc.total
              const params = new URLSearchParams({ nivel: nivelSelecionado ?? '' })

              return (
                <button
                  key={disc.disciplina}
                  onClick={() =>
                    navigate(`/trilha/${slug}/disciplina/${encodeURIComponent(disc.disciplina)}?${params}`)
                  }
                  className="w-full text-left bg-white hover:bg-navy-50 border border-navy-100 rounded-2xl px-5 py-4 transition-all hover:shadow-md group"
                >
                  <div className="flex items-start gap-4">
                    {/* Número */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${
                      concluida ? 'bg-green-500 text-white' : 'bg-navy-100 text-navy-600'
                    }`}>
                      {concluida ? '✓' : idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h4 className="font-semibold text-navy-900 text-sm leading-tight">{disc.disciplina}</h4>
                        <span className="text-navy-400 group-hover:text-navy-600 text-lg transition-colors shrink-0">›</span>
                      </div>

                      <div className="h-1.5 bg-navy-100 rounded-full overflow-hidden mb-1.5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            concluida ? 'bg-green-500' : 'bg-gold-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-navy-400">
                        <span>{disc.respondidas}/{disc.total} questões</span>
                        {disc.respondidas > 0 && (
                          <span className={disc.acertos / disc.respondidas >= 0.7 ? 'text-green-600 font-medium' : ''}>
                            {Math.round((disc.acertos / disc.respondidas) * 100)}% de acerto
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
