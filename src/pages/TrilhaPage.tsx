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
        supabase.from('questoes').select('id, disciplina, nivel_escolaridade').eq('anulada', false).eq('desatualizada', false),
        supabase.from('progresso_questoes').select('questao_id, acertou').eq('usuario_id', user.id),
      ])

      const respondidaMap = new Map(
        ((respondidas ?? []) as { questao_id: string; acertou: boolean }[]).map((r) => [r.questao_id, r.acertou])
      )

      const niveisMap = new Map<string, Map<string, DisciplinaInfo>>()
      for (const q of (questoes ?? []) as { id: string; disciplina: string; nivel_escolaridade: string | null }[]) {
        const nivel = q.nivel_escolaridade ?? 'Geral'
        if (!niveisMap.has(nivel)) niveisMap.set(nivel, new Map())
        const discMap = niveisMap.get(nivel)!
        if (!discMap.has(q.disciplina)) discMap.set(q.disciplina, { disciplina: q.disciplina, total: 0, respondidas: 0, acertos: 0 })
        const info = discMap.get(q.disciplina)!
        info.total++
        if (respondidaMap.has(q.id)) { info.respondidas++; if (respondidaMap.get(q.id)) info.acertos++ }
      }

      const resultado: NivelInfo[] = Array.from(niveisMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([nivel, discMap]) => ({ nivel, disciplinas: Array.from(discMap.values()).sort((a, b) => a.disciplina.localeCompare(b.disciplina)) }))

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

  const goldGrad = 'linear-gradient(98.37deg, #FBE07A 0%, #F5C33B 45%, #EAA42A 100%)'

  return (
    <div className="min-h-screen" style={{ background: '#000213' }}>
      <header className="px-4 py-5" style={{ background: 'radial-gradient(35.05% 100% at 50% 0%, #001338 0%, #000213 100%)' }}>
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-white text-lg"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.13)' }}
          >‹</button>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">{trilhaNome}</h1>
            {!loading && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{totalDisc} questões disponíveis</p>}
          </div>
        </div>
      </header>

      {!loading && niveisDisponiveis.length > 0 && (
        <div className="px-4 pb-4" style={{ background: 'radial-gradient(35.05% 100% at 50% 0%, #001338 0%, #000213 100%)' }}>
          <div className="max-w-xl mx-auto">
            {niveisDisponiveis.length > 1 ? (
              <div className="flex flex-wrap gap-2 pt-3">
                {niveisDisponiveis.map((nivel) => (
                  <button
                    key={nivel}
                    onClick={() => setNivelSelecionado(nivel)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={nivelSelecionado === nivel
                      ? { background: goldGrad, color: '#000312', border: '1px solid rgba(255,255,255,0.4)' }
                      : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.13)' }
                    }
                  >🎓 {nivel}</button>
                ))}
              </div>
            ) : (
              <div className="pt-3">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl" style={{ background: goldGrad, color: '#000312' }}>
                  🎓 {niveisDisponiveis[0]}
                </span>
              </div>
            )}
            {totalDisc > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <span>Progresso neste nível</span>
                  <span>{totalResp}/{totalDisc} · {pctGeral}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pctGeral}%`, background: goldGrad }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="max-w-xl mx-auto px-4 py-5">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => <div key={i} className="rounded-2xl h-20 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />)}
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
                  onClick={() => navigate(`/trilha/${slug}/disciplina/${encodeURIComponent(disc.disciplina)}?${params}`)}
                  className="w-full text-left rounded-2xl px-5 py-4 transition-all"
                  style={{ background: 'rgba(8,10,26,0.9)', border: '1px solid rgba(255,255,255,0.13)' }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm"
                      style={concluida
                        ? { background: goldGrad, color: '#000312' }
                        : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.13)', color: 'rgba(255,255,255,0.5)' }
                      }
                    >{concluida ? '✓' : idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h4 className="font-semibold text-white text-sm leading-tight">{disc.disciplina}</h4>
                        <span className="text-lg shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>›</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: goldGrad }} />
                      </div>
                      <div className="flex items-center justify-between text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        <span>{disc.respondidas}/{disc.total} questões</span>
                        {disc.respondidas > 0 && (
                          <span style={disc.acertos / disc.respondidas >= 0.7 ? { color: '#F5C33B', fontWeight: 600 } : {}}>
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
