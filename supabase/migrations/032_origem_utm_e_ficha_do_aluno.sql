-- ============================================================
-- Origem do cadastro (UTMs) e ficha completa do aluno no admin
-- ============================================================
--   * usuarios.utm_* / origem_*: de onde a pessoa veio (utm_source,
--     utm_medium, utm_campaign, utm_content, utm_term, site de origem e
--     página de entrada) — o último link com UTM antes do cadastro
--     (acessos diretos não apagam).
--   * onboarding_eventos.utm_source/utm_campaign: o funil do cadastro por
--     campanha (visitas → contas criadas).
--   * admin_publico(): nova lista "origens" (visitas, cadastros e
--     assinantes por fonte/campanha).
--   * admin_aluno_detalhe(): ficha do aluno para "Alunos e equipe".
-- ============================================================

alter table public.usuarios
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists origem_referrer text,
  add column if not exists origem_pagina text,
  add column if not exists origem_em timestamptz;

create index if not exists usuarios_utm_idx on public.usuarios (utm_source, utm_campaign);

alter table public.onboarding_eventos
  add column if not exists utm_source text,
  add column if not exists utm_campaign text;

drop function if exists public.registrar_onboarding(uuid, text);
drop function if exists public.registrar_onboarding(uuid, text, text, text);
create function public.registrar_onboarding(p_sessao uuid, p_etapa text, p_utm_source text default null, p_utm_campaign text default null)
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
  insert into public.onboarding_eventos (sessao, etapa, usuario_id, utm_source, utm_campaign)
  values (
    p_sessao, p_etapa, (select u.id from public.usuarios u where u.id = auth.uid()),
    nullif(left(lower(trim(p_utm_source)), 80), ''), nullif(left(trim(p_utm_campaign), 120), '')
  )
  on conflict (sessao, etapa) do update
    set usuario_id = coalesce(public.onboarding_eventos.usuario_id, excluded.usuario_id);
end;
$$;
grant execute on function public.registrar_onboarding(uuid, text, text, text) to anon, authenticated;


-- ---- Painel "Público" com origens ----
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
  origens as (
    -- visitas (quem abriu o cadastro) e cadastros por origem (UTM)
    select coalesce(o.fonte, '(direto)') as fonte, coalesce(o.campanha, '—') as campanha,
           sum(o.visitas)::int as visitas, sum(o.cadastros)::int as cadastros, sum(o.assinantes)::int as assinantes
    from (
      select e.utm_source as fonte, e.utm_campaign as campanha, count(distinct e.sessao) as visitas, 0 as cadastros, 0 as assinantes
      from public.onboarding_eventos e
      where e.criado_em >= v_desde and e.etapa = 'welcome'
      group by 1, 2
      union all
      select b.utm_source, b.utm_campaign, 0, count(*), count(*) filter (where coalesce(b.assinatura_ativa, false))
      from base b
      group by 1, 2
    ) o
    group by 1, 2
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
    'origens', coalesce((select jsonb_agg(to_jsonb(o) order by o.cadastros desc, o.visitas desc) from origens o), '[]'),
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


-- ---- Ficha do aluno (admin → Alunos e equipe) ----
create or replace function public.admin_aluno_detalhe(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores.';
  end if;

  with r as (
    select r.acertou, r.respondido_em, q.disciplina::text as disciplina
    from public.respostas r
    left join public.questoes q on q.id = r.questao_id
    where r.usuario_id = p_id
  ),
  u as (select * from public.usuarios where id = p_id)
  select jsonb_build_object(
    'trilha', (select t.nome from u join public.trilhas t on t.id = u.trilha_ativa_id),
    'modulos_total', (select count(*) from u join public.modulos m on m.trilha_id = u.trilha_ativa_id and m.tipo in ('questoes', 'inteligente')),
    'modulos_feitos', (select count(*) from u join public.modulos m on m.trilha_id = u.trilha_ativa_id
                       join public.progresso_modulos pm on pm.modulo_id = m.id and pm.usuario_id = p_id),
    'respostas', (select count(*) from r),
    'acertos', (select count(*) from r where r.acertou),
    'respostas_7d', (select count(*) from r where r.respondido_em >= now() - interval '7 days'),
    'respostas_30d', (select count(*) from r where r.respondido_em >= now() - interval '30 days'),
    'dias_estudo_30d', (select count(distinct (r.respondido_em at time zone 'America/Sao_Paulo')::date) from r
                        where r.respondido_em >= now() - interval '30 days'),
    'ultima_resposta', (select max(r.respondido_em) from r),
    -- questões por dia nos últimos 14 dias (mais antigo → hoje)
    'ultimos_14d', (
      select jsonb_agg(coalesce(c.n, 0) order by d.dia)
      from generate_series((now() at time zone 'America/Sao_Paulo')::date - 13, (now() at time zone 'America/Sao_Paulo')::date, interval '1 day') as d(dia)
      left join (
        select (r.respondido_em at time zone 'America/Sao_Paulo')::date as dia, count(*) as n
        from r group by 1
      ) c on c.dia = d.dia::date
    ),
    'por_disciplina', coalesce((
      select jsonb_agg(x order by x.total desc) from (
        select coalesce(r.disciplina, '—') as disciplina, count(*)::int as total, count(*) filter (where r.acertou)::int as acertos
        from r group by 1 order by 2 desc limit 8
      ) x
    ), '[]'),
    'dominio', coalesce((
      select jsonb_agg(jsonb_build_object('disciplina', p.disciplina, 'dominio', round(100 / (1 + exp(-p.habilidade)))::int, 'respostas', p.respostas)
                       order by p.respostas desc)
      from public.proficiencia p where p.usuario_id = p_id and p.assunto = '' and p.respostas > 0
    ), '[]'),
    'revisoes_pendentes', (select count(*) from public.revisoes rv where rv.usuario_id = p_id and rv.proxima_em is not null and rv.proxima_em <= now()),
    'indicacoes', (select count(*) from public.indicacoes i where i.indicador_id = p_id),
    'indicacoes_assinaram', (select count(*) from public.indicacoes i where i.indicador_id = p_id and i.status = 'assinou'),
    'indicado_por', (select ind.nome from public.indicacoes i join public.usuarios ind on ind.id = i.indicador_id where i.indicado_user_id = p_id limit 1)
  ) into v;
  return v;
end;
$$;
revoke execute on function public.admin_aluno_detalhe(uuid) from public, anon;
grant execute on function public.admin_aluno_detalhe(uuid) to authenticated;
