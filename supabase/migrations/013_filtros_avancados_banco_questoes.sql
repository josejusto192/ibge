-- ============================================================
-- Filtros avançados no banco de questões (admin)
-- ============================================================
-- RPC que devolve os valores distintos de cada campo filtrável, pra
-- montar dropdowns em vez de texto livre. Não precisa ser security
-- definer nem checar is_admin() aqui: já roda sob as permissões de quem
-- chama, e a RLS de `questoes` (migration 004) já restringe leitura a
-- admin — um não-admin simplesmente agrega sobre zero linhas.
-- ============================================================

create or replace function public.admin_filtros_questoes()
returns table (
  bancas text[],
  disciplinas text[],
  cargos text[],
  niveis text[],
  orgaos text[]
)
language sql
stable
as $$
  select
    array_agg(distinct banca order by banca) filter (where banca is not null and banca <> ''),
    array_agg(distinct disciplina order by disciplina) filter (where disciplina is not null and disciplina <> ''),
    array_agg(distinct cargo order by cargo) filter (where cargo is not null and cargo <> ''),
    array_agg(distinct nivel_escolaridade order by nivel_escolaridade) filter (where nivel_escolaridade is not null and nivel_escolaridade <> ''),
    array_agg(distinct orgao order by orgao) filter (where orgao is not null and orgao <> '')
  from public.questoes;
$$;

grant execute on function public.admin_filtros_questoes() to authenticated;
