-- ============================================================
-- Revisão espaçada + algoritmo de aprendizagem + Trilha Inteligente
-- ============================================================
-- FASE 1 (vale para todas as trilhas)
--   * respostas: histórico de TODAS as respostas (progresso_questoes guarda
--     só a última de cada questão).
--   * revisoes: fila de revisão espaçada de cada aluno.
--       errou                      → etapa 0, volta na hora (caderno)
--       acertou na revisão vencida → etapa 1 (volta em 1 dia)
--                                  → etapa 2 (7 dias) → etapa 3 (30 dias)
--                                  → dominada (sai da fila)
--       errou em qualquer momento  → volta pra etapa 0
--   * get_revisoes_pendentes / contar_revisoes_pendentes: o novo caderno
--     (erros + revisões vencidas, de qualquer trilha).
--   * get_revisoes_para_sessao: 2–3 questões antigas intercaladas nas
--     sessões dos módulos manuais (revisões vencidas; senão, questões que o
--     aluno acertou há dias, da mesma trilha).
--
-- ALGORITMO (cálculo, sem IA) — atualizado a cada resposta:
--   * proficiencia: "nota" (θ) do aluno por disciplina e por assunto.
--   * questao_stats: dificuldade (b) de cada questão, aprendida das
--     respostas de todos (só a 1ª resposta de cada aluno conta).
--   * P(acerto) = chute + (1 − chute)·σ(θ − b), chute = 1/nº de alternativas
--     (Certo/Errado = 50%). Depois da resposta, θ e b andam na direção do
--     erro da previsão (como o ranking Elo do xadrez).
--   * domínio exibido = σ(θ) = chance de acertar uma questão de
--     dificuldade média, sem chute.
--
-- TRILHA INTELIGENTE (trilhas.tipo = 'inteligente')
--   * trilha_config: filtros do banco (bancas, órgãos, cargos, níveis,
--     anos, só Certo/Errado), banca-alvo com % de prioridade, tamanho da
--     sessão e quantas revisões entram em cada sessão.
--   * etapas = modulos tipo 'inteligente' com disciplina, assuntos, meta
--     de questões e domínio-alvo.
--   * trilha_questoes_regras: questões obrigatórias (por etapa) e
--     excluídas (da trilha toda) — o admin mantém o controle.
--   * montar_sessao_inteligente: revisões vencidas + obrigatórias + 1
--     reforço da etapa anterior mais fraca + novas perto do nível do aluno
--     (chance ~70% de acerto), priorizando a banca-alvo.
--   * avaliar_etapa: conclui a etapa quando respondeu a meta E atingiu o
--     domínio-alvo; sem domínio, o aluno refaz os erros (limite de segurança).
-- ============================================================


-- ============================================================
-- 1. Tabelas
-- ============================================================

create table if not exists public.respostas (
  id            bigserial primary key,
  usuario_id    uuid not null references public.usuarios(id) on delete cascade,
  questao_id    uuid not null references public.questoes(id) on delete cascade,
  letra         text,
  acertou       boolean not null,
  origem        text not null default 'trilha',
  respondido_em timestamptz not null default now()
);
create index if not exists respostas_usuario_idx on public.respostas (usuario_id, respondido_em desc);
create index if not exists respostas_questao_idx on public.respostas (questao_id);
alter table public.respostas enable row level security;
drop policy if exists "respostas: leitura própria" on public.respostas;
create policy "respostas: leitura própria" on public.respostas for select
  using (auth.uid() = usuario_id or public.is_admin());

create table if not exists public.revisoes (
  usuario_id    uuid not null references public.usuarios(id) on delete cascade,
  questao_id    uuid not null references public.questoes(id) on delete cascade,
  etapa         smallint not null default 0,
  proxima_em    timestamptz,             -- null = dominada
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, questao_id)
);
create index if not exists revisoes_pendentes_idx on public.revisoes (usuario_id, proxima_em);
alter table public.revisoes enable row level security;
drop policy if exists "revisoes: leitura própria" on public.revisoes;
create policy "revisoes: leitura própria" on public.revisoes for select using (auth.uid() = usuario_id);

create table if not exists public.proficiencia (
  usuario_id    uuid not null references public.usuarios(id) on delete cascade,
  disciplina    text not null,
  assunto       text not null default '',   -- '' = a disciplina inteira
  habilidade    double precision not null default 0,
  respostas     int not null default 0,
  acertos       int not null default 0,
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, disciplina, assunto)
);
alter table public.proficiencia enable row level security;
drop policy if exists "proficiencia: leitura própria" on public.proficiencia;
create policy "proficiencia: leitura própria" on public.proficiencia for select
  using (auth.uid() = usuario_id or public.is_admin());

create table if not exists public.questao_stats (
  questao_id  uuid primary key references public.questoes(id) on delete cascade,
  dificuldade double precision not null default 0,
  respostas   int not null default 0,
  acertos     int not null default 0
);
alter table public.questao_stats enable row level security;
drop policy if exists "questao_stats: leitura equipe" on public.questao_stats;
create policy "questao_stats: leitura equipe" on public.questao_stats for select using (public.is_conteudo_admin());

-- tipo de trilha
alter table public.trilhas add column if not exists tipo text not null default 'manual';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'trilhas_tipo_check') then
    alter table public.trilhas add constraint trilhas_tipo_check check (tipo in ('manual', 'inteligente'));
  end if;
end $$;

-- etapas inteligentes são módulos
alter table public.modulos
  add column if not exists disciplina text,
  add column if not exists assuntos text[] not null default '{}',
  add column if not exists meta_questoes int not null default 20,
  add column if not exists dominio_alvo int not null default 70;
alter table public.modulos drop constraint if exists modulos_tipo_check;
alter table public.modulos add constraint modulos_tipo_check check (tipo in ('questoes', 'aula', 'inteligente'));

create table if not exists public.trilha_config (
  trilha_id           int primary key references public.trilhas(id) on delete cascade,
  concurso            text,
  cargo_alvo          text,
  bancas              text[] not null default '{}',
  banca_alvo          text,
  banca_alvo_pct      int not null default 70 check (banca_alvo_pct between 0 and 100),
  orgaos              text[] not null default '{}',
  cargos              text[] not null default '{}',
  niveis              text[] not null default '{}',
  ano_min             int,
  ano_max             int,
  apenas_certo_errado boolean not null default false,
  questoes_por_sessao int not null default 10 check (questoes_por_sessao between 5 and 30),
  revisoes_por_sessao int not null default 2 check (revisoes_por_sessao between 0 and 5),
  atualizado_em       timestamptz not null default now()
);
alter table public.trilha_config enable row level security;
drop policy if exists "trilha_config: leitura" on public.trilha_config;
create policy "trilha_config: leitura" on public.trilha_config for select to authenticated using (true);
drop policy if exists "trilha_config: escrita equipe" on public.trilha_config;
create policy "trilha_config: escrita equipe" on public.trilha_config for all
  using (public.is_conteudo_admin()) with check (public.is_conteudo_admin());

create table if not exists public.trilha_questoes_regras (
  trilha_id  int not null references public.trilhas(id) on delete cascade,
  questao_id uuid not null references public.questoes(id) on delete cascade,
  regra      text not null check (regra in ('obrigatoria', 'excluida')),
  modulo_id  int references public.modulos(id) on delete cascade,
  primary key (trilha_id, questao_id)
);
alter table public.trilha_questoes_regras enable row level security;
drop policy if exists "trilha_questoes_regras: equipe" on public.trilha_questoes_regras;
create policy "trilha_questoes_regras: equipe" on public.trilha_questoes_regras for all
  using (public.is_conteudo_admin()) with check (public.is_conteudo_admin());

-- o que o servidor já entregou ao aluno numa etapa inteligente (libera a resposta)
create table if not exists public.sessoes_servidas (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  questao_id uuid not null references public.questoes(id) on delete cascade,
  modulo_id  int not null references public.modulos(id) on delete cascade,
  servida_em timestamptz not null default now(),
  primary key (usuario_id, questao_id, modulo_id)
);
alter table public.sessoes_servidas enable row level security;

create index if not exists questoes_disciplina_idx on public.questoes (disciplina);
create index if not exists questoes_assunto_idx on public.questoes (assunto);


-- ============================================================
-- 2. Dados antigos: histórico, fila de revisão e calibragem inicial
-- ============================================================

insert into public.respostas (usuario_id, questao_id, acertou, origem, respondido_em)
select pq.usuario_id, pq.questao_id, pq.acertou, 'importada', pq.respondido_em
from public.progresso_questoes pq
where not exists (select 1 from public.respostas limit 1);

insert into public.revisoes (usuario_id, questao_id, etapa, proxima_em, atualizado_em)
select pq.usuario_id, pq.questao_id, 0, pq.respondido_em, pq.respondido_em
from public.progresso_questoes pq
where not pq.acertou
on conflict do nothing;

-- dificuldade inicial = % de acerto já observado (suavizado)
insert into public.questao_stats (questao_id, dificuldade, respostas, acertos)
select pq.questao_id,
       greatest(-4, least(4, -ln(((count(*) filter (where pq.acertou)) + 1.0) / (count(*) - (count(*) filter (where pq.acertou)) + 1.0)))),
       count(*)::int, (count(*) filter (where pq.acertou))::int
from public.progresso_questoes pq
group by pq.questao_id
on conflict do nothing;

-- nota inicial do aluno por assunto e por disciplina
insert into public.proficiencia (usuario_id, disciplina, assunto, habilidade, respostas, acertos)
select pq.usuario_id, coalesce(q.disciplina::text, ''), k.assunto,
       greatest(-4, least(4, ln(((count(*) filter (where pq.acertou)) + 1.0) / (count(*) - (count(*) filter (where pq.acertou)) + 1.0)))),
       count(*)::int, (count(*) filter (where pq.acertou))::int
from public.progresso_questoes pq
join public.questoes q on q.id = pq.questao_id
cross join lateral (select distinct x from unnest(array[coalesce(nullif(btrim(q.assunto::text), ''), ''), '']) x) as k(assunto)
group by pq.usuario_id, coalesce(q.disciplina::text, ''), k.assunto
on conflict do nothing;


-- ============================================================
-- 3. Acesso: 1º módulo/etapa grátis, questões entregues pelo servidor
-- ============================================================

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
      where m.id = p_modulo_id
      order by m2.ordem, m2.id
      limit 1
    );
$$;

create or replace function public.questao_liberada(p_questao_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.modulo_questoes mq
    where mq.questao_id = p_questao_id and public.modulo_liberado(mq.modulo_id)
  ) or exists (
    select 1 from public.sessoes_servidas s
    where s.usuario_id = auth.uid() and s.questao_id = p_questao_id and public.modulo_liberado(s.modulo_id)
  );
$$;


-- ============================================================
-- 4. Responder questão: gabarito, XP, ofensiva, revisão e algoritmo
-- ============================================================

drop function if exists public.responder_questao(uuid, text);
drop function if exists public.responder_questao(uuid, text, text);

create function public.responder_questao(p_questao_id uuid, p_letra text, p_origem text default 'trilha')
returns table (
  acertou boolean, xp_ganho int, xp int, streak int, ultimo_estudo date, ofensiva_nova int,
  revisao_etapa int, proxima_revisao timestamptz, dominio int
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_gabarito text;
  v_disc text;
  v_assunto text;
  v_nalt int;
  v_chute double precision;
  v_acertou boolean;
  v_r double precision;
  v_primeira boolean;
  v_ja_tinha_xp boolean;
  v_ganho int := 0;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_usuario public.usuarios%rowtype;
  v_nova int := null;
  v_rev public.revisoes%rowtype;
  v_rev_etapa int := null;
  v_rev_prox timestamptz := null;
  v_b double precision;
  v_nq int;
  v_theta double precision;
  v_nu int;
  v_p double precision;
  v_k double precision;
  v_chave text;
  v_theta_assunto double precision := 0;
begin
  if v_uid is null then
    raise exception 'Faça login para responder.';
  end if;
  if not public.questao_liberada(p_questao_id) then
    raise exception 'ASSINATURA_NECESSARIA';
  end if;

  select q.gabarito_letra::text, coalesce(q.disciplina::text, ''), coalesce(nullif(btrim(q.assunto::text), ''), ''),
         coalesce(jsonb_array_length(q.alternativas), 5)
    into v_gabarito, v_disc, v_assunto, v_nalt
  from public.questoes q where q.id = p_questao_id;
  if v_gabarito is null then
    raise exception 'Questão não encontrada.';
  end if;
  v_acertou := upper(btrim(coalesce(p_letra, ''))) = upper(btrim(v_gabarito));
  v_r := case when v_acertou then 1 else 0 end;

  -- ---- progresso (vale a resposta mais recente) + XP uma vez por questão ----
  select pq.xp_concedido into v_ja_tinha_xp
  from public.progresso_questoes pq
  where pq.usuario_id = v_uid and pq.questao_id = p_questao_id;
  v_primeira := not found;

  if v_acertou and not coalesce(v_ja_tinha_xp, false) then
    v_ganho := 10;
  end if;

  insert into public.progresso_questoes as pq (usuario_id, questao_id, acertou, respondido_em, xp_concedido)
  values (v_uid, p_questao_id, v_acertou, now(), v_ganho > 0)
  on conflict (usuario_id, questao_id) do update
    set acertou = excluded.acertou,
        respondido_em = excluded.respondido_em,
        xp_concedido = pq.xp_concedido or excluded.xp_concedido;

  insert into public.respostas (usuario_id, questao_id, letra, acertou, origem)
  values (v_uid, p_questao_id, left(p_letra, 5), v_acertou, left(coalesce(p_origem, 'trilha'), 20));

  -- ---- revisão espaçada ----
  select * into v_rev from public.revisoes r where r.usuario_id = v_uid and r.questao_id = p_questao_id;
  if not v_acertou then
    insert into public.revisoes as r (usuario_id, questao_id, etapa, proxima_em, atualizado_em)
    values (v_uid, p_questao_id, 0, now(), now())
    on conflict (usuario_id, questao_id) do update set etapa = 0, proxima_em = now(), atualizado_em = now();
    v_rev_etapa := 0;
    v_rev_prox := now();
  elsif v_rev.usuario_id is not null and v_rev.proxima_em is not null and v_rev.proxima_em <= now() then
    v_rev_etapa := v_rev.etapa + 1;
    v_rev_prox := case v_rev_etapa
      when 1 then now() + interval '1 day'
      when 2 then now() + interval '7 days'
      when 3 then now() + interval '30 days'
      else null
    end;
    update public.revisoes r set etapa = least(v_rev_etapa, 4), proxima_em = v_rev_prox, atualizado_em = now()
    where r.usuario_id = v_uid and r.questao_id = p_questao_id;
  elsif v_rev.usuario_id is not null then
    v_rev_etapa := v_rev.etapa;
    v_rev_prox := v_rev.proxima_em;
  end if;

  -- ---- algoritmo: nota do aluno (θ) e dificuldade da questão (b) ----
  v_chute := case when v_nalt <= 2 then 0.5 else 1.0 / v_nalt end;

  insert into public.proficiencia (usuario_id, disciplina, assunto) values (v_uid, v_disc, '') on conflict do nothing;
  if v_assunto <> '' then
    -- assunto novo começa com a nota da disciplina
    insert into public.proficiencia (usuario_id, disciplina, assunto, habilidade)
    select v_uid, v_disc, v_assunto, p.habilidade from public.proficiencia p
    where p.usuario_id = v_uid and p.disciplina = v_disc and p.assunto = ''
    on conflict do nothing;
  end if;

  insert into public.questao_stats (questao_id) values (p_questao_id) on conflict do nothing;
  select s.dificuldade, s.respostas into v_b, v_nq from public.questao_stats s where s.questao_id = p_questao_id for update;

  select p.habilidade into v_theta_assunto from public.proficiencia p
  where p.usuario_id = v_uid and p.disciplina = v_disc and p.assunto = v_assunto;

  -- dificuldade: só a 1ª resposta de cada aluno (refazer decora)
  if v_primeira then
    v_p := v_chute + (1 - v_chute) / (1 + exp(-(v_theta_assunto - v_b)));
    v_k := greatest(0.03, 0.4 / (1 + 0.05 * v_nq));
    update public.questao_stats s
      set dificuldade = greatest(-4, least(4, s.dificuldade - v_k * (v_r - v_p))),
          respostas = s.respostas + 1,
          acertos = s.acertos + v_r::int
    where s.questao_id = p_questao_id;
  end if;

  foreach v_chave in array (case when v_assunto <> '' then array[v_assunto, ''] else array[''] end) loop
    select p.habilidade, p.respostas into v_theta, v_nu from public.proficiencia p
    where p.usuario_id = v_uid and p.disciplina = v_disc and p.assunto = v_chave for update;
    v_p := v_chute + (1 - v_chute) / (1 + exp(-(v_theta - v_b)));
    v_k := greatest(0.08, 0.6 / (1 + 0.1 * v_nu)) * case when v_primeira then 1 else 0.5 end;
    update public.proficiencia p
      set habilidade = greatest(-4, least(4, p.habilidade + v_k * (v_r - v_p))),
          respostas = p.respostas + 1,
          acertos = p.acertos + v_r::int,
          atualizado_em = now()
    where p.usuario_id = v_uid and p.disciplina = v_disc and p.assunto = v_chave
    returning p.habilidade into v_theta;
    if v_chave = v_assunto then
      v_theta_assunto := v_theta;
    end if;
  end loop;

  -- ---- XP e ofensiva ----
  perform set_config('foco.servidor', '1', true);

  select * into v_usuario from public.usuarios u where u.id = v_uid for update;
  if v_usuario.ultimo_estudo is distinct from v_hoje then
    v_nova := case when v_usuario.ultimo_estudo = v_hoje - 1 then v_usuario.streak + 1 else 1 end;
  end if;

  update public.usuarios u
    set xp = u.xp + v_ganho,
        streak = coalesce(v_nova, u.streak),
        ultimo_estudo = v_hoje
    where u.id = v_uid
    returning u.xp, u.streak, u.ultimo_estudo into v_usuario.xp, v_usuario.streak, v_usuario.ultimo_estudo;

  perform set_config('foco.servidor', '', true);

  return query select v_acertou, v_ganho, v_usuario.xp, v_usuario.streak, v_usuario.ultimo_estudo, v_nova,
    v_rev_etapa, v_rev_prox, round(100 / (1 + exp(-v_theta_assunto)))::int;
end;
$$;

revoke execute on function public.responder_questao(uuid, text, text) from public, anon;
grant execute on function public.responder_questao(uuid, text, text) to authenticated;


-- ============================================================
-- 5. Caderno (erros + revisões vencidas) e revisões intercaladas
-- ============================================================

create or replace function public.contar_revisoes_pendentes()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.revisoes r
  where r.usuario_id = auth.uid() and r.proxima_em <= now() and public.questao_liberada(r.questao_id);
$$;

create or replace function public.get_revisoes_pendentes(p_limite int default 50)
returns table (
  id uuid, enunciado text, enunciado_html text, tem_imagem boolean,
  gabarito_letra text, comentario text, comentario_html text,
  banca text, ano smallint, orgao text, orgao_nome text, cargo text,
  disciplina text, nivel_escolaridade text, tipo text,
  anulada boolean, desatualizada boolean, alternativas jsonb,
  aula_titulo text, aula_video_url text, revisao_etapa int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    q.id::uuid, q.enunciado::text, q.enunciado_html::text, q.tem_imagem::boolean, q.gabarito_letra::text,
    coalesce(q.comentario_revisado, q.comentario)::text,
    coalesce(q.comentario_revisado_html, q.comentario_html)::text,
    q.banca::text, q.ano::smallint, q.orgao::text, q.orgao_nome::text, q.cargo::text, q.disciplina::text,
    q.nivel_escolaridade::text, q.tipo::text, q.anulada::boolean, q.desatualizada::boolean, q.alternativas::jsonb,
    a.titulo::text, a.video_url::text, r.etapa::int
  from public.revisoes r
  join public.questoes q on q.id = r.questao_id
  left join public.aulas a on a.id = q.aula_id
  where r.usuario_id = auth.uid() and r.proxima_em <= now() and public.questao_liberada(q.id)
  order by r.etapa, r.proxima_em
  limit greatest(1, least(coalesce(p_limite, 50), 100));
$$;

-- Para intercalar nas sessões de módulos manuais: revisões vencidas (erros
-- só depois de ~1 dia) e, se faltar, questões acertadas há 3+ dias da
-- mesma trilha, sorteadas.
create or replace function public.get_revisoes_para_sessao(p_trilha_id int, p_limite int, p_excluir uuid[] default '{}')
returns table (
  id uuid, enunciado text, enunciado_html text, tem_imagem boolean,
  gabarito_letra text, comentario text, comentario_html text,
  banca text, ano smallint, orgao text, orgao_nome text, cargo text,
  disciplina text, nivel_escolaridade text, tipo text,
  anulada boolean, desatualizada boolean, alternativas jsonb, motivo text
)
language sql
volatile
security definer
set search_path = public
as $$
  with vencidas as (
    select r.questao_id, 1 as prioridade, extract(epoch from r.proxima_em) as ordem
    from public.revisoes r
    where r.usuario_id = auth.uid() and r.proxima_em <= now()
      and (r.etapa > 0 or r.atualizado_em <= now() - interval '20 hours')
      and not (r.questao_id = any(coalesce(p_excluir, '{}')))
      and public.questao_liberada(r.questao_id)
    order by r.proxima_em
    limit greatest(0, least(coalesce(p_limite, 2), 5))
  ),
  antigas as (
    select x.questao_id, 2 as prioridade, random() as ordem
    from (
      select distinct pq.questao_id
      from public.progresso_questoes pq
      join public.modulo_questoes mq on mq.questao_id = pq.questao_id
      join public.modulos m on m.id = mq.modulo_id
      where pq.usuario_id = auth.uid() and pq.acertou
        and pq.respondido_em < now() - interval '3 days'
        and m.trilha_id = p_trilha_id
        and public.modulo_liberado(m.id)
        and not (pq.questao_id = any(coalesce(p_excluir, '{}')))
        and not exists (select 1 from vencidas v where v.questao_id = pq.questao_id)
    ) x
    order by random()
    limit greatest(0, least(coalesce(p_limite, 2), 5))
  ),
  escolhidas as (
    select * from (select * from vencidas union all select * from antigas) t
    order by prioridade, ordem
    limit greatest(0, least(coalesce(p_limite, 2), 5))
  )
  select
    q.id::uuid, q.enunciado::text, q.enunciado_html::text, q.tem_imagem::boolean, q.gabarito_letra::text,
    coalesce(q.comentario_revisado, q.comentario)::text,
    coalesce(q.comentario_revisado_html, q.comentario_html)::text,
    q.banca::text, q.ano::smallint, q.orgao::text, q.orgao_nome::text, q.cargo::text, q.disciplina::text,
    q.nivel_escolaridade::text, q.tipo::text, q.anulada::boolean, q.desatualizada::boolean, q.alternativas::jsonb,
    case when e.prioridade = 1 then 'revisao' else 'relembrar' end
  from escolhidas e
  join public.questoes q on q.id = e.questao_id
  order by e.prioridade, e.ordem;
$$;

-- Domínio do aluno por disciplina/assunto (tela Evolução)
create or replace function public.meu_dominio()
returns table (disciplina text, assunto text, dominio int, respostas int, acertos int)
language sql
stable
security definer
set search_path = public
as $$
  select p.disciplina, p.assunto, round(100 / (1 + exp(-p.habilidade)))::int, p.respostas, p.acertos
  from public.proficiencia p
  where p.usuario_id = auth.uid() and p.respostas > 0
  order by p.disciplina, p.assunto;
$$;

revoke execute on function public.contar_revisoes_pendentes() from public, anon;
revoke execute on function public.get_revisoes_pendentes(int) from public, anon;
revoke execute on function public.get_revisoes_para_sessao(int, int, uuid[]) from public, anon;
revoke execute on function public.meu_dominio() from public, anon;
grant execute on function public.contar_revisoes_pendentes() to authenticated;
grant execute on function public.get_revisoes_pendentes(int) to authenticated;
grant execute on function public.get_revisoes_para_sessao(int, int, uuid[]) to authenticated;
grant execute on function public.meu_dominio() to authenticated;


-- ============================================================
-- 6. Trilha inteligente: estoque de cada etapa
-- ============================================================

create or replace function public.questoes_filtradas(
  p_disciplina text, p_assuntos text[], p_bancas text[], p_orgaos text[], p_cargos text[], p_niveis text[],
  p_ano_min int, p_ano_max int, p_certo_errado boolean
)
returns table (questao_id uuid, banca text)
language sql
stable
security definer
set search_path = public
as $$
  select q.id, q.banca::text
  from public.questoes q
  where coalesce(q.revisado, false)
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
      m.disciplina, m.assuntos, c.bancas, c.orgaos, c.cargos, c.niveis, c.ano_min, c.ano_max, c.apenas_certo_errado
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
    where r.modulo_id = p_modulo_id and r.regra = 'obrigatoria'
      and coalesce(q.revisado, false) and not coalesce(q.anulada, false)
  ) t
  order by t.questao_id, t.obrigatoria desc;
$$;

-- nota (θ) do aluno nos assuntos da etapa (média ponderada pelas respostas)
create or replace function public.theta_etapa(p_uid uuid, p_modulo_id int)
returns table (theta double precision, respostas int)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(p.habilidade * p.respostas) / nullif(sum(p.respostas), 0), 0), coalesce(sum(p.respostas), 0)::int
  from public.modulos m
  join public.proficiencia p on p.usuario_id = p_uid
    and (m.disciplina is null or p.disciplina = m.disciplina)
    and (case when coalesce(cardinality(m.assuntos), 0) = 0 then p.assunto = '' else p.assunto = any(m.assuntos) end)
  where m.id = p_modulo_id;
$$;

drop function if exists public.estado_etapa(uuid, int);
create function public.estado_etapa(p_uid uuid, p_modulo_id int)
returns table (dominio int, respondidas int, acertos int, meta int, alvo int, estoque int, tentativas int, concluida boolean)
language sql
stable
security definer
set search_path = public
as $$
  with pool as (
    select e.questao_id, pq.acertou
    from public.questoes_da_etapa(p_modulo_id) e
    left join public.progresso_questoes pq on pq.questao_id = e.questao_id and pq.usuario_id = p_uid
  ),
  t as (select * from public.theta_etapa(p_uid, p_modulo_id))
  select
    case when t.respostas < 3 then 0 else round(100 / (1 + exp(-t.theta)))::int end,
    (select count(*) from pool where acertou is not null)::int,
    (select count(*) from pool where acertou)::int,
    m.meta_questoes,
    m.dominio_alvo,
    (select count(*) from pool)::int,
    (select count(*) from public.respostas r join pool on pool.questao_id = r.questao_id where r.usuario_id = p_uid)::int,
    exists (select 1 from public.progresso_modulos pm where pm.usuario_id = p_uid and pm.modulo_id = p_modulo_id)
  from public.modulos m, t
  where m.id = p_modulo_id;
$$;

revoke execute on function public.questoes_filtradas(text, text[], text[], text[], text[], text[], int, int, boolean) from public, anon, authenticated;
revoke execute on function public.questoes_da_etapa(int) from public, anon, authenticated;
revoke execute on function public.theta_etapa(uuid, int) from public, anon, authenticated;
revoke execute on function public.estado_etapa(uuid, int) from public, anon, authenticated;


-- ============================================================
-- 7. Trilha inteligente: montar a sessão do aluno
-- ============================================================

create or replace function public.montar_sessao_inteligente(p_modulo_id int)
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
  if v_n >= 8 then
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

revoke execute on function public.montar_sessao_inteligente(int) from public, anon;
grant execute on function public.montar_sessao_inteligente(int) to authenticated;


-- ============================================================
-- 8. Trilha inteligente: progresso e conclusão das etapas
-- ============================================================

create or replace function public.avaliar_etapa(p_modulo_id int)
returns table (
  dominio int, respondidas int, acertos int, meta int, alvo int, estoque int,
  concluida boolean, concluiu_agora boolean
)
language plpgsql
volatile
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_e record;
  v_agora boolean := false;
begin
  if v_uid is null then
    raise exception 'Faça login.';
  end if;
  if not exists (select 1 from public.modulos m where m.id = p_modulo_id and m.tipo = 'inteligente') then
    raise exception 'Etapa inválida.';
  end if;
  select * into v_e from public.estado_etapa(v_uid, p_modulo_id);

  -- conclui ao responder a meta (ou todo o estoque, se for menor) COM o
  -- domínio-alvo; se o domínio não vem, o aluno segue refazendo os erros
  -- até um limite de segurança (3× a meta ou 2× o estoque em tentativas).
  if not v_e.concluida and v_e.estoque > 0 and v_e.respondidas > 0 and (
       (v_e.respondidas >= least(v_e.meta, v_e.estoque) and v_e.dominio >= v_e.alvo)
    or v_e.tentativas >= greatest(v_e.meta * 3, v_e.estoque * 2)
  ) then
    perform set_config('foco.servidor', '1', true);
    insert into public.progresso_modulos (usuario_id, modulo_id, acertos, total)
    values (v_uid, p_modulo_id, v_e.acertos, v_e.respondidas)
    on conflict (usuario_id, modulo_id) do update set acertos = excluded.acertos, total = excluded.total;
    perform set_config('foco.servidor', '', true);
    v_agora := true;
  end if;

  return query select v_e.dominio, v_e.respondidas, v_e.acertos, v_e.meta, v_e.alvo, v_e.estoque,
    v_e.concluida or v_agora, v_agora;
end;
$$;

create or replace function public.progresso_trilha_inteligente(p_trilha_id int)
returns table (modulo_id int, dominio int, respondidas int, meta int, alvo int, estoque int)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, e.dominio, e.respondidas, e.meta, e.alvo, e.estoque
  from public.modulos m
  cross join lateral public.estado_etapa(auth.uid(), m.id) e
  where m.trilha_id = p_trilha_id and m.tipo = 'inteligente' and auth.uid() is not null
  order by m.ordem, m.id;
$$;

revoke execute on function public.avaliar_etapa(int) from public, anon;
revoke execute on function public.progresso_trilha_inteligente(int) from public, anon;
grant execute on function public.avaliar_etapa(int) to authenticated;
grant execute on function public.progresso_trilha_inteligente(int) to authenticated;

-- etapa inteligente só é concluída pelo servidor (avaliar_etapa)
create or replace function public.progresso_modulos_confere()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  papel text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', '');
  v_tipo text;
  v_total int;
  v_respondidas int;
  v_acertos int;
begin
  if papel not in ('anon', 'authenticated') then
    return new;
  end if;
  select m.tipo into v_tipo from public.modulos m where m.id = new.modulo_id;
  if v_tipo = 'inteligente' then
    if coalesce(current_setting('foco.servidor', true), '') <> '1' then
      raise exception 'Etapa inteligente é concluída automaticamente pelo servidor.';
    end if;
    return new;
  end if;
  if not public.modulo_liberado(new.modulo_id) then
    raise exception 'ASSINATURA_NECESSARIA';
  end if;

  select count(*)::int, count(pq.questao_id)::int, count(*) filter (where pq.acertou)::int
    into v_total, v_respondidas, v_acertos
  from public.modulo_questoes mq
  left join public.progresso_questoes pq on pq.questao_id = mq.questao_id and pq.usuario_id = new.usuario_id
  where mq.modulo_id = new.modulo_id;

  if v_respondidas < v_total then
    raise exception 'Responda todas as questões do módulo antes de concluir.';
  end if;

  new.acertos := v_acertos;
  new.total := v_total;
  return new;
end;
$$;


-- ============================================================
-- 9. Admin: montar a trilha inteligente com controle
-- ============================================================

-- assuntos de uma disciplina, com quantas questões já podem ser usadas (revisadas)
create or replace function public.admin_assuntos(p_disciplina text)
returns table (assunto text, total int, revisadas int)
language sql
stable
security definer
set search_path = public
as $$
  select q.assunto::text, count(*)::int, (count(*) filter (where coalesce(q.revisado, false)))::int
  from public.questoes q
  where public.is_conteudo_admin()
    and q.disciplina::text = p_disciplina
    and q.assunto is not null and btrim(q.assunto::text) <> ''
  group by q.assunto
  order by count(*) desc, q.assunto;
$$;

-- estoque ao vivo enquanto o admin edita uma etapa (usa os filtros salvos da trilha)
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
      nullif(p_disciplina, ''), p_assuntos, c.bancas, c.orgaos, c.cargos, c.niveis, c.ano_min, c.ano_max, c.apenas_certo_errado
    ) f
    where not exists (
      select 1 from public.trilha_questoes_regras r
      where r.trilha_id = p_trilha_id and r.questao_id = f.questao_id and r.regra = 'excluida'
    )
  )
  select
    (select count(*) from f)::int,
    (select count(*) from f, c where f.banca = c.banca_alvo)::int,
    (select count(*) from public.questoes q
      where not coalesce(q.revisado, false)
        and (nullif(p_disciplina, '') is null or q.disciplina::text = p_disciplina)
        and (coalesce(cardinality(p_assuntos), 0) = 0 or q.assunto::text = any(p_assuntos)))::int
  where public.is_conteudo_admin();
$$;

-- estoque salvo de cada etapa da trilha
create or replace function public.admin_estoque_trilha(p_trilha_id int)
returns table (modulo_id int, total int, banca_alvo int, obrigatorias int)
language sql
stable
security definer
set search_path = public
as $$
  select m.id,
    (select count(*) from public.questoes_da_etapa(m.id))::int,
    (select count(*) from public.questoes_da_etapa(m.id) e, public.trilha_config c
      where c.trilha_id = m.trilha_id and e.banca = c.banca_alvo)::int,
    (select count(*) from public.trilha_questoes_regras r where r.modulo_id = m.id and r.regra = 'obrigatoria')::int
  from public.modulos m
  where m.trilha_id = p_trilha_id and m.tipo = 'inteligente' and public.is_conteudo_admin()
  order by m.ordem, m.id;
$$;

revoke execute on function public.admin_assuntos(text) from public, anon;
revoke execute on function public.admin_contar_estoque(int, text, text[]) from public, anon;
revoke execute on function public.admin_estoque_trilha(int) from public, anon;
grant execute on function public.admin_assuntos(text) to authenticated;
grant execute on function public.admin_contar_estoque(int, text, text[]) to authenticated;
grant execute on function public.admin_estoque_trilha(int) to authenticated;
