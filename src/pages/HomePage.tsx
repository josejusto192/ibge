import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useUsuario } from '../hooks/useUsuario'
import { IconBarChart, IconClipboard, IconFlame, IconChevronRight, IconLogOut } from '../components/Icons'

interface Trilha {
  id: number; nome: string; slug: string; descricao: string | null; ativa: boolean; ordem: number
}

export function HomePage() {
  const { user, signOut } = useAuth()
  const { usuario } = useUsuario()
  const [trilhas, setTrilhas] = useState<Trilha[]>([])
  const [totalRespondidas, setTotalRespondidas] = useState(0)
  const [totalAcertos, setTotalAcertos] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [{ data: trilhasData }, { data: progressoData }] = await Promise.all([
        supabase.from('trilhas').select('*').eq('ativa', true).order('ordem'),
        supabase.from('progresso_questoes').select('acertou').eq('usuario_id', user.id),
      ])
      setTrilhas((trilhasData ?? []) as Trilha[])
      const rows = (progressoData ?? []) as { acertou: boolean }[]
      setTotalRespondidas(rows.length)
      setTotalAcertos(rows.filter((r) => r.acertou).length)
      setLoading(false)
    }
    load()
  }, [user])

  const pctAcerto = totalRespondidas > 0 ? Math.round((totalAcertos / totalRespondidas) * 100) : 0
  const nomeExibido = usuario?.nome ?? user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Usuário'

  return (
    <div className="min-h-screen" style={{ background: '#081529' }}>
      {/* Topbar */}
      <header style={{ background: '#0C1E3D', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F5C33B 0%, #D4A017 100%)' }}>
              <IconBarChart size={16} color="#081529" />
            </div>
            <span className="font-bold text-white text-base">IBGE Questões</span>
          </div>
          <button onClick={signOut} className="flex items-center gap-1.5 text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <IconLogOut size={16} />
            Sair
          </button>
        </div>
      </header>

      {/* Hero stats */}
      <div style={{ background: '#0C1E3D', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-xl mx-auto px-4 py-6">
          <p className="text-sm mb-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Bom estudo,</p>
          <h2 className="text-xl font-bold text-white mb-5">{nomeExibido}</h2>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl p-3.5" style={{ background: '#081529', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <IconBarChart size={14} color="#F5C33B" />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Respondidas</span>
              </div>
              <div className="text-2xl font-bold text-white">{totalRespondidas}</div>
            </div>
            <div className="rounded-xl p-3.5" style={{ background: '#081529', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <IconTarget size={14} color="#F5C33B" />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Acerto</span>
              </div>
              <div className="text-2xl font-bold text-white">{pctAcerto}%</div>
            </div>
            <div className="rounded-xl p-3.5" style={{ background: '#081529', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <IconFlame size={14} color="#F5C33B" />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Streak</span>
              </div>
              <div className="text-2xl font-bold text-white">{usuario?.streak ?? 0}</div>
            </div>
          </div>

          {totalRespondidas > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                <span>Progresso geral</span>
                <span>{totalAcertos} acertos de {totalRespondidas}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pctAcerto}%`, background: 'linear-gradient(90deg, #F5C33B 0%, #D4A017 100%)' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trilhas */}
      <main className="max-w-xl mx-auto px-4 py-6">
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '1.5px' }}>Trilhas de estudo</p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-xl h-16 animate-pulse" style={{ background: '#0C1E3D' }} />
            ))}
          </div>
        ) : trilhas.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'rgba(255,255,255,0.3)' }}>Nenhuma trilha disponível.</div>
        ) : (
          <div className="space-y-2">
            {trilhas.map((trilha) => (
              <Link
                key={trilha.id}
                to={`/trilha/${trilha.slug}`}
                className="flex items-center gap-4 rounded-xl px-4 py-4 transition-all group"
                style={{ background: '#0C1E3D', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(245,195,59,0.1)', border: '1px solid rgba(245,195,59,0.18)' }}>
                  <IconClipboard size={18} color="#F5C33B" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white text-sm">{trilha.nome}</h4>
                  {trilha.descricao && <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{trilha.descricao}</p>}
                </div>
                <IconChevronRight size={18} color="rgba(255,255,255,0.25)" />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

// inline icon missing from imports
function IconTarget(p: { size?: number; color?: string }) {
  return (
    <svg width={p.size ?? 20} height={p.size ?? 20} viewBox="0 0 24 24" fill="none" stroke={p.color ?? 'currentColor'} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  )
}
