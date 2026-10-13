-- ============================================================
-- Revisão pelo Cowork: questão completa, com as imagens
-- ============================================================
-- cowork_proximas_questoes passa a trazer o enunciado em HTML (onde ficam
-- as figuras, tabelas e gráficos) e a lista de links das imagens do
-- enunciado e do comentário, para o Cowork abrir e olhar cada imagem
-- antes de reescrever (prompt em docs/REVISAO-COWORK.md).
-- ============================================================

drop function if exists public.cowork_proximas_questoes(int, text, text);
create function public.cowork_proximas_questoes(
  p_limite int default 10,
  p_disciplina text default null,
  p_banca text default null
)
returns table (
  questao_id uuid,
  disciplina text,
  assunto text,
  banca text,
  ano int,
  enunciado text,
  enunciado_html text,
  alternativas jsonb,
  gabarito_letra text,
  comentario_original_html text,
  imagens text[],
  diretrizes_extras text
)
language sql
stable
security definer
set search_path = public
as $$
  select q.id, q.disciplina::text, q.assunto::text, q.banca::text, q.ano, q.enunciado, q.enunciado_html, q.alternativas,
         q.gabarito_letra, coalesce(nullif(q.comentario_html, ''), q.comentario),
         array(
           select distinct m[1]
           from regexp_matches(
             coalesce(q.enunciado_html, '') || ' ' || coalesce(q.alternativas::text, '') || ' ' || coalesce(q.comentario_html, ''),
             -- (sem quantificador "preguiçoso": no Postgres ele deixaria a expressão toda preguiçosa)
             '<img[^>]*src=\\?["'']([^"''\\ >]+)', 'gi'
           ) as m
         ),
         (select c.prompt_extra from public.configuracoes_ia c where c.id = 1)
  from public.questoes q
  where not coalesce(q.revisado, false)
    and not coalesce(q.anulada, false)
    and not coalesce(q.desatualizada, false)
    and coalesce(nullif(q.comentario_html, ''), q.comentario, '') <> ''
    and (p_disciplina is null or q.disciplina::text ilike p_disciplina)
    and (p_banca is null or q.banca::text ilike p_banca)
  order by q.ano desc nulls last, q.id
  limit least(greatest(coalesce(p_limite, 10), 1), 50);
$$;

revoke execute on function public.cowork_proximas_questoes(int, text, text) from public, anon, authenticated;
