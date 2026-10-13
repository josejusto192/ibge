-- ============================================================
-- Robustez (log de erros do client) + consentimento de termos (LGPD)
-- ============================================================

-- ---- client_errors: log de crash/erro do navegador ----
-- Sem depender de um serviço externo (Sentry etc): qualquer erro capturado
-- pelo ErrorBoundary, por window.onerror/unhandledrejection, ou por uma
-- falha silenciosa de carregamento é gravado aqui. Só admin lê; insert é
-- liberado pra qualquer um (erro pode acontecer até antes do login, ex. na
-- tela de onboarding).
create table if not exists public.client_errors (
  id          bigserial primary key,
  usuario_id  uuid references public.usuarios(id) on delete set null,
  mensagem    text not null,
  stack       text,
  contexto    text,
  url         text,
  user_agent  text,
  criado_em   timestamptz not null default now()
);

alter table public.client_errors enable row level security;

create policy "client_errors: qualquer um registra"
  on public.client_errors for insert
  with check (true);

create policy "client_errors: leitura admin"
  on public.client_errors for select
  using (is_admin());

-- ---- Consentimento de Termos de Uso / Política de Privacidade ----
-- Registrado no momento do cadastro (ver PlanStep.tsx) — evidência de
-- aceite pra fins de LGPD. Nulo pra contas criadas antes desta feature.
alter table public.usuarios
  add column if not exists termos_aceitos_em timestamptz;
