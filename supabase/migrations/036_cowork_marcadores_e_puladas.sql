-- ============================================================
-- Revisão pelo Cowork: marcadores de imagem, questões puladas e fórmulas
-- ============================================================
--   * Imagens gravadas dentro do HTML (base64, até ~1,5 MB) não dá para a
--     IA reenviar idênticas. Agora o comentário vai para o Cowork com cada
--     <img> trocada por [[IMG1]], [[IMG2]]…, e o servidor devolve a tag
--     original no lugar do marcador ao salvar. Para OLHAR a imagem, o
--     Cowork pede cowork_imagem(questao_id, n).
--   * cowork_pular(questao_id, motivo): questão pulada (ex.: comentário
--     errado) não volta nos próximos lotes; fica listada para o professor.
--   * Trava de tamanho: o texto revisado pode ter até 40% do original
--     (antes 50%), já que a bibliografia do fim sai do comentário.
--   * Fórmulas: <span class="render-latex">…</span> é aceito (o app desenha
--     com KaTeX).
-- ============================================================

create table if not exists public.cowork_puladas (
  questao_id uuid primary key references public.questoes(id) on delete cascade,
  motivo text not null,
  pulada_em timestamptz not null default now()
);
alter table public.cowork_puladas enable row level security;
drop policy if exists "cowork_puladas: leitura equipe" on public.cowork_puladas;
create policy "cowork_puladas: leitura equipe" on public.cowork_puladas for select using (public.is_conteudo_admin());

-- troca cada <img> por [[IMGn]] (na ordem em que aparecem)
create or replace function public.cowork_com_marcadores(p_html text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_saida text := '';
  v_resto text := coalesce(p_html, '');
  v_n int := 0;
  v_pos int;
  v_tag text;
begin
  loop
    v_tag := substring(v_resto from '(?i)<img[^>]*>');
    exit when v_tag is null;
    v_pos := strpos(v_resto, v_tag);
    v_n := v_n + 1;
    v_saida := v_saida || left(v_resto, v_pos - 1) || '[[IMG' || v_n || ']]';
    v_resto := substr(v_resto, v_pos + length(v_tag));
  end loop;
  return v_saida || v_resto;
end;
$$;

-- lista das tags <img> do HTML, na ordem
create or replace function public.cowork_tags_img(p_html text)
returns text[]
language sql
immutable
set search_path = public
as $$
  select coalesce(array_agg(m[1] order by ord), '{}')
  from regexp_matches(coalesce(p_html, ''), '(<img[^>]*>)', 'gi') with ordinality as t(m, ord);
$$;

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
         -- links (http) das imagens do enunciado e das alternativas; as do
         -- comentário são vistas com cowork_imagem(questao_id, n)
         array(
           select distinct m[1]
           from regexp_matches(coalesce(q.enunciado_html, '') || ' ' || coalesce(q.alternativas::text, ''),
                               '<img[^>]*src=\\?["''](https?:[^"''\\ >]+)', 'gi') as m
         ),
         (select c.prompt_extra from public.configuracoes_ia c where c.id = 1)
  from public.questoes q
  where not coalesce(q.revisado, false)
    and not coalesce(q.anulada, false)
    and not coalesce(q.desatualizada, false)
    and coalesce(nullif(q.comentario_html, ''), q.comentario, '') <> ''
    and not exists (select 1 from public.cowork_puladas p where p.questao_id = q.id)
    and (p_disciplina is null or q.disciplina::text ilike p_disciplina)
    and (p_banca is null or q.banca::text ilike p_banca)
  order by q.ano desc nulls last, q.id
  limit least(greatest(coalesce(p_limite, 10), 1), 50);
$$;

-- endereço (link ou imagem embutida "data:...") da n-ésima imagem do comentário
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
  from public.questoes q where q.id = p_questao_id;
$$;

create or replace function public.cowork_pular(p_questao_id uuid, p_motivo text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
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

  -- marcadores [[IMGn]] → tag original (cada um uma vez)
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

  -- as imagens originais têm de voltar todas (via marcador ou tag idêntica)
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
    revisado_por = null
  where q.id = p_questao_id;

  delete from public.cowork_puladas where questao_id = p_questao_id;
  return 'salva';
end;
$$;

drop function if exists public.cowork_resumo_pendentes();
create function public.cowork_resumo_pendentes()
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
  where not coalesce(q.revisado, false)
    and not coalesce(q.anulada, false)
    and not coalesce(q.desatualizada, false)
    and coalesce(nullif(q.comentario_html, ''), q.comentario, '') <> ''
  group by 1, 2
  order by 1, 3 desc;
$$;

revoke execute on function public.cowork_proximas_questoes(int, text, text) from public, anon, authenticated;
revoke execute on function public.cowork_imagem(uuid, int) from public, anon, authenticated;
revoke execute on function public.cowork_pular(uuid, text) from public, anon, authenticated;
revoke execute on function public.cowork_salvar_revisao(uuid, text) from public, anon, authenticated;
revoke execute on function public.cowork_resumo_pendentes() from public, anon, authenticated;
revoke execute on function public.cowork_com_marcadores(text) from public, anon, authenticated;
revoke execute on function public.cowork_tags_img(text) from public, anon, authenticated;
