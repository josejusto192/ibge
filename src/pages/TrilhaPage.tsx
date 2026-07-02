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
        .from('trilhas')
        .select('nome')
        .eq('slug', slug!)
        .single()

      setTrilhaNome((trilha as { nome: string } | null)?.nome ?? '')

      // Busca disciplinas dinamicamente da tabela questoes
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

      // Agrupa por nivel_escolaridade → disciplina
      const niveisMap = new Map<string, Map<string, DisciplinaInfo>>()

      for (const q of (questoes ?? []) as { id: string; disciplina: string; nivel_escolaridade: string | null }[]) {
        const nivel = q.nivel_escolaridade ?? 'Geral'
        const disc = q.disciplina

        if (!niveisMap.has(nivel)) niveisMap.set(nivel, new Map())
        const discMap = niveisMap.get(nivel)!

        if (!discMap.has(disc)) {
          discMap.set(disc, { disciplina: disc, total: 0, respondidas: 0, acertos: 0 })
        }
        const info = discMap.get(disc)!
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
          disciplinas: Array.from(discMap.values()).sort((a, b) =>
            a.disciplina.localeCompare(b.disciplina)
          ),
        }))

      setNiveis(resultado)

      // Seleciona o primeiro nível automaticamente
      if (resultado.length === 1) {
        setNivelSelecionado(resultado[0].nivel)
      }

      setLoading(false)
    }
    load()
  }, [slug, user])

  const niveisDisponiveis = niveis.map((n) => n.nivel)
  const disciplinasExibidas = niveis.find((n) => n.nivel === nivelSelecionado)?.disciplinas ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700 text-xl">
            ‹
          </button>
          <h1 className="text-lg font-bold text-gray-900">{trilhaNome}</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6">
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
          <>
            {/* Seletor de escolaridade */}
            {niveisDisponiveis.length > 1 && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Nível de escolaridade
                </p>
                <div className="flex flex-wrap gap-2">
                  {niveisDisponiveis.map((nivel) => (
                    <button
                      key={nivel}
                      onClick={() => setNivelSelecionado(nivel)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
                        nivelSelecionado === nivel
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {nivel}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Nível único — exibe badge */}
            {niveisDisponiveis.length === 1 && (
              <div className="mb-5">
                <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1.5 rounded-full border border-blue-200">
                  🎓 {niveisDisponiveis[0]}
                </span>
              </div>
            )}

            {/* Lista de disciplinas */}
            {nivelSelecionado === null && niveisDisponiveis.length > 1 ? (
              <div className="card text-center text-gray-500 py-8">
                Selecione um nível de escolaridade para ver as disciplinas.
              </div>
            ) : (
              <div className="space-y-3">
                {disciplinasExibidas.map((disc) => {
                  const pct = disc.total > 0 ? Math.round((disc.respondidas / disc.total) * 100) : 0
                  const concluida = disc.total > 0 && disc.respondidas >= disc.total
                  const params = new URLSearchParams({ nivel: nivelSelecionado ?? '' })

                  return (
                    <button
                      key={disc.disciplina}
                      onClick={() =>
                        navigate(
                          `/trilha/${slug}/disciplina/${encodeURIComponent(disc.disciplina)}?${params}`
                        )
                      }
                      className="card w-full text-left hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900">{disc.disciplina}</h4>
                            {concluida && <span className="text-green-500 text-sm">✓</span>}
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {disc.respondidas}/{disc.total} questões
                            {disc.respondidas > 0 && (
                              <> · {Math.round((disc.acertos / disc.respondidas) * 100)}% de acerto</>
                            )}
                          </p>
                        </div>
                        <span className="text-gray-400 text-xl ml-2">›</span>
                      </div>

                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            concluida ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
