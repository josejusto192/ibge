-- ============================================================
-- Foco app — onboarding, gamificação, progresso por módulo, indicações
-- Run this in Supabase SQL Editor (idempotent — safe to re-run).
-- ============================================================

-- ---- usuarios: novos campos coletados no onboarding + gamificação ----
alter table public.usuarios
  add column if not exists whatsapp text,
  add column if not exists faixa_etaria text,
  add column if not exists ja_prestou_concurso boolean,
  add column if not exists nivel_preparo text,
  add column if not exists prazo_prova text,
  add column if not exists meta_diaria int not null default 20,
  add column if not exists xp int not null default 0,
  add column if not exists trilha_ativa_id int references public.trilhas(id);


-- ---- progresso_modulos: registra módulo (disciplina) concluído numa trilha ----
-- Um módulo é considerado concluído quando o usuário termina uma rodada de
-- questões daquela disciplina. "current"/"locked" não são armazenados: são
-- derivados no cliente a partir da ordem em trilha_disciplinas + quais
-- disciplinas já têm linha aqui (ver src/lib/queries.ts).
create table if not exists public.progresso_modulos (
  usuario_id    uuid not null references public.usuarios(id) on delete cascade,
  trilha_id     int not null references public.trilhas(id) on delete cascade,
  disciplina    varchar(255) not null,
  acertos       int not null default 0,
  total         int not null default 0,
  concluido_em  timestamptz not null default now(),
  primary key (usuario_id, trilha_id, disciplina)
);

alter table public.progresso_modulos enable row level security;

create policy "progresso_modulos: leitura própria"
  on public.progresso_modulos for select
  using (auth.uid() = usuario_id);

create policy "progresso_modulos: inserção própria"
  on public.progresso_modulos for insert
  with check (auth.uid() = usuario_id);

create policy "progresso_modulos: atualização própria"
  on public.progresso_modulos for update
  using (auth.uid() = usuario_id);


-- ---- indicacoes: programa de indicação (crédito de assinatura) ----
-- codigo de indicação não é armazenado: é derivado do id do indicador
-- (ver resolve_referral_code abaixo e src/lib/queries.ts).
create table if not exists public.indicacoes (
  id                uuid primary key default gen_random_uuid(),
  indicador_id      uuid not null references public.usuarios(id) on delete cascade,
  indicado_user_id  uuid references public.usuarios(id) on delete set null,
  status            text not null default 'pendente', -- 'pendente' | 'assinou'
  credito_gerado    numeric not null default 0,
  criado_em         timestamptz not null default now(),
  confirmado_em     timestamptz
);

alter table public.indicacoes enable row level security;

create policy "indicacoes: indicador ve suas indicacoes"
  on public.indicacoes for select
  using (auth.uid() = indicador_id or auth.uid() = indicado_user_id);

-- O NOVO usuário (indicado) é quem cria a linha, referenciando a si mesmo,
-- no momento do cadastro — por isso o check é sobre indicado_user_id, não
-- indicador_id (o indicador não está autenticado nesse momento).
create policy "indicacoes: indicado registra sua propria indicacao"
  on public.indicacoes for insert
  with check (auth.uid() = indicado_user_id);


-- ---- Funções security definer (expõem só o necessário, sem afrouxar RLS) ----

-- Resolve um código de indicação (prefixo do uuid do indicador) para o id
-- do indicador. Chamada por um usuário ainda não autenticado (tela de
-- cadastro), por isso é grantada para o papel `anon`.
create or replace function public.resolve_referral_code(p_code text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from public.usuarios
  where upper(left(id::text, 8)) = upper(p_code)
  limit 1;
$$;

grant execute on function public.resolve_referral_code(text) to anon, authenticated;

-- Ranking mensal: expõe só nome/xp/streak (nunca email/whatsapp) para
-- qualquer usuário autenticado, contornando a RLS de usuarios (que só
-- permite ler a própria linha).
create or replace function public.get_ranking(p_limit int default 50)
returns table (id uuid, nome text, xp int, streak int)
language sql
security definer
set search_path = public
as $$
  select id, coalesce(nome, 'Concurseiro'), xp, streak
  from public.usuarios
  order by xp desc
  limit p_limit;
$$;

grant execute on function public.get_ranking(int) to authenticated;
