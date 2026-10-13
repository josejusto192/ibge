-- ============================================================
-- Chave do Gemini deixa de ser lida pelo navegador do admin
-- ============================================================
-- Até aqui a policy "configuracoes_ia: leitura admin" deixava qualquer
-- admin ler a linha inteira via REST (select modelo, api_key, ...) — a
-- api_key chegava crua no navegador, contrariando a própria intenção do
-- projeto (só a Edge Function, com service_role, deveria lê-la).
--
-- Fix: remove a policy de leitura (a tabela vira ilegível via REST direto,
-- só a escrita admin continua). Expõe uma RPC security definer que devolve
-- tudo que a tela de configurações precisa MENOS a api_key em si — só um
-- booleano dizendo se já tem uma chave configurada.
-- ============================================================

drop policy if exists "configuracoes_ia: leitura admin" on public.configuracoes_ia;

create or replace function public.admin_get_configuracoes_ia()
returns table (
  modelo text,
  prompt_extra text,
  tutor_prompt_extra text,
  api_key_configurada boolean,
  atualizado_em timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select modelo, prompt_extra, tutor_prompt_extra, (api_key is not null and api_key <> '') as api_key_configurada, atualizado_em
  from public.configuracoes_ia
  where id = 1 and is_admin();
$$;

grant execute on function public.admin_get_configuracoes_ia() to authenticated;
