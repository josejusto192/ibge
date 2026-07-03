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
    <div className="min-h-screen bg-gray-50">
      {/* Header navy */}
      <header className="bg-navy-900 px-4 py-5">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gold-400 rounded-xl flex items-center justify-center">
              <span className="text-lg">📊</span>
            </div>
            <span className="font-bold text-white text-lg">IBGE Questões</span>
          </div>
          <button onClick={signOut} className="text-navy-300 hover:text-white text-sm transition-colors">
            Sair
          </button>
        </div>
      </header>

      {/* Hero banner */}
      <div className="bg-navy-800 px-4 pt-6 pb-10">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-navy-300 text-sm">Olá,</p>
              <h2 className="text-xl font-bold text-white">{nomeExibido}</h2>
            </div>
            <div className="text-center bg-navy-700 rounded-2xl px-5 py-3">
              <div className="text-3xl font-bold text-gold-400">{usuario?.streak ?? 0}</div>
              <div className="text-navy-300 text-xs mt-0.5 flex items-center gap-1 justify-center">
                🔥 dias seguidos
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-5 bg-navy-700 rounded-2xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-navy-300">Progresso geral</span>
              <span className="text-white font-semibold">
                {totalRespondidas} questões · {pctAcerto}%
              </span>
            </div>
            <div className="h-2.5 bg-navy-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold-400 rounded-full transition-all duration-500"
                style={{ width: `${pctAcerto}%` }}
              />
            </div>
            {totalRespondidas > 0 && (
              <p className="text-navy-400 text-xs mt-2">{totalAcertos} acertos de {totalRespondidas} respondidas</p>
            )}
          </div>
        </div>
      </div>

      {/* Content — cards sobrepostos ao banner */}
      <main className="max-w-xl mx-auto px-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-lg border border-navy-100 overflow-hidden">
          <div className="px-5 pt-5 pb-2">
            <h3 className="text-base font-bold text-navy-900">Trilhas de estudo</h3>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-xl" />
              ))}
            </div>
          ) : trilhas.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Nenhuma trilha disponível no momento.
            </div>
          ) : (
            <div className="p-3 space-y-2 pb-4">
              {trilhas.map((trilha) => (
                <Link
                  key={trilha.id}
                  to={`/trilha/${trilha.slug}`}
                  className="flex items-center gap-4 bg-navy-50 hover:bg-navy-100 rounded-xl px-4 py-4 transition-colors group"
                >
                  <div className="w-11 h-11 bg-navy-900 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-xl">📋</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-navy-900 truncate">{trilha.nome}</h4>
                    {trilha.descricao && (
                      <p className="text-sm text-navy-500 truncate mt-0.5">{trilha.descricao}</p>
                    )}
                  </div>
                  <span className="text-navy-400 group-hover:text-navy-600 text-xl transition-colors">›</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Dica */}
        <div className="mt-4 bg-gold-400 rounded-2xl px-5 py-4 flex items-start gap-3 mb-6">
          <span className="text-2xl mt-0.5">💡</span>
          <div>
            <p className="font-semibold text-navy-900 text-sm">Dica do dia</p>
            <p className="text-navy-800 text-sm mt-0.5">
              Responda pelo menos 10 questões por dia para manter seu streak e fixar o conteúdo!
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
