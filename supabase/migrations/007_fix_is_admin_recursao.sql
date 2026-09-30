-- ============================================================
-- Corrige recursão infinita em is_admin()
-- ============================================================
-- A migration 006 adicionou a policy "usuarios: leitura admin" (using
-- is_admin()) na própria tabela usuarios. Como is_admin() não era
-- `security definer`, a consulta interna dela a public.usuarios voltava a
-- passar pelas policies de RLS de usuarios — incluindo a policy que acabara
-- de chamar is_admin() — causando recursão infinita ("stack depth limit
-- exceeded" / 500 em qualquer ação de admin: revisar questão, editar
-- trilha/módulo, etc).
--
-- Fix: is_admin() vira security definer, então a leitura de usuarios que
-- ela faz roda com os privilégios do dono da função (bypassa RLS), sem
-- reavaliar as policies de usuarios.
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.usuarios where id = auth.uid()), false);
$$;
