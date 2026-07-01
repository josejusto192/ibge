import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function DisciplinaConcluidaPage() {
  const { slug, disciplina } = useParams<{ slug: string; disciplina: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [acertos, setAcertos] = useState(0)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const disciplinaDecoded = decodeURIComponent(disciplina!)

      const { data: questoes } = await supabase
        .from('questoes')
        .select('id')
        .eq('disciplina', disciplinaDecoded)
        .eq('anulada', false)
        .eq('desatualizada', false)

      const ids = ((questoes ?? []) as { id: string }[]).map((q) => q.id)

      const { data: prog } = await supabase
        .from('progresso_questoes')
        .select('acertou')
        .eq('usuario_id', user.id)
        .in('questao_id', ids)

      const rows = (prog ?? []) as { acertou: boolean }[]
      setTotal(rows.length)
      setAcertos(rows.filter((p) => p.acertou).length)
    }
    load()
  }, [disciplina, user])

  const pct = total > 0 ? Math.round((acertos / total) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="card max-w-sm w-full text-center">
        <div className="text-6xl mb-4">{pct >= 70 ? '🏆' : pct >= 50 ? '👍' : '📚'}</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Disciplina concluída!</h2>
        <p className="text-gray-500 mb-6">{decodeURIComponent(disciplina!)}</p>

        <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
          <div className="text-4xl font-bold text-blue-600 mb-1">{pct}%</div>
          <div className="text-gray-500 text-sm">{acertos} acertos de {total} questões</div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate(`/trilha/${slug}`)}
            className="btn-primary w-full"
          >
            Continuar trilha
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-secondary w-full"
          >
            Ir para o início
          </button>
        </div>
      </div>
    </div>
  )
}
