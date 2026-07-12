-- ============================================================
-- Tutor de IA (aluno) vira configurável, reaproveitando configuracoes_ia
-- ============================================================
-- Até aqui `configuracoes_ia` (modelo/api_key/prompt_extra) só alimentava
-- o botão "Revisar com IA" do admin. O Tutor de IA do aluno (botão
-- "Perguntar para a IA" na tela de questão) era mockado no front — agora
-- vira uma chamada real, usando o mesmo modelo/chave, mas com diretrizes
-- de prompt próprias (tom de tutor, não de revisor de comentário).
-- ============================================================

alter table public.configuracoes_ia
  add column if not exists tutor_prompt_extra text;
