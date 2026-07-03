import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { IconChevronLeft, IconChevronRight, IconGraduate, IconCheck } from '../components/Icons'

interface DisciplinaInfo { disciplina: string; total: number; respondidas: number; acertos: number }
interface NivelInfo { nivel: string; disciplinas: DisciplinaInfo[] }

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
      const { data: trilha } = await supabase.from('trilhas').select('nome').eq('slug', slug!).single()
      setTrilhaNome((trilha as { nome: string } | null)?.nome ?? '')
      const [{ data: questoes }, { data: respondidas }] = await Promise.all([
        supabase.from('questoes').select('id, disciplina, nivel_escolaridade').eq('anulada', false).eq('desatualizada', false),
        supabase.from('progresso_questoes').select('questao_id, acertou').eq('usuario_id', user.id),
      ])
      const respondidaMap = new Map(((respondidas ?? []) as { questao_id: string; acertou: boolean }[]).map((r) => [r.questao_id, r.acertou]))
      const niveisMap = new Map<string, Map<string, DisciplinaInfo>>()
      for (const q of (questoes ?? []) as { id: string; disciplina: string; nivel_escolaridade: string | null }[]) {
        const nivel = q.nivel_escolaridade ?? 'Geral'
        if (!niveisMap.has(nivel)) niveisMap.set(nivel, new Map())
        const dm = niveisMap.get(nivel)!
        if (!dm.has(q.disciplina)) dm.set(q.disciplina, { disciplina: q.disciplina, total: 0, respondidas: 0, acertos: 0 })
        const info = dm.get(q.disciplina)!
        info.total++
        if (respondidaMap.has(q.id)) { info.respondidas++; if (respondidaMap.get(q.id)) info.acertos++ }
      }
      const resultado = Array.from(niveisMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([nivel, dm]) => ({ nivel, disciplinas: Array.from(dm.values()).sort((a, b) => a.disciplina.localeCompare(b.disciplina)) }))
      setNiveis(resultado)
      if (resultado.length) setNivelSelecionado(resultado[0].nivel)
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
    <div className="min-h-screen" style={{ background: '#081529' }}>
      {/* Header */}
      <header style={{ background: '#0C1E3D', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
            <IconChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">{trilhaNome}</h1>
            {!loading && <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{totalDisc} questões</p>}
          </div>
        </div>
      </header>

      {/* Nivel tabs + progress */}
      {!loading && niveisDisponiveis.length > 0 && (
        <div style={{ background: '#0C1E3D', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="max-w-xl mx-auto px-4 py-4">
            {niveisDisponiveis.length > 1 && (
              <div className="flex gap-2 mb-4">
                {niveisDisponiveis.map((nivel) => (
                  <button
                    key={nivel}
                    onClick={() => setNivelSelecionado(nivel)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={nivelSelecionado === nivel
                      ? { background: 'linear-gradient(135deg, #F5C33B 0%, #D4A017 100%)', color: '#081529' }
                      : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)' }
                    }
                  >
                    <IconGraduate size={13} /> {nivel}
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-between text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              <span>Progresso neste nível</span>
              <span>{totalResp} / {totalDisc} · {pctGeral}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pctGeral}%`, background: 'linear-gradient(90deg, #F5C33B 0%, #D4A017 100%)' }} />
            </div>
          </div>
        </div>
      )}

      <main className="max-w-xl mx-auto px-4 py-5">
        {loading ? (
          <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="rounded-xl h-16 animate-pulse" style={{ background: '#0C1E3D' }} />)}</div>
        ) : (
          <div className="space-y-2">
            {disciplinasExibidas.map((disc, idx) => {
              const pct = disc.total > 0 ? Math.round((disc.respondidas / disc.total) * 100) : 0
              const concluida = disc.total > 0 && disc.respondidas >= disc.total
              const params = new URLSearchParams({ nivel: nivelSelecionado ?? '' })
              return (
                <button
                  key={disc.disciplina}
                  onClick={() => navigate(`/trilha/${slug}/disciplina/${encodeURIComponent(disc.disciplina)}?${params}`)}
                  className="w-full text-left rounded-xl px-4 py-4 transition-all"
                  style={{ background: '#0C1E3D', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                      style={concluida
                        ? { background: 'linear-gradient(135deg, #F5C33B 0%, #D4A017 100%)', color: '#081529' }
                        : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }
                      }
                    >
                      {concluida ? <IconCheck size={14} color="#081529" /> : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <h4 className="font-semibold text-white text-sm leading-tight truncate">{disc.disciplina}</h4>
                        <div className="flex items-center gap-2 shrink-0">
                          {disc.respondidas > 0 && (
                            <span className="text-xs font-medium" style={disc.acertos / disc.respondidas >= 0.7 ? { color: '#F5C33B' } : { color: 'rgba(255,255,255,0.35)' }}>
                              {Math.round((disc.acertos / disc.respondidas) * 100)}%
                            </span>
                          )}
                          <IconChevronRight size={16} color="rgba(255,255,255,0.2)" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #F5C33B 0%, #D4A017 100%)' }} />
                        </div>
                        <span className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>{disc.respondidas}/{disc.total}</span>
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
