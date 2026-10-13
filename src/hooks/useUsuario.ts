import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Database } from '../lib/database.types'

export type Usuario = Database['public']['Tables']['usuarios']['Row']
type UsuarioUpdate = Database['public']['Tables']['usuarios']['Update']

export function useUsuario() {
  const { user } = useAuth()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  // `loading` é DERIVADO (não um estado atualizado via efeito) de propósito:
  // ao abrir /admin direto pela URL/F5, a sessão é restaurada num render em
  // que o efeito de fetch ainda nem rodou — um loading via setState só
  // viraria true um commit depois, e nesse meio-tempo o AdminGuard via
  // "loading=false + usuario=null" e expulsava o admin pra /trilha.
  const [fetchedFor, setFetchedFor] = useState<string | null>(null)
  const loading = !!user && fetchedFor !== user.id

  useEffect(() => {
    if (!user) {
      setUsuario(null)
      setFetchedFor(null)
      return
    }

    let cancelled = false

    const upsertUsuario = async () => {
      const today = new Date().toISOString().split('T')[0]

      const { data: existing } = await supabase.from('usuarios').select('*').eq('id', user.id).single()

      if (existing) {
        // Só registra o acesso. A ofensiva (streak) NÃO muda ao abrir o app:
        // ela cresce ao estudar (responder_questao no servidor, migration 027).
        if (existing.ultimo_acesso === today) {
          if (!cancelled) setUsuario(existing)
        } else {
          const { data: updated } = await supabase
            .from('usuarios')
            .update({ ultimo_acesso: today })
            .eq('id', user.id)
            .select()
            .single()

          if (!cancelled) setUsuario(updated ?? existing)
        }
      } else {
        const { data: created } = await supabase
          .from('usuarios')
          .insert({
            id: user.id,
            email: user.email!,
            nome: user.user_metadata?.full_name ?? null,
            ...perfilDaConta(user.user_metadata?.onboarding),
            streak: 0,
            ultimo_acesso: today,
          })
          .select()
          .single()

        if (!cancelled) setUsuario(created)
      }

      if (!cancelled) setFetchedFor(user.id)
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

  // Pontos e ofensiva são calculados no servidor (responder_questao); aqui
  // só refletimos na tela o que ele devolveu.
  const aplicarDoServidor = useCallback((patch: Partial<Pick<Usuario, 'xp' | 'streak' | 'ultimo_estudo'>>) => {
    setUsuario((u) => (u ? { ...u, ...patch } : u))
  }, [])

  // Relê a linha sem mexer em streak/último acesso — usado quando o app volta
  // a ficar visível (ex.: depois de pagar a fatura da assinatura).
  const recarregarUsuario = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
    if (data) setUsuario(data)
  }, [user])

  return { usuario, loading, updateUsuario, aplicarDoServidor, recarregarUsuario }
}

// Respostas do onboarding guardadas na conta no cadastro (quando o projeto
// exige confirmação de e-mail, o perfil só é criado no 1º login).
function perfilDaConta(o: unknown) {
  if (!o || typeof o !== 'object') return {}
  const d = o as Record<string, unknown>
  const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 120) : null)
  const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  return {
    whatsapp: texto(d.whatsapp),
    faixa_etaria: texto(d.faixa_etaria),
    ja_prestou_concurso: typeof d.ja_prestou_concurso === 'boolean' ? d.ja_prestou_concurso : null,
    nivel_preparo: texto(d.nivel_preparo),
    prazo_prova: texto(d.prazo_prova),
    meta_diaria: numero(d.meta_diaria) ?? 20,
    trilha_ativa_id: numero(d.trilha_ativa_id),
    termos_aceitos_em: texto(d.termos_aceitos_em),
    utm_source: texto(d.utm_source),
    utm_medium: texto(d.utm_medium),
    utm_campaign: texto(d.utm_campaign),
    utm_content: texto(d.utm_content),
    utm_term: texto(d.utm_term),
    origem_referrer: texto(d.origem_referrer),
    origem_pagina: texto(d.origem_pagina),
    origem_em: texto(d.origem_em),
  }
}
