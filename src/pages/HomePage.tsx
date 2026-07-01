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
        supabase
          .from('progresso_questoes')
          .select('acertou')
          .eq('usuario_id', user.id),
      ])

      setTrilhas((trilhasData ?? []) as Trilha[])

      const rows = (progressoData ?? []) as { acertou: boolean }[]
      setTotalRespondidas(rows.length)
      setTotalAcertos(rows.filter((r) => r.acertou).length)
      setLoading(false)
    }
    load()
  }, [user])

  const pctAcerto = totalRespondidas > 0
    ? Math.round((totalAcertos / totalRespondidas) * 100)
    : 0

  const nomeExibido = usuario?.nome
    ?? user?.user_metadata?.full_name
    ?? user?.email?.split('@')[0]
    ?? 'Usuário'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <span className="font-bold text-lg text-gray-900">IBGE Questões</span>
          </div>
          <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-700">
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* Greeting + streak */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Olá,</p>
              <h2 className="text-xl font-bold text-gray-900">{nomeExibido}</h2>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500">{usuario?.streak ?? 0}</div>
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <span>🔥</span> dias seguidos
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Progresso geral</span>
              <span className="font-semibold text-gray-900">
                {totalRespondidas} questões · {pctAcerto}% de acerto
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${pctAcerto}%` }}
              />
            </div>
          </div>
        </div>

        {/* Trilhas */}
        <section>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Trilhas de estudo</h3>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-1/2 mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : trilhas.length === 0 ? (
            <div className="card text-center text-gray-500">
              Nenhuma trilha disponível no momento.
            </div>
          ) : (
            <div className="space-y-3">
              {trilhas.map((trilha) => (
                <Link
                  key={trilha.id}
                  to={`/trilha/${trilha.slug}`}
                  className="card block hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{trilha.nome}</h4>
                      {trilha.descricao && (
                        <p className="text-sm text-gray-500 mt-1">{trilha.descricao}</p>
                      )}
                    </div>
                    <span className="text-gray-400 text-xl">›</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
