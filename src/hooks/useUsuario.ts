import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface Usuario {
  id: string
  nome: string | null
  email: string
  assinatura_ativa: boolean
  streak: number
  ultimo_acesso: string | null
  created_at: string
}

export function useUsuario() {
  const { user } = useAuth()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setUsuario(null)
      setLoading(false)
      return
    }

    const upsertUsuario = async () => {
      const today = new Date().toISOString().split('T')[0]

      const { data: existing } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single()

      if (existing) {
        const ex = existing as Usuario
        const lastAccess = ex.ultimo_acesso
        let newStreak = ex.streak

        if (lastAccess) {
          const last = new Date(lastAccess)
          const todayDate = new Date(today)
          const diffDays = Math.floor((todayDate.getTime() - last.getTime()) / 86400000)
          if (diffDays === 1) {
            newStreak = ex.streak + 1
          } else if (diffDays > 1) {
            newStreak = 1
          }
        } else {
          newStreak = 1
        }

        const { data: updated } = await supabase
          .from('usuarios')
          .update({ ultimo_acesso: today, streak: newStreak })
          .eq('id', user.id)
          .select()
          .single()

        setUsuario(updated as Usuario)
      } else {
        const { data: created } = await supabase
          .from('usuarios')
          .insert({
            id: user.id,
            email: user.email!,
            nome: user.user_metadata?.full_name ?? null,
            streak: 1,
            ultimo_acesso: today,
            assinatura_ativa: true,
          })
          .select()
          .single()

        setUsuario(created as Usuario)
      }

      setLoading(false)
    }

    upsertUsuario()
  }, [user])

  return { usuario, loading }
}
