-- ============================================================
-- Trilhas curadas por admin — questão por questão
-- ============================================================
-- Muda o modelo de "trilha = lista de disciplinas" (auto, via
-- trilha_disciplinas) para "trilha = módulos com questões escolhidas a
-- dedo pelo admin" (modulos + modulo_questoes). A tabela `questoes` vira
-- banco de referência só para admin — o aluno só vê o que foi
-- explicitamente colocado em algum módulo (via a função
-- get_modulo_questoes, abaixo).
--
-- `trilha_disciplinas` não é usada nem alterada aqui — fica como está,
-- sem uso, até vocês decidirem removê-la de vez.
--
-- ⚠️ Este arquivo APAGA a tabela `progresso_modulos` atual (estrutura
-- antiga, chaveada por disciplina) e recria com a estrutura nova
-- (chaveada por modulo_id). Só existia 1 linha de teste até agora.
--
-- ⚠️ Este arquivo também REMOVE as policies que permitiam a `anon`
-- inserir/atualizar `questoes` livremente (o buraco de segurança
-- identificado na auditoria). Se o seu pipeline de extração/scraping usa
-- a chave `anon` para gravar em `questoes`, troque para a chave
-- `service_role`/`secret` (que ignora RLS) — combinado com esta migration,
-- ele vai parar de conseguir escrever com a `anon`.
-- ============================================================


-- ---- usuarios: quem é admin ----
alter table public.usuarios add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((select is_admin from public.usuarios where id = auth.uid()), false);
$$;


-- ---- modulos: nós do caminho da trilha, com título livre (não é mais 1:1 com disciplina) ----
create table if not exists public.modulos (
  id        serial primary key,
  trilha_id int not null references public.trilhas(id) on delete cascade,
  titulo    text not null,
  ordem     int not null default 0
);

alter table public.modulos enable row level security;

create policy "modulos: leitura pública"
  on public.modulos for select
  using (true);

create policy "modulos: escrita admin"
  on public.modulos for all
  using (is_admin())
  with check (is_admin());


-- ---- modulo_questoes: curadoria — quais questões (e em que ordem) compõem cada módulo ----
create table if not exists public.modulo_questoes (
  modulo_id  int not null references public.modulos(id) on delete cascade,
  questao_id uuid not null references public.questoes(id) on delete cascade,
  ordem      int not null default 0,
  primary key (modulo_id, questao_id)
);

alter table public.modulo_questoes enable row level security;

create policy "modulo_questoes: leitura/escrita admin"
  on public.modulo_questoes for all
  using (is_admin())
  with check (is_admin());


-- ---- trilhas: leitura pública já existia; escrita agora é só admin ----
create policy "trilhas: escrita admin"
  on public.trilhas for insert
  with check (is_admin());

create policy "trilhas: atualização admin"
  on public.trilhas for update
  using (is_admin());

create policy "trilhas: exclusão admin"
  on public.trilhas for delete
  using (is_admin());


-- ---- progresso_modulos: recriado, agora chaveado por modulo_id (não mais disciplina) ----
drop table if exists public.progresso_modulos;

create table public.progresso_modulos (
  usuario_id   uuid not null references public.usuarios(id) on delete cascade,
  modulo_id    int not null references public.modulos(id) on delete cascade,
  acertos      int not null default 0,
  total        int not null default 0,
  concluido_em timestamptz not null default now(),
  primary key (usuario_id, modulo_id)
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


-- ---- questoes: vira banco só de admin — remove os buracos de anon e a leitura geral ----
drop policy if exists "anon_select_questoes" on public.questoes;
drop policy if exists "anon_insert_questoes" on public.questoes;
drop policy if exists "anon_update_questoes" on public.questoes;
drop policy if exists "questoes: leitura autenticada" on public.questoes;

create policy "questoes: leitura admin"
  on public.questoes for select
  using (is_admin());

create policy "questoes: inserção admin"
  on public.questoes for insert
  with check (is_admin());

create policy "questoes: atualização admin"
  on public.questoes for update
  using (is_admin());


-- ---- RPC: aluno busca o conteúdo das questões do módulo atual ----
-- security definer para poder ler `questoes` (RLS acima restringe a admin),
-- mas o escopo fica travado às questões que o admin já colocou nesse
-- módulo específico via modulo_questoes — não expõe o banco inteiro.
-- Retorna uma lista explícita de colunas (não `setof questoes`) de propósito:
-- assim, adicionar colunas em `questoes` no futuro (como os campos de
-- revisão da migration 005) não quebra o retorno desta função.
create or replace function public.get_modulo_questoes(p_modulo_id int)
returns table (
  id uuid, enunciado text, enunciado_html text, tem_imagem boolean,
  gabarito_letra text, comentario text, comentario_html text,
  banca text, ano smallint, orgao text, orgao_nome text, cargo text,
  disciplina text, nivel_escolaridade text, tipo text,
  anulada boolean, desatualizada boolean, alternativas jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    q.id, q.enunciado, q.enunciado_html, q.tem_imagem, q.gabarito_letra,
    q.comentario, q.comentario_html, q.banca, q.ano, q.orgao, q.orgao_nome,
    q.cargo, q.disciplina, q.nivel_escolaridade, q.tipo, q.anulada,
    q.desatualizada, q.alternativas
  from public.questoes q
  join public.modulo_questoes mq on mq.questao_id = q.id
  where mq.modulo_id = p_modulo_id
  order by mq.ordem;
$$;

grant execute on function public.get_modulo_questoes(int) to authenticated;


-- ---- RPC: desempenho por disciplina do próprio usuário (tela de Estatísticas) ----
-- Antes disso era um join direto progresso_questoes -> questoes no cliente,
-- mas com `questoes` restrita a admin esse join passaria a voltar vazio.
-- security definer para poder ler `questoes`, mas sempre travado a
-- auth.uid() — nunca recebe o usuario_id como parâmetro, então não dá para
-- consultar o desempenho de outra pessoa.
create or replace function public.get_meu_desempenho_por_disciplina()
returns table (disciplina text, acertos int, total int)
language sql
security definer
set search_path = public
as $$
  select q.disciplina, count(*) filter (where pq.acertou)::int as acertos, count(*)::int as total
  from public.progresso_questoes pq
  join public.questoes q on q.id = pq.questao_id
  where pq.usuario_id = auth.uid()
  group by q.disciplina;
$$;

grant execute on function public.get_meu_desempenho_por_disciplina() to authenticated;
