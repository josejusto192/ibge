-- ============================================================
-- Corrige get_modulo_questoes (migration 022): "Não conseguimos carregar
-- as questões" em qualquer módulo
-- ============================================================
-- A 022 transformou a função em plpgsql (pra avisar ASSINATURA_NECESSARIA).
-- Em plpgsql, RETURN QUERY exige tipos IDÊNTICOS aos declarados, e a
-- tabela `questoes` (criada fora das migrations) tem colunas como
-- disciplina varchar(255), não text — a versão em SQL puro aceitava, esta
-- não: "Returned type character varying(255) does not match expected type
-- text in column 13". Agora cada coluna é convertida explicitamente.
-- ============================================================

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
      q.id::uuid,
      q.enunciado::text,
      q.enunciado_html::text,
      q.tem_imagem::boolean,
      q.gabarito_letra::text,
      coalesce(q.comentario_revisado, q.comentario)::text,
      coalesce(q.comentario_revisado_html, q.comentario_html)::text,
      q.banca::text,
      q.ano::smallint,
      q.orgao::text,
      q.orgao_nome::text,
      q.cargo::text,
      q.disciplina::text,
      q.nivel_escolaridade::text,
      q.tipo::text,
      q.anulada::boolean,
      q.desatualizada::boolean,
      q.alternativas::jsonb
    from public.questoes q
    join public.modulo_questoes mq on mq.questao_id = q.id
    where mq.modulo_id = p_modulo_id
    order by mq.ordem;
end;
$$;

grant execute on function public.get_modulo_questoes(int) to authenticated;
