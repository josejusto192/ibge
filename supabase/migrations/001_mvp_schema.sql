-- ============================================================
-- MVP Schema — IBGE Questões App
-- Run this in Supabase SQL Editor
-- ============================================================

-- Perfil de usuário (espelha auth.users)
create table if not exists public.usuarios (
  id            uuid primary key references auth.users(id) on delete cascade,
  nome          text,
  email         text not null,
  assinatura_ativa boolean not null default true,
  streak        int not null default 0,
  ultimo_acesso date,
  created_at    timestamptz not null default now()
);

alter table public.usuarios enable row level security;

create policy "usuarios: leitura própria"
  on public.usuarios for select
  using (auth.uid() = id);

create policy "usuarios: inserção própria"
  on public.usuarios for insert
  with check (auth.uid() = id);

create policy "usuarios: atualização própria"
  on public.usuarios for update
  using (auth.uid() = id);


-- Progresso por questão
-- questao_id referencia questoes.id que é uuid
create table if not exists public.progresso_questoes (
  id            bigserial primary key,
  usuario_id    uuid not null references public.usuarios(id) on delete cascade,
  questao_id    uuid not null references public.questoes(id) on delete cascade,
  acertou       boolean not null,
  respondido_em timestamptz not null default now(),
  unique (usuario_id, questao_id)
);

alter table public.progresso_questoes enable row level security;

create policy "progresso: leitura própria"
  on public.progresso_questoes for select
  using (auth.uid() = usuario_id);

create policy "progresso: inserção própria"
  on public.progresso_questoes for insert
  with check (auth.uid() = usuario_id);


-- Trilhas disponíveis
create table if not exists public.trilhas (
  id        serial primary key,
  nome      text not null,
  slug      text not null unique,
  descricao text,
  ativa     boolean not null default false,
  ordem     int not null default 0
);

alter table public.trilhas enable row level security;

create policy "trilhas: leitura pública"
  on public.trilhas for select
  using (true);


-- Disciplinas dentro de cada trilha
create table if not exists public.trilha_disciplinas (
  id          serial primary key,
  trilha_id   int not null references public.trilhas(id) on delete cascade,
  disciplina  varchar(255) not null,
  ordem       int not null default 0
);

alter table public.trilha_disciplinas enable row level security;

create policy "trilha_disciplinas: leitura pública"
  on public.trilha_disciplinas for select
  using (true);


-- ============================================================
-- Seed: trilha IBGE
-- Ajuste as disciplinas conforme os valores reais na tabela questoes
-- ============================================================
insert into public.trilhas (nome, slug, descricao, ativa, ordem)
values (
  'IBGE 2025',
  'ibge',
  'Preparação completa para o concurso do IBGE com questões comentadas de bancas anteriores.',
  true,
  1
)
on conflict (slug) do nothing;

-- Insira aqui as disciplinas na ordem desejada.
-- Execute: SELECT DISTINCT disciplina FROM questoes ORDER BY disciplina;
-- para ver os valores exatos e substitua abaixo.
insert into public.trilha_disciplinas (trilha_id, disciplina, ordem)
select
  t.id,
  d.disciplina,
  d.ordem
from public.trilhas t
cross join (values
  ('Língua Portuguesa',           1),
  ('Raciocínio Lógico',           2),
  ('Matemática',                  3),
  ('Estatística',                 4),
  ('Noções de Informática',       5),
  ('Direito Constitucional',      6),
  ('Direito Administrativo',      7),
  ('Administração Pública',       8),
  ('Economia',                    9),
  ('Geografia do Brasil',        10),
  ('Atualidades',                11)
) as d(disciplina, ordem)
where t.slug = 'ibge'
on conflict do nothing;
