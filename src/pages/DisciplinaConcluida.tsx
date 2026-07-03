import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const goldGrad = 'linear-gradient(98.37deg, #FBE07A 0%, #F5C33B 45%, #EAA42A 100%)'

export function DisciplinaConcluidaPage() {
  const { slug, disciplina } = useParams<{ slug: string; disciplina: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [acertos, setAcertos] = useState(0)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data: questoes } = await supabase
        .from('questoes').select('id').eq('disciplina', decodeURIComponent(disciplina!)).eq('anulada', false).eq('desatualizada', false)
      const ids = ((questoes ?? []) as { id: string }[]).map((q) => q.id)
      const { data: prog } = await supabase
        .from('progresso_questoes').select('acertou').eq('usuario_id', user.id).in('questao_id', ids)
      const rows = (prog ?? []) as { acertou: boolean }[]
      setTotal(rows.length)
      setAcertos(rows.filter((p) => p.acertou).length)
    }
    load()
  }, [disciplina, user])

  const pct = total > 0 ? Math.round((acertos / total) * 100) : 0
  const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📚'
  const msg = pct >= 80 ? 'Excelente resultado!' : pct >= 60 ? 'Bom trabalho!' : 'Continue estudando!'

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#000213' }}>
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="rounded-3xl p-8 text-center" style={{ background: '#080A1A', border: '1px solid rgba(255,255,255,0.13)', boxShadow: '-40px 34px 53px rgba(0,0,0,0.4)' }}>
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(242,183,52,0.12)', border: '1px solid rgba(242,183,52,0.3)' }}>
            <span className="text-4xl">{emoji}</span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">Disciplina concluída!</h2>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>{decodeURIComponent(disciplina!)}</p>

          <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="text-5xl font-bold text-white mb-1">{pct}%</div>
            <div className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{msg}</div>
            <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: goldGrad }} />
            </div>
            <div className="flex justify-between text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <span>{acertos} acertos</span>
              <span>{total - acertos} erros</span>
            </div>
          </div>

          <div className="space-y-3">
            <button onClick={() => navigate(`/trilha/${slug}`)} className="btn-primary w-full">Continuar trilha</button>
            <button onClick={() => navigate('/')} className="btn-secondary w-full">Ir para o início</button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl px-5 py-4 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span className="text-2xl">🔥</span>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Continue amanhã para manter seu streak!</p>
        </div>
      </div>
    </div>
  )
}
