-- ============================================================
-- Onboarding: nível inicial no algoritmo, funil de desistência,
-- painel "Público" e plano de estudos real
-- ============================================================
--   * habilidade_inicial(): a resposta "Como está seu preparo hoje?" vira o
--     ponto de partida do algoritmo (antes todo aluno começava no meio).
--     Depois das primeiras respostas o algoritmo corrige sozinho.
--   * onboarding_eventos + registrar_onboarding(): cada tela do cadastro
--     vista é registrada (sem login), para saber onde as pessoas desistem.
--   * plano_onboarding(): tamanho real da trilha escolhida (unidades,
--     lições e questões), para o "Seu plano está pronto".
--   * admin_publico(): números do público para o painel admin.
-- ============================================================

-- ---- 1. Nível inicial ----
create or replace function public.habilidade_inicial(p_uid uuid)
returns double precision
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case u.nivel_preparo
      when 'zero' then -0.7   -- começa com questões mais fáceis
      when 'reta' then 0.6    -- começa com questões mais difíceis
      else 0
    end
    from public.usuarios u where u.id = p_uid
  ), 0);
$$;
revoke execute on function public.habilidade_inicial(uuid) from public, anon, authenticated;

-- A 1ª nota de cada disciplina nasce do nível do onboarding (os assuntos
-- já copiam a nota da disciplina em responder_questao).
create or replace function public.proficiencia_nivel_inicial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assunto = '' and new.respostas = 0 and new.habilidade = 0 then
    new.habilidade := public.habilidade_inicial(new.usuario_id);
  end if;
  return new;
end;
$$;

drop trigger if exists proficiencia_nivel_inicial on public.proficiencia;
create trigger proficiencia_nivel_inicial
  before insert on public.proficiencia
  for each row execute function public.proficiencia_nivel_inicial();

-- Sem nenhuma resposta ainda, a nota da unidade é o nível inicial.
create or replace function public.theta_etapa(p_uid uuid, p_modulo_id int)
returns table (theta double precision, respostas int)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(p.habilidade * p.respostas) / nullif(sum(p.respostas), 0), public.habilidade_inicial(p_uid)),
         coalesce(sum(p.respostas), 0)::int
  from public.modulos m
  left join public.proficiencia p on p.usuario_id = p_uid
    and (m.disciplina is null or p.disciplina = m.disciplina)
    and (case when coalesce(cardinality(m.assuntos), 0) = 0 then p.assunto = '' else p.assunto = any(m.assuntos) end)
  where m.id = p_modulo_id;
$$;
revoke execute on function public.theta_etapa(uuid, int) from public, anon, authenticated;


-- ---- 2. Funil do onboarding ----
create table if not exists public.onboarding_eventos (
  id         bigserial primary key,
  sessao     uuid not null,
  etapa      text not null,
  usuario_id uuid references public.usuarios(id) on delete set null,
  criado_em  timestamptz not null default now(),
  unique (sessao, etapa)
);
create index if not exists onboarding_eventos_data_idx on public.onboarding_eventos (criado_em);
alter table public.onboarding_eventos enable row level security;
-- sem políticas: só as funções abaixo leem e escrevem

-- Ordem das telas (a mesma de src/screens/onboarding/OnboardingScreen.tsx)
create or replace function public.etapas_onboarding()
returns text[]
language sql
immutable
as $$
  select array['welcome', 'contact', 'faixa', 'prestou', 'concurso', 'prazo', 'nivel', 'meta', 'commit', 'plan', 'conta_criada'];
$$;

create or replace function public.registrar_onboarding(p_sessao uuid, p_etapa text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_sessao is null or not (p_etapa = any(public.etapas_onboarding())) then
    return;
  end if;
  -- trava simples contra abuso (é chamada sem login)
  if (select count(*) from public.onboarding_eventos where criado_em > now() - interval '1 minute') > 600 then
    return;
  end if;
  insert into public.onboarding_eventos (sessao, etapa, usuario_id)
  values (p_sessao, p_etapa, (select u.id from public.usuarios u where u.id = auth.uid()))
  on conflict (sessao, etapa) do update
    set usuario_id = coalesce(public.onboarding_eventos.usuario_id, excluded.usuario_id);
end;
$$;
grant execute on function public.registrar_onboarding(uuid, text) to anon, authenticated;


-- ---- 3. Plano real da trilha escolhida (tela "Seu plano está pronto") ----
create or replace function public.plano_onboarding(p_trilha_id int)
returns table (unidades int, licoes int, questoes int)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where m.tipo in ('questoes', 'inteligente'))::int,
    coalesce(sum(case when m.tipo = 'inteligente' then m.licoes + 1 when m.tipo = 'questoes' then 1 else 0 end), 0)::int,
    coalesce(sum(case
      when m.tipo = 'inteligente' then (m.licoes + 1) * coalesce(c.questoes_por_sessao, 10)
      when m.tipo = 'questoes' then (select count(*) from public.modulo_questoes mq where mq.modulo_id = m.id)
      else 0 end), 0)::int
  from public.modulos m
  left join public.trilha_config c on c.trilha_id = m.trilha_id
  where m.trilha_id = p_trilha_id;
$$;
grant execute on function public.plano_onboarding(int) to anon, authenticated;


-- ---- 4. Painel "Público" (admin) ----
create or replace function public.admin_publico(p_dias int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_desde timestamptz := case when coalesce(p_dias, 0) > 0 then now() - make_interval(days => p_dias) else '-infinity'::timestamptz end;
  v jsonb;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores.';
  end if;

  with base as (
    select u.* from public.usuarios u
    where u.created_at >= v_desde and not coalesce(u.is_admin, false) and not coalesce(u.is_editor, false)
  ),
  estudo as (
    -- questões respondidas por dia nos últimos 14 dias (por aluno)
    select r.usuario_id, count(*)::numeric / 14 as por_dia
    from public.respostas r
    where r.respondido_em >= now() - interval '14 days'
    group by r.usuario_id
  ),
  contagem as (
    select campo, valor, count(*)::int as total
    from (
      select 'faixa' as campo, coalesce(b.faixa_etaria, 'não informado') as valor from base b
      union all select 'prestou', case b.ja_prestou_concurso when true then 'Já prestou' when false then 'Primeira vez' else 'não informado' end from base b
      union all select 'nivel', coalesce(b.nivel_preparo, 'não informado') from base b
      union all select 'prazo', coalesce(b.prazo_prova, 'não informado') from base b
      union all select 'trilha', coalesce(t.nome, 'nenhuma') from base b left join public.trilhas t on t.id = b.trilha_ativa_id
    ) x
    group by campo, valor
  ),
  metas as (
    select b.meta_diaria as meta, count(*)::int as alunos,
           round(avg(coalesce(e.por_dia, 0)), 1) as media_real,
           count(*) filter (where coalesce(e.por_dia, 0) >= b.meta_diaria)::int as batem_meta
    from base b left join estudo e on e.usuario_id = b.id
    where b.meta_diaria is not null
    group by b.meta_diaria
  ),
  funil as (
    select e.etapa, count(distinct e.sessao)::int as sessoes
    from public.onboarding_eventos e
    where e.criado_em >= v_desde
    group by e.etapa
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'assinantes', (select count(*) from base b where coalesce(b.assinatura_ativa, false)),
    'ativos_7d', (select count(distinct r.usuario_id) from public.respostas r join base b on b.id = r.usuario_id
                  where r.respondido_em >= now() - interval '7 days'),
    'contagens', coalesce((select jsonb_agg(jsonb_build_object('campo', campo, 'valor', valor, 'total', total) order by campo, total desc) from contagem), '[]'),
    'metas', coalesce((select jsonb_agg(to_jsonb(m) order by m.meta) from metas m), '[]'),
    'funil', coalesce((
      select jsonb_agg(jsonb_build_object('etapa', et.etapa, 'sessoes', coalesce(f.sessoes, 0)) order by et.ord)
      from unnest(public.etapas_onboarding()) with ordinality as et(etapa, ord)
      left join funil f on f.etapa = et.etapa
    ), '[]')
  ) into v;
  return v;
end;
$$;
revoke execute on function public.admin_publico(int) from public, anon;
grant execute on function public.admin_publico(int) to authenticated;
