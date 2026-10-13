-- ============================================================
-- Trilha inteligente no formato Duolingo: seções → unidades → lições
-- ============================================================
-- O aluno não vê mais "meta" nem "domínio-alvo". O caminho tem seções
-- (blocos grandes), cada seção tem unidades (um tema: disciplina +
-- assuntos) e cada unidade vira N bolinhas (lições de ~10 questões) + 1
-- bolinha final de "Revisão da unidade". Terminou a lição → a próxima
-- libera (sem nota mínima). O algoritmo continua por trás: escolhe questões
-- no nível do aluno, intercala revisões e reforça o que está fraco.
--
--   * trilha_secoes: seções da trilha (título + ordem).
--   * modulos.secao_id / modulos.licoes: a unidade e quantas lições tem.
--   * progresso_unidades: quantas lições da unidade o aluno já fez.
--   * concluir_licao(): chamada no fim da sessão; exige que o aluno tenha
--     respondido as questões entregues; ao terminar a revisão, a unidade
--     fica concluída (progresso_modulos).
--   * montar_sessao_inteligente(modulo, p_revisao): a revisão da unidade
--     traz primeiro os erros e o que foi visto há mais tempo.
--   * modulo_liberado(): a unidade grátis é a 1ª na ordem das seções.
--   * admin_sugerir_estrutura(): estoque por disciplina/assunto com os
--     filtros da trilha, para o admin montar a trilha com 1 clique.
-- ============================================================

create table if not exists public.trilha_secoes (
  id        serial primary key,
  trilha_id int not null references public.trilhas(id) on delete cascade,
  titulo    text not null,
  ordem     int not null default 0
);
create index if not exists trilha_secoes_trilha_idx on public.trilha_secoes (trilha_id, ordem);
alter table public.trilha_secoes enable row level security;
drop policy if exists "trilha_secoes: leitura" on public.trilha_secoes;
create policy "trilha_secoes: leitura" on public.trilha_secoes for select to authenticated using (true);
drop policy if exists "trilha_secoes: escrita equipe" on public.trilha_secoes;
create policy "trilha_secoes: escrita equipe" on public.trilha_secoes for all
  using (public.is_conteudo_admin()) with check (public.is_conteudo_admin());

alter table public.modulos
  add column if not exists secao_id int references public.trilha_secoes(id) on delete set null,
  add column if not exists licoes int not null default 4;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'modulos_licoes_check') then
    alter table public.modulos add constraint modulos_licoes_check check (licoes between 1 and 20);
  end if;
end $$;

create table if not exists public.progresso_unidades (
  usuario_id    uuid not null references public.usuarios(id) on delete cascade,
  modulo_id     int not null references public.modulos(id) on delete cascade,
  licoes_feitas int not null default 0,
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, modulo_id)
);
alter table public.progresso_unidades enable row level security;
drop policy if exists "progresso_unidades: leitura própria" on public.progresso_unidades;
create policy "progresso_unidades: leitura própria" on public.progresso_unidades for select using (auth.uid() = usuario_id);


-- ---- Unidade grátis: a 1ª do caminho, na ordem das seções ----
-- (sem seção primeiro; nas trilhas manuais nada muda: secao_id é sempre nulo)
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
      join public.modulos m2 on m2.trilha_id = m.trilha_id and m2.tipo in ('questoes', 'inteligente')
      left join public.trilha_secoes s on s.id = m2.secao_id
      where m.id = p_modulo_id
      order by (s.id is not null), s.ordem, s.id, m2.ordem, m2.id
      limit 1
    );
$$;

-- ---- Sessão (lição normal ou revisão da unidade) ----
drop function if exists public.montar_sessao_inteligente(int);
drop function if exists public.montar_sessao_inteligente(int, boolean);

create function public.montar_sessao_inteligente(p_modulo_id int, p_revisao boolean default false)
returns table (
  id uuid, enunciado text, enunciado_html text, tem_imagem boolean,
  gabarito_letra text, comentario text, comentario_html text,
  banca text, ano smallint, orgao text, orgao_nome text, cargo text,
  disciplina text, nivel_escolaridade text, tipo text,
  anulada boolean, desatualizada boolean, alternativas jsonb, motivo text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_mod public.modulos%rowtype;
  v_cfg public.trilha_config%rowtype;
  v_n int;
  v_r int;
  v_theta double precision;
  v_alvo_b double precision;
  v_ids uuid[] := '{}';
  v_mot text[] := '{}';
  v_tmp uuid[];
  v_falta int;
  v_prev int;
begin
  if v_uid is null then
    raise exception 'Faça login.';
  end if;
  select * into v_mod from public.modulos m where m.id = p_modulo_id;
  if v_mod.id is null or v_mod.tipo <> 'inteligente' then
    raise exception 'Etapa inválida.';
  end if;
  if not public.modulo_liberado(p_modulo_id) then
    raise exception 'ASSINATURA_NECESSARIA';
  end if;
  select * into v_cfg from public.trilha_config c where c.trilha_id = v_mod.trilha_id;
  v_n := coalesce(v_cfg.questoes_por_sessao, 10);
  v_r := coalesce(v_cfg.revisoes_por_sessao, 2);

  select t.theta into v_theta from public.theta_etapa(v_uid, p_modulo_id) t;
  -- questão "no ponto": chance de ~70% de acerto
  v_alvo_b := coalesce(v_theta, 0) - 0.85;

  create temp table if not exists _foco_pool (
    questao_id uuid primary key, banca text, obrigatoria boolean, dificuldade double precision,
    respondida boolean, acertou boolean, respondida_em timestamptz
  ) on commit drop;
  truncate _foco_pool;
  insert into _foco_pool
  select e.questao_id, e.banca, e.obrigatoria, coalesce(s.dificuldade, 0),
         pq.questao_id is not null, pq.acertou, pq.respondido_em
  from public.questoes_da_etapa(p_modulo_id) e
  left join public.questao_stats s on s.questao_id = e.questao_id
  left join public.progresso_questoes pq on pq.questao_id = e.questao_id and pq.usuario_id = v_uid;

  -- 1. revisões vencidas (de qualquer trilha)
  select coalesce(array_agg(x.qid), '{}') into v_tmp from (
    select r.questao_id as qid from public.revisoes r
    where r.usuario_id = v_uid and r.proxima_em <= now()
      and (r.etapa > 0 or r.atualizado_em <= now() - interval '20 hours')
      and public.questao_liberada(r.questao_id)
    order by r.proxima_em
    limit v_r
  ) x;
  v_ids := v_ids || v_tmp;
  v_mot := v_mot || array_fill('revisao'::text, array[cardinality(v_tmp)]);

  -- Lição de revisão (última bolinha da unidade): primeiro o que o aluno
  -- errou nesta unidade, depois o que ele viu há mais tempo.
  if p_revisao then
    select coalesce(array_agg(x.questao_id), '{}') into v_tmp from (
      select p.questao_id from _foco_pool p
      where p.respondida and not (p.questao_id = any(v_ids))
      order by p.acertou, p.respondida_em
      limit greatest(v_n - cardinality(v_ids), 0)
    ) x;
    v_ids := v_ids || v_tmp;
    v_mot := v_mot || array_fill('repeticao'::text, array[cardinality(v_tmp)]);
  end if;

  -- 2. obrigatórias ainda não respondidas
  select coalesce(array_agg(x.questao_id), '{}') into v_tmp from (
    select p.questao_id from _foco_pool p
    where p.obrigatoria and not p.respondida and not (p.questao_id = any(v_ids))
    order by p.dificuldade
    limit greatest(v_n - cardinality(v_ids) - 1, 0)
  ) x;
  v_ids := v_ids || v_tmp;
  v_mot := v_mot || array_fill('obrigatoria'::text, array[cardinality(v_tmp)]);

  -- 3. reforço: 1 questão da etapa anterior em que o aluno está mais fraco
  if v_n >= 8 and not p_revisao then
    select m2.id into v_prev
    from public.modulos m2
    cross join lateral public.theta_etapa(v_uid, m2.id) t
    where m2.trilha_id = v_mod.trilha_id and m2.tipo = 'inteligente' and m2.ordem < v_mod.ordem and t.respostas >= 3
    order by t.theta
    limit 1;
    if v_prev is not null then
      select coalesce(array_agg(x.questao_id), '{}') into v_tmp from (
        select e.questao_id from public.questoes_da_etapa(v_prev) e
        left join public.progresso_questoes pq on pq.questao_id = e.questao_id and pq.usuario_id = v_uid
        where (pq.questao_id is null or not pq.acertou) and not (e.questao_id = any(v_ids))
        order by random()
        limit 1
      ) x;
      if cardinality(v_tmp) > 0 then
        insert into public.sessoes_servidas (usuario_id, questao_id, modulo_id)
        values (v_uid, v_tmp[1], v_prev)
        on conflict (usuario_id, questao_id, modulo_id) do update set servida_em = now();
      end if;
      v_ids := v_ids || v_tmp;
      v_mot := v_mot || array_fill('reforco'::text, array[cardinality(v_tmp)]);
    end if;
  end if;

  -- 4. novas no nível do aluno, priorizando a banca-alvo
  v_falta := v_n - cardinality(v_ids);
  if v_falta > 0 and v_cfg.banca_alvo is not null and v_cfg.banca_alvo_pct > 0 then
    select coalesce(array_agg(x.questao_id), '{}') into v_tmp from (
      select p.questao_id from _foco_pool p
      where not p.respondida and p.banca = v_cfg.banca_alvo and not (p.questao_id = any(v_ids))
      order by abs(p.dificuldade - v_alvo_b) + random() * 0.6
      limit ceil(v_falta * v_cfg.banca_alvo_pct / 100.0)::int
    ) x;
    v_ids := v_ids || v_tmp;
    v_mot := v_mot || array_fill('nova'::text, array[cardinality(v_tmp)]);
  end if;

  v_falta := v_n - cardinality(v_ids);
  if v_falta > 0 then
    select coalesce(array_agg(x.questao_id), '{}') into v_tmp from (
      select p.questao_id from _foco_pool p
      where not p.respondida and not (p.questao_id = any(v_ids))
      order by abs(p.dificuldade - v_alvo_b) + random() * 0.6
      limit v_falta
    ) x;
    v_ids := v_ids || v_tmp;
    v_mot := v_mot || array_fill('nova'::text, array[cardinality(v_tmp)]);
  end if;

  -- 5. acabou o estoque de novas: refaz primeiro as que errou, depois as mais antigas
  v_falta := v_n - cardinality(v_ids);
  if v_falta > 0 then
    select coalesce(array_agg(x.questao_id), '{}') into v_tmp from (
      select p.questao_id from _foco_pool p
      where p.respondida and not (p.questao_id = any(v_ids))
      order by p.acertou, p.respondida_em
      limit v_falta
    ) x;
    v_ids := v_ids || v_tmp;
    v_mot := v_mot || array_fill('repeticao'::text, array[cardinality(v_tmp)]);
  end if;

  -- o que foi entregue nesta etapa passa a poder ser respondido
  insert into public.sessoes_servidas (usuario_id, questao_id, modulo_id)
  select v_uid, u.qid, p_modulo_id
  from unnest(v_ids, v_mot) as u(qid, mot)
  where u.mot not in ('revisao', 'reforco')
  on conflict (usuario_id, questao_id, modulo_id) do update set servida_em = now();

  -- ordem: novas da mais fácil pra mais difícil; revisões/reforço intercalados
  return query
  with sel as (
    select u.qid, u.mot, u.ord, (u.mot in ('revisao', 'reforco')) as extra
    from unnest(v_ids, v_mot) with ordinality as u(qid, mot, ord)
  ),
  k as (
    select sel.*, row_number() over (
      partition by sel.extra
      order by case when sel.extra then sel.ord::double precision else coalesce(st.dificuldade, 0) end, sel.ord
    ) as rn
    from sel left join public.questao_stats st on st.questao_id = sel.qid
  )
  select
    q.id::uuid, q.enunciado::text, q.enunciado_html::text, q.tem_imagem::boolean, q.gabarito_letra::text,
    coalesce(q.comentario_revisado, q.comentario)::text,
    coalesce(q.comentario_revisado_html, q.comentario_html)::text,
    q.banca::text, q.ano::smallint, q.orgao::text, q.orgao_nome::text, q.cargo::text, q.disciplina::text,
    q.nivel_escolaridade::text, q.tipo::text, q.anulada::boolean, q.desatualizada::boolean, q.alternativas::jsonb,
    k.mot::text
  from k
  join public.questoes q on q.id = k.qid
  order by case when k.extra then ((k.rn - 1) * 3 + 1) * 10 + 5 else k.rn * 10 end;
end;
$$;

revoke execute on function public.montar_sessao_inteligente(int, boolean) from public, anon;
grant execute on function public.montar_sessao_inteligente(int, boolean) to authenticated;


-- ---- Fim da lição ----
create or replace function public.concluir_licao(p_modulo_id int)
returns table (licoes_feitas int, licoes int, unidade_concluida boolean, concluiu_agora boolean)
language plpgsql
volatile
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_mod public.modulos%rowtype;
  v_feitas int := 0;
  v_desde timestamptz;
  v_servidas int;
  v_respondidas int;
  v_acertos int;
  v_total int;
  v_agora boolean := false;
begin
  if v_uid is null then
    raise exception 'Faça login.';
  end if;
  select * into v_mod from public.modulos m where m.id = p_modulo_id;
  if v_mod.id is null or v_mod.tipo <> 'inteligente' then
    raise exception 'Unidade inválida.';
  end if;
  if not public.modulo_liberado(p_modulo_id) then
    raise exception 'ASSINATURA_NECESSARIA';
  end if;

  select pu.licoes_feitas, pu.atualizado_em into v_feitas, v_desde
  from public.progresso_unidades pu where pu.usuario_id = v_uid and pu.modulo_id = p_modulo_id;
  v_feitas := coalesce(v_feitas, 0);
  v_desde := coalesce(v_desde, '-infinity'::timestamptz);

  -- só conta a lição se o aluno respondeu o que o servidor entregou nela
  select count(*) into v_servidas from public.sessoes_servidas s
  where s.usuario_id = v_uid and s.modulo_id = p_modulo_id and s.servida_em > v_desde;
  select count(distinct r.questao_id) into v_respondidas
  from public.respostas r
  join public.sessoes_servidas s on s.questao_id = r.questao_id and s.usuario_id = v_uid and s.modulo_id = p_modulo_id
  where r.usuario_id = v_uid and r.respondido_em > v_desde and s.servida_em > v_desde;
  if v_servidas = 0 or v_respondidas < least(5, v_servidas) then
    raise exception 'Responda as questões da lição antes de concluir.';
  end if;

  if v_feitas <= v_mod.licoes then
    v_feitas := v_feitas + 1;
    insert into public.progresso_unidades as pu (usuario_id, modulo_id, licoes_feitas, atualizado_em)
    values (v_uid, p_modulo_id, v_feitas, now())
    on conflict (usuario_id, modulo_id) do update set licoes_feitas = excluded.licoes_feitas, atualizado_em = now();
  end if;

  -- lições + a revisão final → unidade concluída
  if v_feitas >= v_mod.licoes + 1
     and not exists (select 1 from public.progresso_modulos pm where pm.usuario_id = v_uid and pm.modulo_id = p_modulo_id) then
    select count(pq.questao_id), count(*) filter (where pq.acertou) into v_total, v_acertos
    from public.questoes_da_etapa(p_modulo_id) e
    join public.progresso_questoes pq on pq.questao_id = e.questao_id and pq.usuario_id = v_uid;
    perform set_config('foco.servidor', '1', true);
    insert into public.progresso_modulos (usuario_id, modulo_id, acertos, total)
    values (v_uid, p_modulo_id, coalesce(v_acertos, 0), coalesce(v_total, 0))
    on conflict (usuario_id, modulo_id) do nothing;
    perform set_config('foco.servidor', '', true);
    v_agora := true;
  end if;

  return query select v_feitas, v_mod.licoes, v_feitas >= v_mod.licoes + 1, v_agora;
end;
$$;

revoke execute on function public.concluir_licao(int) from public, anon;
grant execute on function public.concluir_licao(int) to authenticated;


-- ---- Progresso do caminho (lições feitas por unidade) ----
drop function if exists public.progresso_trilha_inteligente(int);
create function public.progresso_trilha_inteligente(p_trilha_id int)
returns table (modulo_id int, licoes int, licoes_feitas int, estoque int)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.licoes, coalesce(pu.licoes_feitas, 0),
    (select count(*) from public.questoes_da_etapa(m.id))::int
  from public.modulos m
  left join public.progresso_unidades pu on pu.modulo_id = m.id and pu.usuario_id = auth.uid()
  where m.trilha_id = p_trilha_id and m.tipo = 'inteligente' and auth.uid() is not null
  order by m.ordem, m.id;
$$;

revoke execute on function public.progresso_trilha_inteligente(int) from public, anon;
grant execute on function public.progresso_trilha_inteligente(int) to authenticated;


-- ---- Admin: sugestão de estrutura (estoque por disciplina/assunto) ----
create or replace function public.admin_sugerir_estrutura(p_trilha_id int)
returns table (disciplina text, assunto text, estoque int, banca_alvo int)
language sql
stable
security definer
set search_path = public
as $$
  with c as (select * from public.trilha_config where trilha_id = p_trilha_id),
  f as (
    select f.questao_id, f.banca
    from c cross join lateral public.questoes_filtradas(
      null, '{}', c.bancas, c.orgaos, c.cargos, c.niveis, c.ano_min, c.ano_max, c.apenas_certo_errado, c.permitir_nao_revisadas
    ) f
    where not exists (
      select 1 from public.trilha_questoes_regras r
      where r.trilha_id = p_trilha_id and r.questao_id = f.questao_id and r.regra = 'excluida'
    )
  )
  select coalesce(q.disciplina::text, ''), coalesce(nullif(btrim(q.assunto::text), ''), ''),
         count(*)::int, (count(*) filter (where f.banca = (select banca_alvo from c)))::int
  from f join public.questoes q on q.id = f.questao_id
  where public.is_conteudo_admin()
  group by 1, 2
  order by 1, 3 desc;
$$;

revoke execute on function public.admin_sugerir_estrutura(int) from public, anon;
grant execute on function public.admin_sugerir_estrutura(int) to authenticated;
