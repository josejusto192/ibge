import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useUsuario } from '../hooks/useUsuario'

interface Trilha {
  id: number
  nome: string
  slug: string
  descricao: string | null
  ativa: boolean
  ordem: number
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
    <div className="min-h-screen" style={{ background: '#000213' }}>
      {/* Header */}
      <header className="px-4 py-5" style={{ background: 'radial-gradient(35.05% 100% at 50% 0%, #001338 0%, #000213 100%)' }}>
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(98.37deg, #FBE07A 0%, #F5C33B 45%, #EAA42A 100%)' }}>
              <span className="text-lg">📊</span>
            </div>
            <span className="font-bold text-white text-lg">IBGE Questões</span>
          </div>
          <button onClick={signOut} className="text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Sair
          </button>
        </div>
      </header>

      {/* Hero */}
      <div className="px-4 pt-8 pb-10" style={{ background: 'radial-gradient(35.05% 100% at 50% 0%, #001338 0%, #000213 100%)' }}>
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Olá,</p>
              <h2 className="text-xl font-bold text-white">{nomeExibido}</h2>
            </div>
            <div className="text-center rounded-2xl px-5 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.13)' }}>
              <div className="text-3xl font-black" style={{ color: '#F5C33B' }}>{usuario?.streak ?? 0}</div>
              <div className="text-xs mt-0.5 flex items-center gap-1 justify-center" style={{ color: 'rgba(255,255,255,0.5)' }}>
                🔥 dias seguidos
              </div>
            </div>
          </div>

          {/* Progress card */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.13)' }}>
            <div className="flex justify-between text-sm mb-2">
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Progresso geral</span>
              <span className="text-white font-semibold">{totalRespondidas} questões · {pctAcerto}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pctAcerto}%`, background: 'linear-gradient(90deg, #FBE07A 0%, #F5C33B 100%)' }}
              />
            </div>
            {totalRespondidas > 0 && (
              <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>{totalAcertos} acertos de {totalRespondidas} respondidas</p>
            )}
          </div>
        </div>
      </div>

      {/* Trilhas */}
      <main className="max-w-xl mx-auto px-4 py-6">
        <p className="section-label mb-4">Trilhas de estudo</p>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-2xl h-20 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : trilhas.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Nenhuma trilha disponível no momento.
          </div>
        ) : (
          <div className="space-y-3">
            {trilhas.map((trilha) => (
              <Link
                key={trilha.id}
                to={`/trilha/${trilha.slug}`}
                className="flex items-center gap-4 rounded-2xl px-4 py-4 transition-all group"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(242,183,52,0.12)', border: '1px solid rgba(242,183,52,0.22)' }}>
                  <span className="text-xl">📋</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white truncate">{trilha.nome}</h4>
                  {trilha.descricao && (
                    <p className="text-sm truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{trilha.descricao}</p>
                  )}
                </div>
                <span className="text-xl shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>›</span>
              </Link>
            ))}
          </div>
        )}

        {/* Tip */}
        <div className="mt-5 rounded-2xl px-5 py-4 flex items-start gap-3" style={{ background: 'rgba(245,195,59,0.08)', border: '1px solid rgba(245,195,59,0.22)' }}>
          <span className="text-2xl mt-0.5">💡</span>
          <div>
            <p className="font-semibold text-sm" style={{ color: '#F5C33B' }}>Dica do dia</p>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Responda pelo menos 10 questões por dia para manter seu streak e fixar o conteúdo!
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
