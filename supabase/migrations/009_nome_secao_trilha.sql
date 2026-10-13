-- ============================================================
-- Nome da seção customizável (opcional) por trilha
-- ============================================================
-- O rótulo "SEÇÃO 1" acima do caminho era fixo no código. Agora é
-- opcional por trilha: se o admin não preencher, o app continua caindo
-- no padrão "SEÇÃO 1" (ver src/screens/home/TrilhaPath.tsx).
-- ============================================================

alter table public.trilhas
  add column if not exists secao_nome text;
