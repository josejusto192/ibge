-- ============================================================
-- Créditos diários do Tutor de IA (assinante x não assinante)
-- ============================================================
-- 1 mensagem respondida = 1 crédito (tutor_ia_usos, migration 016 — só
-- resposta bem-sucedida conta). Dois limites diários, configuráveis pelo
-- admin em Configurações:
--   tutor_limite_diario        → assinantes (e equipe)        [já existia]
--   tutor_limite_diario_gratis → quem não assina (padrão 10)   [novo]
-- Vale por aluno e por dia, somando todas as questões/conversas.
-- O "dia" vira à meia-noite de Brasília (antes virava à meia-noite UTC,
-- 21h de Brasília).
-- ============================================================

alter table public.configuracoes_ia
  add column if not exists tutor_limite_diario_gratis int not null default 10
  check (tutor_limite_diario_gratis >= 0);

-- Fonte única da regra: usada pela Edge Function tutor-ia (service_role)
-- e, via meus_creditos_tutor(), pelo app do aluno.
create or replace function public.tutor_creditos(p_usuario_id uuid)
returns table (limite int, usados int, restantes int, assinante boolean)
language sql
stable
security definer
set search_path = public
as $$
  with u as (
    select coalesce(assinatura_cortesia or coalesce(acesso_ate > now(), false) or is_admin or is_editor, false) as assinante
    from public.usuarios where id = p_usuario_id
  ),
  c as (
    select tutor_limite_diario, tutor_limite_diario_gratis from public.configuracoes_ia where id = 1
  ),
  n as (
    select count(*)::int as usados
    from public.tutor_ia_usos
    where usuario_id = p_usuario_id
      and usado_em >= (date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo')
  )
  select
    lim.limite,
    n.usados,
    greatest(lim.limite - n.usados, 0),
    coalesce(u.assinante, false)
  from n
  left join u on true
  cross join lateral (
    select case when coalesce(u.assinante, false)
      then coalesce((select tutor_limite_diario from c), 20)
      else coalesce((select tutor_limite_diario_gratis from c), 10)
    end as limite
  ) lim;
$$;

revoke execute on function public.tutor_creditos(uuid) from public, anon, authenticated;
grant execute on function public.tutor_creditos(uuid) to service_role;

-- Versão do aluno: sempre dele mesmo (auth.uid()), nunca de outra pessoa.
create or replace function public.meus_creditos_tutor()
returns table (limite int, usados int, restantes int, assinante boolean)
language sql
stable
security definer
set search_path = public
as $$
  select * from public.tutor_creditos(auth.uid());
$$;

grant execute on function public.meus_creditos_tutor() to authenticated;


-- A RPC de configurações do admin passa a devolver também o limite grátis.
drop function if exists public.admin_get_configuracoes_ia();
create or replace function public.admin_get_configuracoes_ia()
returns table (
  modelo text,
  prompt_extra text,
  tutor_prompt_extra text,
  tutor_limite_diario int,
  tutor_limite_diario_gratis int,
  api_key_configurada boolean,
  atualizado_em timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select modelo, prompt_extra, tutor_prompt_extra, tutor_limite_diario, tutor_limite_diario_gratis,
         (api_key is not null and api_key <> '') as api_key_configurada, atualizado_em
  from public.configuracoes_ia
  where id = 1 and is_admin();
$$;

grant execute on function public.admin_get_configuracoes_ia() to authenticated;
