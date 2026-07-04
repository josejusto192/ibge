import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Database } from '../lib/database.types'

export type Usuario = Database['public']['Tables']['usuarios']['Row']
type UsuarioUpdate = Database['public']['Tables']['usuarios']['Update']

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

    let cancelled = false

    const upsertUsuario = async () => {
      const today = new Date().toISOString().split('T')[0]

      const { data: existing } = await supabase.from('usuarios').select('*').eq('id', user.id).single()

      if (existing) {
        const lastAccess = existing.ultimo_acesso
        let newStreak = existing.streak

        if (lastAccess) {
          const last = new Date(lastAccess)
          const todayDate = new Date(today)
          const diffDays = Math.floor((todayDate.getTime() - last.getTime()) / 86400000)
          if (diffDays === 1) newStreak = existing.streak + 1
          else if (diffDays > 1) newStreak = 1
        } else {
          newStreak = 1
        }

        const { data: updated } = await supabase
          .from('usuarios')
          .update({ ultimo_acesso: today, streak: newStreak })
          .eq('id', user.id)
          .select()
          .single()

        if (!cancelled) setUsuario(updated)
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

        if (!cancelled) setUsuario(created)
      }

      if (!cancelled) setLoading(false)
    }

    upsertUsuario()
    return () => {
      cancelled = true
    }
  }, [user])

  const updateUsuario = useCallback(
    async (patch: UsuarioUpdate) => {
      if (!user) return
      const { data, error } = await supabase.from('usuarios').update(patch).eq('id', user.id).select().single()
      if (error) throw error
      setUsuario(data)
    },
    [user]
  )

  const addXp = useCallback(
    async (amount: number) => {
      if (!usuario) return
      await updateUsuario({ xp: usuario.xp + amount })
    },
    [usuario, updateUsuario]
  )

  return { usuario, loading, updateUsuario, addXp }
}
