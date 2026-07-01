import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Disciplina {
  id: number
  disciplina: string
  ordem: number
}

interface ProgressoDisciplina {
  [disciplina: string]: { respondidas: number; total: number; acertos: number }
}

export function TrilhaPage() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [trilhaNome, setTrilhaNome] = useState('')
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [progresso, setProgresso] = useState<ProgressoDisciplina>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data: trilha } = await supabase
        .from('trilhas')
        .select('id, nome')
        .eq('slug', slug!)
        .single()

      if (!trilha) { navigate('/'); return }

      const t = trilha as { id: number; nome: string }
      setTrilhaNome(t.nome)

      const { data: discs } = await supabase
        .from('trilha_disciplinas')
        .select('*')
        .eq('trilha_id', t.id)
        .order('ordem')

      const disciplinaList = (discs ?? []) as Disciplina[]
      setDisciplinas(disciplinaList)

      const disciplinaNames = disciplinaList.map((d) => d.disciplina)

      const [{ data: todasQuestoes }, { data: respondidas }] = await Promise.all([
        supabase
          .from('questoes')
          .select('id, disciplina')
          .in('disciplina', disciplinaNames)
          .eq('anulada', false)
          .eq('desatualizada', false),
        supabase
          .from('progresso_questoes')
          .select('questao_id, acertou')
          .eq('usuario_id', user.id),
      ])

      const respondidaIds = new Set(
        ((respondidas ?? []) as { questao_id: string; acertou: boolean }[]).map((r) => r.questao_id)
      )
      const acertouMap = new Map(
        ((respondidas ?? []) as { questao_id: string; acertou: boolean }[]).map((r) => [r.questao_id, r.acertou])
      )

      const prog: ProgressoDisciplina = {}
      for (const q of (todasQuestoes ?? []) as { id: string; disciplina: string }[]) {
        if (!prog[q.disciplina]) prog[q.disciplina] = { respondidas: 0, total: 0, acertos: 0 }
        prog[q.disciplina].total++
        if (respondidaIds.has(q.id)) {
          prog[q.disciplina].respondidas++
          if (acertouMap.get(q.id)) prog[q.disciplina].acertos++
        }
      }
      setProgresso(prog)
      setLoading(false)
    }
    load()
  }, [slug, user, navigate])

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
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-2/3 mb-3" />
                <div className="h-2 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {disciplinas.map((disc) => {
              const p = progresso[disc.disciplina] ?? { respondidas: 0, total: 0, acertos: 0 }
              const pct = p.total > 0 ? Math.round((p.respondidas / p.total) * 100) : 0
              const concluida = p.total > 0 && p.respondidas >= p.total

              return (
                <Link
                  key={disc.id}
                  to={`/trilha/${slug}/disciplina/${encodeURIComponent(disc.disciplina)}`}
                  className="card block hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{disc.disciplina}</h4>
                        {concluida && <span className="text-green-500 text-sm">✓</span>}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {p.respondidas}/{p.total} questões
                        {p.respondidas > 0 && (
                          <> · {Math.round((p.acertos / p.respondidas) * 100)}% de acerto</>
                        )}
                      </p>
                    </div>
                    <span className="text-gray-400 text-xl ml-2">›</span>
                  </div>

                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${concluida ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
