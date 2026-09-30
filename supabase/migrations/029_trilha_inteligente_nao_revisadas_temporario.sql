-- ============================================================
-- TEMPORÁRIO (remover antes do lançamento): trilha inteligente pode usar
-- questões ainda NÃO revisadas
-- ============================================================
-- Enquanto o banco não foi todo revisado, o admin marca, por trilha,
-- "Usar questões ainda não revisadas". Com isso, questões sem comentário
-- revisado também entram nas sessões e podem ser obrigatórias (o aluno vê o
-- comentário original). Padrão: desligado.
--
-- Para remover depois: nova migration que apaga a coluna
-- trilha_config.permitir_nao_revisadas e volta questoes_filtradas /
-- questoes_da_etapa / admin_contar_estoque à versão da migration 028;
-- no app, tirar o seletor em src/admin/AdminTrilhaInteligente.tsx
-- (procure por "permitir_nao_revisadas").
-- ============================================================

alter table public.trilha_config add column if not exists permitir_nao_revisadas boolean not null default false;

drop function if exists public.questoes_filtradas(text, text[], text[], text[], text[], text[], int, int, boolean);
drop function if exists public.questoes_filtradas(text, text[], text[], text[], text[], text[], int, int, boolean, boolean);

create function public.questoes_filtradas(
  p_disciplina text, p_assuntos text[], p_bancas text[], p_orgaos text[], p_cargos text[], p_niveis text[],
  p_ano_min int, p_ano_max int, p_certo_errado boolean, p_incluir_nao_revisadas boolean
)
returns table (questao_id uuid, banca text)
language sql
stable
security definer
set search_path = public
as $$
  select q.id, q.banca::text
  from public.questoes q
  where (coalesce(q.revisado, false) or coalesce(p_incluir_nao_revisadas, false))
    and not coalesce(q.anulada, false)
    and not coalesce(q.desatualizada, false)
    and (p_disciplina is null or q.disciplina::text = p_disciplina)
    and (coalesce(cardinality(p_assuntos), 0) = 0 or q.assunto::text = any(p_assuntos))
    and (coalesce(cardinality(p_bancas), 0) = 0 or q.banca::text = any(p_bancas))
    and (coalesce(cardinality(p_orgaos), 0) = 0 or q.orgao::text = any(p_orgaos))
    and (coalesce(cardinality(p_cargos), 0) = 0 or q.cargo::text = any(p_cargos))
    and (coalesce(cardinality(p_niveis), 0) = 0 or q.nivel_escolaridade::text = any(p_niveis))
    and (p_ano_min is null or q.ano >= p_ano_min)
    and (p_ano_max is null or q.ano <= p_ano_max)
    and (not coalesce(p_certo_errado, false) or q.tipo::text ilike '%certo%' or jsonb_array_length(q.alternativas) = 2);
$$;

revoke execute on function public.questoes_filtradas(text, text[], text[], text[], text[], text[], int, int, boolean, boolean)
  from public, anon, authenticated;

create or replace function public.questoes_da_etapa(p_modulo_id int)
returns table (questao_id uuid, banca text, obrigatoria boolean)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (t.questao_id) t.questao_id, t.banca, t.obrigatoria
  from (
    select f.questao_id, f.banca, false as obrigatoria
    from public.modulos m
    join public.trilha_config c on c.trilha_id = m.trilha_id
    cross join lateral public.questoes_filtradas(
      m.disciplina, m.assuntos, c.bancas, c.orgaos, c.cargos, c.niveis, c.ano_min, c.ano_max, c.apenas_certo_errado,
      c.permitir_nao_revisadas
    ) f
    where m.id = p_modulo_id
      and not exists (
        select 1 from public.trilha_questoes_regras r
        where r.trilha_id = m.trilha_id and r.questao_id = f.questao_id and r.regra = 'excluida'
      )
    union all
    select r.questao_id, q.banca::text, true
    from public.trilha_questoes_regras r
    join public.questoes q on q.id = r.questao_id
    join public.trilha_config c on c.trilha_id = r.trilha_id
    where r.modulo_id = p_modulo_id and r.regra = 'obrigatoria'
      and (coalesce(q.revisado, false) or c.permitir_nao_revisadas)
      and not coalesce(q.anulada, false)
  ) t
  order by t.questao_id, t.obrigatoria desc;
$$;

create or replace function public.admin_contar_estoque(p_trilha_id int, p_disciplina text, p_assuntos text[])
returns table (total int, banca_alvo int, nao_revisadas int)
language sql
stable
security definer
set search_path = public
as $$
  with c as (select * from public.trilha_config where trilha_id = p_trilha_id),
  f as (
    select f.questao_id, f.banca
    from c cross join lateral public.questoes_filtradas(
      nullif(p_disciplina, ''), p_assuntos, c.bancas, c.orgaos, c.cargos, c.niveis, c.ano_min, c.ano_max, c.apenas_certo_errado,
      c.permitir_nao_revisadas
    ) f
    where not exists (
      select 1 from public.trilha_questoes_regras r
      where r.trilha_id = p_trilha_id and r.questao_id = f.questao_id and r.regra = 'excluida'
    )
  )
  select
    (select count(*) from f)::int,
    (select count(*) from f, c where f.banca = c.banca_alvo)::int,
    -- com não revisadas liberadas, elas já estão no total
    (select case when coalesce((select permitir_nao_revisadas from c), false) then 0 else count(*) end
      from public.questoes q
      where not coalesce(q.revisado, false)
        and (nullif(p_disciplina, '') is null or q.disciplina::text = p_disciplina)
        and (coalesce(cardinality(p_assuntos), 0) = 0 or q.assunto::text = any(p_assuntos)))::int
  where public.is_conteudo_admin();
$$;
