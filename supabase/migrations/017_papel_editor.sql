-- ============================================================
-- Papel "Editor": admin de conteúdo, sem acesso a dados sensíveis
-- ============================================================
-- O especialista em concursos precisa curar trilhas/módulos e revisar
-- questões, mas NÃO deve ver dados pessoais dos alunos (/admin/usuarios),
-- os erros do app, nem mexer na chave do Gemini / promover admins.
--
-- usuarios.is_editor marca esse papel. is_conteudo_admin() = admin OU
-- editor, e as policies de CONTEÚDO (questoes, modulos, modulo_questoes,
-- trilhas) passam a usá-la. As policies sensíveis (usuarios,
-- client_errors, configuracoes_ia e a RPC de configurações) continuam
-- exigindo is_admin().
-- ============================================================

alter table public.usuarios add column if not exists is_editor boolean not null default false;

-- security definer pra não recursionar nas policies de usuarios
-- (mesma lição da migration 007 com is_admin()).
create or replace function public.is_conteudo_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin or is_editor from public.usuarios where id = auth.uid()), false);
$$;

-- ---- questoes ----
drop policy if exists "questoes: leitura admin" on public.questoes;
drop policy if exists "questoes: inserção admin" on public.questoes;
drop policy if exists "questoes: atualização admin" on public.questoes;

create policy "questoes: leitura equipe"
  on public.questoes for select
  using (is_conteudo_admin());

create policy "questoes: inserção equipe"
  on public.questoes for insert
  with check (is_conteudo_admin());

create policy "questoes: atualização equipe"
  on public.questoes for update
  using (is_conteudo_admin());

-- ---- modulos ----
drop policy if exists "modulos: escrita admin" on public.modulos;

create policy "modulos: escrita equipe"
  on public.modulos for all
  using (is_conteudo_admin())
  with check (is_conteudo_admin());

-- ---- modulo_questoes ----
drop policy if exists "modulo_questoes: leitura/escrita admin" on public.modulo_questoes;

create policy "modulo_questoes: leitura/escrita equipe"
  on public.modulo_questoes for all
  using (is_conteudo_admin())
  with check (is_conteudo_admin());

-- ---- trilhas (leitura pública continua como está) ----
drop policy if exists "trilhas: escrita admin" on public.trilhas;
drop policy if exists "trilhas: atualização admin" on public.trilhas;
drop policy if exists "trilhas: exclusão admin" on public.trilhas;

create policy "trilhas: escrita equipe"
  on public.trilhas for insert
  with check (is_conteudo_admin());

create policy "trilhas: atualização equipe"
  on public.trilhas for update
  using (is_conteudo_admin());

create policy "trilhas: exclusão equipe"
  on public.trilhas for delete
  using (is_conteudo_admin());
