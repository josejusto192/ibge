-- ============================================================
-- Painel admin: dashboard, contadores de curadoria e autores de revisão
-- ============================================================

-- Números gerais do dashboard. Campos sensíveis (alunos, erros, uso do
-- tutor) vêm null pra editor — só admin pleno os enxerga; os de conteúdo
-- aparecem pra equipe toda (is_conteudo_admin).
create or replace function public.admin_dashboard_stats()
returns table (
  total_questoes int,
  questoes_revisadas int,
  total_alunos int,
  alunos_ativos_hoje int,
  erros_7d int,
  tutor_usos_hoje int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::int from public.questoes),
    (select count(*)::int from public.questoes where revisado),
    case when is_admin() then (select count(*)::int from public.usuarios) end,
    case when is_admin() then (select count(*)::int from public.usuarios where ultimo_acesso = current_date) end,
    case when is_admin() then (select count(*)::int from public.client_errors where criado_em >= now() - interval '7 days') end,
    case when is_admin() then (select count(*)::int from public.tutor_ia_usos where usado_em >= date_trunc('day', now())) end
  where is_conteudo_admin();
$$;

grant execute on function public.admin_dashboard_stats() to authenticated;

-- Visão por trilha: nº de módulos, módulos de questões ainda VAZIOS
-- (a armadilha do aluno ver tela quebrada) e total de questões curadas.
create or replace function public.admin_dashboard_trilhas()
returns table (
  id int,
  nome text,
  ativa boolean,
  modulos int,
  modulos_sem_questoes int,
  questoes int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id, t.nome, t.ativa,
    (select count(*)::int from public.modulos m where m.trilha_id = t.id),
    (select count(*)::int from public.modulos m
       where m.trilha_id = t.id and m.tipo = 'questoes'
         and not exists (select 1 from public.modulo_questoes mq where mq.modulo_id = m.id)),
    (select count(*)::int from public.modulos m
       join public.modulo_questoes mq on mq.modulo_id = m.id
       where m.trilha_id = t.id)
  from public.trilhas t
  where is_conteudo_admin()
  order by t.ordem;
$$;

grant execute on function public.admin_dashboard_trilhas() to authenticated;

-- Resolve ids -> nome (e SÓ o nome — nunca email/whatsapp) pra exibir quem
-- revisou cada questão. Editor não lê usuarios direto (RLS), daí a RPC.
create or replace function public.admin_nomes_usuarios(p_ids uuid[])
returns table (id uuid, nome text)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, coalesce(u.nome, 'Sem nome') as nome
  from public.usuarios u
  where u.id = any(p_ids) and is_conteudo_admin();
$$;

grant execute on function public.admin_nomes_usuarios(uuid[]) to authenticated;
