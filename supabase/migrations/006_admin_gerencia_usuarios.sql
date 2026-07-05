-- ============================================================
-- Admin: ver e gerenciar usuários
-- ============================================================
-- Até aqui `usuarios` só tinha policies de "leitura/atualização própria"
-- (auth.uid() = id), então o painel admin não conseguia listar nem editar
-- outros usuários. Adiciona policies extras (permissivas, somem-se via OR
-- às já existentes) liberando select/update para quem passa em is_admin().
-- Insert/delete de usuarios continuam só própria conta (criados via trigger
-- de signup) — admin não cria/exclui usuário diretamente por aqui.
-- ============================================================

create policy "usuarios: leitura admin"
  on public.usuarios for select
  using (is_admin());

create policy "usuarios: atualização admin"
  on public.usuarios for update
  using (is_admin())
  with check (is_admin());
