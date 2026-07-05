-- ============================================================
-- Aulas (vídeo) opcionais no caminho da trilha
-- ============================================================
-- Reaproveita `modulos` (o nó do caminho) em vez de criar uma tabela nova:
-- um módulo agora pode ser do tipo 'questoes' (like até aqui, quiz curado
-- via modulo_questoes) ou 'aula' (só um vídeo do YouTube, sem questões).
-- Aulas são sempre opcionais: não entram na sequência obrigatória de
-- questões (ver computeModules em src/contexts/AppDataContext.tsx) e não
-- geram progresso_modulos — o aluno só clica e assiste, sem bloquear nem
-- ser bloqueado pelo restante da trilha.
-- ============================================================

alter table public.modulos
  add column if not exists tipo text not null default 'questoes',
  add column if not exists video_url text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'modulos_tipo_check') then
    alter table public.modulos add constraint modulos_tipo_check check (tipo in ('questoes', 'aula'));
  end if;
end $$;
