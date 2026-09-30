-- ============================================================
-- Revisão de comentários pelo Claude Cowork (ligado direto no Supabase)
-- ============================================================
-- Em vez de o Cowork escrever direto nas tabelas, ele usa só estas duas
-- funções (prompt em docs/REVISAO-COWORK.md):
--   * cowork_proximas_questoes(limite, disciplina, banca): o próximo lote
--     de questões sem revisão, com o comentário original e as diretrizes
--     extras do professor (Configurações → prompt_extra).
--   * cowork_salvar_revisao(questao_id, html): confere e salva, igual à
--     revisão com IA do app: não aceita texto vazio, curto demais ou com
--     imagens perdidas/alteradas; grava revisado_metodo = 'cowork'.
-- As funções não ficam disponíveis para o app (anon/authenticated): só
-- para quem acessa o banco com a conta do projeto (SQL Editor / MCP).
-- ============================================================

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
  alternativas jsonb,
  gabarito_letra text,
  comentario_original_html text,
  diretrizes_extras text
)
language sql
stable
security definer
set search_path = public
as $$
  select q.id, q.disciplina::text, q.assunto::text, q.banca::text, q.ano, q.enunciado, q.alternativas,
         q.gabarito_letra, coalesce(nullif(q.comentario_html, ''), q.comentario),
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

create or replace function public.cowork_salvar_revisao(p_questao_id uuid, p_html text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_original text;
  v_revisado boolean;
  v_imgs_orig text[];
  v_imgs_novo text[];
  v_texto text;
  v_texto_orig text;
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

  v_texto := trim(regexp_replace(regexp_replace(coalesce(p_html, ''), '<[^>]+>', ' ', 'g'), '\s+', ' ', 'g'));
  v_texto_orig := trim(regexp_replace(regexp_replace(coalesce(v_original, ''), '<[^>]+>', ' ', 'g'), '\s+', ' ', 'g'));

  if length(v_texto) < 40 then
    raise exception 'Comentário revisado vazio ou curto demais.';
  end if;
  -- uma paráfrase não encolhe o conteúdo pela metade
  if length(v_texto_orig) > 200 and length(v_texto) < length(v_texto_orig) * 0.5 then
    raise exception 'O texto revisado ficou muito menor que o original (possível perda de conteúdo). Reescreva sem cortar informação.';
  end if;
  if p_html ~* '```|<script|<iframe|<style|\son\w+\s*=' then
    raise exception 'HTML não permitido (use só <p>, <strong>, <em>, <ul>, <ol>, <li>, <br> e as <img> originais).';
  end if;

  -- as imagens originais têm de voltar idênticas
  select coalesce(array_agg(m[1] order by m[1]), '{}') into v_imgs_orig
  from regexp_matches(coalesce(v_original, ''), '(<img[^>]*>)', 'gi') as m;
  select coalesce(array_agg(m[1] order by m[1]), '{}') into v_imgs_novo
  from regexp_matches(p_html, '(<img[^>]*>)', 'gi') as m;
  if v_imgs_orig is distinct from v_imgs_novo then
    raise exception 'As imagens do comentário original (% no total) precisam aparecer exatamente iguais no revisado.', cardinality(v_imgs_orig);
  end if;

  update public.questoes q set
    comentario_revisado_html = p_html,
    comentario_revisado = v_texto,
    revisado = true,
    revisado_em = now(),
    revisado_metodo = 'cowork',
    revisado_por = null
  where q.id = p_questao_id;

  return 'salva';
end;
$$;

revoke execute on function public.cowork_proximas_questoes(int, text, text) from public, anon, authenticated;
revoke execute on function public.cowork_salvar_revisao(uuid, text) from public, anon, authenticated;
