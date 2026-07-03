import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { IconTrophy, IconStar, IconBook, IconArrowRight } from '../components/Icons'

export function DisciplinaConcluidaPage() {
  const { slug, disciplina } = useParams<{ slug: string; disciplina: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [acertos, setAcertos] = useState(0)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data: questoes } = await supabase.from('questoes').select('id').eq('disciplina', decodeURIComponent(disciplina!)).eq('anulada', false).eq('desatualizada', false)
      const ids = ((questoes ?? []) as { id: string }[]).map((q) => q.id)
      const { data: prog } = await supabase.from('progresso_questoes').select('acertou').eq('usuario_id', user.id).in('questao_id', ids)
      const rows = (prog ?? []) as { acertou: boolean }[]
      setTotal(rows.length); setAcertos(rows.filter((p) => p.acertou).length)
    }
    load()
  }, [disciplina, user])

  const pct = total > 0 ? Math.round((acertos / total) * 100) : 0
  const Icon = pct >= 80 ? IconTrophy : pct >= 60 ? IconStar : IconBook
  const iconColor = pct >= 80 ? '#F5C33B' : pct >= 60 ? '#F5C33B' : 'rgba(255,255,255,0.5)'
  const msg = pct >= 80 ? 'Excelente resultado!' : pct >= 60 ? 'Bom trabalho, continue!' : 'Continue praticando!'

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#081529' }}>
      <div className="w-full max-w-sm">
        <div className="rounded-2xl overflow-hidden" style={{ background: '#0C1E3D', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Top accent bar */}
          <div className="h-1" style={{ background: 'linear-gradient(90deg, #F5C33B 0%, #D4A017 100%)' }} />

          <div className="p-7 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(245,195,59,0.1)', border: '1px solid rgba(245,195,59,0.2)' }}>
              <Icon size={26} color={iconColor} />
            </div>

            <h2 className="text-xl font-bold text-white mb-1">Disciplina concluída</h2>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>{decodeURIComponent(disciplina!)}</p>

            {/* Score */}
            <div className="rounded-xl p-5 mb-5" style={{ background: '#081529', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="text-4xl font-bold text-white mb-0.5">{pct}%</div>
              <div className="text-sm mb-4" style={{ color: pct >= 60 ? '#F5C33B' : 'rgba(255,255,255,0.4)' }}>{msg}</div>
              <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #F5C33B 0%, #D4A017 100%)' }} />
              </div>
              <div className="flex justify-between text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                <span>{acertos} acertos</span>
                <span>{total - acertos} erros</span>
              </div>
            </div>

            <div className="space-y-2">
              <button onClick={() => navigate(`/trilha/${slug}`)} className="btn-primary w-full">
                Continuar trilha <IconArrowRight size={15} color="#081529" />
              </button>
              <button onClick={() => navigate('/')} className="btn-secondary w-full">
                Ir para o início
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
