-- ============================================================
-- Revisão em lote pelo Claude Code (scripts em scripts/revisao)
-- ============================================================
-- Os scripts entram com o login de um admin/editor (e-mail e senha, sem
-- chave secreta no computador) e chamam as mesmas funções do Cowork.
-- Por isso:
--   * as funções cowork_* passam a aceitar usuário logado, mas só se for
--     admin/editor de conteúdo (quem não for recebe erro ou lista vazia);
--     anon continua sem acesso; SQL direto (MCP/SQL Editor) segue igual;
--   * a revisão salva registra quem revisou (revisado_por).
-- ============================================================

-- quem pode revisar: SQL direto (sem usuário do app) ou admin/editor logado
create or replace function public.cowork_pode_revisar()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is null or public.is_conteudo_admin();
$$;

create or replace function public.cowork_proximas_questoes(
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
  imagens_no_comentario int,
  imagens_links text[],
  diretrizes_extras text
)
language sql
stable
security definer
set search_path = public
as $$
  select q.id, q.disciplina::text, q.assunto::text, q.banca::text, q.ano, q.enunciado, q.enunciado_html, q.alternativas,
         q.gabarito_letra,
         public.cowork_com_marcadores(coalesce(nullif(q.comentario_html, ''), q.comentario)),
         cardinality(public.cowork_tags_img(coalesce(nullif(q.comentario_html, ''), q.comentario))),
         array(
           select distinct m[1]
           from regexp_matches(coalesce(q.enunciado_html, '') || ' ' || coalesce(q.alternativas::text, ''),
                               '<img[^>]*src=\\?["''](https?:[^"''\\ >]+)', 'gi') as m
         ),
         (select c.prompt_extra from public.configuracoes_ia c where c.id = 1)
  from public.questoes q
  where public.cowork_pode_revisar()
    and not coalesce(q.revisado, false)
    and not coalesce(q.anulada, false)
    and not coalesce(q.desatualizada, false)
    and coalesce(nullif(q.comentario_html, ''), q.comentario, '') <> ''
    and not exists (select 1 from public.cowork_puladas p where p.questao_id = q.id)
    and (p_disciplina is null or q.disciplina::text ilike p_disciplina)
    and (p_banca is null or q.banca::text ilike p_banca)
  order by q.ano desc nulls last, q.id
  limit least(greatest(coalesce(p_limite, 10), 1), 50);
$$;

create or replace function public.cowork_imagem(p_questao_id uuid, p_n int)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select substring(
    (public.cowork_tags_img(coalesce(nullif(q.comentario_html, ''), q.comentario)))[p_n]
    from '(?i)src\s*=\s*["'']([^"'']+)'
  )
  from public.questoes q where q.id = p_questao_id and public.cowork_pode_revisar();
$$;

create or replace function public.cowork_pular(p_questao_id uuid, p_motivo text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.cowork_pode_revisar() then
    raise exception 'Só admin ou editor pode revisar questões.';
  end if;
  if not exists (select 1 from public.questoes where id = p_questao_id) then
    raise exception 'Questão % não encontrada.', p_questao_id;
  end if;
  insert into public.cowork_puladas (questao_id, motivo)
  values (p_questao_id, left(coalesce(nullif(trim(p_motivo), ''), 'sem motivo'), 300))
  on conflict (questao_id) do update set motivo = excluded.motivo, pulada_em = now();
  return 'pulada';
end;
$$;

create or replace function public.cowork_salvar_revisao(p_questao_id uuid, p_html text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_original text;
  v_revisado boolean;
  v_tags text[];
  v_html text := coalesce(p_html, '');
  v_imgs_orig text[];
  v_imgs_novo text[];
  v_texto text;
  v_texto_orig text;
  i int;
begin
  if not public.cowork_pode_revisar() then
    raise exception 'Só admin ou editor pode revisar questões.';
  end if;

  select coalesce(nullif(q.comentario_html, ''), q.comentario), coalesce(q.revisado, false)
    into v_original, v_revisado
  from public.questoes q where q.id = p_questao_id;

  if not found then
    raise exception 'Questão % não encontrada.', p_questao_id;
  end if;
  if v_revisado then
    return 'ignorada: já estava revisada';
  end if;

  if v_html ~* '```|<script|<iframe|<style|<object|<embed|\son\w+\s*=' then
    raise exception 'HTML não permitido (use só <p>, <strong>, <em>, <ul>, <ol>, <li>, <br>, <span class="render-latex"> e os marcadores [[IMGn]]).';
  end if;

  v_tags := public.cowork_tags_img(v_original);
  for i in 1 .. coalesce(array_length(v_tags, 1), 0) loop
    if (length(v_html) - length(replace(v_html, '[[IMG' || i || ']]', ''))) / length('[[IMG' || i || ']]') > 1 then
      raise exception 'O marcador [[IMG%]] aparece mais de uma vez.', i;
    end if;
    v_html := replace(v_html, '[[IMG' || i || ']]', v_tags[i]);
  end loop;
  if v_html ~ '\[\[IMG\d+\]\]' then
    raise exception 'Há marcador de imagem que não existe no comentário original (ele tem % imagem(ns)).', coalesce(array_length(v_tags, 1), 0);
  end if;

  select coalesce(array_agg(x order by x), '{}') into v_imgs_orig from unnest(v_tags) x;
  select coalesce(array_agg(x order by x), '{}') into v_imgs_novo from unnest(public.cowork_tags_img(v_html)) x;
  if v_imgs_orig is distinct from v_imgs_novo then
    raise exception 'Todas as imagens do comentário original precisam estar no revisado: use os marcadores [[IMG1]] a [[IMG%]], cada um uma vez.', cardinality(v_imgs_orig);
  end if;

  v_texto := trim(regexp_replace(regexp_replace(v_html, '<[^>]+>', ' ', 'g'), '\s+', ' ', 'g'));
  v_texto_orig := trim(regexp_replace(regexp_replace(coalesce(v_original, ''), '<[^>]+>', ' ', 'g'), '\s+', ' ', 'g'));

  if length(v_texto) < 40 then
    raise exception 'Comentário revisado vazio ou curto demais.';
  end if;
  if length(v_texto_orig) > 200 and length(v_texto) < length(v_texto_orig) * 0.4 then
    raise exception 'O texto revisado ficou muito menor que o original (possível perda de conteúdo). Reescreva sem cortar a explicação.';
  end if;

  update public.questoes q set
    comentario_revisado_html = v_html,
    comentario_revisado = v_texto,
    revisado = true,
    revisado_em = now(),
    revisado_metodo = 'cowork',
    revisado_por = auth.uid()
  where q.id = p_questao_id;

  delete from public.cowork_puladas where questao_id = p_questao_id;
  return 'salva';
end;
$$;

create or replace function public.cowork_resumo_pendentes()
returns table (disciplina text, banca text, pendentes int, com_imagem int, puladas int)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(q.disciplina::text, '(sem disciplina)'), coalesce(q.banca::text, '(sem banca)'),
         count(*) filter (where p.questao_id is null)::int,
         count(*) filter (where p.questao_id is null
           and coalesce(q.enunciado_html, '') || coalesce(q.alternativas::text, '') || coalesce(q.comentario_html, '') ~* '<img')::int,
         count(p.questao_id)::int
  from public.questoes q
  left join public.cowork_puladas p on p.questao_id = q.id
  where public.cowork_pode_revisar()
    and not coalesce(q.revisado, false)
    and not coalesce(q.anulada, false)
    and not coalesce(q.desatualizada, false)
    and coalesce(nullif(q.comentario_html, ''), q.comentario, '') <> ''
  group by 1, 2
  order by 1, 3 desc;
$$;

-- anon nunca; logado só passa se for admin/editor (conferido dentro de cada função)
revoke execute on function public.cowork_pode_revisar() from public, anon;
revoke execute on function public.cowork_proximas_questoes(int, text, text) from public, anon;
revoke execute on function public.cowork_imagem(uuid, int) from public, anon;
revoke execute on function public.cowork_pular(uuid, text) from public, anon;
revoke execute on function public.cowork_salvar_revisao(uuid, text) from public, anon;
revoke execute on function public.cowork_resumo_pendentes() from public, anon;
grant execute on function public.cowork_pode_revisar() to authenticated;
grant execute on function public.cowork_proximas_questoes(int, text, text) to authenticated;
grant execute on function public.cowork_imagem(uuid, int) to authenticated;
grant execute on function public.cowork_pular(uuid, text) to authenticated;
grant execute on function public.cowork_salvar_revisao(uuid, text) to authenticated;
grant execute on function public.cowork_resumo_pendentes() to authenticated;
