-- ============================================================
-- Conteúdo liberado só para assinantes (exceto o 1º módulo da trilha)
-- ============================================================
-- Regra: quem não assina estuda de graça o PRIMEIRO módulo de questões de
-- cada trilha (menor ordem, desempate por id — mesma ordenação do app).
-- O resto exige assinatura ativa (cortesia OU acesso_ate no futuro, ver
-- migration 021). Admin e editor sempre têm acesso.
--
-- O bloqueio vale no banco, não só na tela: get_modulo_questoes() é o
-- único caminho do aluno até o conteúdo das questões (RLS de `questoes` é
-- só da equipe). O caderno de erros mostra só questões de módulos
-- liberados. Aulas (vídeos) ficam travadas só na tela.
-- ============================================================

create or replace function public.tem_acesso_assinatura()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- acesso_ate direto (e não assinatura_ativa): não depende do job de
  -- expiração ter rodado.
  select coalesce((
    select assinatura_cortesia or coalesce(acesso_ate > now(), false) or is_admin or is_editor
    from public.usuarios where id = auth.uid()
  ), false);
$$;

create or replace function public.modulo_liberado(p_modulo_id int)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.tem_acesso_assinatura()
    or p_modulo_id = (
      select m2.id
      from public.modulos m
      join public.modulos m2 on m2.trilha_id = m.trilha_id and m2.tipo = 'questoes'
      where m.id = p_modulo_id
      order by m2.ordem, m2.id
      limit 1
    );
$$;

grant execute on function public.tem_acesso_assinatura() to authenticated;
grant execute on function public.modulo_liberado(int) to authenticated;


-- ---- Questões do módulo: bloqueia sem assinatura ----
-- Vira plpgsql pra poder avisar o app (ASSINATURA_NECESSARIA) em vez de
-- devolver lista vazia, que pareceria "módulo sem questões".
create or replace function public.get_modulo_questoes(p_modulo_id int)
returns table (
  id uuid, enunciado text, enunciado_html text, tem_imagem boolean,
  gabarito_letra text, comentario text, comentario_html text,
  banca text, ano smallint, orgao text, orgao_nome text, cargo text,
  disciplina text, nivel_escolaridade text, tipo text,
  anulada boolean, desatualizada boolean, alternativas jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.modulo_liberado(p_modulo_id) then
    raise exception 'ASSINATURA_NECESSARIA' using hint = 'Este módulo é exclusivo para assinantes.';
  end if;
  return query
    select
      q.id, q.enunciado, q.enunciado_html, q.tem_imagem, q.gabarito_letra,
      coalesce(q.comentario_revisado, q.comentario) as comentario,
      coalesce(q.comentario_revisado_html, q.comentario_html) as comentario_html,
      q.banca, q.ano, q.orgao, q.orgao_nome, q.cargo, q.disciplina,
      q.nivel_escolaridade, q.tipo, q.anulada, q.desatualizada, q.alternativas
    from public.questoes q
    join public.modulo_questoes mq on mq.questao_id = q.id
    where mq.modulo_id = p_modulo_id
    order by mq.ordem;
end;
$$;

grant execute on function public.get_modulo_questoes(int) to authenticated;


-- ---- Caderno de erros: só questões de módulos liberados ----
create or replace function public.contar_minhas_questoes_erradas(p_trilha_id int)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct pq.questao_id)::int
  from public.progresso_questoes pq
  join public.modulo_questoes mq on mq.questao_id = pq.questao_id
  join public.modulos m on m.id = mq.modulo_id
  where pq.usuario_id = auth.uid()
    and pq.acertou = false
    and m.trilha_id = p_trilha_id
    and public.modulo_liberado(m.id);
$$;

create or replace function public.get_minhas_questoes_erradas(p_trilha_id int)
returns table (
  id uuid, enunciado text, enunciado_html text, tem_imagem boolean,
  gabarito_letra text, comentario text, comentario_html text,
  banca text, ano smallint, orgao text, orgao_nome text, cargo text,
  disciplina text, nivel_escolaridade text, tipo text,
  anulada boolean, desatualizada boolean, alternativas jsonb,
  aula_titulo text, aula_video_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct
    q.id, q.enunciado, q.enunciado_html, q.tem_imagem, q.gabarito_letra,
    coalesce(q.comentario_revisado, q.comentario) as comentario,
    coalesce(q.comentario_revisado_html, q.comentario_html) as comentario_html,
    q.banca, q.ano, q.orgao, q.orgao_nome, q.cargo, q.disciplina,
    q.nivel_escolaridade, q.tipo, q.anulada, q.desatualizada, q.alternativas,
    a.titulo as aula_titulo, a.video_url as aula_video_url
  from public.questoes q
  join public.modulo_questoes mq on mq.questao_id = q.id
  join public.modulos m on m.id = mq.modulo_id
  join public.progresso_questoes pq on pq.questao_id = q.id
  left join public.aulas a on a.id = q.aula_id
  where pq.usuario_id = auth.uid()
    and pq.acertou = false
    and m.trilha_id = p_trilha_id
    and public.modulo_liberado(m.id);
$$;

grant execute on function public.contar_minhas_questoes_erradas(int) to authenticated;
grant execute on function public.get_minhas_questoes_erradas(int) to authenticated;
