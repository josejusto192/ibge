-- ============================================================
-- Revisão pelo Cowork: resumo do que falta revisar
-- ============================================================
-- Antes de começar, o Cowork mostra quantas questões ainda estão sem
-- revisão por disciplina e banca (e quantas têm imagem) e pergunta o que
-- revisar (prompt em docs/REVISAO-COWORK.md).
-- ============================================================

create or replace function public.cowork_resumo_pendentes()
returns table (disciplina text, banca text, pendentes int, com_imagem int)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(q.disciplina::text, '(sem disciplina)'), coalesce(q.banca::text, '(sem banca)'),
         count(*)::int,
         count(*) filter (where coalesce(q.enunciado_html, '') || coalesce(q.alternativas::text, '') || coalesce(q.comentario_html, '') ~* '<img')::int
  from public.questoes q
  where not coalesce(q.revisado, false)
    and not coalesce(q.anulada, false)
    and not coalesce(q.desatualizada, false)
    and coalesce(nullif(q.comentario_html, ''), q.comentario, '') <> ''
  group by 1, 2
  order by 1, 3 desc;
$$;

revoke execute on function public.cowork_resumo_pendentes() from public, anon, authenticated;
